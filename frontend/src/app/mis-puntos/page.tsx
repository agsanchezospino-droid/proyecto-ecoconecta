"use client";

import { AlertCircle, ArrowLeft, Award, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import PointsAndBenefitsView from "@/components/PointsAndBenefitsView";
import WhatsAppCtaButton from "@/components/WhatsAppCtaButton";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import type { MiResumenPuntos } from "@/lib/types";

export default function MisPuntosPage() {
  const { user, loading, isCoordinatorOrAdmin, refreshUser } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<MiResumenPuntos | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const userId = user?.id ?? null;

  const loadData = useCallback(
    async (opts?: { syncProfile?: boolean }) => {
      setFetching(true);
      setLoadError(null);
      try {
        const res = await apiFetch<MiResumenPuntos>("/solicitudes/mias/puntos");
        setData(res);
        if (opts?.syncProfile) {
          await refreshUser();
        }
      } catch (err) {
        setLoadError(
          err instanceof Error
            ? err.message
            : "No pudimos cargar tus puntos y beneficios en este momento."
        );
      } finally {
        setFetching(false);
      }
    },
    [refreshUser]
  );

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      router.replace("/login?next=/mis-puntos");
      return;
    }
    void loadData({ syncProfile: false });
  }, [loading, userId, router, loadData]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-huerta-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/mi-cuenta"
            className="inline-flex items-center gap-1 text-xs font-bold text-huerta-700 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a Mi Cuenta
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-black text-stone-900 sm:text-3xl">
            <Award className="h-7 w-7 text-sol-500" />
            Mis Puntos y Beneficios
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Revisa tu progreso por niveles, canjea beneficios y consulta cada
            movimiento acreditado en <strong>{user.nombre}</strong>.
          </p>
        </div>

        {!isCoordinatorOrAdmin && (
          <WhatsAppCtaButton
            label="Pedir Recolección por WhatsApp"
            size="md"
          />
        )}
      </div>

      {loadError && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {loadError}
          </span>
          <button
            type="button"
            onClick={() => void loadData({ syncProfile: true })}
            className="rounded-xl bg-rose-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-800"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="mt-6">
        {fetching || !data ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-7 w-7 animate-spin text-huerta-600" />
          </div>
        ) : (
          <PointsAndBenefitsView
            data={data}
            onRefresh={() => loadData({ syncProfile: true })}
          />
        )}
      </div>
    </div>
  );
}
