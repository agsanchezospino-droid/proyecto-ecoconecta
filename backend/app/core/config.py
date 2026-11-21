from functools import lru_cache
import re
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "EcoConecta – Villas de San Pablo API"
    APP_VERSION: str = "2.0.0"

    DATABASE_URL: str = (
        "postgresql+psycopg://ecoconecta_user:ecoconecta_local_dev@localhost:5432/ecoconecta"
    )

    SECRET_KEY: str = "dev_only_secret_key_change_in_production_32chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720

    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    AUTO_SEED: bool = True
    ENABLE_DEMO_QUICK_LOGIN: bool = True

    # WhatsApp Business Cloud API (Meta) — Canal móvil real exclusivo
    WHATSAPP_PUBLIC_NUMBER: str = ""
    WHATSAPP_API_VERSION: str = "v21.0"
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_ACCESS_TOKEN: str = ""  # Alias retrocompatible
    WHATSAPP_VERIFY_TOKEN: str = "ecoconecta_verify_token_2026"
    WHATSAPP_APP_SECRET: str = ""
    WHATSAPP_DEFAULT_COUNTRY_CODE: str = "57"

    # OpenAI API (transcripción de notas de voz + clasificación Structured Outputs)
    OPENAI_API_KEY: str = ""
    OPENAI_TRANSCRIBE_MODEL: str = "gpt-4o-mini-transcribe"
    OPENAI_CLASSIFIER_MODEL: str = "gpt-4o-mini"

    # Voz neuronal cálida y tranquila (español de Colombia por defecto)
    TTS_VOICE: str = "es-CO-SalomeNeural"
    TTS_RATE: str = "-10%"
    TTS_PITCH: str = "-2Hz"

    POINTS_DISCLAIMER: str = (
        "Valores de puntaje y beneficios referenciales y parametrizables; "
        "sujetos a validación oficial de la Fundación Santo Domingo"
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if isinstance(value, str):
            if value.startswith("postgres://"):
                return value.replace("postgres://", "postgresql+psycopg://", 1)
            if value.startswith("postgresql://"):
                return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def whatsapp_token(self) -> str:
        return (self.WHATSAPP_TOKEN or self.WHATSAPP_ACCESS_TOKEN).strip()

    @property
    def whatsapp_public_number_clean(self) -> str:
        return re.sub(r"\D+", "", self.WHATSAPP_PUBLIC_NUMBER or "")

    @property
    def whatsapp_has_credentials(self) -> bool:
        return bool(self.WHATSAPP_PHONE_NUMBER_ID.strip() and self.whatsapp_token)

    @property
    def whatsapp_effective_mode(self) -> str:
        return "conectado" if self.whatsapp_has_credentials else "pendiente_credenciales"

    @property
    def openai_configured(self) -> bool:
        return bool(self.OPENAI_API_KEY.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
