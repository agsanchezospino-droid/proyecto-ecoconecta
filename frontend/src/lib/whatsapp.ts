"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { PublicConfig } from "@/lib/types";

export const DEFAULT_WHATSAPP_NUMBER = "573235017843";

export const DEFAULT_WHATSAPP_MESSAGE =
  "Hola, quiero pedir una recolección en Villas de San Pablo";

const ENV_WHATSAPP_NUMBER = (
  process.env.NEXT_PUBLIC_WHATSAPP_PUBLIC_NUMBER || DEFAULT_WHATSAPP_NUMBER
).replace(/\D+/g, "");

let cachedPublicNumber: string | null = null;
let inflightPromise: Promise<string> | null = null;

export function sanitizePhoneDigits(phone: string): string {
  return (phone || "").replace(/\D+/g, "");
}

export function formatWhatsAppDisplayNumber(
  phone: string = ENV_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER
): string {
  const digits = sanitizePhoneDigits(phone) || DEFAULT_WHATSAPP_NUMBER;
  if (digits.startsWith("57") && digits.length === 12) {
    return `+57 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return `+${digits}`;
}

export function buildWhatsAppUrl(
  publicNumber: string = ENV_WHATSAPP_NUMBER,
  message: string = DEFAULT_WHATSAPP_MESSAGE
): string {
  const cleanNumber =
    sanitizePhoneDigits(publicNumber) || DEFAULT_WHATSAPP_NUMBER;
  const encoded = encodeURIComponent(message).replace(/%2C/gi, ",");
  return `https://wa.me/${cleanNumber}?text=${encoded}`;
}

export function useWhatsAppPublicNumber(): string {
  const [number, setNumber] = useState<string>(
    cachedPublicNumber || ENV_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER
  );

  useEffect(() => {
    let active = true;
    if (cachedPublicNumber) {
      setNumber(cachedPublicNumber);
      return;
    }
    if (!inflightPromise) {
      inflightPromise = apiFetch<PublicConfig>("/public/config", {
        auth: false,
      })
        .then((cfg) => {
          const clean = sanitizePhoneDigits(cfg.whatsapp_public_number);
          cachedPublicNumber =
            clean || ENV_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER;
          return cachedPublicNumber;
        })
        .catch(() => ENV_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER);
    }
    void inflightPromise.then((resolved) => {
      if (active) setNumber(resolved);
    });
    return () => {
      active = false;
    };
  }, []);

  return number;
}
