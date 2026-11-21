"use client";

import { Loader2, Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ListenButtonProps {
  text: string;
  label?: string;
  className?: string;
  variant?: "accent" | "light" | "dark";
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(
  /\/$/,
  ""
);

// Caché local de audios MP3 neuronales para reproducción instantánea sin volver a pedirlos
const clientAudioUrlCache = new Map<string, string>();
const MAX_CLIENT_CACHE = 40;

// Control global para que nunca suenen dos voces al mismo tiempo al cambiar de pregunta
let activeStopCallback: (() => void) | null = null;

function stopAnyOtherAudio(currentStop: () => void) {
  if (activeStopCallback && activeStopCallback !== currentStop) {
    activeStopCallback();
  }
  activeStopCallback = currentStop;
}

function clearActiveAudio(currentStop: () => void) {
  if (activeStopCallback === currentStop) {
    activeStopCallback = null;
  }
}

function selectCalmSpanishVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  const spanishVoices = voices.filter((v) =>
    v.lang.toLowerCase().startsWith("es")
  );
  if (spanishVoices.length === 0) return null;

  const scoreVoice = (v: SpeechSynthesisVoice): number => {
    const name = v.name.toLowerCase();
    const lang = v.lang.toLowerCase();
    let score = 0;

    // Prioriza voces neuronales/naturales sobre las voces robóticas locales
    if (name.includes("natural") || name.includes("neural")) score += 60;
    if (name.includes("online")) score += 35;
    if (name.includes("google")) score += 30;
    if (name.includes("salome") || name.includes("paulina") || name.includes("dalia"))
      score += 25;
    if (lang === "es-co") score += 25;
    else if (lang === "es-419" || lang === "es-mx" || lang === "es-us")
      score += 15;
    else if (lang.startsWith("es")) score += 5;

    if (!v.localService) score += 10;
    return score;
  };

  return [...spanishVoices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
}

function cleanTextForFallbackSpeech(raw: string): string {
  return raw
    .replace(/\b(\d+(?:[.,]\d+)?)\s*kg\b/gi, "$1 kilos")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*lb\b/gi, "$1 libras")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*pts\b/gi, "$1 puntos")
    .replace(/[·—–]/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ListenButton({
  text,
  label = "Escuchar",
  className = "",
  variant = "accent",
}: ListenButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stopRef = useRef<() => void>(() => {});

  const stopPlayback = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignorar errores al detener síntesis del navegador
      }
    }
    clearActiveAudio(stopRef.current);
    setStatus("idle");
  };

  stopRef.current = stopPlayback;

  // Precarga de voces del navegador como respaldo offline
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const synth = window.speechSynthesis;
    const warmUp = () => {
      synth.getVoices();
    };
    warmUp();
    synth.addEventListener?.("voiceschanged", warmUp);
    return () => {
      synth.removeEventListener?.("voiceschanged", warmUp);
      stopRef.current();
    };
  }, []);

  const speakWithBrowserFallback = (spokenText: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      clearActiveAudio(stopRef.current);
      setStatus("idle");
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(
      cleanTextForFallbackSpeech(spokenText)
    );
    utterance.lang = "es-CO";
    utterance.rate = 0.88;
    utterance.pitch = 0.98;

    const bestVoice = selectCalmSpanishVoice(synth.getVoices());
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    }

    utterance.onend = () => {
      clearActiveAudio(stopRef.current);
      setStatus("idle");
    };
    utterance.onerror = () => {
      clearActiveAudio(stopRef.current);
      setStatus("idle");
    };

    setStatus("playing");
    synth.speak(utterance);
  };

  const playMp3Url = async (objectUrl: string) => {
    const audio = new Audio(objectUrl);
    audioRef.current = audio;

    audio.onended = () => {
      audioRef.current = null;
      clearActiveAudio(stopRef.current);
      setStatus("idle");
    };
    audio.onerror = () => {
      audioRef.current = null;
      speakWithBrowserFallback(text);
    };

    await audio.play();
    setStatus("playing");
  };

  const handleToggle = async () => {
    if (status === "playing" || status === "loading") {
      stopPlayback();
      return;
    }

    const cleanKey = text.trim();
    if (!cleanKey) return;

    stopAnyOtherAudio(stopRef.current);

    // 1. Si ya está en caché local, reproduce al instante con voz neuronal humana
    const cachedUrl = clientAudioUrlCache.get(cleanKey);
    if (cachedUrl) {
      try {
        await playMp3Url(cachedUrl);
        return;
      } catch {
        // Si el navegador bloqueó el audio o falló, reintenta abajo
      }
    }

    // 2. Solicita voz neuronal colombiana cálida y pausada al backend (/api/v1/public/tts)
    setStatus("loading");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_BASE}/public/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanKey }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`TTS HTTP ${response.status}`);
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error("Audio vacío");
      }

      if (controller.signal.aborted) {
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      if (clientAudioUrlCache.size >= MAX_CLIENT_CACHE) {
        const oldestKey = clientAudioUrlCache.keys().next().value;
        if (oldestKey) {
          const oldestUrl = clientAudioUrlCache.get(oldestKey);
          if (oldestUrl) URL.revokeObjectURL(oldestUrl);
          clientAudioUrlCache.delete(oldestKey);
        }
      }
      clientAudioUrlCache.set(cleanKey, objectUrl);
      abortRef.current = null;

      await playMp3Url(objectUrl);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      abortRef.current = null;
      // 3. Respaldo automático offline con la mejor voz natural disponible en el navegador
      speakWithBrowserFallback(cleanKey);
    }
  };

  const isActive = status === "playing";
  const isLoading = status === "loading";

  const styleByVariant =
    variant === "dark"
      ? isActive
        ? "border-rose-500 bg-rose-600 text-white"
        : "border-sol-400 bg-sol-400 text-gray-900 hover:bg-sol-500"
      : variant === "light"
        ? isActive
          ? "border-rose-600 bg-rose-700 text-white"
          : "border-huerta-700 bg-white text-huerta-800 hover:bg-huerta-50"
        : isActive
          ? "border-rose-700 bg-rose-700 text-white"
          : "border-sol-600 bg-sol-400 text-gray-900 hover:bg-sol-500";

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      aria-pressed={isActive}
      aria-busy={isLoading}
      aria-label={
        isActive
          ? "Detener lectura en voz alta"
          : isLoading
            ? "Preparando voz tranquila"
            : `${label} en voz alta`
      }
      className={`inline-flex min-h-[56px] shrink-0 items-center justify-center gap-2.5 rounded-2xl border-2 px-5 py-3 text-lg font-extrabold shadow-sm transition active:scale-[0.98] ${styleByVariant} ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-6 w-6 shrink-0 animate-spin" />
          <span>Preparando voz...</span>
        </>
      ) : isActive ? (
        <>
          <Square className="h-5 w-5 shrink-0 fill-current" />
          <span>Detener audio</span>
        </>
      ) : (
        <>
          <Volume2 className="h-6 w-6 shrink-0" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
