from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import require_roles
from app.models.entities import Beneficio, ReglaPuntos, RolUsuario, Usuario
from app.schemas.schemas import (
    BeneficioCreate,
    BeneficioOut,
    BeneficioUpdate,
    ReglaPuntosOut,
    ReglaPuntosUpdate,
    UsuarioAdminUpdate,
    UsuarioOut,
)
from app.services.solicitudes import get_user_points_total

router = APIRouter(prefix="/admin", tags=["Administración"])
admin_only = require_roles(RolUsuario.ADMINISTRADOR.value)


@router.get("/reglas-puntos", response_model=list[ReglaPuntosOut])
def listar_reglas_puntos(
    _: Usuario = Depends(admin_only),
    db: Session = Depends(get_db),
) -> list[ReglaPuntosOut]:
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


@router.put("/reglas-puntos/{flujo}", response_model=ReglaPuntosOut)
def actualizar_regla_puntos(
    flujo: str,
    payload: ReglaPuntosUpdate,
    admin_user: Usuario = Depends(admin_only),
    db: Session = Depends(get_db),
) -> ReglaPuntosOut:
    if flujo not in ("organico", "reciclable"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Flujo inválido. Usa 'organico' o 'reciclable'.",
        )
    regla = db.scalar(select(ReglaPuntos).where(ReglaPuntos.flujo == flujo))
    if not regla:
        regla = ReglaPuntos(flujo=flujo)
        db.add(regla)

    regla.puntos_base = payload.puntos_base
    regla.puntos_por_kg = payload.puntos_por_kg
    regla.puntos_por_libra = payload.puntos_por_libra
    regla.descripcion = payload.descripcion
    regla.activo = payload.activo
    regla.actualizado_por_id = admin_user.id

    db.commit()
    db.refresh(regla)
    return ReglaPuntosOut(
        id=regla.id,
        flujo=regla.flujo,
        puntos_base=float(regla.puntos_base),
        puntos_por_kg=float(regla.puntos_por_kg),
        puntos_por_libra=float(regla.puntos_por_libra),
        descripcion=regla.descripcion,
        activo=regla.activo,
        actualizado_en=regla.actualizado_en,
        nota_institucional=settings.POINTS_DISCLAIMER,
    )


@router.get("/beneficios", response_model=list[BeneficioOut])
def listar_beneficios_admin(
    _: Usuario = Depends(admin_only),
    db: Session = Depends(get_db),
) -> list[BeneficioOut]:
    items = db.scalars(
        select(Beneficio).order_by(
            Beneficio.tipo_destinatario.asc(),
            Beneficio.puntos_requeridos.asc(),
            Beneficio.id.asc(),
        )
    ).all()
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


@router.post("/beneficios", response_model=BeneficioOut, status_code=status.HTTP_201_CREATED)
def crear_beneficio(
    payload: BeneficioCreate,
    _: Usuario = Depends(admin_only),
    db: Session = Depends(get_db),
) -> BeneficioOut:
    beneficio = Beneficio(
        tipo_destinatario=payload.tipo_destinatario,
        nombre=payload.nombre.strip(),
        descripcion=payload.descripcion.strip(),
        puntos_requeridos=payload.puntos_requeridos,
        activo=payload.activo,
    )
    db.add(beneficio)
    db.commit()
    db.refresh(beneficio)
    return BeneficioOut(
        id=beneficio.id,
        tipo_destinatario=beneficio.tipo_destinatario,  # type: ignore[arg-type]
        nombre=beneficio.nombre,
        descripcion=beneficio.descripcion,
        puntos_requeridos=float(beneficio.puntos_requeridos),
        activo=beneficio.activo,
    )


@router.put("/beneficios/{beneficio_id}", response_model=BeneficioOut)
def actualizar_beneficio(
    beneficio_id: int,
    payload: BeneficioUpdate,
    _: Usuario = Depends(admin_only),
    db: Session = Depends(get_db),
) -> BeneficioOut:
    beneficio = db.get(Beneficio, beneficio_id)
    if not beneficio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Beneficio no encontrado.",
        )
    if payload.nombre is not None:
        beneficio.nombre = payload.nombre.strip()
    if payload.descripcion is not None:
        beneficio.descripcion = payload.descripcion.strip()
    if payload.puntos_requeridos is not None:
        beneficio.puntos_requeridos = payload.puntos_requeridos
    if payload.activo is not None:
        beneficio.activo = payload.activo

    db.commit()
    db.refresh(beneficio)
    return BeneficioOut(
        id=beneficio.id,
        tipo_destinatario=beneficio.tipo_destinatario,  # type: ignore[arg-type]
        nombre=beneficio.nombre,
        descripcion=beneficio.descripcion,
        puntos_requeridos=float(beneficio.puntos_requeridos),
        activo=beneficio.activo,
    )


@router.get("/usuarios", response_model=list[UsuarioOut])
def listar_usuarios(
    _: Usuario = Depends(admin_only),
    db: Session = Depends(get_db),
) -> list[UsuarioOut]:
    users = db.scalars(select(Usuario).order_by(Usuario.rol.asc(), Usuario.nombre.asc())).all()
    return [
        UsuarioOut(
            id=u.id,
            nombre=u.nombre,
            email=u.email,
            rol=u.rol,
            telefono=u.telefono,
            direccion=u.direccion,
            barrio_sector=u.barrio_sector,
            es_piloto=u.es_piloto,
            habilitado_solicitudes=u.habilitado_solicitudes,
            pendiente_completar_datos=u.pendiente_completar_datos,
            activo=u.activo,
            puntos_acumulados=get_user_points_total(db, u.id),
            creado_en=u.creado_en,
        )
        for u in users
    ]


@router.patch("/usuarios/{usuario_id}", response_model=UsuarioOut)
def actualizar_usuario_piloto(
    usuario_id: int,
    payload: UsuarioAdminUpdate,
    _: Usuario = Depends(admin_only),
    db: Session = Depends(get_db),
) -> UsuarioOut:
    """RN-08: Permite habilitar/deshabilitar cuentas del piloto de Villas de San Pablo."""
    user = db.get(Usuario, usuario_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado.",
        )
    if payload.es_piloto is not None:
        user.es_piloto = payload.es_piloto
    if payload.habilitado_solicitudes is not None:
        user.habilitado_solicitudes = payload.habilitado_solicitudes
    if payload.activo is not None:
        user.activo = payload.activo

    db.commit()
    db.refresh(user)
    return UsuarioOut(
        id=user.id,
        nombre=user.nombre,
        email=user.email,
        rol=user.rol,
        telefono=user.telefono,
        direccion=user.direccion,
        barrio_sector=user.barrio_sector,
        es_piloto=user.es_piloto,
        habilitado_solicitudes=user.habilitado_solicitudes,
        pendiente_completar_datos=user.pendiente_completar_datos,
        activo=user.activo,
        puntos_acumulados=get_user_points_total(db, user.id),
        creado_en=user.creado_en,
    )
