"use client";

import { AlertCircle, Award, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import BackToHomeButton from "@/components/BackToHomeButton";
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
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-huerta-600" />
        <p className="text-lg font-bold text-gray-900">
          Cargando tus beneficios...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center gap-4">
        <BackToHomeButton href="/cuenta" label="Volver a Mi Cuenta" className="mb-0" />
      </div>

      <header className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black text-gray-900 sm:text-4xl">
            <Award className="h-9 w-9 shrink-0 text-sol-600" />
            <span>Mis Puntos y Beneficios</span>
          </h1>
          <p className="mt-2 text-lg leading-relaxed text-gray-900">
            Consulta tu avance y reclama tus premios en{" "}
            <strong>{user.nombre}</strong>.
          </p>
        </div>

        {!isCoordinatorOrAdmin && (
          <WhatsAppCtaButton
            label="Pedir Recolección"
            size="md"
            className="w-full sm:w-auto"
          />
        )}
      </header>

      {loadError && (
        <div className="mt-6 flex flex-col gap-4 rounded-3xl border-2 border-rose-400 bg-rose-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-3 text-lg font-bold text-rose-900">
            <AlertCircle className="mt-1 h-6 w-6 shrink-0" />
            <span>{loadError}</span>
          </span>
          <button
            type="button"
            onClick={() => void loadData({ syncProfile: true })}
            className="eco-btn-danger shrink-0"
          >
            <RefreshCw className="h-5 w-5 shrink-0" />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      <div className="mt-8">
        {fetching || !data ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <Loader2 className="h-10 w-10 animate-spin text-huerta-600" />
            <p className="text-lg font-bold text-gray-900">
              Cargando puntos...
            </p>
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
