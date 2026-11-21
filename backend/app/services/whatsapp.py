import hashlib
import hmac
import logging
import re
from typing import Any, Optional
from urllib.parse import quote

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import NotificacionWhatsApp

logger = logging.getLogger("ecoconecta.whatsapp")

DEFAULT_WHATSAPP_PREFILL_TEXT = (
    "Hola, quiero pedir una recolección en Villas de San Pablo"
)


def normalize_phone_e164(phone: str, default_country_code: str = "57") -> str:
    digits = re.sub(r"\D+", "", phone or "")
    if not digits:
        return ""
    if len(digits) == 10 and not digits.startswith(default_country_code):
        return f"{default_country_code}{digits}"
    return digits


def format_display_phone(phone_e164: str) -> str:
    digits = re.sub(r"\D+", "", phone_e164 or "")
    if not digits:
        return ""
    if len(digits) == 12 and digits.startswith("57"):
        return f"+57 {digits[2:5]} {digits[5:8]} {digits[8:]}"
    return f"+{digits}"


def build_whatsapp_deeplink(
    public_number: Optional[str] = None,
    text: str = DEFAULT_WHATSAPP_PREFILL_TEXT,
) -> str:
    clean_num = re.sub(
        r"\D+", "", public_number if public_number is not None else settings.whatsapp_public_number_clean
    )
    if not clean_num:
        return ""
    encoded = quote(text, safe=",")
    return f"https://wa.me/{clean_num}?text={encoded}"


class WhatsAppService:
    """Cliente real de Meta WhatsApp Business Cloud API.

    - Envía mensajes automáticos al WhatsApp móvil del usuario (recepción,
      reclasificación, programación y cierre con peso/puntos).
    - Descarga archivos de audio (.ogg) enviados desde la app móvil real de
      WhatsApp mediante Meta Graph API usando WHATSAPP_TOKEN.
    - Persiste auditoría en PostgreSQL (`notificaciones_whatsapp`).
    """

    def verify_webhook_signature(
        self, raw_body: bytes, signature_header: Optional[str]
    ) -> bool:
        app_secret = settings.WHATSAPP_APP_SECRET.strip()
        if not app_secret:
            return True
        if not signature_header or not signature_header.startswith("sha256="):
            return False
        provided = signature_header.split("=", 1)[1].strip()
        expected = hmac.new(
            app_secret.encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(provided, expected)

    def download_media(self, media_id: str) -> tuple[bytes, str]:
        """Descarga un archivo de audio (.ogg) desde Meta Graph API en 2 pasos
        usando `WHATSAPP_TOKEN`.
        """
        token = settings.whatsapp_token
        if not token:
            raise RuntimeError(
                "WHATSAPP_TOKEN no está configurado; no es posible descargar el audio desde Meta Graph API."
            )

        headers = {"Authorization": f"Bearer {token}"}
        metadata_url = (
            f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{media_id}"
        )

        with httpx.Client(timeout=20.0) as client:
            meta_res = client.get(metadata_url, headers=headers)
            meta_res.raise_for_status()
            meta_json = meta_res.json()
            media_url = meta_json.get("url")
            mime_type = meta_json.get("mime_type") or "audio/ogg"
            if not media_url:
                raise RuntimeError(
                    f"Meta Graph API no devolvió URL de descarga para media_id={media_id}."
                )

            bin_res = client.get(media_url, headers=headers, follow_redirects=True)
            bin_res.raise_for_status()
            return bin_res.content, mime_type

    def send_message(
        self,
        db: Session,
        *,
        solicitud_id: Optional[int],
        flujo: str,
        destinatario_nombre: str,
        destinatario_telefono: str,
        tipo_evento: str,
        mensaje: str,
    ) -> NotificacionWhatsApp:
        phone_e164 = normalize_phone_e164(
            destinatario_telefono, settings.WHATSAPP_DEFAULT_COUNTRY_CODE
        )
        token = settings.whatsapp_token
        phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID.strip()

        modo = "cloud_api"
        estado_envio = "pendiente_credenciales"
        respuesta_api: dict[str, Any] = {
            "provider": "Meta WhatsApp Business Cloud API",
            "to": phone_e164,
            "event": tipo_evento,
        }

        if token and phone_number_id and phone_e164:
            url = (
                f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/"
                f"{phone_number_id}/messages"
            )
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }
            body = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": phone_e164,
                "type": "text",
                "text": {"preview_url": False, "body": mensaje},
            }
            try:
                with httpx.Client(timeout=15.0) as client:
                    response = client.post(url, headers=headers, json=body)
                try:
                    response_json = response.json()
                except Exception:
                    response_json = {"raw_text": response.text}

                if 200 <= response.status_code < 300:
                    estado_envio = "enviado"
                else:
                    estado_envio = "error"
                    logger.warning(
                        "Error enviando WhatsApp Cloud API (%s): %s",
                        response.status_code,
                        response_json,
                    )
                respuesta_api = {
                    "http_status": response.status_code,
                    "response": response_json,
                }
            except Exception as exc:
                estado_envio = "error"
                respuesta_api = {"error": str(exc)}
                logger.exception("Excepción enviando mensaje por WhatsApp Cloud API")
        else:
            modo = "pendiente_configuracion"
            estado_envio = "pendiente_credenciales"
            respuesta_api = {
                "provider": "Meta WhatsApp Business Cloud API",
                "reason": (
                    "Configura WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID en .env "
                    "para despachar mensajes salientes hacia la app móvil de WhatsApp."
                ),
                "to": phone_e164,
                "event": tipo_evento,
            }

        registro = NotificacionWhatsApp(
            solicitud_id=solicitud_id,
            flujo=flujo,
            destinatario_nombre=destinatario_nombre,
            destinatario_telefono=destinatario_telefono,
            tipo_evento=tipo_evento,
            mensaje=mensaje,
            modo=modo,
            estado_envio=estado_envio,
            respuesta_api=respuesta_api,
        )
        db.add(registro)
        db.flush()
        return registro


whatsapp_service = WhatsAppService()
