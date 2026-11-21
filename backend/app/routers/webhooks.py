import hmac
import json
import logging
import re
from typing import Any, Literal, Optional
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.entities import SesionWhatsApp, Solicitud
from app.services.ai_classifier import (
    ORGANIC_KEYWORDS,
    RECYCLABLE_KEYWORDS,
    ClasificacionSolicitudIA,
    classify_whatsapp_request,
    transcribe_audio_spanish,
)
from app.services.solicitudes import create_solicitud_from_whatsapp
from app.services.whatsapp import normalize_phone_e164, whatsapp_service

logger = logging.getLogger("ecoconecta.webhooks")

router = APIRouter(tags=["Webhooks WhatsApp Cloud API"])

MENU_BIENVENIDA_TEXT = (
    "¡Hola! Bienvenido a EcoConecta – Villas de San Pablo 🌿♻️\n\n"
    "¿Qué residuos quieres entregar hoy? Responde solo con un número o envía una nota de voz:\n\n"
    "1️⃣ Orgánicos (cáscaras de frutas, verduras, borra de café — Huerteros)\n"
    "2️⃣ Reciclables (botellas, cartón, papel, latas — Recicladores)\n"
    "🎤 O envíanos una nota de voz contándonos qué tienes y tu manzana/casa."
)

GREETING_EXACT = {
    "hola",
    "holaa",
    "holaaa",
    "buenas",
    "buenos dias",
    "buen dia",
    "buenas tardes",
    "buenas noches",
    "menu",
    "inicio",
    "ayuda",
    "info",
    "informacion",
    "empezar",
    "saludos",
    "hi",
    "hello",
}

OPTION_ORGANICO_EXACT = {
    "1",
    "1.",
    "1)",
    "uno",
    "organico",
    "organicos",
    "huerta",
    "huerteros",
    "opcion 1",
}

OPTION_RECICLABLE_EXACT = {
    "2",
    "2.",
    "2)",
    "dos",
    "reciclable",
    "reciclables",
    "reciclaje",
    "recicladores",
    "opcion 2",
}


