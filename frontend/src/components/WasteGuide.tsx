"use client";

import {
  Apple,
  Ban,
  CheckCircle2,
  Clock,
  Coffee,
  CupSoda,
  FileText,
  Leaf,
  Milk,
  Package,
  Recycle,
  Search,
  Sprout,
  Wine,
} from "lucide-react";
import { useMemo, useState } from "react";

import ListenButton from "@/components/ListenButton";
import { FlujoBadge } from "@/components/StatusBadge";
import WhatsAppCtaButton from "@/components/WhatsAppCtaButton";
import type { GuiaResiduo } from "@/lib/types";

function ItemIcon({ name, flujo }: { name: string; flujo: string }) {
  const color =
    flujo === "organico"
      ? "text-huerta-600"
      : flujo === "reciclable"
        ? "text-reciclaje-600"
        : "text-stone-500";
  const cls = `h-6 w-6 ${color}`;

  switch (name) {
    case "apple":
      return <Apple className={cls} />;
    case "coffee":
      return <Coffee className={cls} />;
    case "sprout":
      return <Sprout className={cls} />;
    case "leaf":
      return <Leaf className={cls} />;
    case "milk":
      return <Milk className={cls} />;
    case "package":
      return <Package className={cls} />;
    case "file-text":
      return <FileText className={cls} />;
    case "cup-soda":
      return <CupSoda className={cls} />;
    case "wine":
      return <Wine className={cls} />;
    default:
      return <Ban className={cls} />;
  }
}

export default function WasteGuide({ items }: { items: GuiaResiduo[] }) {
  const [filter, setFilter] = useState<
    "todos" | "organico" | "reciclable" | "no_aprovechable"
  >("todos");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "todos" && item.flujo !== filter) return false;
      if (!q) return true;
      return (
        item.nombre.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q) ||
        item.descripcion.toLowerCase().includes(q) ||
        item.buenas_practicas.toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  return (
    <section id="guia" className="scroll-mt-20 py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-huerta-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-huerta-700">
              Guía visual de separación
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
              ¿Orgánico o Reciclable? Aprende a separar en segundos
            </h2>
            <p className="mt-2 text-base text-stone-600">
              Busca cualquier residuo cotidiano para saber a qué colectivo de
              Villas de San Pablo entregarlo, cómo prepararlo y sus horarios de
              referencia.
            </p>
          </div>
          <ListenButton
            label="Escuchar guía"
            text="Guía visual de separación. Los residuos orgánicos como cáscaras crudas de frutas y verduras, borra de café, cáscaras de huevo y hojas secas van al colectivo de huerteros. Los residuos reciclables como botellas plásticas, cartón seco, papel, latas y vidrio limpio van al colectivo de recicladores de oficio. El papel higiénico, pañales, servilletas grasosas y restos cocidos van en bolsa negra al aseo ordinario."
          />
        </div>

        {/* Two main flow cards (Cataki-style clarity) */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-huerta-200 bg-huerta-50/70 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-huerta-600 text-white shadow-sm">
                  <Sprout className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-huerta-800">
                    Residuos Orgánicos
                  </h3>
                  <p className="text-sm font-semibold text-huerta-700">
                    Colectivo de Huerteros · Compostaje comunitario
                  </p>
                </div>
              </div>
              <ListenButton
                variant="compact"
                label="Escuchar"
                text="Residuos orgánicos para el colectivo de huerteros: cáscaras crudas de frutas y verduras, borra de café, cáscaras de huevo y hojas secas. Horario de referencia: martes y viernes de 7 a 11 de la mañana."
              />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-stone-700">
              Cáscaras crudas de frutas y verduras, borra de café, cáscaras de
              huevo y hojas secas. Se convierten en abono vivo para la huerta de
              Villas de San Pablo.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-huerta-200/80 pt-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-huerta-800">
                <Clock className="h-4 w-4" />
                Ref: Mar y Vie · 7:00 – 11:00 a.m.
              </span>
              <WhatsAppCtaButton
                label="Pedir por WhatsApp"
                size="sm"
                variant="primary"
              />
            </div>
          </div>

          <div className="rounded-2xl border-2 border-reciclaje-200 bg-reciclaje-50/80 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-reciclaje-600 text-white shadow-sm">
                  <Recycle className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-reciclaje-700">
                    Residuos Reciclables
                  </h3>
                  <p className="text-sm font-semibold text-reciclaje-600">
                    Colectivo de Recicladores de Oficio
                  </p>
                </div>
              </div>
              <ListenButton
                variant="compact"
                label="Escuchar"
                text="Residuos reciclables para el colectivo de recicladores de oficio: botellas PET, cartón plano, papel, latas de aluminio y frascos de vidrio limpios y secos. Horario de referencia: lunes, miércoles y sábados de 8 de la mañana a 4 de la tarde."
              />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-stone-700">
              Botellas PET, cartón plano, papel, latas de aluminio y frascos de
              vidrio <strong>limpios y secos</strong>. Apoya directamente el
              sustento de los recicladores del barrio.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-reciclaje-200/80 pt-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-reciclaje-700">
                <Clock className="h-4 w-4" />
                Ref: Lun, Mié y Sáb · 8:00 a.m. – 4:00 p.m.
              </span>
              <WhatsAppCtaButton
                label="Pedir por WhatsApp"
                size="sm"
                variant="teal"
              />
            </div>
          </div>
        </div>

        {/* Interactive search & filter controls */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: plátano, botella PET, cartón, café, aceite..."
              className="eco-input pl-11"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "todos", label: "Todos" },
                { id: "organico", label: "Orgánico" },
                { id: "reciclable", label: "Reciclable" },
                { id: "no_aprovechable", label: "No aprovechable" },
              ] as const
            ).map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`min-h-[42px] rounded-xl px-4 py-2 text-sm font-bold transition ${
                    active
                      ? tab.id === "organico"
                        ? "bg-huerta-600 text-white"
                        : tab.id === "reciclable"
                          ? "bg-reciclaje-600 text-white"
                          : "bg-stone-900 text-white"
                      : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-600">
            No encontramos ese residuo en la guía. Si tienes dudas, envíanos un
            mensaje o nota de voz por WhatsApp y el coordinador te orientará.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <article
                key={item.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                  item.flujo === "organico"
                    ? "border-huerta-200/80"
                    : item.flujo === "reciclable"
                      ? "border-reciclaje-200/80"
                      : "border-stone-200"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        item.flujo === "organico"
                          ? "bg-huerta-50"
                          : item.flujo === "reciclable"
                            ? "bg-reciclaje-50"
                            : "bg-stone-100"
                      }`}
                    >
                      <ItemIcon name={item.icono} flujo={item.flujo} />
                    </span>
                    <FlujoBadge flujo={item.flujo} />
                  </div>
                  <h3 className="mt-3 text-base font-extrabold text-stone-900">
                    {item.nombre}
                  </h3>
                  <p className="mt-1 text-sm text-stone-600">
                    {item.descripcion}
                  </p>
                </div>

                <div className="mt-4 space-y-2 border-t border-stone-100 pt-3">
                  <div className="flex items-start gap-2 rounded-xl bg-stone-50 p-2.5 text-xs text-stone-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-huerta-600" />
                    <span>
                      <strong>Buena práctica:</strong> {item.buenas_practicas}
                    </span>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {item.horario_referencia}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
