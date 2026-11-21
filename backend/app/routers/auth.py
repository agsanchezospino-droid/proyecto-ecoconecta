from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.entities import Usuario
from app.schemas.schemas import (
    AuthResponse,
    DemoAccountOut,
    DemoLoginRequest,
    LoginRequest,
    RegisterCitizenRequest,
    UsuarioOut,
)
from app.services.solicitudes import get_user_points_total
from app.services.whatsapp import normalize_phone_e164

router = APIRouter(prefix="/auth", tags=["Autenticación"])

DEMO_ACCOUNTS_METADATA: dict[str, dict] = {
    "coord.huerta@villas.demo": {
        "etiqueta": "Coordinador de Huerteros",
        "descripcion": "Acceso a /coordinacion — bandeja en tiempo real exclusiva de residuos orgánicos recibidos por WhatsApp.",
        "flujo": "organico",
    },
    "coord.reciclaje@villas.demo": {
        "etiqueta": "Coordinador de Recicladores",
        "descripcion": "Acceso a /coordinacion — bandeja en tiempo real exclusiva de residuos reciclables recibidos por WhatsApp.",
        "flujo": "reciclable",
    },
    "admin@villas.demo": {
        "etiqueta": "Administrador Comunitario",
        "descripcion": "Supervisión integral de ambos flujos, reglas de puntos kg/lb (RN-06), beneficios y control piloto (RN-08).",
        "flujo": None,
    },
    "piloto@villas.demo": {
        "etiqueta": "Unidad Productiva Piloto",
        "descripcion": "Consulta sus pedidos enviados desde WhatsApp (+57 300 000 0101), puntos y beneficios.",
        "flujo": "organico",
    },
    "hogar@villas.demo": {
        "etiqueta": "Hogar Ciudadano",
        "descripcion": "Consulta sus entregas de WhatsApp (+57 300 000 0102), progreso de niveles y canjes.",
        "flujo": "reciclable",
    },
}


def _to_usuario_out(db: Session, user: Usuario) -> UsuarioOut:
    return UsuarioOut(
        id=user.id,
        nombre=user.nombre or "",
        email=user.email,
        rol=user.rol,
        telefono=user.telefono,
        direccion=user.direccion,
        barrio_sector=user.barrio_sector or "Villas de San Pablo",
        es_piloto=bool(user.es_piloto),
        habilitado_solicitudes=bool(user.habilitado_solicitudes),
        pendiente_completar_datos=bool(user.pendiente_completar_datos),
        activo=bool(user.activo),
        puntos_acumulados=get_user_points_total(db, user.id),
        creado_en=user.creado_en,
    )


@router.get("/demo-accounts", response_model=list[DemoAccountOut])
def list_demo_accounts(db: Session = Depends(get_db)) -> list[DemoAccountOut]:
    if not settings.ENABLE_DEMO_QUICK_LOGIN:
        return []
    users = db.scalars(
        select(Usuario).where(Usuario.email.in_(list(DEMO_ACCOUNTS_METADATA.keys())))
    ).all()
    by_email = {u.email: u for u in users}
    result: list[DemoAccountOut] = []
    for email, meta in DEMO_ACCOUNTS_METADATA.items():
        user = by_email.get(email)
        if user:
            result.append(
                DemoAccountOut(
                    email=user.email,
                    nombre=user.nombre,
                    rol=user.rol,
                    etiqueta=meta["etiqueta"],
                    descripcion=meta["descripcion"],
                    flujo=meta["flujo"],
                )
            )
    return result


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    email_norm = payload.email.strip().lower()
    user = db.scalar(select(Usuario).where(Usuario.email == email_norm))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
        )
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta cuenta se encuentra desactivada.",
        )
    token = create_access_token(user)
    return AuthResponse(access_token=token, usuario=_to_usuario_out(db, user))


@router.post("/demo-login", response_model=AuthResponse)
def demo_login(payload: DemoLoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if not settings.ENABLE_DEMO_QUICK_LOGIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El acceso rápido demo está deshabilitado en este entorno.",
        )
    email_norm = payload.email.strip().lower()
    if email_norm not in DEMO_ACCOUNTS_METADATA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta no autorizada para acceso rápido demo.",
        )
    user = db.scalar(select(Usuario).where(Usuario.email == email_norm))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario demo no encontrado. Ejecuta seed.py primero.",
        )
    token = create_access_token(user)
    return AuthResponse(access_token=token, usuario=_to_usuario_out(db, user))


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_citizen(
    payload: RegisterCitizenRequest, db: Session = Depends(get_db)
) -> AuthResponse:
    email_norm = payload.email.strip().lower()
    existing = db.scalar(select(Usuario).where(Usuario.email == email_norm))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta registrada con este correo electrónico.",
        )

    phone_norm = normalize_phone_e164(
        payload.telefono, settings.WHATSAPP_DEFAULT_COUNTRY_CODE
    )

    user = Usuario(
        nombre=payload.nombre.strip(),
        email=email_norm,
        password_hash=hash_password(payload.password),
        rol=payload.rol,
        telefono=payload.telefono.strip(),
        telefono_normalizado=phone_norm or None,
        direccion=payload.direccion.strip(),
        barrio_sector=payload.barrio_sector.strip() or "Villas de San Pablo",
        es_piloto=False,
        habilitado_solicitudes=True,
        pendiente_completar_datos=False,
        activo=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user)
    return AuthResponse(access_token=token, usuario=_to_usuario_out(db, user))


@router.get("/me", response_model=UsuarioOut)
def get_me(
    current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
) -> UsuarioOut:
    return _to_usuario_out(db, current_user)


usuarios_router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@usuarios_router.get("/me", response_model=UsuarioOut)
def get_usuario_me(
    current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
) -> UsuarioOut:
    """Alias seguro de perfil de cuenta para todos los roles autenticados (incluidos hogar y unidad_productiva)."""
    return _to_usuario_out(db, current_user)
