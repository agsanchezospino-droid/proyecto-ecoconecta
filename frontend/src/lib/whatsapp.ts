"use client";

import { useEffect } from "react";

export const DEFAULT_WHATSAPP_MESSAGE =
  "Hola, quiero pedir una recolección en Villas de San Pablo";

const RAW_PUBLIC_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_PUBLIC_NUMBER || "";

let warnedMissingNumber = false;

export function sanitizePhoneDigits(phone: string): string {
  return (phone || "").replace(/\D+/g, "");
}

export function getConfiguredWhatsAppNumber(): string {
  return sanitizePhoneDigits(RAW_PUBLIC_NUMBER);
}

export function formatWhatsAppDisplayNumber(phone: string): string {
  const digits = sanitizePhoneDigits(phone);
  if (!digits) return "";
  if (digits.startsWith("57") && digits.length === 12) {
    return `+57 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return `+${digits}`;
}

export function buildWhatsAppUrl(
  publicNumber: string = getConfiguredWhatsAppNumber(),
  message: string = DEFAULT_WHATSAPP_MESSAGE
): string | null {
  const cleanNumber = sanitizePhoneDigits(publicNumber);
  if (!cleanNumber) {
    return null;
  }
  const encoded = encodeURIComponent(message).replace(/%2C/gi, ",");
  return `https://wa.me/${cleanNumber}?text=${encoded}`;
}

/**
 * Lee exclusivamente NEXT_PUBLIC_WHATSAPP_PUBLIC_NUMBER.
 * Si aún no está configurada, emite un aviso limpio en consola sin romper la interfaz.
 */
export function useWhatsAppPublicNumber(): string {
  const number = getConfiguredWhatsAppNumber();

  useEffect(() => {
    if (!number && !warnedMissingNumber) {
      warnedMissingNumber = true;
      console.warn(
        "[EcoConecta] NEXT_PUBLIC_WHATSAPP_PUBLIC_NUMBER no está configurada. " +
          "Define el número oficial de WhatsApp Business en tu .env o panel de despliegue para activar el botón de WhatsApp."
      );
    }
  }, [number]);

  return number;
}
