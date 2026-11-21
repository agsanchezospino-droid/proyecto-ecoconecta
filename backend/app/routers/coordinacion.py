import csv
from datetime import date, datetime, time, timezone
import io
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_coordinator_flow, get_current_user
from app.models.entities import (
    EstadoSolicitud,
    HistorialEstado,
    IntegranteColectivo,
    NotificacionWhatsApp,
    RegistroRecoleccion,
    Solicitud,
    Usuario,
)
from app.schemas.schemas import (
    CambiarEstadoRequest,
    CanjeCreate,
    CanjeOut,
    IntegranteCreate,
    IntegranteOut,
    NotificacionWhatsAppOut,
    PanelRecolectoresPuntosOut,
    ProgramarSolicitudRequest,
    ReclasificarFlujoOut,
    ReclasificarFlujoRequest,
    RegistroRecoleccionCreate,
    RegistroRecoleccionOut,
    ResumenOperativoOut,
    SolicitudCoordinadorOut,
    VerificarDatosUsuarioRequest,
)
from app.services.solicitudes import (
    assert_coordinator_flow_access,
    close_and_register_collection,
    get_collectors_points_panel,
    reclassify_solicitud_flow,
    redeem_benefit,
    schedule_solicitud,
    serialize_canje,
    serialize_notificacion_whatsapp,
    serialize_registro_recoleccion,
    serialize_solicitud_coordinador,
    update_solicitud_status,
    verify_and_update_solicitud_user_data,
)

router = APIRouter(prefix="/coordinacion", tags=["Panel Operativo de Coordinadores"])


def _resolve_effective_flow(user: Usuario, requested_flow: Optional[str]) -> Optional[str]:
    """RN-01: Los coordinadores quedan anclados a su flujo; solo el admin puede elegir flujo."""
    coord_flow = get_coordinator_flow(user)
    if coord_flow is not None:
        return coord_flow
    if requested_flow in ("organico", "reciclable"):
        return requested_flow
    return None


def _load_solicitud_for_coord(db: Session, solicitud_id: int) -> Solicitud:
    solicitud = db.scalar(
        select(Solicitud)
        .options(
            selectinload(Solicitud.usuario),
            selectinload(Solicitud.coordinador),
            selectinload(Solicitud.encargado),
            selectinload(Solicitud.registro_recoleccion).selectinload(
                RegistroRecoleccion.coordinador
            ),
            selectinload(Solicitud.registro_recoleccion).selectinload(
                RegistroRecoleccion.solicitud
            ),
            selectinload(Solicitud.historial_estados).selectinload(HistorialEstado.usuario),
            selectinload(Solicitud.notificaciones),
        )
        .where(Solicitud.id == solicitud_id)
    )
    if not solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada.",
        )
    return solicitud


@router.get("/solicitudes", response_model=list[SolicitudCoordinadorOut])
def bandeja_coordinacion(
    estado: Optional[str] = Query(default=None),
    flujo: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SolicitudCoordinadorOut]:
    effective_flow = _resolve_effective_flow(current_user, flujo)

    stmt = (
        select(Solicitud)
        .options(
            selectinload(Solicitud.usuario),
            selectinload(Solicitud.coordinador),
            selectinload(Solicitud.encargado),
            selectinload(Solicitud.registro_recoleccion).selectinload(
                RegistroRecoleccion.coordinador
            ),
            selectinload(Solicitud.registro_recoleccion).selectinload(
                RegistroRecoleccion.solicitud
            ),
            selectinload(Solicitud.historial_estados).selectinload(HistorialEstado.usuario),
            selectinload(Solicitud.notificaciones),
        )
        .order_by(Solicitud.creado_en.desc())
    )

    if effective_flow:
        stmt = stmt.where(Solicitud.flujo == effective_flow)
    if estado and estado in [e.value for e in EstadoSolicitud]:
        stmt = stmt.where(Solicitud.estado == estado)
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Solicitud.codigo.ilike(pattern),
                Solicitud.nombre_solicitante.ilike(pattern),
                Solicitud.telefono_contacto.ilike(pattern),
                Solicitud.direccion.ilike(pattern),
                Solicitud.mensaje_original.ilike(pattern),
            )
        )

    items = db.scalars(stmt).all()
    return [serialize_solicitud_coordinador(s) for s in items]


