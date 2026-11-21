"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { PublicConfig } from "@/lib/types";

export const DEFAULT_WHATSAPP_MESSAGE =
  "Hola, quiero pedir una recolección en Villas de San Pablo";

const ENV_WHATSAPP_NUMBER = (
  process.env.NEXT_PUBLIC_WHATSAPP_PUBLIC_NUMBER || "573000000000"
).replace(/\D+/g, "");

let cachedPublicNumber: string | null = null;
let inflightPromise: Promise<string> | null = null;

export function sanitizePhoneDigits(phone: string): string {
  return (phone || "").replace(/\D+/g, "");
}

export function buildWhatsAppUrl(
  publicNumber: string = ENV_WHATSAPP_NUMBER,
  message: string = DEFAULT_WHATSAPP_MESSAGE
): string {
  const cleanNumber = sanitizePhoneDigits(publicNumber) || "573000000000";
  const encoded = encodeURIComponent(message).replace(/%2C/gi, ",");
  return `https://wa.me/${cleanNumber}?text=${encoded}`;
}

export function useWhatsAppPublicNumber(): string {
  const [number, setNumber] = useState<string>(
    cachedPublicNumber || ENV_WHATSAPP_NUMBER || "573000000000"
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
          cachedPublicNumber = clean || ENV_WHATSAPP_NUMBER || "573000000000";
          return cachedPublicNumber;
        })
        .catch(() => ENV_WHATSAPP_NUMBER || "573000000000");
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
