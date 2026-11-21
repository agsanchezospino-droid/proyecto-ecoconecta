"use client";

import { HeartHandshake, Leaf, Shield } from "lucide-react";
import Link from "next/link";

import {
  buildWhatsAppUrl,
  DEFAULT_WHATSAPP_MESSAGE,
  useWhatsAppPublicNumber,
} from "@/lib/whatsapp";

export default function Footer() {
  const publicNumber = useWhatsAppPublicNumber();
  const whatsappHref = buildWhatsAppUrl(publicNumber, DEFAULT_WHATSAPP_MESSAGE);

  return (
    <footer className="mt-16 border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-huerta-600 text-white">
                <Leaf className="h-5 w-5" />
              </span>
              <div>
                <p className="font-extrabold text-stone-900">
                  EcoConecta – Villas de San Pablo
                </p>
                <p className="text-xs text-stone-500">Barranquilla, Colombia</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              Conectando hogares y unidades productivas con los colectivos
              comunitarios de huerteros y recicladores de oficio a través de la
              app móvil real de WhatsApp.
            </p>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800">
              <Shield className="h-4 w-4 text-huerta-600" />
              Privacidad e Intermediación
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Toda la coordinación se realiza únicamente por WhatsApp con el
              líder del colectivo correspondiente (orgánicos o reciclables). Tu
              teléfono y dirección se protegen y jamás se exponen públicamente.
            </p>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800">
              <HeartHandshake className="h-4 w-4 text-sol-600" />
              Accesos rápidos
            </h3>
            <ul className="mt-2 space-y-2 text-sm font-medium text-stone-700">
              <li>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#15803D] hover:underline"
                >
                  Pedir Recolección por WhatsApp
                </a>
              </li>
              <li>
                <Link href="/ayuda" className="hover:text-huerta-600">
                  Centro de Ayuda y Reglamentos (/ayuda)
                </Link>
              </li>
              <li>
                <Link href="/#guia" className="hover:text-huerta-600">
                  Guía interactiva de separación
                </Link>
              </li>
              <li>
                <Link href="/mis-puntos" className="hover:text-huerta-600">
                  Mis Puntos y Beneficios
                </Link>
              </li>
              <li>
                <Link
                  href="/coordinacion"
                  className="font-semibold text-reciclaje-700 hover:underline"
                >
                  Panel operativo de coordinadores (/coordinacion)
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-sol-400/40 bg-sol-50 px-4 py-3 text-xs font-medium text-stone-700">
          <strong>Nota sobre puntos y beneficios (RN-06):</strong> Valores de
          puntaje y beneficios referenciales y parametrizables; sujetos a
          validación oficial de la Fundación Santo Domingo.
        </div>

        <p className="mt-6 text-center text-xs text-stone-500">
          EcoConecta · Villas de San Pablo · Recepción oficial por WhatsApp
          Business Cloud API.
        </p>
      </div>
    </footer>
  );
}
