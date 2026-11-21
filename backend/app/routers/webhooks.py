import hmac
import json
import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.entities import Solicitud
from app.services.ai_classifier import (
    classify_whatsapp_request,
    transcribe_audio_spanish,
)
from app.services.solicitudes import create_solicitud_from_whatsapp
from app.services.whatsapp import whatsapp_service

logger = logging.getLogger("ecoconecta.webhooks")

router = APIRouter(tags=["Webhooks WhatsApp Cloud API"])


@router.get("/api/webhooks/whatsapp")
def verify_whatsapp_webhook(
    hub_mode: Optional[str] = Query(default=None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(default=None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(default=None, alias="hub.challenge"),
) -> PlainTextResponse:
    """Verificación oficial de webhook de Meta WhatsApp Business Cloud API."""
    expected_token = settings.WHATSAPP_VERIFY_TOKEN.strip()
    if (
        hub_mode == "subscribe"
        and hub_challenge is not None
        and expected_token
        and hub_verify_token is not None
        and hmac.compare_digest(hub_verify_token, expected_token)
    ):
        logger.info("Webhook de WhatsApp verificado correctamente por Meta.")
        return PlainTextResponse(content=hub_challenge, status_code=status.HTTP_200_OK)

    logger.warning("Intento fallido de verificación del webhook de WhatsApp.")
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Token de verificación de WhatsApp inválido.",
    )


def _extract_profile_names(value: dict[str, Any]) -> dict[str, str]:
    contacts_map: dict[str, str] = {}
    for contact in value.get("contacts") or []:
        wa_id = str(contact.get("wa_id") or "").strip()
        profile = contact.get("profile") or {}
        name = str(profile.get("name") or "").strip()
        if wa_id and name:
            contacts_map[wa_id] = name
    return contacts_map


@router.post("/api/webhooks/whatsapp")
async def receive_whatsapp_webhook(
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Webhook real de Meta WhatsApp Business Cloud API.

    Recibe mensajes de texto y notas de voz (audio `.ogg`) enviados desde la app móvil
    real de WhatsApp, transcribe el audio con OpenAI (`gpt-4o-mini-transcribe` / `whisper-1`),
    clasifica con `gpt-4o-mini` (Structured Outputs), vincula o crea el usuario en PostgreSQL,
    guarda la solicitud con código único `ECO-YYYY-XXXX` y responde automáticamente por WhatsApp.
    """
    raw_body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")
    if not whatsapp_service.verify_webhook_signature(raw_body, signature):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Firma X-Hub-Signature-256 inválida.",
        )

    try:
        payload = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload JSON inválido en webhook de WhatsApp.",
        ) from exc

    processed: list[dict[str, Any]] = []
    ignored: list[dict[str, Any]] = []

    for entry in payload.get("entry") or []:
        for change in entry.get("changes") or []:
            value = change.get("value") or {}
            messages = value.get("messages") or []
            if not messages:
                # Callbacks de estado (sent, delivered, read) se acusan con 200 OK
                if value.get("statuses"):
                    ignored.append({"reason": "status_update", "count": len(value["statuses"])})
                continue

            contacts_map = _extract_profile_names(value)

            for msg in messages:
                from_phone = str(msg.get("from") or "").strip()
                msg_id = str(msg.get("id") or "").strip() or None
                msg_type = str(msg.get("type") or "").strip().lower()
                profile_name = contacts_map.get(from_phone)

                if not from_phone:
                    ignored.append({"id": msg_id, "reason": "missing_sender"})
                    continue

                # Deduplicación temprana por wamid antes de descargar audio o invocar OpenAI
                if msg_id:
                    existing_sol = db.scalar(
                        select(Solicitud).where(Solicitud.whatsapp_message_id == msg_id)
                    )
                    if existing_sol:
                        processed.append(
                            {
                                "solicitud_id": existing_sol.id,
                                "codigo": existing_sol.codigo,
                                "flujo": existing_sol.flujo,
                                "tipo_mensaje": existing_sol.tipo_mensaje_origen,
                                "duplicado": True,
                                "usuario_id": existing_sol.usuario_id,
                            }
                        )
                        continue

                tipo_origen = "texto"
                media_id: Optional[str] = None
                transcription_model: Optional[str] = None
                text_content = ""

                if msg_type == "text":
                    text_content = str((msg.get("text") or {}).get("body") or "").strip()
                    tipo_origen = "texto"
                elif msg_type == "audio":
                    audio_obj = msg.get("audio") or {}
                    media_id = str(audio_obj.get("id") or "").strip() or None
                    mime_hint = str(audio_obj.get("mime_type") or "audio/ogg")
                    tipo_origen = "audio"
                    if not media_id:
                        ignored.append({"id": msg_id, "reason": "missing_audio_media_id"})
                        continue
                    try:
                        audio_bytes, real_mime = whatsapp_service.download_media(media_id)
                        text_content, transcription_model = transcribe_audio_spanish(
                            audio_bytes, real_mime or mime_hint
                        )
                    except Exception as exc:
                        logger.exception(
                            "Error descargando o transcribiendo audio WhatsApp %s", media_id
                        )
                        whatsapp_service.send_message(
                            db,
                            solicitud_id=None,
                            flujo="organico",
                            destinatario_nombre=profile_name or "Vecino",
                            destinatario_telefono=from_phone,
                            tipo_evento="error_transcripcion_audio",
                            mensaje=(
                                "Hola, recibimos tu nota de voz en EcoConecta – Villas de San Pablo, "
                                "pero tuvimos un inconveniente técnico al procesarla. Por favor "
                                "envíanos un mensaje de texto o intenta con otra nota de voz indicando "
                                "si son residuos orgánicos o reciclables y tu dirección."
                            ),
                        )
                        db.commit()
                        ignored.append(
                            {"id": msg_id, "reason": "audio_processing_error", "detail": str(exc)}
                        )
                        continue
                elif msg_type == "button":
                    text_content = str((msg.get("button") or {}).get("text") or "").strip()
                elif msg_type == "interactive":
                    inter = msg.get("interactive") or {}
                    reply = inter.get("button_reply") or inter.get("list_reply") or {}
                    text_content = str(reply.get("title") or "").strip()
                else:
                    whatsapp_service.send_message(
                        db,
                        solicitud_id=None,
                        flujo="reciclable",
                        destinatario_nombre=profile_name or "Vecino",
                        destinatario_telefono=from_phone,
                        tipo_evento="tipo_mensaje_no_soportado",
                        mensaje=(
                            "Hola, en EcoConecta – Villas de San Pablo recibimos solicitudes "
                            "por mensaje de texto o nota de voz. Cuéntanos qué residuos vas a "
                            "entregar (orgánicos o reciclables), tu manzana/casa y horario preferido."
                        ),
                    )
                    db.commit()
                    ignored.append({"id": msg_id, "reason": f"unsupported_type:{msg_type}"})
                    continue

                if not text_content:
                    ignored.append({"id": msg_id, "reason": "empty_text"})
                    continue

                # Clasificación estructurada con gpt-4o-mini (sin enviar PII innecesario)
                clasificacion = classify_whatsapp_request(text_content)

                solicitud, created_now = create_solicitud_from_whatsapp(
                    db,
                    from_phone=from_phone,
                    profile_name=profile_name,
                    whatsapp_message_id=msg_id,
                    tipo_mensaje_origen=tipo_origen,
                    mensaje_original=text_content,
                    clasificacion=clasificacion,
                    whatsapp_media_id=media_id,
                    transcription_model=transcription_model,
                )
                processed.append(
                    {
                        "solicitud_id": solicitud.id,
                        "codigo": solicitud.codigo,
                        "flujo": solicitud.flujo,
                        "tipo_mensaje": tipo_origen,
                        "duplicado": not created_now,
                        "usuario_id": solicitud.usuario_id,
                    }
                )

    return {
        "status": "ok",
        "processed_count": len(processed),
        "processed": processed,
        "ignored": ignored,
    }
