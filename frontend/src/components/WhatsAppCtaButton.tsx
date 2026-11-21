"use client";

import { ExternalLink, MessageCircle } from "lucide-react";

import {
  buildWhatsAppUrl,
  DEFAULT_WHATSAPP_MESSAGE,
  useWhatsAppPublicNumber,
} from "@/lib/whatsapp";

interface WhatsAppCtaButtonProps {
  label?: string;
  message?: string;
  className?: string;
  size?: "lg" | "md" | "sm";
  variant?: "primary" | "teal" | "nav";
}

export default function WhatsAppCtaButton({
  label = "Pedir Recolección por WhatsApp",
  message = DEFAULT_WHATSAPP_MESSAGE,
  className = "",
  size = "lg",
  variant = "primary",
}: WhatsAppCtaButtonProps) {
  const publicNumber = useWhatsAppPublicNumber();
  const href = buildWhatsAppUrl(publicNumber, message);

  const variantClass =
    variant === "teal"
      ? "bg-reciclaje-600 text-white hover:bg-reciclaje-700"
      : variant === "nav"
        ? "bg-[#15803D] text-white hover:bg-[#166534]"
        : "bg-[#15803D] text-white shadow-md hover:bg-[#166534]";

  const sizeClass =
    size === "lg"
      ? "min-h-[56px] rounded-2xl px-6 py-3.5 text-base font-extrabold sm:text-lg"
      : size === "sm"
        ? "min-h-[40px] rounded-xl px-3.5 py-2 text-xs font-bold sm:text-sm"
        : "min-h-[48px] rounded-xl px-5 py-3 text-sm font-bold sm:text-base";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2.5 transition active:scale-[0.99] ${variantClass} ${sizeClass} ${className}`}
    >
      <MessageCircle className={size === "lg" ? "h-6 w-6 shrink-0" : "h-4 w-4 shrink-0"} />
      <span>{label}</span>
      <ExternalLink className={size === "lg" ? "h-5 w-5 shrink-0 opacity-90" : "h-3.5 w-3.5 shrink-0 opacity-90"} />
    </a>
  );
}
