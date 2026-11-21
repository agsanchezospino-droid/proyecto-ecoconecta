"use client";

import {
  Apple,
  Ban,
  CheckCircle2,
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
      ? "text-huerta-700"
      : flujo === "reciclable"
        ? "text-reciclaje-700"
        : "text-gray-700";
  const cls = `h-7 w-7 ${color}`;

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
        item.descripcion.toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  return (
    <section
      id="guia"
      className="scroll-mt-24 border-t-2 border-stone-200 bg-white py-12"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 sm:text-3xl">
              Cómo separar tus residuos
            </h2>
            <p className="mt-1 text-lg text-gray-800">
              Guarda aparte lo orgánico y lo reciclable limpio.
            </p>
          </div>
          <ListenButton
            label="Escuchar guía"
            text="Cómo separar tus residuos. Los orgánicos como cáscaras crudas de frutas y verduras, café y hojas secas van para los huerteros. Los reciclables como botellas plásticas, cartón seco, papel, latas y vidrio limpio van para los recicladores."
          />
        </div>

        {/* 2 bloques grandes principales (máx. 2 columnas) */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-huerta-500 bg-huerta-50 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-huerta-600 text-white">
                <Sprout className="h-8 w-8" />
              </span>
              <div>
                <h3 className="text-2xl font-black text-huerta-900">
                  Orgánicos
                </h3>
                <p className="text-base font-bold text-huerta-800">
                  Para los Huerteros
                </p>
              </div>
            </div>
            <p className="mt-4 text-lg leading-relaxed text-gray-900">
              Cáscaras crudas de frutas y verduras, borra de café, cáscaras de
              huevo y hojas secas.
            </p>
            <div className="mt-5">
              <WhatsAppCtaButton
                label="Pedir recogida orgánica"
                size="md"
                variant="primary"
                className="w-full"
              />
            </div>
          </div>

          <div className="rounded-2xl border-2 border-reciclaje-500 bg-reciclaje-50 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-reciclaje-600 text-white">
                <Recycle className="h-8 w-8" />
              </span>
              <div>
                <h3 className="text-2xl font-black text-reciclaje-700">
                  Reciclables
                </h3>
                <p className="text-base font-bold text-reciclaje-700">
                  Para los Recicladores
                </p>
              </div>
            </div>
            <p className="mt-4 text-lg leading-relaxed text-gray-900">
              Botellas plásticas, cartón plano, papel, latas y vidrio limpios y
              secos.
            </p>
            <div className="mt-5">
              <WhatsAppCtaButton
                label="Pedir recogida reciclable"
                size="md"
                variant="teal"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Buscador y filtros grandes */}
        <div className="mt-10 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca un residuo: plátano, botella, cartón, aceite..."
              aria-label="Buscar residuo"
              className="eco-input pl-12"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            {(
              [
                { id: "todos", label: "Todos" },
                { id: "organico", label: "Orgánico" },
                { id: "reciclable", label: "Reciclable" },
                { id: "no_aprovechable", label: "No va aquí" },
              ] as const
            ).map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`min-h-[56px] rounded-2xl border-2 px-5 py-3 text-lg font-extrabold transition ${
                    active
                      ? tab.id === "organico"
                        ? "border-huerta-700 bg-huerta-600 text-white"
                        : tab.id === "reciclable"
                          ? "border-reciclaje-700 bg-reciclaje-600 text-white"
                          : "border-gray-900 bg-gray-900 text-white"
                      : "border-stone-300 bg-stone-50 text-gray-900 hover:bg-stone-100"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tarjetas: MÁXIMO 2 columnas en computador, 1 en celular */}
        {filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center text-lg font-semibold text-gray-800">
            No encontramos ese residuo. Pregunta por WhatsApp y te ayudamos.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="eco-card flex flex-col justify-between p-6"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-100">
                      <ItemIcon name={item.icono} flujo={item.flujo} />
                    </span>
                    <FlujoBadge flujo={item.flujo} />
                  </div>
                  <h3 className="mt-4 text-xl font-black text-gray-900">
                    {item.nombre}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-lg leading-relaxed text-gray-800">
                    {item.descripcion}
                  </p>
                </div>

                <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-stone-50 p-4 text-base font-semibold text-gray-900">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-huerta-700" />
                  <span className="line-clamp-2">{item.buenas_practicas}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
