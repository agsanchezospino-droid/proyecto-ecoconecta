"use client";

import {
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Leaf,
  Mic,
  Recycle,
  Scale,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import ListenButton from "@/components/ListenButton";
import WhatsAppCtaButton from "@/components/WhatsAppCtaButton";

const FULL_PAGE_AUDIO =
  "Centro de Ayuda y Reglamentos de EcoConecta Villas de San Pablo. " +
  "Para pedir una recolección, toca el botón verde Pedir Recolección por WhatsApp desde tu celular. " +
  "Puedes escribir un mensaje o mandar una nota de voz indicando si tienes residuos orgánicos o reciclables y tu dirección en el barrio. " +
  "Nuestro sistema clasifica tu pedido automáticamente y te responde con un código único. " +
  "Reglas principales: primero, los residuos orgánicos van con el colectivo de huerteros y los reciclables con el colectivo de recicladores de oficio, en bandejas totalmente separadas. " +
  "Segundo, nunca exponemos tu teléfono ni tu dirección públicamente; siempre coordinas únicamente por WhatsApp con el coordinador del colectivo. " +
  "Tercero, al finalizar la recolección se registra el peso en kilogramos o libras. Un kilogramo equivale a un punto y una libra equivale a medio punto, acreditados tanto para tu hogar como para el recolector encargado. " +
  "Estos valores son referenciales y parametrizables, sujetos a validación oficial de la Fundación Santo Domingo.";

const REGLAMENTOS = [
  {
    code: "RN-01",
    title: "Separación estricta de dos flujos",
    icon: Recycle,
    color: "bg-huerta-50 border-huerta-200 text-huerta-800",
    summary:
      "Los residuos orgánicos (cáscaras crudas, borra de café, cáscaras de huevo, hojas secas) los atiende exclusivamente la Coordinación de Huerteros. Los reciclables (plástico PET, cartón, papel, latas, vidrio limpio y seco) los atiende la Coordinación de Recicladores.",
    audio:
      "Regla uno: Separación estricta de dos flujos. Los residuos orgánicos los atiende exclusivamente el colectivo de huerteros para compostaje, y los reciclables limpios y secos los atiende el colectivo de recicladores de oficio.",
  },
  {
    code: "RN-02 y RN-03",
    title: "Coordinación de horario y encargado asignado",
    icon: CalendarClock,
    color: "bg-reciclaje-50 border-reciclaje-200 text-reciclaje-700",
    summary:
      "Ninguna recolección queda programada sin día, hora acordada y un huertero o reciclador del colectivo asignado internamente por el coordinador. Al guardar la programación, recibes una confirmación automática en tu WhatsApp móvil.",
    audio:
      "Reglas dos y tres: Toda recolección programada tiene fecha, hora y un huertero o reciclador asignado internamente por el coordinador, y siempre recibes la confirmación por WhatsApp.",
  },
  {
    code: "RN-04",
    title: "Código único trazable (ECO-2026-XXXX)",
    icon: CheckCircle2,
    color: "bg-sol-50 border-sol-400/50 text-stone-900",
    summary:
      "Cada mensaje o nota de voz que envías por WhatsApp genera automáticamente un código único con historial completo de estados: Recibida, En revisión, Programada y Recolectada.",
    audio:
      "Regla cuatro: Cada pedido enviado por WhatsApp recibe un código único, por ejemplo ECO 2026 0001, con seguimiento paso a paso de su estado.",
  },
  {
    code: "RN-05 y RN-06",
    title: "Pesaje obligatorio (kg / lb) y puntos duales",
    icon: Scale,
    color: "bg-huerta-50 border-huerta-200 text-huerta-800",
    summary:
      "Al cerrar tu entrega, el coordinador registra obligatoriamente el peso en kilogramos (kg) o libras (lb = 500 g). Regla referencial inicial: 1 kg = 1.0 punto y 1 lb = 0.5 puntos, acreditados simultáneamente al hogar/unidad productiva y al recolector encargado.",
    audio:
      "Reglas cinco y seis: Al finalizar la recolección se registra el peso en kilogramos o libras. Un kilogramo suma un punto y una libra suma medio punto, acreditados tanto para tu hogar como para el huertero o reciclador. Los valores son referenciales y sujetos a validación oficial de la Fundación Santo Domingo.",
  },
  {
    code: "RN-07",
    title: "Privacidad e intermediación segura",
    icon: ShieldCheck,
    color: "bg-reciclaje-50 border-reciclaje-200 text-reciclaje-700",
    summary:
      "Tu número de teléfono y tu dirección solo los ve el coordinador del colectivo correspondiente. La consulta pública por código en la página web nunca muestra datos personales ni el contacto del equipo recolector.",
    audio:
      "Regla siete: Tu privacidad está protegida. Tu teléfono y dirección solo los ve el coordinador del colectivo, y nunca aparecen públicamente al consultar un código.",
  },
  {
    code: "RN-08",
    title: "Acompañamiento a hogares y piloto comunitario",
    icon: Users,
    color: "bg-sol-50 border-sol-400/50 text-stone-900",
    summary:
      "Si tu teléfono ya está registrado en el piloto de Villas de San Pablo, el sistema reconoce tu hogar o unidad productiva al instante. Si escribes por primera vez, creamos un perfil básico para que el coordinador verifique tu dirección contigo.",
    audio:
      "Regla ocho: Si ya estás registrado, reconocemos tu hogar o negocio automáticamente por tu número de WhatsApp. Si es tu primera vez, creamos un perfil inicial y el coordinador verifica tu dirección contigo.",
  },
];

const FAQS = [
  {
    q: "¿Puedo pedir la recolección enviando una nota de voz por WhatsApp?",
    a: "¡Sí! No necesitas escribir si prefieres hablar. Solo toca el botón verde para abrir WhatsApp en tu celular, graba una nota de voz contando qué residuos tienes (orgánicos o reciclables), tu manzana/casa y el horario que prefieres. EcoConecta transcribe tu audio automáticamente a español y envía el pedido al coordinador.",
  },
  {
    q: "¿Debo llenar algún formulario o usar un chat dentro de la página web?",
    a: "No. Todas las solicitudes se realizan exclusivamente desde tu aplicación móvil real de WhatsApp. Esta página web es para consultar la guía de separación, los reglamentos, tus puntos acumulados y el estado de tu código.",
  },
  {
    q: "¿Qué pasa si mezclé residuos orgánicos y reciclables o el mensaje no quedó claro?",
    a: "Lo ideal es entregarlos siempre por separado (orgánicos crudos en balde aparte, reciclables limpios y secos aparte). Si el pedido llega al colectivo equivocado, el coordinador tiene un botón para moverlo de inmediato entre Orgánicos y Reciclables y te llegará el aviso a tu WhatsApp.",
  },
  {
    q: "¿Qué pasa si es la primera vez que escribo desde mi celular?",
    a: "El sistema registra automáticamente tu teléfono y tu nombre de WhatsApp como 'Pendiente de completar datos' y te entrega tu código de solicitud. El coordinador verificará tu manzana y casa contigo por WhatsApp para completar tu perfil.",
  },
  {
    q: "¿Cómo sé cuántos puntos gané después de la recolección?",
    a: "Cuando el coordinador registra el peso final (en kilogramos o libras) y cierra el servicio, recibes un mensaje automático en tu WhatsApp confirmando el peso exacto y los puntos acreditados. También puedes consultar tu saldo en 'Mis Puntos y Beneficios'.",
  },
];

export default function AyudaPage() {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {/* HEADER INCLUSIVO CATAKI-STYLE */}
      <section className="rounded-3xl border-2 border-huerta-200 bg-gradient-to-br from-huerta-50 via-white to-sol-50/80 p-6 shadow-sm sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-huerta-100 px-3.5 py-1 text-xs font-extrabold text-huerta-800">
            <HelpCircle className="h-4 w-4" />
            Centro de Ayuda y Reglamentos · Villas de San Pablo
          </span>
          <ListenButton text={FULL_PAGE_AUDIO} label="Escuchar toda la guía" />
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-900 sm:text-4xl">
          Todo lo que necesitas saber para usar{" "}
          <span className="text-huerta-600">EcoConecta por WhatsApp</span>
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-700">
          Diseñado para que cualquier vecino, familia o unidad productiva de
          Villas de San Pablo pueda entregar sus residuos aprovechables de forma
          clara, gratuita y segura usando solo su{" "}
          <strong>app móvil de WhatsApp</strong> (por texto o nota de voz).
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <WhatsAppCtaButton
            label="Pedir Recolección por WhatsApp"
            size="lg"
            className="w-full sm:w-auto"
          />
          <Link href="/#guia" className="eco-btn-outline text-base">
            <BookOpen className="h-5 w-5" />
            Ver Guía Visual de Residuos
          </Link>
        </div>
      </section>

      {/* CÓMO PEDIR POR WHATSAPP (TEXTO O AUDIO) */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-stone-900">
              ¿Cómo hacer tu pedido desde tu celular?
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              No necesitas instalar nada nuevo: usa tu WhatsApp de siempre.
            </p>
          </div>
          <ListenButton
            variant="compact"
            label="Escuchar"
            text="Paso uno: toca el botón verde Pedir Recolección por WhatsApp. Paso dos: envía un mensaje de texto o una nota de voz contando qué residuos tienes, tu manzana y casa, y en qué horario te sirve. Paso tres: recibe automáticamente tu código ECO 2026 y espera la confirmación del coordinador por WhatsApp."
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="eco-card border-2 border-huerta-200 p-5">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-huerta-600 text-lg font-black text-white">
              1
            </span>
            <h3 className="mt-3 text-base font-extrabold text-stone-900">
              Abre WhatsApp con un toque
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
              Toca el botón verde <strong>Pedir Recolección por WhatsApp</strong>{" "}
              para abrir directamente la conversación oficial de EcoConecta en
              tu celular.
            </p>
          </div>

          <div className="eco-card border-2 border-reciclaje-200 p-5">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-reciclaje-600 text-white">
              <Mic className="h-6 w-6" />
            </span>
            <h3 className="mt-3 text-base font-extrabold text-stone-900">
              Escribe o manda una nota de voz
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
              Dinos qué residuos tienes (orgánicos o reciclables), tu dirección
              (Manzana y Casa) y si prefieres mañana o tarde.{" "}
              <strong>¡Las notas de voz se transcriben automáticamente!</strong>
            </p>
          </div>

          <div className="eco-card border-2 border-sol-400/60 p-5">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sol-500 text-lg font-black text-stone-950">
              3
            </span>
            <h3 className="mt-3 text-base font-extrabold text-stone-900">
              Recibe código, cita y puntos
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
              Recibes tu código <code>ECO-2026-XXXX</code>, el coordinador
              acuerda contigo el horario y al finalizar te confirmamos por
              WhatsApp el peso (kg o lb) y tus puntos ganados.
            </p>
          </div>
        </div>
      </section>

      {/* QUÉ SE ENTREGA EN CADA COLECTIVO */}
      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border-2 border-huerta-200 bg-huerta-50/70 p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-huerta-600 text-white">
                <Sprout className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-lg font-black text-huerta-900">
                  Orgánicos → Huerteros
                </h3>
                <p className="text-xs font-bold text-huerta-700">
                  Compostaje y abono comunitario
                </p>
              </div>
            </div>
            <ListenButton
              variant="compact"
              label="Escuchar"
              text="Residuos orgánicos para los huerteros: sí recibimos cáscaras crudas de frutas y verduras, borra de café, cáscaras de huevo y hojas secas en balde con tapa. No incluir carnes cocidas, huesos grandes, aceite quemado ni plásticos."
            />
          </div>
          <ul className="mt-4 space-y-2 text-sm text-stone-800">
            <li className="flex items-start gap-2">
              <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-huerta-600" />
              <span>
                <strong>SÍ:</strong> Cáscaras crudas de plátano, yuca, frutas y
                verduras, borra de café, cáscaras de huevo y hojas secas.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sol-600" />
              <span>
                <strong>NO:</strong> Carnes cocidas, huesos grandes, aceite de
                fritura, bolsas plásticas ni servilletas con grasa.
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border-2 border-reciclaje-200 bg-reciclaje-50/70 p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-reciclaje-600 text-white">
                <Recycle className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-lg font-black text-reciclaje-700">
                  Reciclables → Recicladores
                </h3>
                <p className="text-xs font-bold text-reciclaje-600">
                  Aprovechamiento limpio y seco
                </p>
              </div>
            </div>
            <ListenButton
              variant="compact"
              label="Escuchar"
              text="Residuos reciclables para los recicladores de oficio: sí recibimos botellas plásticas PET, cajas de cartón planas, papel, cuadernos, latas de aluminio y frascos de vidrio limpios y secos. No entregar cartón con grasa, papel higiénico ni pañales."
            />
          </div>
          <ul className="mt-4 space-y-2 text-sm text-stone-800">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-reciclaje-600" />
              <span>
                <strong>SÍ:</strong> Botellas PET enjuagadas y aplastadas,
                cartón seco y plano, cuadernos, latas y frascos de vidrio.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sol-600" />
              <span>
                <strong>NO:</strong> Cartón mojado o con grasa, icopor sucio,
                papel higiénico, pañales ni residuos sanitarios.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* REGLAMENTO COMUNITARIO (RN-01 a RN-08) */}
      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-200 px-3 py-1 text-xs font-bold uppercase text-stone-700">
              Reglamento Operativo
            </span>
            <h2 className="mt-2 text-2xl font-black text-stone-900">
              Reglas de funcionamiento y cuidado comunitario
            </h2>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {REGLAMENTOS.map((rule) => {
            const Icon = rule.icon;
            return (
              <article
                key={rule.code}
                className={`rounded-2xl border-2 p-5 ${rule.color}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider opacity-75">
                        {rule.code}
                      </span>
                      <h3 className="text-base font-extrabold text-stone-900">
                        {rule.title}
                      </h3>
                    </div>
                  </div>
                  <ListenButton
                    variant="compact"
                    label="Escuchar"
                    text={rule.audio}
                  />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-stone-700">
                  {rule.summary}
                </p>
              </article>
            );
          })}
        </div>

        {/* Nota institucional obligatoria RN-06 */}
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-sol-400/60 bg-sol-50 p-4 text-xs font-semibold text-stone-800 sm:text-sm">
          <Award className="mt-0.5 h-5 w-5 shrink-0 text-sol-600" />
          <p>
            <strong>Nota institucional sobre puntos y beneficios (RN-06):</strong>{" "}
            Valores de puntaje y beneficios referenciales y parametrizables (
            <code>1 kg = 1.0 punto</code>, <code>1 lb = 0.5 puntos</code>);
            sujetos a validación oficial de la Fundación Santo Domingo.
          </p>
        </div>
      </section>

      {/* PREGUNTAS FRECUENTES */}
      <section className="mt-12">
        <h2 className="text-2xl font-black text-stone-900">
          Preguntas frecuentes
        </h2>
        <div className="mt-4 space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={item.q}
                className="eco-card overflow-hidden transition"
              >
                <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="flex flex-1 items-center justify-between gap-3 text-left"
                  >
                    <span className="text-base font-extrabold text-stone-900">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-stone-500 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <ListenButton
                    variant="compact"
                    label="Escuchar"
                    text={`${item.q}. ${item.a}`}
                  />
                </div>
                {isOpen && (
                  <div className="border-t border-stone-100 bg-stone-50/70 px-4 py-4 text-sm leading-relaxed text-stone-700 sm:px-5">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mt-12 rounded-3xl bg-stone-900 p-6 text-center text-white sm:p-10">
        <h2 className="text-2xl font-black">
          ¿Ya tienes tus residuos separados?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-stone-300">
          Toca el botón verde para abrir tu aplicación móvil de WhatsApp y
          enviar tu solicitud por texto o nota de voz.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <WhatsAppCtaButton
            label="Pedir Recolección por WhatsApp"
            size="lg"
            className="w-full sm:w-auto"
          />
          <Link
            href="/"
            className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-stone-600 px-6 text-sm font-bold text-stone-200 transition hover:bg-stone-800"
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </div>
  );
}
