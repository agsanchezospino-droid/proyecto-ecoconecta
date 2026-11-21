from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.entities import (
    Beneficio,
    EstadoSolicitud,
    GuiaResiduo,
    RegistroRecoleccion,
    ReglaPuntos,
    RolUsuario,
    Solicitud,
    Usuario,
)
from app.schemas.schemas import (
    BeneficioOut,
    GuiaResiduoOut,
    ImpactoPublicoOut,
    PublicConfigOut,
    ReglaPuntosOut,
    SolicitudPublicaTrackOut,
)
from app.services.solicitudes import serialize_solicitud_publica
from app.services.tts import synthesize_speech_mp3
from app.services.whatsapp import (
    DEFAULT_WHATSAPP_PREFILL_TEXT,
    build_whatsapp_deeplink,
)

router = APIRouter(tags=["Portal Público"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)) -> dict:
    db.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": "postgresql",
        "whatsapp_mode": settings.whatsapp_effective_mode,
        "whatsapp_cloud_api_configured": settings.whatsapp_has_credentials,
        "openai_configured": settings.openai_configured,
        "webhook_endpoint": "/api/webhooks/whatsapp",
    }


@router.get("/public/config", response_model=PublicConfigOut)
def get_public_config() -> PublicConfigOut:
    """Configuración pública del canal oficial de WhatsApp móvil."""
    public_num = settings.whatsapp_public_number_clean
    return PublicConfigOut(
        app_name=settings.APP_NAME,
        whatsapp_public_number=public_num,
        whatsapp_default_message=DEFAULT_WHATSAPP_PREFILL_TEXT,
        whatsapp_url=build_whatsapp_deeplink(public_num, DEFAULT_WHATSAPP_PREFILL_TEXT),
    )


@router.get("/public/guia-residuos", response_model=list[GuiaResiduoOut])
def get_guia_residuos(
    flujo: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> list[GuiaResiduoOut]:
    stmt = select(GuiaResiduo).order_by(GuiaResiduo.flujo.asc(), GuiaResiduo.nombre.asc())
    if flujo and flujo in ("organico", "reciclable", "no_aprovechable"):
        stmt = stmt.where(GuiaResiduo.flujo == flujo)
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                GuiaResiduo.nombre.ilike(pattern),
                GuiaResiduo.categoria.ilike(pattern),
                GuiaResiduo.descripcion.ilike(pattern),
            )
        )
    items = db.scalars(stmt).all()
    return [GuiaResiduoOut.model_validate(item) for item in items]


@router.get("/public/impacto", response_model=ImpactoPublicoOut)
def get_public_impact(db: Session = Depends(get_db)) -> ImpactoPublicoOut:
    rows = db.execute(
        select(Solicitud.flujo, func.coalesce(func.sum(RegistroRecoleccion.peso_kg), 0))
        .join(RegistroRecoleccion, RegistroRecoleccion.solicitud_id == Solicitud.id)
        .group_by(Solicitud.flujo)
    ).all()

    kg_by_flow = {flujo: float(total or 0) for flujo, total in rows}
    kg_organico = round(kg_by_flow.get("organico", 0.0), 2)
    kg_reciclable = round(kg_by_flow.get("reciclable", 0.0), 2)

    completed_count = db.scalar(
        select(func.count(Solicitud.id)).where(
            Solicitud.estado == EstadoSolicitud.RECOLECTADA.value
        )
    )
    participants_count = db.scalar(
        select(func.count(Usuario.id)).where(
            Usuario.rol.in_([RolUsuario.HOGAR.value, RolUsuario.UNIDAD_PRODUCTIVA.value]),
            Usuario.activo.is_(True),
        )
    )

    return ImpactoPublicoOut(
        total_kg_aprovechados=round(kg_organico + kg_reciclable, 2),
        kg_organico=kg_organico,
        kg_reciclable=kg_reciclable,
        recolecciones_completadas=int(completed_count or 0),
        participantes_activos=int(participants_count or 0),
        nota_institucional=settings.POINTS_DISCLAIMER,
    )


@router.get("/public/reglas-puntos", response_model=list[ReglaPuntosOut])
def get_public_reglas_puntos(db: Session = Depends(get_db)) -> list[ReglaPuntosOut]:
    reglas = db.scalars(select(ReglaPuntos).order_by(ReglaPuntos.flujo.asc())).all()
    return [
        ReglaPuntosOut(
            id=r.id,
            flujo=r.flujo,
            puntos_base=float(r.puntos_base),
            puntos_por_kg=float(r.puntos_por_kg),
            puntos_por_libra=float(r.puntos_por_libra),
            descripcion=r.descripcion,
            activo=r.activo,
            actualizado_en=r.actualizado_en,
            nota_institucional=settings.POINTS_DISCLAIMER,
        )
        for r in reglas
    ]


@router.get("/public/beneficios", response_model=list[BeneficioOut])
def get_public_beneficios(
    tipo_destinatario: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> list[BeneficioOut]:
    stmt = (
        select(Beneficio)
        .where(Beneficio.activo.is_(True))
        .order_by(Beneficio.tipo_destinatario.asc(), Beneficio.puntos_requeridos.asc())
    )
    if tipo_destinatario in ("usuario", "recolector"):
        stmt = stmt.where(Beneficio.tipo_destinatario == tipo_destinatario)
    items = db.scalars(stmt).all()
    return [
        BeneficioOut(
            id=b.id,
            tipo_destinatario=b.tipo_destinatario,  # type: ignore[arg-type]
            nombre=b.nombre,
            descripcion=b.descripcion,
            puntos_requeridos=float(b.puntos_requeridos),
            activo=b.activo,
        )
        for b in items
    ]


@router.get("/public/solicitudes/{codigo}", response_model=SolicitudPublicaTrackOut)
def track_solicitud_public(
    codigo: str, db: Session = Depends(get_db)
) -> SolicitudPublicaTrackOut:
    """RN-07: Permite consultar el estado por código único sin exponer datos personales."""
    clean_code = codigo.strip().upper()
    solicitud = db.scalar(
        select(Solicitud)
        .options(
            selectinload(Solicitud.registro_recoleccion),
            selectinload(Solicitud.historial_estados),
        )
        .where(Solicitud.codigo == clean_code)
    )
    if not solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No encontramos ninguna solicitud con el código {clean_code}.",
        )
    return serialize_solicitud_publica(solicitud)


class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)


@router.post("/public/tts")
async def generate_human_tts(payload: TtsRequest) -> Response:
    """Sintetiza audio MP3 con voz neuronal colombiana cálida y tranquila para ayudas inclusivas."""
    try:
        audio_bytes = await synthesize_speech_mp3(payload.text)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Voz neuronal temporalmente no disponible; usando voz del navegador.",
        ) from exc

    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )
