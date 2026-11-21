"use client";

import { Leaf, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";

import {
  buildWhatsAppUrl,
  formatWhatsAppDisplayNumber,
  useWhatsAppPublicNumber,
} from "@/lib/whatsapp";

export default function Footer() {
  const whatsappNumber = useWhatsAppPublicNumber();
  const whatsappUrl = buildWhatsAppUrl(whatsappNumber);

  return (
    <footer className="mt-16 border-t-2 border-stone-200 bg-white">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-huerta-600 text-white">
                <Leaf className="h-6 w-6" />
              </span>
              <p className="text-xl font-black text-gray-900">
                EcoConecta – Villas de San Pablo
              </p>
            </div>
            <p className="text-base leading-relaxed text-gray-900">
              Conectamos a tu barrio con los huerteros y recicladores a través
              de WhatsApp.
            </p>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-huerta-600 bg-huerta-50 px-4 py-2 text-base font-extrabold text-huerta-900 transition hover:bg-huerta-100"
              >
                <MessageCircle className="h-5 w-5 shrink-0 text-[#15803D]" />
                <span>
                  WhatsApp: {formatWhatsAppDisplayNumber(whatsappNumber)}
                </span>
              </a>
            ) : (
              <p className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-stone-300 bg-stone-100 px-4 py-2 text-base font-bold text-gray-800">
                <MessageCircle className="h-5 w-5 shrink-0 text-gray-700" />
                <span>WhatsApp oficial pendiente de configurar</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
              <ShieldCheck className="h-5 w-5 text-huerta-700" />
              Privacidad protegida
            </p>
            <p className="text-base leading-relaxed text-gray-900">
              Tu teléfono y dirección solo los ve el coordinador del colectivo.
            </p>
            <div className="flex flex-wrap gap-4 pt-1 text-base font-bold">
              <Link href="/ayuda" className="text-huerta-700 underline">
                Ayuda y Reglas
              </Link>
              <Link href="/coordinacion" className="text-reciclaje-700 underline">
                Acceso Coordinadores
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-sol-400 bg-sol-50 px-5 py-4 text-base font-semibold text-gray-900">
          <strong>Nota sobre puntos y beneficios (RN-06):</strong> Valores de
          puntaje y beneficios referenciales y parametrizables; sujetos a
          validación oficial de la Fundación Santo Domingo.
        </div>
      </div>
    </footer>
  );
}
