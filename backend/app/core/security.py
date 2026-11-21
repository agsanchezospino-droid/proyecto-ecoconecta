from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets
from typing import Callable, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.entities import RolUsuario, Usuario

PBKDF2_ITERATIONS = 210_000
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${derived.hex()}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    try:
        algorithm, iter_str, salt_hex, hash_hex = stored_hash.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        derived = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(iter_str),
        )
        return hmac.compare_digest(derived.hex(), hash_hex)
    except Exception:
        return False


def create_access_token(user: Usuario) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "rol": user.rol,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tu sesión ha expirado. Inicia sesión nuevamente.",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación inválido.",
        ) from exc


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticación requerida.",
        )
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido.",
        )
    user = db.get(Usuario, int(user_id))
    if not user or not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo.",
        )
    return user


def require_roles(*allowed_roles: str) -> Callable[[Usuario], Usuario]:
    def dependency(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.rol not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para acceder a este recurso.",
            )
        return current_user

    return dependency


def get_coordinator_flow(user: Usuario) -> Optional[str]:
    """RN-01: Determina el flujo exclusivo asignado a un coordinador.
    Retorna None para el administrador (acceso a ambos flujos).
    """
    if user.rol == RolUsuario.COORDINADOR_HUERTEROS.value:
        return "organico"
    if user.rol == RolUsuario.COORDINADOR_RECICLADORES.value:
        return "reciclable"
    if user.rol == RolUsuario.ADMINISTRADOR.value:
        return None
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Esta sección es exclusiva para coordinadores de colectivo o administración.",
    )
