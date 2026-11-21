import json
import logging
import re
from typing import Literal, Optional

import httpx
from pydantic import BaseModel, Field

from app.core.config import settings

logger = logging.getLogger("ecoconecta.ai")


class ClasificacionSolicitudIA(BaseModel):
    flujo: Literal["organico", "reciclable"]
    tipo_generador: Literal["hogar", "unidad_productiva"] = "hogar"
    direccion_mencionada: Optional[str] = None
    resumen_material: str = Field(min_length=2, max_length=400)
    preferencia_horaria: Optional[str] = None
    requiere_revision_flujo: bool = False
    confianza: float = Field(default=0.8, ge=0.0, le=1.0)
    fuente: str = "openai_gpt4o_mini"


CLASSIFICATION_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "flujo": {"type": "string", "enum": ["organico", "reciclable"]},
        "tipo_generador": {
            "type": "string",
            "enum": ["hogar", "unidad_productiva"],
        },
        "direccion_mencionada": {"type": ["string", "null"]},
        "resumen_material": {"type": "string"},
        "preferencia_horaria": {"type": ["string", "null"]},
        "requiere_revision_flujo": {"type": "boolean"},
        "confianza": {"type": "number"},
    },
    "required": [
        "flujo",
        "tipo_generador",
        "direccion_mencionada",
        "resumen_material",
        "preferencia_horaria",
        "requiere_revision_flujo",
        "confianza",
    ],
    "additionalProperties": False,
}

SYSTEM_PROMPT = (
    "Eres el clasificador operativo de EcoConecta – Villas de San Pablo (Barranquilla, Colombia). "
    "Analiza el mensaje (texto o transcripción de nota de voz) enviado por un vecino y devuelve "
    "únicamente el JSON estructurado requerido.\n"
    "Reglas de clasificación (RN-01):\n"
    "- flujo='organico': cáscaras de frutas y verduras (plátano, yuca, papa, mango, etc.), "
    "borra de café, cáscaras de huevo, restos vegetales crudos, poda, hojas secas, compost, huerta.\n"
    "- flujo='reciclable': botellas plásticas PET, plástico, cartón, cajas, papel, cuadernos, "
    "latas, aluminio, vidrio, metales, chatarra, material reciclable limpio y seco.\n"
    "- Si el usuario menciona ambos tipos o el mensaje es ambiguo, elige el flujo predominante "
    "(o 'reciclable' si no se especifica ningún residuo) y marca requiere_revision_flujo=true.\n"
    "- tipo_generador='unidad_productiva' si menciona comedor, restaurante, tienda, frutería, "
    "panadería, negocio, local, cafetería, emprendimiento o cocina comunitaria; de lo contrario 'hogar'.\n"
    "- direccion_mencionada: extrae Manzana, Casa, Etapa, Sector, Bloque, Torre, Calle o Carrera "
    "mencionada por el usuario, o null si no mencionó dirección.\n"
    "- resumen_material: resumen corto y claro en español de los residuos a recoger.\n"
    "- preferencia_horaria: día o franja horaria mencionada (ej. 'Mañana temprano', 'Sábado 9 a.m.'), o null."
)

EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_OR_ID_PATTERN = re.compile(r"(?:\+?\d[\d\s\-()]{6,}\d)")

ORGANIC_KEYWORDS = (
    "organico",
    "orgánico",
    "organicos",
    "orgánicos",
    "cascara",
    "cáscara",
    "cascaras",
    "cáscaras",
    "verdura",
    "verduras",
    "fruta",
    "frutas",
    "platano",
    "plátano",
    "yuca",
    "papa",
    "borra",
    "cafe",
    "café",
    "huevo",
    "compost",
    "compostaje",
    "huerta",
    "huertero",
    "huerteros",
    "poda",
    "hojas",
    "vegetal",
    "vegetales",
    "abono",
    "balde",
)

RECYCLABLE_KEYWORDS = (
    "reciclable",
    "reciclables",
    "reciclaje",
    "reciclar",
    "reciclador",
    "recicladores",
    "plastico",
    "plástico",
    "plasticos",
    "plásticos",
    "botella",
    "botellas",
    "pet",
    "carton",
    "cartón",
    "caja",
    "cajas",
    "papel",
    "cuaderno",
    "cuadernos",
    "periodico",
    "periódico",
    "lata",
    "latas",
    "aluminio",
    "vidrio",
    "frasco",
    "frascos",
    "chatarra",
    "metal",
    "metales",
    "costal",
    "costales",
)

