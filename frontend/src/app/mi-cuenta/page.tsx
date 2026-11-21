"use client";

import {
  Award,
  CalendarClock,
  CheckCircle2,
  Gift,
  Loader2,
  MessageSquareText,
  Mic,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import PointsAndBenefitsView from "@/components/PointsAndBenefitsView";
import { EstadoBadge, FlujoBadge } from "@/components/StatusBadge";
import WhatsAppCtaButton from "@/components/WhatsAppCtaButton";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import {
  formatPts,
  type MiResumenPuntos,
  type SolicitudCiudadano,
} from "@/lib/types";

export default function MiCuentaPage() {
  const { user, loading, isCoordinatorOrAdmin, refreshUser } = useAuth();
  const router = useRouter();

  const [solicitudes, setSolicitudes] = useState<SolicitudCiudadano[]>([]);
  const [puntos, setPuntos] = useState<MiResumenPuntos | null>(null);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<"solicitudes" | "puntos">("solicitudes");

  const loadData = useCallback(async () => {
    setFetching(true);
    try {
      const [sols, pts] = await Promise.all([
        apiFetch<SolicitudCiudadano[]>("/solicitudes/mias"),
        apiFetch<MiResumenPuntos>("/solicitudes/mias/puntos"),
      ]);
      setSolicitudes(sols);
      setPuntos(pts);
      await refreshUser();
    } finally {
      setFetching(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login?next=/mi-cuenta");
      } else {
        void loadData();
      }
    }
  }, [loading, user, router, loadData]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-huerta-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-stone-900 sm:text-3xl">
              Hola, {user.nombre}
            </h1>
            {user.es_piloto && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sol-100 px-3 py-1 text-xs font-bold text-sol-700">
                <Sparkles className="h-3.5 w-3.5" />
                Piloto Villas de San Pablo
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-stone-600">
            Consulta el estado de los pedidos que enviaste desde tu WhatsApp
            móvil, tus horarios programados y tus puntos acumulados.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isCoordinatorOrAdmin && (
            <Link href="/coordinacion" className="eco-btn-amber text-sm">
              Ir a /coordinacion
            </Link>
          )}
          {!isCoordinatorOrAdmin && (
            <>
              <Link href="/mis-puntos" className="eco-btn-amber text-sm">
                <Gift className="h-5 w-5" />
                Mis Puntos y Beneficios
              </Link>
              <WhatsAppCtaButton
                label="Pedir Recolección por WhatsApp"
                size="md"
              />
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border-2 border-sol-400/50 bg-sol-50 p-5">
          <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-sol-700">
            <span className="flex items-center gap-1.5">
              <Award className="h-4 w-4" />
              Saldo disponible
            </span>
            {puntos && (
              <span className="rounded-full bg-huerta-600 px-2 py-0.5 text-[10px] font-bold text-white">
                {puntos.progreso_nivel.nivel_actual}
              </span>
            )}
          </div>
          <p className="mt-2 text-3xl font-black text-stone-900">
            {formatPts(puntos?.puntos_disponibles ?? user.puntos_acumulados)}{" "}
            pts
          </p>
        </div>

        <div className="rounded-2xl border border-huerta-200 bg-huerta-50/70 p-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-huerta-700">
            <Scale className="h-4 w-4" />
            Material aprovechado
          </div>
          <p className="mt-2 text-3xl font-black text-huerta-800">
            {puntos ? `${puntos.total_kg.toFixed(2)} kg` : "0.00 kg"}
          </p>
        </div>

        <div className="eco-card p-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
            <CheckCircle2 className="h-4 w-4 text-huerta-600" />
            Entregas completadas
          </div>
          <p className="mt-2 text-3xl font-black text-stone-900">
            {puntos?.recolecciones_completadas ?? 0}
          </p>
        </div>
      </div>

      {/* Mandatory RN-06 disclaimer */}
      <p className="mt-3 rounded-xl border border-sol-400/40 bg-white px-4 py-2.5 text-xs font-medium text-stone-600">
        <strong>Nota (RN-06):</strong>{" "}
        {puntos?.nota_institucional ||
          "Valores de puntaje y beneficios referenciales y parametrizables; sujetos a validación oficial de la Fundación Santo Domingo."}
      </p>

      {/* Tabs */}
      <div className="mt-7 flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        <button
          type="button"
          onClick={() => setTab("solicitudes")}
          className={`min-h-[42px] rounded-xl px-4 text-sm font-bold transition ${
            tab === "solicitudes"
              ? "bg-stone-900 text-white"
              : "bg-white text-stone-700 hover:bg-stone-100"
          }`}
        >
          Mis Pedidos de WhatsApp ({solicitudes.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("puntos")}
          className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-4 text-sm font-bold transition ${
            tab === "puntos"
              ? "bg-stone-900 text-white"
              : "bg-white text-stone-700 hover:bg-stone-100"
          }`}
        >
          <Gift className="h-4 w-4" />
          Mis Puntos y Beneficios
        </button>
      </div>

      {fetching ? (
        <div className="flex justify-center py-14">
          <Loader2 className="h-7 w-7 animate-spin text-huerta-600" />
        </div>
      ) : tab === "solicitudes" ? (
        <div className="mt-5 space-y-4">
          {solicitudes.length === 0 ? (
            <div className="eco-card p-8 text-center">
              <p className="text-base font-bold text-stone-800">
                Aún no tienes pedidos registrados desde WhatsApp.
              </p>
              <p className="mt-1 text-sm text-stone-500">
                Separa tus orgánicos o reciclables y pide tu primera recolección
                por texto o nota de voz desde tu app de WhatsApp.
              </p>
              <div className="mt-4 flex justify-center">
                <WhatsAppCtaButton
                  label="Pedir Recolección por WhatsApp"
                  size="md"
                />
              </div>
            </div>
          ) : (
            solicitudes.map((sol) => (
              <article key={sol.id} className="eco-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-black text-stone-900">
                        {sol.codigo}
                      </span>
                      <FlujoBadge flujo={sol.flujo} />
                      <EstadoBadge estado={sol.estado} />
                      <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-bold text-stone-700">
                        {sol.tipo_mensaje_origen === "audio" ? (
                          <>
                            <Mic className="h-3 w-3 text-reciclaje-600" />
                            Nota de voz WhatsApp
                          </>
                        ) : (
                          <>
                            <MessageSquareText className="h-3 w-3 text-huerta-600" />
                            Mensaje WhatsApp
                          </>
                        )}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      Recibida el{" "}
                      {new Date(sol.creado_en).toLocaleString("es-CO")} ·{" "}
                      {sol.direccion}
                    </p>
                  </div>

                  {sol.estado === "recolectada" && (
                    <div className="rounded-xl bg-huerta-50 px-3.5 py-2 text-right">
                      <p className="text-xs font-bold text-huerta-700">
                        {sol.peso_ingresado != null && sol.unidad_medida
                          ? `${sol.peso_ingresado.toFixed(2)} ${sol.unidad_medida}`
                          : `${sol.peso_kg_registrado?.toFixed(2) ?? "0.00"} kg`}
                        {sol.unidad_medida === "lb" &&
                          sol.peso_kg_registrado != null &&
                          ` (${sol.peso_kg_registrado.toFixed(2)} kg)`}
                      </p>
                      <p className="text-sm font-black text-sol-700">
                        +{formatPts(sol.puntos_otorgados)} pts acreditados
                      </p>
                    </div>
                  )}
                </div>

                {/* Mensaje original / transcripción recibida */}
                {sol.mensaje_original && (
                  <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs text-stone-700">
                    <p className="font-bold text-stone-500">
                      {sol.tipo_mensaje_origen === "audio"
                        ? "Transcripción de tu nota de voz:"
                        : "Tu mensaje enviado por WhatsApp:"}
                    </p>
                    <p className="mt-1 italic text-stone-800">
                      &ldquo;{sol.mensaje_original}&rdquo;
                    </p>
                  </div>
                )}

                {/* Coordinador intermediario y cita */}
                <div className="mt-4 grid gap-3 rounded-xl bg-stone-50 p-3.5 text-sm sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-huerta-600" />
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500">
                        Coordinador intermediario
                      </p>
                      <p className="font-bold text-stone-900">
                        {sol.coordinador_nombre || sol.coordinador_rol_label}
                      </p>
                      <p className="text-xs text-stone-500">
                        {sol.coordinador_rol_label}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-reciclaje-600" />
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500">
                        Horario acordado
                      </p>
                      {sol.fecha_programada ? (
                        <p className="font-bold text-reciclaje-700">
                          {sol.fecha_programada} · {sol.hora_programada}
                        </p>
                      ) : (
                        <p className="text-xs text-stone-600">
                          El coordinador confirmará día y hora en tu WhatsApp
                          (Pref: {sol.preferencia_horaria || "Por acordar"})
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3 text-xs text-stone-500">
                  <span>
                    Trazabilidad: {sol.historial_estados.length} evento(s)
                    registrado(s)
                  </span>
                  <span>
                    La coordinación de horario se realiza directamente en tu app
                    de WhatsApp.
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      ) : puntos ? (
        <div className="mt-5">
          <PointsAndBenefitsView data={puntos} onRefresh={loadData} />
        </div>
      ) : null}
    </div>
  );
}
