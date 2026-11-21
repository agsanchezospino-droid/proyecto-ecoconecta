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
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

import { FlujoBadge } from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import { formatPts, type Beneficio, type MiResumenPuntos } from "@/lib/types";

interface Props {
  data: MiResumenPuntos;
  onRefresh: () => Promise<void>;
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
        text: `¡Canje registrado! "${beneficio.nombre}" (-${formatPts(
          beneficio.puntos_requeridos
        )} pts). Tu saldo se actualizó automáticamente.`,
      });
      await onRefresh();
    } catch (err) {
      setFeedback({
        type: "err",
        text:
          err instanceof Error
            ? err.message
            : "No se pudo registrar el canje del beneficio.",
      });
    } finally {
      setRedeemingId(null);
    }
  };

  const progreso = data.progreso_nivel;

  return (
    <div className="space-y-6">
      {/* Progreso por niveles */}
      <div className="rounded-3xl border-2 border-huerta-200 bg-gradient-to-br from-huerta-50 via-white to-sol-50/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-huerta-600 px-3 py-1 text-xs font-bold text-white">
              <Sprout className="h-3.5 w-3.5" />
              Nivel actual: {progreso.nivel_actual}
            </span>
            <h2 className="mt-2.5 text-xl font-black text-stone-900 sm:text-2xl">
              Saldo disponible: {formatPts(data.puntos_disponibles)} puntos
            </h2>
            <p className="mt-1 text-xs text-stone-600">
              Histórico ganado: <strong>{formatPts(data.puntos_ganados)} pts</strong>{" "}
              · Canjeado: <strong>{formatPts(data.puntos_canjeados)} pts</strong>{" "}
              · Equivalente acumulado:{" "}
              <strong>{data.total_kg.toFixed(2)} kg</strong>
            </p>
          </div>

          <div className="rounded-2xl border border-sol-400/50 bg-sol-50 px-4 py-3 text-left sm:text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-sol-700">
              Equivalencia referencial
            </p>
            <p className="mt-0.5 text-sm font-extrabold text-stone-900">
              1 kg = 1.0 pt · 1 lb (500 g) = 0.5 pts
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-stone-700">
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-huerta-600" />
              {progreso.siguiente_beneficio_id
                ? `Siguiente nivel: ${progreso.siguiente_nivel_nombre}`
                : "¡Alcanzaste el nivel máximo disponible!"}
            </span>
            <span className="text-huerta-700">
              {progreso.porcentaje_avance.toFixed(0)}%
              {progreso.siguiente_beneficio_id &&
                ` · Te faltan ${formatPts(progreso.puntos_faltantes)} pts`}
            </span>
          </div>
          <div className="mt-2 h-4 w-full overflow-hidden rounded-full bg-stone-200/90">
            <div
              className="h-full rounded-full bg-gradient-to-r from-huerta-500 via-huerta-600 to-sol-500 transition-all duration-500"
              style={{ width: `${Math.min(Math.max(progreso.porcentaje_avance, 4), 100)}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] font-semibold text-stone-500">
            {data.beneficios.map((b) => (
              <span
                key={b.id}
                className={
                  b.desbloqueado ? "font-bold text-huerta-700" : "text-stone-500"
                }
              >
                {b.nombre.split("–")[0].trim()} ({formatPts(b.puntos_requeridos)}{" "}
                pts)
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Mandatory RN-06 Institutional Note */}
      <div className="rounded-2xl border border-sol-400/50 bg-sol-50 px-4 py-3 text-xs font-semibold text-stone-800">
        <strong>Nota institucional (RN-06):</strong>{" "}
        {data.nota_institucional ||
          "Valores de puntaje y beneficios referenciales y parametrizables; sujetos a validación oficial de la Fundación Santo Domingo."}
      </div>

      {feedback && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            feedback.type === "ok"
              ? "border-huerta-200 bg-huerta-50 text-huerta-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Catálogo de Beneficios (Usuarios) */}
      <div>
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-huerta-600" />
          <h3 className="text-lg font-extrabold text-stone-900">
            Catálogo de Beneficios por Nivel (Usuarios)
          </h3>
        </div>
        <p className="mt-1 text-xs text-stone-600">
          Cuando alcances el puntaje requerido, registra el canje desde aquí y
          coordina la entrega con el equipo comunitario de Villas de San Pablo.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {data.beneficios.map((b) => {
            const busy = redeemingId === b.id;
            return (
              <article
                key={b.id}
                className={`flex flex-col justify-between rounded-2xl border-2 p-5 transition ${
                  b.desbloqueado
                    ? "border-huerta-500 bg-white shadow-sm"
                    : "border-stone-200 bg-stone-50/70"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-sol-100 px-3 py-1 text-xs font-black text-sol-700">
                      <Award className="h-3.5 w-3.5" />
                      {formatPts(b.puntos_requeridos)} pts
                    </span>
                    {b.desbloqueado ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-huerta-100 px-2.5 py-0.5 text-[11px] font-bold text-huerta-700">
                        <Sparkles className="h-3 w-3" />
                        Disponible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-stone-200 px-2.5 py-0.5 text-[11px] font-bold text-stone-600">
                        <Lock className="h-3 w-3" />
                        Faltan {formatPts(b.puntos_faltantes)} pts
                      </span>
                    )}
                  </div>

                  <h4 className="mt-3 text-base font-extrabold text-stone-900">
                    {b.nombre}
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                    {b.descripcion}
                  </p>
                </div>

                <div className="mt-4 space-y-2 border-t border-stone-100 pt-3">
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
                      className="eco-input py-2 text-xs"
                    />
                  )}
                  <button
                    type="button"
                    disabled={!b.desbloqueado || redeemingId !== null}
                    onClick={() => handleRedeem(b)}
                    className={
                      b.desbloqueado
                        ? "eco-btn-primary w-full py-2.5 text-xs"
                        : "inline-flex min-h-[42px] w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-100 px-4 text-xs font-bold text-stone-500"
                    }
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : b.desbloqueado ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Registrar canje ({formatPts(b.puntos_requeridos)} pts)
                      </>
                    ) : (
                      `Te faltan ${formatPts(b.puntos_faltantes)} pts`
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Canjes Registrados */}
      {data.canjes.length > 0 && (
        <div className="eco-card overflow-hidden">
          <div className="border-b border-stone-200 px-5 py-3.5">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-stone-900">
              <Gift className="h-4 w-4 text-sol-600" />
              Mis Canjes Registrados ({data.canjes.length})
            </h3>
          </div>
          <div className="divide-y divide-stone-100">
            {data.canjes.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
              >
                <div>
                  <p className="font-bold text-stone-900">
                    {c.beneficio_nombre}
                  </p>
                  <p className="text-xs text-stone-500">
                    {new Date(c.creado_en).toLocaleString("es-CO")}
                    {c.observaciones ? ` · ${c.observaciones}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-huerta-100 px-2.5 py-0.5 text-xs font-bold uppercase text-huerta-700">
                    {c.estado}
                  </span>
                  <p className="mt-0.5 text-xs font-extrabold text-rose-700">
                    -{formatPts(c.puntos_canjeados)} pts
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Movimientos de Puntos */}
      <div className="eco-card overflow-hidden">
        <div className="border-b border-stone-200 px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-stone-900">
            <History className="h-4 w-4 text-huerta-600" />
            Historial de Movimientos de Puntos ({data.movimientos.length})
          </h3>
        </div>
        {data.movimientos.length === 0 ? (
          <p className="p-6 text-center text-sm text-stone-500">
            Aún no tienes movimientos registrados. Al cerrarse tu primera
            recolección verás aquí el peso y tus puntos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Referencia</th>
                  <th className="px-4 py-3">Flujo</th>
                  <th className="px-4 py-3">Peso</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3 text-right">Puntos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.movimientos.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {new Date(m.creado_en).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-stone-800">
                      {m.codigo_solicitud || m.beneficio_nombre || "Canje"}
                    </td>
                    <td className="px-4 py-3">
                      {m.flujo ? (
                        <FlujoBadge flujo={m.flujo} />
                      ) : (
                        <span className="rounded-full bg-sol-100 px-2.5 py-0.5 text-xs font-bold text-sol-700">
                          Canje beneficio
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-stone-700">
                      {m.peso_ingresado !== null &&
                      m.peso_ingresado !== undefined ? (
                        <>
                          {m.peso_ingresado.toFixed(2)} {m.unidad_medida}
                          {m.unidad_medida === "lb" && m.peso_kg != null && (
                            <span className="block text-[11px] text-stone-500">
                              ({m.peso_kg.toFixed(2)} kg)
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600">
                      {m.regla_aplicada}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-black ${
                        m.puntos >= 0 ? "text-huerta-700" : "text-rose-700"
                      }`}
                    >
                      {m.puntos >= 0
                        ? `+${formatPts(m.puntos)}`
                        : formatPts(m.puntos)}{" "}
                      pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
