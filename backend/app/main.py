from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import (
    Base,
    SessionLocal,
    engine,
    ensure_schema_compatibility,
)
from app.routers import admin, auth, coordinacion, public, solicitudes, webhooks
from app.seed import run_seed

logger = logging.getLogger("ecoconecta")


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_schema_compatibility(engine)
    if settings.AUTO_SEED:
        db = SessionLocal()
        try:
            summary = run_seed(db)
            logger.info("Auto-seed completado: %s", summary)
        finally:
            db.close()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "API REST de EcoConecta – Villas de San Pablo (Barranquilla, Colombia). "
        "Recibe pedidos exclusivamente desde la app móvil real de WhatsApp "
        "(Meta WhatsApp Business Cloud API + transcripción/clasificación OpenAI) "
        "y los organiza por flujo para los coordinadores de huerteros y recicladores."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"
app.include_router(public.router, prefix=API_PREFIX)
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(auth.usuarios_router, prefix=API_PREFIX)
app.include_router(solicitudes.router, prefix=API_PREFIX)
app.include_router(coordinacion.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)
# Webhook real de Meta WhatsApp Business Cloud API en GET/POST /api/webhooks/whatsapp
app.include_router(webhooks.router)


@app.get("/")
def root() -> dict:
    return {
        "app": settings.APP_NAME,
        "docs": "/docs",
        "health": "/api/v1/health",
        "whatsapp_webhook": "/api/webhooks/whatsapp",
    }
