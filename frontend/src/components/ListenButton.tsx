"use client";

import { Square, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ListenButtonProps {
  text: string;
  label?: string;
  className?: string;
  variant?: "accent" | "light" | "dark";
}

export default function ListenButton({
  text,
  label = "Escuchar",
  className = "",
  variant = "accent",
}: ListenButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    return () => {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignorar errores al desmontar
      }
    };
  }, []);

  const handleToggle = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-CO";
    utterance.rate = 0.92;

    const voices = synth.getVoices();
    const spanishVoice =
      voices.find((v) => v.lang.toLowerCase() === "es-co") ||
      voices.find((v) => v.lang.toLowerCase().startsWith("es-419")) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("es"));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    synth.speak(utterance);
  };

  if (!supported) {
    return null;
  }

  const styleByVariant =
    variant === "dark"
      ? speaking
        ? "border-rose-500 bg-rose-600 text-white"
        : "border-sol-400 bg-sol-400 text-gray-900 hover:bg-sol-500"
      : variant === "light"
        ? speaking
          ? "border-rose-600 bg-rose-700 text-white"
          : "border-huerta-700 bg-white text-huerta-800 hover:bg-huerta-50"
        : speaking
          ? "border-rose-700 bg-rose-700 text-white"
          : "border-sol-600 bg-sol-400 text-gray-900 hover:bg-sol-500";

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={speaking}
      aria-label={speaking ? "Detener lectura en voz alta" : `${label} en voz alta`}
      className={`inline-flex min-h-[56px] shrink-0 items-center justify-center gap-2.5 rounded-2xl border-2 px-5 py-3 text-lg font-extrabold shadow-sm transition active:scale-[0.98] ${styleByVariant} ${className}`}
    >
      {speaking ? (
        <>
          <Square className="h-5 w-5 fill-current" />
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