PRODUCTIVE_UNIT_KEYWORDS = (
    "comedor",
    "restaurante",
    "tienda",
    "panaderia",
    "panadería",
    "fruteria",
    "frutería",
    "negocio",
    "local",
    "cafeteria",
    "cafetería",
    "emprendimiento",
    "asadero",
    "puesto",
    "cocina comunitaria",
    "unidad productiva",
)

ADDRESS_PATTERN = re.compile(
    r"((?:manzana|mz\.?|mza\.?|etapa|sector|bloque|torre|calle|cll\.?|carrera|cra\.?|kr\.?)"
    r"[^,.\n;]{2,80})",
    re.IGNORECASE,
)


def redact_unnecessary_pii(text: str) -> str:
    """Elimina correos, teléfonos largos y cédulas antes de enviar texto a OpenAI,
    preservando referencias cortas de ubicación (Manzana, Casa, Etapa).
    """
    cleaned = EMAIL_PATTERN.sub("[EMAIL]", text or "")

    def _mask_long_digits(match: re.Match[str]) -> str:
        raw = match.group(0)
        digits_only = re.sub(r"\D+", "", raw)
        if len(digits_only) >= 7:
            return "[TELEFONO_O_ID]"
        return raw

    return PHONE_OR_ID_PATTERN.sub(_mask_long_digits, cleaned).strip()


def _extension_for_mime(mime_type: str) -> tuple[str, str]:
    base_mime = (mime_type or "audio/ogg").split(";", 1)[0].strip().lower()
    mapping = {
        "audio/ogg": (".ogg", "audio/ogg"),
        "audio/opus": (".ogg", "audio/ogg"),
        "audio/mpeg": (".mp3", "audio/mpeg"),
        "audio/mp4": (".m4a", "audio/mp4"),
        "audio/m4a": (".m4a", "audio/m4a"),
        "audio/wav": (".wav", "audio/wav"),
        "audio/webm": (".webm", "audio/webm"),
    }
    return mapping.get(base_mime, (".ogg", "audio/ogg"))


def transcribe_audio_spanish(
    audio_bytes: bytes, mime_type: str = "audio/ogg"
) -> tuple[str, str]:
    """Transcribe notas de voz de WhatsApp (.ogg) a español usando OpenAI API
    (`gpt-4o-mini-transcribe` con respaldo automático en `whisper-1`).
    """
    api_key = settings.OPENAI_API_KEY.strip()
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY no está configurada; no es posible transcribir notas de voz."
        )

    ext, clean_mime = _extension_for_mime(mime_type)
    filename = f"nota_voz{ext}"
    primary_model = settings.OPENAI_TRANSCRIBE_MODEL.strip() or "gpt-4o-mini-transcribe"
    candidate_models = [primary_model]
    if "whisper-1" not in candidate_models:
        candidate_models.append("whisper-1")

    url = "https://api.openai.com/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {api_key}"}

    last_error: Optional[str] = None
    with httpx.Client(timeout=45.0) as client:
        for model in candidate_models:
            res = client.post(
                url,
                headers=headers,
                data={"model": model, "language": "es"},
                files={"file": (filename, audio_bytes, clean_mime)},
            )
            if 200 <= res.status_code < 300:
                payload = res.json()
                text = (payload.get("text") or "").strip()
                if text:
                    return text, model
                last_error = f"Transcripción vacía devuelta por {model}"
            else:
                last_error = f"{model} -> HTTP {res.status_code}: {res.text[:250]}"
                logger.warning("Fallo transcripción OpenAI (%s)", last_error)

    raise RuntimeError(f"No se pudo transcribir el audio con OpenAI: {last_error}")


