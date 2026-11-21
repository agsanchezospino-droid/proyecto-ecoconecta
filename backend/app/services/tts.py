from __future__ import annotations

from collections import OrderedDict
import hashlib
import logging
import re

import edge_tts
import httpx

from app.core.config import settings

logger = logging.getLogger("ecoconecta.tts")

MAX_CACHE_ENTRIES = 64
_AUDIO_CACHE: OrderedDict[str, bytes] = OrderedDict()

# Elimina emojis y símbolos decorativos para que la voz lea solo texto natural
_EMOJI_PATTERN = re.compile(
    "["
    "\U0001F300-\U0001F9FF"
    "\U0001FA00-\U0001FAFF"
    "\U00002600-\U000027BF"
    "\u200d\ufe0f"
    "]+",
    flags=re.UNICODE,
)


def normalize_text_for_speech(text: str) -> str:
    """Limpia símbolos y expande abreviaturas para una lectura cálida y natural."""
    cleaned = _EMOJI_PATTERN.sub(" ", text or "")
    cleaned = cleaned.replace("·", ". ").replace("—", ", ").replace("–", ", ")
    cleaned = re.sub(r"\b(\d+(?:[.,]\d+)?)\s*kg\b", r"\1 kilos", cleaned, flags=re.I)
    cleaned = re.sub(r"\b(\d+(?:[.,]\d+)?)\s*lb\b", r"\1 libras", cleaned, flags=re.I)
    cleaned = re.sub(r"\b(\d+(?:[.,]\d+)?)\s*pts\b", r"\1 puntos", cleaned, flags=re.I)
    cleaned = re.sub(r"\bpts\b", "puntos", cleaned, flags=re.I)
    cleaned = re.sub(r"\bkg\b", "kilos", cleaned, flags=re.I)
    cleaned = re.sub(r"\blb\b", "libras", cleaned, flags=re.I)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def _cache_key(text: str, voice: str, rate: str, pitch: str) -> str:
    raw = f"{voice}|{rate}|{pitch}|{text}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _cache_get(key: str) -> bytes | None:
    audio = _AUDIO_CACHE.get(key)
    if audio is not None:
        _AUDIO_CACHE.move_to_end(key)
    return audio


def _cache_set(key: str, audio: bytes) -> None:
    _AUDIO_CACHE[key] = audio
    _AUDIO_CACHE.move_to_end(key)
    while len(_AUDIO_CACHE) > MAX_CACHE_ENTRIES:
        _AUDIO_CACHE.popitem(last=False)


async def _synthesize_edge_tts(
    text: str, voice: str, rate: str, pitch: str
) -> bytes:
    communicate = edge_tts.Communicate(
        text=text,
        voice=voice,
        rate=rate,
        pitch=pitch,
    )
    chunks = bytearray()
    async for chunk in communicate.stream():
        if chunk.get("type") == "audio":
            data = chunk.get("data")
            if data:
                chunks.extend(data)
    if not chunks:
        raise RuntimeError("Edge TTS devolvió audio vacío.")
    return bytes(chunks)


async def _synthesize_openai_tts(text: str) -> bytes:
    url = "https://api.openai.com/v1/audio/speech"
    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY.strip()}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "tts-1",
        "voice": "nova",
        "input": text,
        "response_format": "mp3",
        "speed": 0.9,
    }
    async with httpx.AsyncClient(timeout=25.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        if not response.content:
            raise RuntimeError("OpenAI TTS devolvió audio vacío.")
        return response.content


async def synthesize_speech_mp3(text: str) -> bytes:
    """
    Genera audio MP3 con voz neuronal colombiana, cálida y tranquila.
    1. Usa caché en memoria para respuesta instantánea en lecturas repetidas.
    2. Sintetiza con Microsoft Edge Neural (`es-CO-SalomeNeural`, ritmo pausado).
    3. Si falla y hay OPENAI_API_KEY configurada, usa OpenAI TTS (`nova`) como respaldo.
    """
    normalized = normalize_text_for_speech(text)
    if not normalized:
        raise ValueError("El texto para leer en voz alta no puede estar vacío.")

    voice = settings.TTS_VOICE or "es-CO-SalomeNeural"
    rate = settings.TTS_RATE or "-10%"
    pitch = settings.TTS_PITCH or "-2Hz"

    key = _cache_key(normalized, voice, rate, pitch)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    try:
        audio = await _synthesize_edge_tts(normalized, voice, rate, pitch)
        _cache_set(key, audio)
        return audio
    except Exception as exc:
        logger.warning("Edge TTS falló (%s). Evaluando respaldo...", exc)
        if settings.openai_configured:
            audio = await _synthesize_openai_tts(normalized)
            _cache_set(key, audio)
            return audio
        raise RuntimeError(
            "El servicio de voz neuronal no está disponible en este momento."
        ) from exc
