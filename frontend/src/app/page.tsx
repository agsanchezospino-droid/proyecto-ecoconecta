"use client";

import {
  Award,
  BookOpen,
  CalendarCheck2,
  Leaf,
  Mic,
  Search,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import ListenButton from "@/components/ListenButton";
import { EstadoBadge, FlujoBadge } from "@/components/StatusBadge";
import WasteGuide from "@/components/WasteGuide";
import WhatsAppCtaButton from "@/components/WhatsAppCtaButton";
import { apiFetch } from "@/lib/api";
import {
  formatPts,
  type GuiaResiduo,
  type SolicitudPublicaTrack,
} from "@/lib/types";
import {
  formatWhatsAppDisplayNumber,
  useWhatsAppPublicNumber,
} from "@/lib/whatsapp";

const SIMPLE_STEPS = [
  {
    number: "1",
    text: "Separa lo orgánico de lo reciclable en casa.",
    icon: Leaf,
    color: "bg-huerta-600 text-white",
  },
  {
    number: "2",
    text: "Envía texto o nota de voz por WhatsApp.",
    icon: Mic,
    color: "bg-[#15803D] text-white",
  },
  {
    number: "3",
    text: "Acuerda día y hora con el coordinador.",
    icon: CalendarCheck2,
    color: "bg-reciclaje-600 text-white",
  },
  {
    number: "4",
    text: "Pesamos en kg o libras y sumas puntos.",
    icon: Award,
    color: "bg-sol-500 text-gray-900",
  },
];

const HERO_AUDIO_TEXT =
  "Hola, bienvenido a EcoConecta en Villas de San Pablo. " +
  "Recogemos tu reciclaje y tus residuos orgánicos directamente en tu casa, totalmente gratis por WhatsApp, con mensaje de texto o nota de voz. " +
  "Funciona en cuatro pasos muy sencillos. " +
  "Primero: separa lo orgánico de lo reciclable en casa. " +
  "Segundo: envíanos un mensaje o una nota de voz por WhatsApp. " +
  "Tercero: acuerda el día y la hora con el coordinador. " +
  "Y cuarto: pesamos tus residuos en kilos o libras, y sumas puntos para reclamar beneficios.";

export default function HomePage() {
  const whatsappPublicNumber = useWhatsAppPublicNumber();
  const [guia, setGuia] = useState<GuiaResiduo[]>([]);
  const [trackCode, setTrackCode] = useState("");
  const [trackResult, setTrackResult] = useState<SolicitudPublicaTrack | null>(
    null
  );
  const [trackError, setTrackError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    void apiFetch<GuiaResiduo[]>("/public/guia-residuos", { auth: false })
      .then(setGuia)
      .catch(() => setGuia([]));
  }, []);

  const handleTrack = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = trackCode.trim().toUpperCase();
    if (!cleaned) return;
    setTracking(true);
    setTrackError(null);
    setTrackResult(null);
    try {
      const data = await apiFetch<SolicitudPublicaTrack>(
        `/public/solicitudes/${encodeURIComponent(cleaned)}`,
        { auth: false }
      );
      setTrackResult(data);
    } catch (err) {
      setTrackError(
        err instanceof Error
          ? err.message
          : "No encontramos ningún pedido con ese código."
      );
    } finally {
      setTracking(false);
    }
  };

  return (
    <div className="bg-stone-50">
      {/* SECCIÓN 1: PORTADA LIMPIA Y CALMADA */}
      <section className="border-b-2 border-stone-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-10 text-center sm:px-6 sm:py-16">
          <div className="mb-6 flex justify-center">
            <ListenButton text={HERO_AUDIO_TEXT} label="Escuchar" />
          </div>

          <h1 className="text-3xl font-black leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            Recogemos tu reciclaje y orgánicos en Villas de San Pablo
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-800 sm:text-xl">
            Separa en casa y pide la recogida gratis por WhatsApp, con texto o
            nota de voz.
          </p>

          <div className="mx-auto mt-8 flex max-w-xl flex-col gap-4">
            <WhatsAppCtaButton
              label="Pedir Recolección por WhatsApp"
              size="xl"
              className="w-full"
            />
            {whatsappPublicNumber && (
              <p className="text-lg font-extrabold text-gray-900">
                WhatsApp oficial:{" "}
                <span className="text-huerta-800">
                  {formatWhatsAppDisplayNumber(whatsappPublicNumber)}
                </span>
              </p>
            )}
            <a href="#guia" className="eco-btn-outline w-full">
              <BookOpen className="h-6 w-6 shrink-0" />
              <span>Ver cómo separar</span>
            </a>
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: LOS 4 PASOS ESTILO CATAKI, ULTRA-SIMPLES */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-2xl font-black text-gray-900 sm:text-3xl">
          Cómo funciona en 4 pasos
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {SIMPLE_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <article
                key={step.number}
                className="eco-card flex items-center gap-5 p-6"
              >
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <span
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-black shadow-sm ${step.color}`}
                  >
                    {step.number}
                  </span>
                </div>

                <div className="flex flex-1 items-start gap-3">
                  <Icon className="mt-1 h-7 w-7 shrink-0 text-gray-800" />
                  <p className="text-xl font-bold leading-snug text-gray-900">
                    {step.text}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* SECCIÓN 3: GUÍA CLARA DE SEPARACIÓN (MÁX. 2 COLUMNAS) */}
      <WasteGuide items={guia} />

      {/* SECCIÓN 4: CONSULTA SENCILLA DE CÓDIGO (RN-07 SIN DATOS PERSONALES) */}
      <section className="mx-auto max-w-3xl px-4 pb-6 pt-4 sm:px-6">
        <div className="eco-card p-6 sm:p-8">
          <h2 className="text-2xl font-black text-gray-900">
            ¿Ya pediste por WhatsApp? Consulta tu código
          </h2>
          <p className="mt-2 text-lg text-gray-800">
            Escribe el código que recibiste (ejemplo:{" "}
            <strong className="font-mono">ECO-2026-0002</strong>).
          </p>

          <form
            onSubmit={handleTrack}
            className="mt-5 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={trackCode}
              onChange={(e) => setTrackCode(e.target.value)}
              placeholder="ECO-2026-0002"
              aria-label="Código de pedido"
              className="eco-input uppercase"
            />
            <button
              type="submit"
              disabled={tracking}
              className="eco-btn-primary shrink-0 sm:w-44"
            >
              <Search className="h-6 w-6" />
              <span>Buscar</span>
            </button>
          </form>

          {trackError && (
            <p className="mt-4 rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-lg font-bold text-rose-800">
              {trackError}
            </p>
          )}

          {trackResult && (
            <div className="mt-5 space-y-3 rounded-2xl border-2 border-stone-200 bg-stone-50 p-5 text-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xl font-black text-gray-900">
                  {trackResult.codigo}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <FlujoBadge flujo={trackResult.flujo} />
                  <EstadoBadge estado={trackResult.estado} />
                </div>
              </div>
              <p className="text-gray-900">
                <strong>Atiende:</strong> {trackResult.coordinador_rol_label}
              </p>
              {trackResult.fecha_programada && (
                <p className="font-extrabold text-reciclaje-700">
                  Cita: {trackResult.fecha_programada} ·{" "}
                  {trackResult.hora_programada}
                </p>
              )}
              {trackResult.peso_kg_registrado !== null &&
                trackResult.peso_kg_registrado !== undefined && (
                  <p className="font-extrabold text-huerta-800">
                    Peso:{" "}
                    {trackResult.peso_ingresado != null &&
                    trackResult.unidad_medida
                      ? `${trackResult.peso_ingresado} ${trackResult.unidad_medida}`
                      : `${trackResult.peso_kg_registrado} kg`}{" "}
                    · +{formatPts(trackResult.puntos_otorgados)} puntos
                  </p>
                )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
