from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema_compatibility(bind_engine: Engine) -> None:
    """Asegura de manera idempotente las columnas nuevas en bases PostgreSQL existentes."""
    if bind_engine.dialect.name != "postgresql":
        return

    statements = [
        "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono_normalizado VARCHAR(30)",
        "CREATE INDEX IF NOT EXISTS ix_usuarios_telefono_normalizado ON usuarios (telefono_normalizado)",
        "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pendiente_completar_datos BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS canal_origen VARCHAR(30) NOT NULL DEFAULT 'whatsapp'",
        "ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS tipo_mensaje_origen VARCHAR(20) NOT NULL DEFAULT 'texto'",
        "ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS mensaje_original TEXT",
        "ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS resumen_material TEXT",
        "ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS whatsapp_message_id VARCHAR(120)",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_solicitudes_whatsapp_message_id ON solicitudes (whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL",
        "ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS whatsapp_media_id VARCHAR(120)",
        "ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS requiere_revision_flujo BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS clasificacion_ia JSONB",
    ]
    with bind_engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
