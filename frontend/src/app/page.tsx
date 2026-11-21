"use client";

import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarCheck2,
  Gift,
  HelpCircle,
  Leaf,
  Mic,
  Recycle,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Sprout,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import ListenButton from "@/components/ListenButton";
import { EstadoBadge, FlujoBadge } from "@/components/StatusBadge";
import WasteGuide from "@/components/WasteGuide";
import WhatsAppCtaButton from "@/components/WhatsAppCtaButton";
import { apiFetch } from "@/lib/api";
import {
  formatPts,
  type Beneficio,
  type GuiaResiduo,
  type ImpactoPublico,
  type ReglaPuntos,
  type SolicitudPublicaTrack,
} from "@/lib/types";

const STEPS = [
  {
    number: "1",
    title: "Separa tus residuos",
    description:
      "Guarda lo orgánico crudo en un balde para la huerta y los reciclables limpios y secos aparte.",
    icon: Leaf,
    accent: "bg-huerta-100 text-huerta-700",
  },
  {
    number: "2",
    title: "Escribe o envía nota de voz por WhatsApp",
    description:
      "Toca el botón verde para abrir WhatsApp en tu celular. Puedes escribir o mandar un audio contando qué residuos tienes y tu dirección.",
    icon: Mic,
    accent: "bg-reciclaje-100 text-reciclaje-700",
  },
  {
    number: "3",
    title: "Recibe tu código y horario por WhatsApp",
    description:
      "Recibirás al instante tu código ECO-2026-XXXX. El coordinador de huerteros o recicladores te confirmará día y hora.",
    icon: CalendarCheck2,
    accent: "bg-sol-100 text-sol-700",
  },
  {
    number: "4",
    title: "Suma puntos en kg o libras",
    description:
      "Al pesar tu entrega en kilogramos o libras ganas puntos tú y también el huertero o reciclador que realizó la recolección.",
    icon: Award,
    accent: "bg-huerta-100 text-huerta-700",
  },
];

const HERO_AUDIO_TEXT =
  "Bienvenido a EcoConecta Villas de San Pablo en Barranquilla. " +
  "Aquí conectamos tu hogar o negocio con los huerteros comunitarios para residuos orgánicos y con los recicladores de oficio para residuos reciclables. " +
  "Para pedir una recolección, toca el botón verde Pedir Recolección por WhatsApp y envíanos un mensaje de texto o una nota de voz desde tu celular. " +
  "Te responderemos automáticamente con tu código y el coordinador de tu colectivo acordará contigo el día y la hora. " +
  "Por cada kilogramo entregado ganas un punto, y por cada libra ganas medio punto, tanto para tu hogar como para el recolector.";

const STEPS_AUDIO_TEXT =
  "¿Cómo funciona EcoConecta en 4 pasos? " +
  "Paso 1: Separa tus residuos orgánicos crudos en un balde y tus reciclables limpios y secos aparte. " +
  "Paso 2: Toca el botón Pedir Recolección por WhatsApp en tu celular y envía un mensaje o una nota de voz. " +
  "Paso 3: Recibe tu código único por WhatsApp y espera la confirmación de día y hora del coordinador del colectivo. " +
  "Paso 4: Al entregar y pesar el material en kilogramos o libras, sumas puntos tú y el recolector encargado.";

export default function HomePage() {
  const [guia, setGuia] = useState<GuiaResiduo[]>([]);
  const [impacto, setImpacto] = useState<ImpactoPublico | null>(null);
  const [reglas, setReglas] = useState<ReglaPuntos[]>([]);
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
  const [trackCode, setTrackCode] = useState("");
  const [trackResult, setTrackResult] = useState<SolicitudPublicaTrack | null>(
    null
  );
  const [trackError, setTrackError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    void Promise.allSettled([
      apiFetch<GuiaResiduo[]>("/public/guia-residuos", { auth: false }).then(
        setGuia
      ),
      apiFetch<ImpactoPublico>("/public/impacto", { auth: false }).then(
        setImpacto
      ),
      apiFetch<ReglaPuntos[]>("/public/reglas-puntos", { auth: false }).then(
        setReglas
      ),
      apiFetch<Beneficio[]>("/public/beneficios", { auth: false }).then(
        setBeneficios
      ),
    ]);
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
          : "No se encontró ninguna solicitud con ese código."
      );
    } finally {
      setTracking(false);
    }
  };

  const userBenefits = beneficios.filter(
    (b) => b.tipo_destinatario === "usuario"
  );
  const collectorBenefits = beneficios.filter(
    (b) => b.tipo_destinatario === "recolector"
  );

  return (
    <div>
      {/* HERO CATAKI-STYLE INCLUSIVO + BOTÓN ESCUCHAR + ENLACE DIRECTO A APP WHATSAPP */}
      <section className="relative overflow-hidden border-b border-stone-200/80 bg-gradient-to-br from-huerta-50 via-[#FAFAF7] to-sol-50/70">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-huerta-200 bg-white px-3.5 py-1.5 text-xs font-bold text-huerta-700 shadow-sm">
                  <Sparkles className="h-4 w-4 text-sol-500" />
                  Piloto Comunitario · Villas de San Pablo, Barranquilla
                </div>
                <ListenButton text={HERO_AUDIO_TEXT} label="Escuchar" />
              </div>

              <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight text-stone-900 sm:text-5xl">
                Separa tus residuos y{" "}
                <span className="text-huerta-600">
                  pide recolección por WhatsApp
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-700 sm:text-lg">
                Conectamos hogares y unidades productivas con los colectivos de{" "}
                <strong className="text-huerta-700">huerteros</strong>{" "}
                (orgánicos) y{" "}
                <strong className="text-reciclaje-700">recicladores</strong>{" "}
                (reciclables). Sin llenar formularios: abre tu{" "}
                <strong>app móvil de WhatsApp</strong> y envíanos un texto o una{" "}
                <strong>nota de voz</strong>.
              </p>

              {/* CTA PRINCIPAL GRANDE A WHATSAPP MÓVIL REAL */}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <WhatsAppCtaButton
                  label="Pedir Recolección por WhatsApp"
                  size="lg"
                  className="w-full sm:w-auto"
                />
                <Link href="/ayuda" className="eco-btn-amber text-base">
                  <HelpCircle className="h-5 w-5" />
                  Ayuda y Reglamentos
                </Link>
                <Link href="#guia" className="eco-btn-outline text-base">
                  <BookOpen className="h-5 w-5" />
                  Aprender a Separar
                </Link>
              </div>

              {/* Aviso de nota de voz + privacidad */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl border border-huerta-200/90 bg-white/95 p-4 text-sm text-stone-700 shadow-sm">
                  <Mic className="mt-0.5 h-5 w-5 shrink-0 text-huerta-600" />
                  <p className="text-xs leading-relaxed sm:text-sm">
                    <strong>Texto o Nota de Voz:</strong> puedes mandar un audio
                    en WhatsApp diciendo qué residuos tienes y tu manzana/casa.
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-reciclaje-200/90 bg-white/95 p-4 text-sm text-stone-700 shadow-sm">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-reciclaje-600" />
                  <p className="text-xs leading-relaxed sm:text-sm">
                    <strong>Privacidad protegida:</strong> siempre coordinas
                    únicamente con el líder del colectivo correspondiente.
                  </p>
                </div>
              </div>
            </div>

            {/* Right column: Impact + Code Tracker */}
            <div className="space-y-4 lg:col-span-5">
              <div className="eco-card p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-stone-500">
                    Impacto en Villas de San Pablo
                  </h2>
                  <span className="rounded-full bg-huerta-100 px-2.5 py-0.5 text-xs font-bold text-huerta-700">
                    En vivo
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-huerta-50 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-huerta-700">
                      <Sprout className="h-4 w-4" />
                      Orgánicos
                    </div>
                    <p className="mt-1 text-2xl font-black text-huerta-800">
                      {impacto ? `${impacto.kg_organico} kg` : "—"}
                    </p>
                    <p className="text-xs text-stone-600">a la huerta</p>
                  </div>

                  <div className="rounded-2xl bg-reciclaje-50 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-reciclaje-700">
                      <Recycle className="h-4 w-4" />
                      Reciclables
                    </div>
                    <p className="mt-1 text-2xl font-black text-reciclaje-700">
                      {impacto ? `${impacto.kg_reciclable} kg` : "—"}
                    </p>
                    <p className="text-xs text-stone-600">a recicladores</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl bg-sol-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-stone-800">
                    <Scale className="h-4 w-4 text-sol-600" />
                    Total aprovechado
                  </div>
                  <span className="text-lg font-black text-stone-900">
                    {impacto
                      ? `${impacto.total_kg_aprovechados} kg · ${impacto.recolecciones_completadas} entregas`
                      : "Cargando..."}
                  </span>
                </div>
              </div>

              {/* Quick public status lookup by code (RN-07: zero PII) */}
              <div className="eco-card p-5">
                <h3 className="text-sm font-extrabold text-stone-900">
                  Consulta el estado de tu pedido por código
                </h3>
                <p className="mt-1 text-xs text-stone-500">
                  Escribe el código que recibiste en WhatsApp (ej:{" "}
                  <code className="font-bold">ECO-2026-0002</code>). No muestra
                  teléfono ni dirección.
                </p>
                <form onSubmit={handleTrack} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={trackCode}
                    onChange={(e) => setTrackCode(e.target.value)}
                    placeholder="ECO-2026-0002"
                    className="eco-input py-2.5 text-sm uppercase"
                  />
                  <button
                    type="submit"
                    disabled={tracking}
                    className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 text-sm font-bold text-white transition hover:bg-stone-800 disabled:opacity-60"
                  >
                    <Search className="h-4 w-4" />
                    Buscar
                  </button>
                </form>

                {trackError && (
                  <p className="mt-2.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                    {trackError}
                  </p>
                )}

                {trackResult && (
                  <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-sm font-extrabold text-stone-900">
                        {trackResult.codigo}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <FlujoBadge flujo={trackResult.flujo} />
                        <EstadoBadge estado={trackResult.estado} />
                      </div>
                    </div>
                    <p className="mt-2 text-stone-700">
                      <strong>Atiende:</strong>{" "}
                      {trackResult.coordinador_rol_label}
                    </p>
                    {trackResult.fecha_programada && (
                      <p className="mt-1 font-semibold text-reciclaje-700">
                        Cita acordada: {trackResult.fecha_programada} ·{" "}
                        {trackResult.hora_programada}
                      </p>
                    )}
                    {trackResult.peso_kg_registrado !== null &&
                      trackResult.peso_kg_registrado !== undefined && (
                        <p className="mt-1 font-bold text-huerta-700">
                          Registrado:{" "}
                          {trackResult.peso_ingresado != null &&
                          trackResult.unidad_medida
                            ? `${trackResult.peso_ingresado} ${trackResult.unidad_medida} (${trackResult.peso_kg_registrado} kg)`
                            : `${trackResult.peso_kg_registrado} kg`}{" "}
                          · +{formatPts(trackResult.puntos_otorgados)} pts
                        </p>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ¿CÓMO FUNCIONA? — 4 PASOS */}
      <section className="border-b border-stone-200/80 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex rounded-full bg-sol-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sol-700">
              Simple, inclusivo y por WhatsApp
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
              ¿Cómo funciona EcoConecta?
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-base text-stone-600">
              En 4 pasos sencillos tus residuos separados llegan a manos de los
              huerteros o recicladores del barrio usando tu WhatsApp habitual.
            </p>
            <div className="mt-4">
              <ListenButton text={STEPS_AUDIO_TEXT} label="Escuchar pasos" />
            </div>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="relative flex flex-col rounded-2xl border border-stone-200 bg-[#FAFAF7] p-6"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${step.accent}`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="text-3xl font-black text-stone-200">
                      0{step.number}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold text-stone-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* GUÍA VISUAL INTERACTIVA DE RESIDUOS */}
      <WasteGuide items={guia} />

      {/* PUNTOS DUALES, BENEFICIOS POR NIVEL + ACCESO COORDINADORES */}
      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        <div className="rounded-3xl bg-stone-900 p-6 text-white sm:p-10">
          <div className="grid items-start gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sol-500/20 px-3 py-1 text-xs font-bold text-sol-400">
                  <Award className="h-4 w-4" />
                  Puntos Duales y Beneficios por Niveles (RN-05 / RN-06)
                </span>
                <ListenButton
                  variant="dark"
                  label="Escuchar puntos"
                  text="Cada kilogramo que entregas equivale a un punto y cada libra de quinientos gramos equivale a medio punto. Al registrar el peso en el cierre de la recolección, ganan puntos tanto tu hogar o unidad productiva como el huertero o reciclador que realizó la recolección. Los valores de puntaje y beneficios son referenciales y parametrizables, sujetos a validación oficial de la Fundación Santo Domingo."
                />
              </div>
              <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
                Cada kilogramo o libra suma puntos para ti y para quien
                recolecta
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-300">
                Al cerrar la recolección en <code>/coordinacion</code>, el
                sistema acredita puntos simultáneamente al{" "}
                <strong>usuario/hogar</strong> y al{" "}
                <strong>huertero o reciclador encargado</strong> según el peso
                en <strong>kilogramos (kg)</strong> o{" "}
                <strong>libras (lb)</strong>, y te confirma el resultado
                directamente por WhatsApp.
              </p>

              {reglas.length > 0 && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {reglas.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-stone-700 bg-stone-800/80 p-4"
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-sol-400">
                        Flujo {r.flujo}
                      </p>
                      <p className="mt-1 text-base font-extrabold text-white">
                        1 kg = {formatPts(r.puntos_por_kg)} pt · 1 lb ={" "}
                        {formatPts(r.puntos_por_libra)} pts
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {(userBenefits.length > 0 || collectorBenefits.length > 0) && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-huerta-700/60 bg-huerta-900/40 p-4">
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-huerta-200">
                      <Gift className="h-3.5 w-3.5" />
                      Niveles Usuarios
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-stone-200">
                      {userBenefits.map((b) => (
                        <li key={b.id}>
                          <strong>{formatPts(b.puntos_requeridos)} pts:</strong>{" "}
                          {b.nombre}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-reciclaje-700/60 bg-reciclaje-700/20 p-4">
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-reciclaje-200">
                      <Award className="h-3.5 w-3.5" />
                      Niveles Recolectores
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-stone-200">
                      {collectorBenefits.map((b) => (
                        <li key={b.id}>
                          <strong>{formatPts(b.puntos_requeridos)} pts:</strong>{" "}
                          {b.nombre}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <p className="mt-4 text-xs font-medium text-sol-300">
                * Valores de puntaje y beneficios referenciales y
                parametrizables; sujetos a validación oficial de la Fundación
                Santo Domingo.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-stone-700 bg-stone-800 p-6 lg:col-span-5">
              <h3 className="text-lg font-extrabold text-white">
                ¿Listo para entregar tus residuos o gestionar tu colectivo?
              </h3>
              <p className="text-sm text-stone-300">
                Los vecinos solicitan recolección directamente desde su{" "}
                <strong>app móvil de WhatsApp</strong>. Los coordinadores de
                huerteros y recicladores operan los pedidos en tiempo real desde{" "}
                <code>/coordinacion</code>.
              </p>
              <WhatsAppCtaButton
                label="Pedir Recolección por WhatsApp"
                size="md"
                className="mt-1 w-full"
              />
              <Link
                href="/coordinacion"
                className="eco-btn-amber w-full text-sm"
              >
                Abrir Panel de Coordinadores (/coordinacion)
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/ayuda"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-stone-600 px-4 py-2.5 text-sm font-semibold text-stone-200 transition hover:bg-stone-700"
              >
                Centro de Ayuda y Reglamentos (/ayuda)
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-stone-600 px-4 py-2.5 text-sm font-semibold text-stone-200 transition hover:bg-stone-700"
              >
                Iniciar Sesión / Acceso Rápido Demo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
