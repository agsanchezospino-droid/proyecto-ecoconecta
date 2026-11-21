from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.entities import HistorialEstado, Solicitud, Usuario
from app.schemas.schemas import (
    CanjeCreate,
    CanjeOut,
    MiResumenPuntosOut,
    SolicitudCiudadanoOut,
)
from app.services.solicitudes import (
    assert_can_view_solicitud,
    get_user_points_and_benefits,
    redeem_benefit,
    serialize_canje,
    serialize_solicitud_ciudadano,
)

router = APIRouter(prefix="/solicitudes", tags=["Portal Ciudadano (Solo Consulta y Puntos)"])


def _load_solicitud_full(db: Session, solicitud_id: int) -> Solicitud:
    solicitud = db.scalar(
        select(Solicitud)
        .options(
            selectinload(Solicitud.coordinador),
            selectinload(Solicitud.registro_recoleccion),
            selectinload(Solicitud.historial_estados).selectinload(HistorialEstado.usuario),
        )
        .where(Solicitud.id == solicitud_id)
    )
    if not solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada.",
        )
    return solicitud


@router.get("/mias", response_model=list[SolicitudCiudadanoOut])
def listar_mis_solicitudes(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SolicitudCiudadanoOut]:
    solicitudes = db.scalars(
        select(Solicitud)
        .options(
            selectinload(Solicitud.coordinador),
            selectinload(Solicitud.registro_recoleccion),
            selectinload(Solicitud.historial_estados).selectinload(HistorialEstado.usuario),
        )
        .where(Solicitud.usuario_id == current_user.id)
        .order_by(Solicitud.creado_en.desc())
    ).all()
    return [serialize_solicitud_ciudadano(s) for s in solicitudes]


@router.get("/mias/puntos", response_model=MiResumenPuntosOut)
def obtener_mis_puntos(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MiResumenPuntosOut:
    return get_user_points_and_benefits(db, current_user)


@router.post("/mias/canjes", response_model=CanjeOut, status_code=status.HTTP_201_CREATED)
def registrar_canje_usuario(
    payload: CanjeCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CanjeOut:
    canje = redeem_benefit(
        db,
        tipo_destinatario="usuario",
        beneficio_id=payload.beneficio_id,
        actor_user=current_user,
        usuario_id=current_user.id,
        observaciones=payload.observaciones,
    )
    return serialize_canje(canje)


@router.get("/{solicitud_id}", response_model=SolicitudCiudadanoOut)
def detalle_mi_solicitud(
    solicitud_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SolicitudCiudadanoOut:
    solicitud = _load_solicitud_full(db, solicitud_id)
    assert_can_view_solicitud(current_user, solicitud)
    return serialize_solicitud_ciudadano(solicitud)