def _extract_schedule_heuristic(text_lower: str) -> Optional[str]:
    if "sabado" in text_lower or "sábado" in text_lower:
        if "tarde" in text_lower:
            return "Sábado en la tarde"
        return "Sábado en la mañana"
    if "mañana" in text_lower and "temprano" in text_lower:
        return "Mañana temprano"
    if "mañana" in text_lower:
        return "En la mañana"
    if "tarde" in text_lower:
        return "En la tarde"
    time_match = re.search(
        r"\b(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))\b", text_lower
    )
    if time_match:
        return f"Alrededor de {time_match.group(1)}"
    return None


def _fallback_classify(clean_text: str) -> ClasificacionSolicitudIA:
    text_lower = clean_text.lower()

    org_hits = sum(1 for kw in ORGANIC_KEYWORDS if kw in text_lower)
    rec_hits = sum(1 for kw in RECYCLABLE_KEYWORDS if kw in text_lower)

    requiere_revision = False
    if org_hits > 0 and rec_hits > 0:
        flujo: Literal["organico", "reciclable"] = (
            "organico" if org_hits >= rec_hits else "reciclable"
        )
        requiere_revision = True
        confianza = 0.55
    elif org_hits > 0:
        flujo = "organico"
        confianza = 0.85
    elif rec_hits > 0:
        flujo = "reciclable"
        confianza = 0.85
    else:
        flujo = "reciclable"
        requiere_revision = True
        confianza = 0.4

    tipo_generador: Literal["hogar", "unidad_productiva"] = (
        "unidad_productiva"
        if any(kw in text_lower for kw in PRODUCTIVE_UNIT_KEYWORDS)
        else "hogar"
    )

    addr_match = ADDRESS_PATTERN.search(clean_text)
    direccion_mencionada = addr_match.group(1).strip(" .,-") if addr_match else None

    preferencia_horaria = _extract_schedule_heuristic(text_lower)

    resumen = clean_text.strip()
    if len(resumen) > 180:
        resumen = resumen[:177].rstrip() + "..."
    if len(resumen) < 2:
        resumen = "Solicitud de recolección recibida por WhatsApp"

    return ClasificacionSolicitudIA(
        flujo=flujo,
        tipo_generador=tipo_generador,
        direccion_mencionada=direccion_mencionada,
        resumen_material=resumen,
        preferencia_horaria=preferencia_horaria,
        requiere_revision_flujo=requiere_revision,
        confianza=confianza,
        fuente="heuristica_local",
    )


def classify_whatsapp_request(raw_text: str) -> ClasificacionSolicitudIA:
    """Clasifica el texto/transcripción del pedido usando OpenAI `gpt-4o-mini`
    (Structured Outputs) sin enviar PII innecesario. Si no existe OPENAI_API_KEY
    o hay fallo temporal de red, usa clasificación heurística segura.
    """
    sanitized_text = redact_unnecessary_pii(raw_text)
    api_key = settings.OPENAI_API_KEY.strip()
    if not api_key:
        return _fallback_classify(sanitized_text)

    model = settings.OPENAI_CLASSIFIER_MODEL.strip() or "gpt-4o-mini"
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": sanitized_text},
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "clasificacion_solicitud_ecoconecta",
                "strict": True,
                "schema": CLASSIFICATION_JSON_SCHEMA,
            },
        },
    }

    try:
        with httpx.Client(timeout=20.0) as client:
            res = client.post(url, headers=headers, json=body)
            res.raise_for_status()
            data = res.json()

        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        result = ClasificacionSolicitudIA(
            flujo=parsed["flujo"],
            tipo_generador=parsed["tipo_generador"],
            direccion_mencionada=(
                parsed["direccion_mencionada"].strip()
                if parsed.get("direccion_mencionada")
                else None
            ),
            resumen_material=(parsed.get("resumen_material") or sanitized_text)[:400],
            preferencia_horaria=(
                parsed["preferencia_horaria"].strip()
                if parsed.get("preferencia_horaria")
                else None
            ),
            requiere_revision_flujo=bool(parsed.get("requiere_revision_flujo", False)),
            confianza=max(0.0, min(1.0, float(parsed.get("confianza", 0.9)))),
            fuente=f"openai_{model}",
        )
        return result
    except Exception as exc:
        logger.warning(
            "Fallo OpenAI Structured Outputs (%s); aplicando clasificación heurística de respaldo.",
            exc,
        )
        return _fallback_classify(sanitized_text)