@router.get("/solicitudes/{solicitud_id}", response_model=SolicitudCoordinadorOut)
def detalle_solicitud_coordinacion(
    solicitud_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SolicitudCoordinadorOut:
    solicitud = _load_solicitud_for_coord(db, solicitud_id)
    assert_coordinator_flow_access(current_user, solicitud)
    return serialize_solicitud_coordinador(solicitud)


@router.patch("/solicitudes/{solicitud_id}/estado", response_model=SolicitudCoordinadorOut)
def actualizar_estado_solicitud(
    solicitud_id: int,
    payload: CambiarEstadoRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SolicitudCoordinadorOut:
    solicitud = _load_solicitud_for_coord(db, solicitud_id)
    update_solicitud_status(db, current_user, solicitud, payload)
    refreshed = _load_solicitud_for_coord(db, solicitud_id)
    return serialize_solicitud_coordinador(refreshed)


@router.patch(
    "/solicitudes/{solicitud_id}/reclasificar-flujo",
    response_model=ReclasificarFlujoOut,
)
def reclasificar_flujo_solicitud(
    solicitud_id: int,
    payload: ReclasificarFlujoRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReclasificarFlujoOut:
    """Mueve una solicitud entre Orgánicos y Reciclables si hubo mezcla o clasificación errónea."""
    solicitud = _load_solicitud_for_coord(db, solicitud_id)
    updated, flujo_anterior, nuevo_coord = reclassify_solicitud_flow(
        db,
        current_user,
        solicitud,
        payload.nuevo_flujo,
        payload.motivo,
    )
    destino_label = "Orgánicos (Huerteros)" if updated.flujo == "organico" else "Reciclables (Recicladores)"
    return ReclasificarFlujoOut(
        id=updated.id,
        codigo=updated.codigo,
        flujo_anterior=flujo_anterior,  # type: ignore[arg-type]
        flujo_nuevo=updated.flujo,  # type: ignore[arg-type]
        coordinador_nuevo=nuevo_coord,
        mensaje=(
            f"Solicitud {updated.codigo} movida a {destino_label} y notificada "
            f"automáticamente al WhatsApp móvil del solicitante."
        ),
    )


@router.patch(
    "/solicitudes/{solicitud_id}/datos-usuario",
    response_model=SolicitudCoordinadorOut,
)
def completar_datos_usuario_solicitud(
    solicitud_id: int,
    payload: VerificarDatosUsuarioRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SolicitudCoordinadorOut:
    """Verifica y completa el perfil de un número nuevo creado automáticamente por WhatsApp."""
    solicitud = _load_solicitud_for_coord(db, solicitud_id)
    verify_and_update_solicitud_user_data(db, current_user, solicitud, payload)
    refreshed = _load_solicitud_for_coord(db, solicitud_id)
    return serialize_solicitud_coordinador(refreshed)


@router.post("/solicitudes/{solicitud_id}/programar", response_model=SolicitudCoordinadorOut)
def programar_recoleccion(
    solicitud_id: int,
    payload: ProgramarSolicitudRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SolicitudCoordinadorOut:
    solicitud = _load_solicitud_for_coord(db, solicitud_id)
    schedule_solicitud(db, current_user, solicitud, payload)
    refreshed = _load_solicitud_for_coord(db, solicitud_id)
    return serialize_solicitud_coordinador(refreshed)


@router.post("/solicitudes/{solicitud_id}/cerrar", response_model=SolicitudCoordinadorOut)
def cerrar_y_registrar_recoleccion(
    solicitud_id: int,
    payload: RegistroRecoleccionCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SolicitudCoordinadorOut:
    solicitud = _load_solicitud_for_coord(db, solicitud_id)
    close_and_register_collection(db, current_user, solicitud, payload)
    refreshed = _load_solicitud_for_coord(db, solicitud_id)
    return serialize_solicitud_coordinador(refreshed)


def _query_recolecciones(
    db: Session,
    effective_flow: Optional[str],
    desde: Optional[date],
    hasta: Optional[date],
) -> list[RegistroRecoleccion]:
    stmt = (
        select(RegistroRecoleccion)
        .join(Solicitud, Solicitud.id == RegistroRecoleccion.solicitud_id)
        .options(
            selectinload(RegistroRecoleccion.solicitud),
            selectinload(RegistroRecoleccion.coordinador),
        )
        .order_by(RegistroRecoleccion.fecha_hora_recoleccion.desc())
    )
    if effective_flow:
        stmt = stmt.where(Solicitud.flujo == effective_flow)
    if desde:
        dt_from = datetime.combine(desde, time.min, tzinfo=timezone.utc)
        stmt = stmt.where(RegistroRecoleccion.fecha_hora_recoleccion >= dt_from)
    if hasta:
        dt_to = datetime.combine(hasta, time.max, tzinfo=timezone.utc)
        stmt = stmt.where(RegistroRecoleccion.fecha_hora_recoleccion <= dt_to)
    return list(db.scalars(stmt).all())


@router.get("/recolecciones", response_model=list[RegistroRecoleccionOut])
def historial_recolecciones(
    flujo: Optional[str] = Query(default=None),
    desde: Optional[date] = Query(default=None),
    hasta: Optional[date] = Query(default=None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RegistroRecoleccionOut]:
    effective_flow = _resolve_effective_flow(current_user, flujo)
    registros = _query_recolecciones(db, effective_flow, desde, hasta)
    return [serialize_registro_recoleccion(r) for r in registros]


@router.get("/recolecciones/exportar.csv")
def exportar_recolecciones_csv(
    flujo: Optional[str] = Query(default=None),
    desde: Optional[date] = Query(default=None),
    hasta: Optional[date] = Query(default=None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    effective_flow = _resolve_effective_flow(current_user, flujo)
    registros = _query_recolecciones(db, effective_flow, desde, hasta)

    buffer = io.StringIO()
    buffer.write("\ufeff")  # UTF-8 BOM para Excel
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "Codigo",
            "Flujo",
            "Tipo Generador",
            "Solicitante Verificado",
            "Peso Ingresado",
            "Unidad Original",
            "Peso Equivalente (kg)",
            "Encargado Recoleccion",
            "Coordinador",
            "Puntos Acreditados (Usuario y Recolector)",
            "Fecha Hora Recoleccion",
            "Observaciones",
        ]
    )
    for r in registros:
        writer.writerow(
            [
                r.solicitud.codigo if r.solicitud else "",
                r.solicitud.flujo if r.solicitud else "",
                r.solicitud.tipo_generador if r.solicitud else "",
                r.nombre_solicitante_verificado,
                f"{float(r.peso_ingresado):.2f}",
                r.unidad_medida,
                f"{float(r.peso_kg):.2f}",
                r.nombre_encargado,
                r.coordinador.nombre if r.coordinador else "",
                f"{float(r.puntos_calculados):.2f}",
                r.fecha_hora_recoleccion.isoformat(),
                r.observaciones or "",
            ]
        )

    filename = f"ecoconecta_recolecciones_{effective_flow or 'todos'}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/resumen", response_model=ResumenOperativoOut)
def resumen_operativo(
    flujo: Optional[str] = Query(default=None),
    desde: Optional[date] = Query(default=None),
    hasta: Optional[date] = Query(default=None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumenOperativoOut:
    effective_flow = _resolve_effective_flow(current_user, flujo)

    sol_stmt = select(Solicitud)
    if effective_flow:
        sol_stmt = sol_stmt.where(Solicitud.flujo == effective_flow)
    if desde:
        sol_stmt = sol_stmt.where(
            Solicitud.creado_en >= datetime.combine(desde, time.min, tzinfo=timezone.utc)
        )
    if hasta:
        sol_stmt = sol_stmt.where(
            Solicitud.creado_en <= datetime.combine(hasta, time.max, tzinfo=timezone.utc)
        )

    solicitudes = db.scalars(sol_stmt).all()
    por_estado = {e.value: 0 for e in EstadoSolicitud}
    for s in solicitudes:
        por_estado[s.estado] = por_estado.get(s.estado, 0) + 1

    registros = _query_recolecciones(db, effective_flow, desde, hasta)
    kg_organico = round(
        sum(float(r.peso_kg) for r in registros if r.solicitud and r.solicitud.flujo == "organico"),
        2,
    )
    kg_reciclable = round(
        sum(
            float(r.peso_kg) for r in registros if r.solicitud and r.solicitud.flujo == "reciclable"
        ),
        2,
    )
    total_puntos = round(sum(float(r.puntos_calculados) for r in registros), 2)

    return ResumenOperativoOut(
        flujo_filtrado=effective_flow,
        periodo_desde=desde,
        periodo_hasta=hasta,
        total_solicitudes=len(solicitudes),
        por_estado=por_estado,
        total_recolecciones_cerradas=len(registros),
        total_kg_recolectados=round(kg_organico + kg_reciclable, 2),
        kg_organico=kg_organico,
        kg_reciclable=kg_reciclable,
        total_puntos_otorgados=total_puntos,
        modo_whatsapp_activo=settings.whatsapp_effective_mode,
        nota_institucional=settings.POINTS_DISCLAIMER,
    )


@router.get("/notificaciones-whatsapp", response_model=list[NotificacionWhatsAppOut])
def listar_notificaciones_whatsapp(
    flujo: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[NotificacionWhatsAppOut]:
    effective_flow = _resolve_effective_flow(current_user, flujo)
    stmt = (
        select(NotificacionWhatsApp)
        .options(selectinload(NotificacionWhatsApp.solicitud))
        .order_by(NotificacionWhatsApp.creado_en.desc())
        .limit(limit)
    )
    if effective_flow:
        stmt = stmt.where(NotificacionWhatsApp.flujo == effective_flow)

    items = db.scalars(stmt).all()
    return [serialize_notificacion_whatsapp(n) for n in items]


@router.get("/colectivo", response_model=list[IntegranteOut])
def listar_colectivo(
    flujo: Optional[str] = Query(default=None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[IntegranteOut]:
    effective_flow = _resolve_effective_flow(current_user, flujo)
    stmt = (
        select(IntegranteColectivo)
        .where(IntegranteColectivo.activo.is_(True))
        .order_by(IntegranteColectivo.nombre.asc())
    )
    if effective_flow:
        stmt = stmt.where(IntegranteColectivo.flujo == effective_flow)
    items = db.scalars(stmt).all()
    return [IntegranteOut.model_validate(i) for i in items]


@router.post("/colectivo", response_model=IntegranteOut, status_code=status.HTTP_201_CREATED)
def agregar_integrante_colectivo(
    payload: IntegranteCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IntegranteOut:
    coord_flow = get_coordinator_flow(current_user)
    target_flow = coord_flow if coord_flow is not None else payload.flujo
    if target_flow not in ("organico", "reciclable"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes especificar el flujo ('organico' o 'reciclable') para el integrante.",
        )

    integrante = IntegranteColectivo(
        nombre=payload.nombre.strip(),
        flujo=target_flow,
        rol_interno=payload.rol_interno.strip(),
        zona_cobertura=payload.zona_cobertura.strip() if payload.zona_cobertura else None,
        coordinador_id=current_user.id,
        activo=True,
    )
    db.add(integrante)
    db.commit()
    db.refresh(integrante)
    return IntegranteOut.model_validate(integrante)


@router.get("/recolectores/puntos", response_model=PanelRecolectoresPuntosOut)
def resumen_puntos_recolectores(
    flujo: Optional[str] = Query(default=None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PanelRecolectoresPuntosOut:
    """Resumen de puntos, progreso por niveles y beneficios por recolector/huertero (RN-01)."""
    effective_flow = _resolve_effective_flow(current_user, flujo)
    return get_collectors_points_panel(db, effective_flow)


@router.post(
    "/recolectores/{integrante_id}/canjes",
    response_model=CanjeOut,
    status_code=status.HTTP_201_CREATED,
)
def registrar_canje_recolector(
    integrante_id: int,
    payload: CanjeCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CanjeOut:
    """Registra el canje de un beneficio para un recolector/huertero del colectivo."""
    get_coordinator_flow(current_user)
    canje = redeem_benefit(
        db,
        tipo_destinatario="recolector",
        beneficio_id=payload.beneficio_id,
        actor_user=current_user,
        integrante_id=integrante_id,
        observaciones=payload.observaciones,
    )
    return serialize_canje(canje)
