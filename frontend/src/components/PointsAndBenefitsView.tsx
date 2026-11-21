"use client";

import {
  Award,
  CheckCircle2,
  Gift,
  History,
  Loader2,
  Lock,
  Sparkles,
  Sprout,
} from "lucide-react";
import { useState } from "react";

import ListenButton from "@/components/ListenButton";
import { FlujoBadge } from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import { formatPts, type Beneficio, type MiResumenPuntos } from "@/lib/types";

interface Props {
  data: MiResumenPuntos;
  onRefresh: () => Promise<void>;
}

function formatDateLong(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function PointsAndBenefitsView({ data, onRefresh }: Props) {
  const [redeemingId, setRedeemingId] = useState<number | null>(null);
  const [notesById, setNotesById] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const handleRedeem = async (beneficio: Beneficio) => {
    setFeedback(null);
    setRedeemingId(beneficio.id);
    try {
      await apiFetch("/solicitudes/mias/canjes", {
        method: "POST",
        body: JSON.stringify({
          beneficio_id: beneficio.id,
          observaciones: notesById[beneficio.id]?.trim() || null,
        }),
      });
      setNotesById((prev) => ({ ...prev, [beneficio.id]: "" }));
      setFeedback({
        type: "ok",
        text: `¡Listo! Reclamaste "${beneficio.nombre}" (-${formatPts(
          beneficio.puntos_requeridos
        )} puntos). Tu saldo ya se actualizó.`,
      });
      await onRefresh();
    } catch (err) {
      setFeedback({
        type: "err",
        text:
          err instanceof Error
            ? err.message
            : "No se pudo registrar el reclamo del beneficio.",
      });
    } finally {
      setRedeemingId(null);
    }
  };

  const progreso = data.progreso_nivel;
  const progresoTexto = progreso.siguiente_beneficio_id
    ? `Te faltan ${formatPts(progreso.puntos_faltantes)} puntos para reclamar: ${progreso.siguiente_nivel_nombre}.`
    : "¡Felicitaciones! Ya alcanzaste el nivel máximo de beneficios.";

  return (
    <div className="space-y-8">
      {/* Resumen de puntos y barra de progreso */}
      <section className="rounded-3xl border-2 border-huerta-500 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-huerta-700 px-4 py-1.5 text-base font-extrabold text-white">
              <Sprout className="h-5 w-5" />
              Nivel actual: {progreso.nivel_actual}
            </span>
            <h2 className="mt-4 text-3xl font-black text-gray-900 sm:text-4xl">
              {formatPts(data.puntos_disponibles)} puntos disponibles
            </h2>
            <p className="mt-2 text-lg text-gray-900">
              1 kilo = 1 punto · 1 libra = medio punto (0.5)
            </p>
          </div>

          <ListenButton
            text={`Tienes ${formatPts(
              data.puntos_disponibles
            )} puntos disponibles. Tu nivel actual es ${
              progreso.nivel_actual
            }. ${progresoTexto}`}
            label="Escuchar"
          />
        </div>

        <div className="mt-6">
          <div
            className="h-5 w-full overflow-hidden rounded-full border border-stone-300 bg-stone-100"
            role="progressbar"
            aria-valuenow={Math.round(progreso.porcentaje_avance)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-huerta-600 transition-all duration-500"
              style={{
                width: `${Math.min(
                  Math.max(progreso.porcentaje_avance, 5),
                  100
                )}%`,
              }}
            />
          </div>
          <p className="mt-3 text-lg font-bold leading-relaxed text-gray-900">
            {progresoTexto}
          </p>
        </div>

        {/* Nota obligatoria RN-06 */}
        <p className="mt-5 rounded-2xl border-2 border-sol-400 bg-sol-50 px-5 py-4 text-base font-semibold leading-relaxed text-gray-900">
          <strong>Nota institucional (RN-06):</strong>{" "}
          {data.nota_institucional ||
            "Valores de puntaje y beneficios referenciales y parametrizables; sujetos a validación oficial de la Fundación Santo Domingo."}
        </p>
      </section>

      {feedback && (
        <div
          className={`rounded-2xl border-2 px-5 py-4 text-lg font-bold ${
            feedback.type === "ok"
              ? "border-huerta-500 bg-huerta-50 text-huerta-900"
              : "border-rose-500 bg-rose-50 text-rose-900"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Catálogo de Beneficios (máximo 2 columnas en escritorio, 1 en celular) */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sol-400 text-gray-900">
            <Gift className="h-7 w-7" />
          </span>
          <div>
            <h3 className="text-2xl font-black text-gray-900 sm:text-3xl">
              Premios y Beneficios
            </h3>
            <p className="text-lg text-gray-900">
              Cuando alcances los puntos, toca el botón verde para reclamarlo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {data.beneficios.map((b) => {
            const busy = redeemingId === b.id;
            return (
              <article
                key={b.id}
                className={`flex flex-col justify-between rounded-3xl border-2 p-6 shadow-sm ${
                  b.desbloqueado
                    ? "border-huerta-600 bg-white"
                    : "border-stone-300 bg-stone-50"
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-sol-500 bg-sol-100 px-4 py-1 text-base font-black text-gray-900">
                      <Award className="h-5 w-5 text-sol-700" />
                      {formatPts(b.puntos_requeridos)} pts
                    </span>

                    {b.desbloqueado ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-huerta-700 px-3.5 py-1 text-sm font-extrabold text-white">
                        <Sparkles className="h-4 w-4" />
                        ¡Disponible!
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-400 bg-white px-3.5 py-1 text-sm font-extrabold text-gray-900">
                        <Lock className="h-4 w-4" />
                        Faltan {formatPts(b.puntos_faltantes)} pts
                      </span>
                    )}
                  </div>

                  <h4 className="mt-4 text-xl font-black text-gray-900">
                    {b.nombre}
                  </h4>
                  <p className="mt-2 text-lg leading-relaxed text-gray-900">
                    {b.descripcion}
                  </p>
                </div>

                <div className="mt-6 space-y-3 border-t-2 border-stone-200 pt-5">
                  {b.desbloqueado && (
                    <input
                      type="text"
                      value={notesById[b.id] || ""}
                      onChange={(e) =>
                        setNotesById((prev) => ({
                          ...prev,
                          [b.id]: e.target.value,
                        }))
                      }
                      placeholder="Nota opcional (ej: reclamar el sábado)"
                      className="eco-input"
                    />
                  )}
                  <button
                    type="button"
                    disabled={!b.desbloqueado || redeemingId !== null}
                    onClick={() => handleRedeem(b)}
                    className={
                      b.desbloqueado
                        ? "eco-btn-primary w-full"
                        : "inline-flex min-h-[56px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border-2 border-stone-300 bg-stone-200 px-5 py-3 text-lg font-extrabold text-gray-800"
                    }
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Registrando...</span>
                      </>
                    ) : b.desbloqueado ? (
                      <>
                        <CheckCircle2 className="h-6 w-6 shrink-0" />
                        <span>Reclamar ({formatPts(b.puntos_requeridos)} pts)</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-5 w-5 shrink-0" />
                        <span>Te faltan {formatPts(b.puntos_faltantes)} pts</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Beneficios ya reclamados */}
      {data.canjes.length > 0 && (
        <section className="rounded-3xl border-2 border-stone-300 bg-white p-6 shadow-sm sm:p-8">
          <h3 className="flex items-center gap-2.5 text-2xl font-black text-gray-900">
            <Gift className="h-7 w-7 text-sol-700" />
            <span>Beneficios que ya reclamaste ({data.canjes.length})</span>
          </h3>
          <div className="mt-5 space-y-4">
            {data.canjes.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 rounded-2xl border-2 border-stone-200 bg-stone-50 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-xl font-black text-gray-900">
                    {c.beneficio_nombre}
                  </p>
                  <p className="mt-1 text-base font-semibold text-gray-800">
                    {formatDateLong(c.creado_en)}
                    {c.observaciones ? ` · ${c.observaciones}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <span className="rounded-full border border-huerta-500 bg-huerta-100 px-3.5 py-1 text-sm font-extrabold uppercase text-huerta-900">
                    {c.estado}
                  </span>
                  <p className="text-lg font-black text-rose-800">
                    -{formatPts(c.puntos_canjeados)} pts
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Historial de Movimientos en tarjetas simples (sin tablas apretadas) */}
      <section className="rounded-3xl border-2 border-stone-300 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="flex items-center gap-2.5 text-2xl font-black text-gray-900">
          <History className="h-7 w-7 text-huerta-700" />
          <span>Historial de Puntos ({data.movimientos.length})</span>
        </h3>

        {data.movimientos.length === 0 ? (
          <p className="mt-4 text-lg leading-relaxed text-gray-900">
            Todavía no tienes movimientos. Cuando recogemos tu primer pedido,
            aquí verás el peso y tus puntos sumados.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {data.movimientos.map((m) => (
              <article
                key={m.id}
                className="flex flex-col gap-3 rounded-2xl border-2 border-stone-200 bg-stone-50 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {m.flujo ? (
                      <FlujoBadge flujo={m.flujo} />
                    ) : (
                      <span className="rounded-full border-2 border-sol-500 bg-sol-100 px-3.5 py-1 text-sm font-extrabold text-gray-900">
                        Beneficio reclamado
                      </span>
                    )}
                    <span className="font-mono text-base font-black text-gray-900">
                      {m.codigo_solicitud || m.beneficio_nombre || "Canje"}
                    </span>
                  </div>
                  <p className="text-base font-bold text-gray-800">
                    {formatDateLong(m.creado_en)}
                    {m.peso_ingresado != null && m.unidad_medida
                      ? ` · Peso: ${m.peso_ingresado.toFixed(1)} ${m.unidad_medida}`
                      : ""}
                  </p>
                </div>

                <p
                  className={`text-2xl font-black ${
                    m.puntos >= 0 ? "text-huerta-800" : "text-rose-800"
                  }`}
                >
                  {m.puntos >= 0
                    ? `+${formatPts(m.puntos)}`
                    : formatPts(m.puntos)}{" "}
                  pts
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