def _normalize_chat_text(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", (text or "").strip().lower())
    without_accents = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    cleaned = re.sub(r"[^a-z0-9\s]", " ", without_accents)
    return re.sub(r"\s+", " ", cleaned).strip()


def _mentions_waste_material(text: str) -> bool:
    low = (text or "").lower()
    return any(kw in low for kw in ORGANIC_KEYWORDS) or any(
        kw in low for kw in RECYCLABLE_KEYWORDS
    )


def _is_greeting_or_menu_trigger(text: str) -> bool:
    norm = _normalize_chat_text(text)
    if not norm:
        return True
    if _mentions_waste_material(text):
        return False
    if norm in GREETING_EXACT:
        return True
    # Detecta también el texto prellenado del botón wa.me cuando aún no trae detalle de residuos
    if norm.startswith("hola") and len(norm.split()) <= 12 and "manzana" not in norm and "casa" not in norm:
        return True
    if "quiero pedir una recoleccion" in norm and "manzana" not in norm and "casa" not in norm:
        return True
    return False


def _parse_menu_selection(text: str) -> Optional[Literal["organico", "reciclable"]]:
    raw_stripped = (text or "").strip()
    if raw_stripped in ("1️⃣", "1"):
        return "organico"
    if raw_stripped in ("2️⃣", "2"):
        return "reciclable"
    norm = _normalize_chat_text(text)
    if norm in OPTION_ORGANICO_EXACT:
        return "organico"
    if norm in OPTION_RECICLABLE_EXACT:
        return "reciclable"
    return None


def _get_or_create_session(db: Session, from_phone: str) -> SesionWhatsApp:
    phone_norm = normalize_phone_e164(
        from_phone, settings.WHATSAPP_DEFAULT_COUNTRY_CODE
    ) or re.sub(r"\D+", "", from_phone)
    sesion = db.scalar(
        select(SesionWhatsApp).where(SesionWhatsApp.telefono_normalizado == phone_norm)
    )
    if sesion is None:
        sesion = SesionWhatsApp(
            telefono_normalizado=phone_norm,
            estado="inicio",
            flujo_seleccionado=None,
        )
        db.add(sesion)
        db.flush()
    return sesion


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
    """Webhook real de Meta WhatsApp Business Cloud API con chatbot en `sesiones_whatsapp`.

    - Saludo ("Hola"): responde con menú sencillo para adultos mayores (1 Orgánicos, 2 Reciclables, o nota de voz).
    - Opción 1 o 2: guarda el flujo elegido en `sesiones_whatsapp` y solicita dirección/horario.
    - Audio o mensaje directo: transcribe (con OpenAI o respaldo seguro), clasifica en `organico` o `reciclable`,
      guarda en `solicitudes` (código `ECO-YYYY-XXXX`) sin duplicados y confirma por WhatsApp.
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
                if value.get("statuses"):
                    ignored.append(
                        {"reason": "status_update", "count": len(value["statuses"])}
                    )
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

                # 1. Deduplicación temprana en `solicitudes` por wamid
                if msg_id:
                    existing_sol = db.scalar(
                        select(Solicitud).where(Solicitud.whatsapp_message_id == msg_id)
                    )
                    if existing_sol:
                        processed.append(
                            {
                                "action": "solicitud_duplicada",
                                "solicitud_id": existing_sol.id,
                                "codigo": existing_sol.codigo,
                                "flujo": existing_sol.flujo,
                                "tipo_mensaje": existing_sol.tipo_mensaje_origen,
                                "duplicado": True,
                                "usuario_id": existing_sol.usuario_id,
                            }
                        )
                        continue

                sesion = _get_or_create_session(db, from_phone)

                # 2. Deduplicación de mensajes de menú ya atendidos en `sesiones_whatsapp`
                if msg_id and sesion.ultimo_mensaje_id == msg_id:
                    processed.append(
                        {
                            "action": "sesion_duplicada",
                            "sesion_estado": sesion.estado,
                            "duplicado": True,
                        }
                    )
                    continue

                tipo_origen = "texto"
                media_id: Optional[str] = None
                transcription_model: Optional[str] = None
                audio_error_detail: Optional[str] = None
                text_content = ""

                if msg_type == "text":
                    text_content = str((msg.get("text") or {}).get("body") or "").strip()
                    tipo_origen = "texto"
                elif msg_type in ("audio", "voice"):
                    audio_obj = msg.get("audio") or msg.get("voice") or {}
                    media_id = str(audio_obj.get("id") or "").strip() or None
                    mime_hint = str(audio_obj.get("mime_type") or "audio/ogg")
                    tipo_origen = "audio"
                    if not media_id:
                        audio_error_detail = "Nota de voz sin media_id en el payload."
                        text_content = (
                            "[Nota de voz recibida por WhatsApp — sin archivo adjunto "
                            "identificable. Contactar al vecino por WhatsApp.]"
                        )
                    else:
                        try:
                            audio_bytes, real_mime = whatsapp_service.download_media(media_id)
                            text_content, transcription_model = transcribe_audio_spanish(
                                audio_bytes, real_mime or mime_hint
                            )
                        except Exception as exc:
                            logger.warning(
                                "Audio WhatsApp %s guardado pendiente de transcripción (%s)",
                                media_id,
                                exc,
                            )
                            audio_error_detail = str(exc)
                            transcription_model = "pendiente_transcripcion"
                            text_content = (
                                "[Nota de voz recibida por WhatsApp — pendiente de "
                                "transcripción automática. Revisar el audio en WhatsApp o "
                                "confirmar el detalle con el vecino.]"
                            )
                elif msg_type == "button":
                    text_content = str((msg.get("button") or {}).get("text") or "").strip()
                elif msg_type == "interactive":
                    inter = msg.get("interactive") or {}
                    reply = inter.get("button_reply") or inter.get("list_reply") or {}
                    text_content = str(
                        reply.get("title") or reply.get("id") or ""
                    ).strip()
                else:
                    whatsapp_service.send_message(
                        db,
                        solicitud_id=None,
                        flujo=sesion.flujo_seleccionado or "reciclable",
                        destinatario_nombre=profile_name or "Vecino",
                        destinatario_telefono=from_phone,
                        tipo_evento="tipo_mensaje_no_soportado",
                        mensaje=(
                            "Hola, en EcoConecta – Villas de San Pablo recibimos solicitudes "
                            "por mensaje de texto o nota de voz.\n\n"
                            "Responde *1* para Orgánicos, *2* para Reciclables, o envíanos una nota de voz."
                        ),
                    )
                    sesion.ultimo_mensaje_id = msg_id
                    db.commit()
                    ignored.append({"id": msg_id, "reason": f"unsupported_type:{msg_type}"})
                    continue

                if not text_content:
                    ignored.append({"id": msg_id, "reason": "empty_text"})
                    continue

                # 3. Flujo conversacional del chatbot (solo para texto/botones, nunca bloquea audios)
                if tipo_origen == "texto":
                    if _is_greeting_or_menu_trigger(text_content):
                        sesion.estado = "esperando_opcion"
                        sesion.flujo_seleccionado = None
                        sesion.ultimo_mensaje_id = msg_id
                        sesion.datos_temporales = {"ultimo_saludo": text_content[:120]}
                        whatsapp_service.send_message(
                            db,
                            solicitud_id=None,
                            flujo="organico",
                            destinatario_nombre=profile_name or "Vecino",
                            destinatario_telefono=from_phone,
                            tipo_evento="menu_bienvenida",
                            mensaje=MENU_BIENVENIDA_TEXT,
                        )
                        db.commit()
                        processed.append(
                            {
                                "action": "menu_enviado",
                                "sesion_id": sesion.id,
                                "sesion_estado": sesion.estado,
                                "duplicado": False,
                            }
                        )
                        continue

                    selected_flow = _parse_menu_selection(text_content)
                    if selected_flow is not None:
                        sesion.flujo_seleccionado = selected_flow
                        sesion.estado = f"esperando_detalle_{selected_flow}"
                        sesion.ultimo_mensaje_id = msg_id
                        sesion.datos_temporales = {"flujo_elegido": selected_flow}
                        flujo_titulo = (
                            "Orgánicos (Huerteros) 🌿"
                            if selected_flow == "organico"
                            else "Reciclables (Recicladores) ♻️"
                        )
                        whatsapp_service.send_message(
                            db,
                            solicitud_id=None,
                            flujo=selected_flow,
                            destinatario_nombre=profile_name or "Vecino",
                            destinatario_telefono=from_phone,
                            tipo_evento="menu_opcion_seleccionada",
                            mensaje=(
                                f"¡Perfecto! Elegiste *{flujo_titulo}*.\n\n"
                                "Ahora escríbenos o envíanos una nota de voz con:\n"
                                "• Tu manzana y casa en Villas de San Pablo\n"
                                "• Qué día u horario prefieres para la recolección"
                            ),
                        )
                        db.commit()
                        processed.append(
                            {
                                "action": "opcion_seleccionada",
                                "flujo": selected_flow,
                                "sesion_id": sesion.id,
                                "sesion_estado": sesion.estado,
                                "duplicado": False,
                            }
                        )
                        continue

                # 4. Clasificación del pedido (audio o texto directo / detalle tras menú)
                session_flow: Optional[Literal["organico", "reciclable"]] = (
                    sesion.flujo_seleccionado
                    if sesion.flujo_seleccionado in ("organico", "reciclable")
                    else None
                )

                if audio_error_detail:
                    flujo_audio: Literal["organico", "reciclable"] = (
                        session_flow or "reciclable"
                    )
                    clasificacion = ClasificacionSolicitudIA(
                        flujo=flujo_audio,
                        tipo_generador="hogar",
                        direccion_mencionada=None,
                        resumen_material=(
                            "Nota de voz pendiente de transcripción automática "
                            "(verificar flujo y dirección con el vecino)."
                        ),
                        preferencia_horaria=None,
                        requiere_revision_flujo=session_flow is None,
                        confianza=0.5 if session_flow else 0.0,
                        fuente="audio_pendiente_transcripcion",
                    )
                else:
                    clasificacion = classify_whatsapp_request(text_content)
                    # Si el usuario ya eligió 1 (Orgánicos) o 2 (Reciclables) en el menú y ahora
                    # solo escribió su dirección/horario, respetamos su elección de sesión.
                    if session_flow and not _mentions_waste_material(text_content):
                        clasificacion = clasificacion.model_copy(
                            update={
                                "flujo": session_flow,
                                "requiere_revision_flujo": False,
                                "fuente": f"sesion_menu_{session_flow}",
                            }
                        )

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
                    audio_error_detail=audio_error_detail,
                )

                # Cierra/reinicia la sesión conversacional tras guardar la solicitud
                sesion.usuario_id = solicitud.usuario_id
                sesion.estado = "inicio"
                sesion.flujo_seleccionado = None
                sesion.ultimo_mensaje_id = msg_id
                sesion.datos_temporales = {"ultima_solicitud_codigo": solicitud.codigo}
                db.commit()

                processed.append(
                    {
                        "action": "solicitud_creada",
                        "solicitud_id": solicitud.id,
                        "codigo": solicitud.codigo,
                        "flujo": solicitud.flujo,
                        "tipo_mensaje": tipo_origen,
                        "pendiente_transcripcion": bool(audio_error_detail),
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
