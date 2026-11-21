"use client";

import { Square, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ListenButtonProps {
  text: string;
  label?: string;
  className?: string;
  variant?: "light" | "dark" | "compact";
}

export default function ListenButton({
  text,
  label = "Escuchar",
  className = "",
  variant = "light",
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
    utterance.rate = 0.96;

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

  const baseStyle =
    variant === "dark"
      ? speaking
        ? "border-sol-400 bg-sol-400 text-stone-950"
        : "border-stone-600 bg-stone-800 text-white hover:bg-stone-700"
      : variant === "compact"
        ? speaking
          ? "border-sol-500 bg-sol-400 text-stone-950"
          : "border-stone-300 bg-white text-stone-800 hover:border-huerta-500 hover:bg-huerta-50"
        : speaking
          ? "border-sol-500 bg-sol-400 text-stone-950 shadow-sm"
          : "border-huerta-300 bg-white text-huerta-800 shadow-sm hover:bg-huerta-50";

  const sizeStyle =
    variant === "compact"
      ? "min-h-[38px] px-3 py-1.5 text-xs"
      : "min-h-[44px] px-4 py-2 text-sm";

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={speaking}
      aria-label={speaking ? "Detener lectura en voz alta" : `${label} en voz alta`}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border-2 font-bold transition active:scale-[0.98] ${baseStyle} ${sizeStyle} ${className}`}
    >
      {speaking ? (
        <>
          <Square className="h-4 w-4 fill-current" />
          <span>Detener audio</span>
        </>
      ) : (
        <>
          <Volume2 className="h-4 w-4" />
          <span aria-hidden="true">🔊</span>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
