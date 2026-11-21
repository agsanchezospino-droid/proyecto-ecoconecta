"use client";

import { MessageCircle } from "lucide-react";

import {
  buildWhatsAppUrl,
  DEFAULT_WHATSAPP_MESSAGE,
  useWhatsAppPublicNumber,
} from "@/lib/whatsapp";

interface WhatsAppCtaButtonProps {
  label?: string;
  message?: string;
  className?: string;
  size?: "xl" | "lg" | "md";
  variant?: "primary" | "teal";
}

export default function WhatsAppCtaButton({
  label = "Pedir Recolección por WhatsApp",
  message = DEFAULT_WHATSAPP_MESSAGE,
  className = "",
  size = "xl",
  variant = "primary",
}: WhatsAppCtaButtonProps) {
  const publicNumber = useWhatsAppPublicNumber();
  const href = buildWhatsAppUrl(publicNumber, message);

  const variantClass =
    variant === "teal"
      ? "bg-reciclaje-600 text-white hover:bg-reciclaje-700"
      : "bg-[#15803D] text-white hover:bg-[#166534]";

  const sizeClass =
    size === "xl"
      ? "min-h-[68px] rounded-2xl px-7 py-4 text-xl font-extrabold shadow-lg sm:text-2xl"
      : size === "lg"
        ? "min-h-[60px] rounded-2xl px-6 py-3.5 text-lg font-extrabold shadow-md sm:text-xl"
        : "min-h-[56px] rounded-2xl px-5 py-3 text-lg font-extrabold shadow-sm";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-3 text-center transition active:scale-[0.99] ${variantClass} ${sizeClass} ${className}`}
    >
      <MessageCircle
        className={size === "xl" ? "h-7 w-7 shrink-0" : "h-6 w-6 shrink-0"}
      />
      <span>{label}</span>
    </a>
  );
}
