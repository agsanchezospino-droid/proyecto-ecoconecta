"use client";

import {
  AlertCircle,
  Award,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Gift,
  Home,
  Leaf,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Recycle,
  RefreshCw,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import BackToHomeButton from "@/components/BackToHomeButton";
import ListenButton from "@/components/ListenButton";
import WhatsAppCtaButton from "@/components/WhatsAppCtaButton";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import {
  formatPts,
  type MiResumenPuntos,
  type SolicitudCiudadano,
} from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  hogar: "Hogar Ciudadano",
  unidad_productiva: "Unidad Productiva",
  coordinador_huerteros: "Coordinador de Huerteros",
  coordinador_recicladores: "Coordinador de Recicladores",
  administrador: "Administrador",
};

function formatHumanDate(isoOrDate: string): string {
  const date = new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return isoOrDate;
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatScheduledDateTime(
  fecha?: string | null,
  hora?: string | null
): string {
  if (!fecha) return "fecha por confirmar";
  const dateObj = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ? new Date(`${fecha}T12:00:00`)
    : new Date(fecha);

  const fechaTexto = Number.isNaN(dateObj.getTime())
    ? fecha
    : new Intl.DateTimeFormat("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(dateObj);

  if (!hora) return fechaTexto;

  const match = hora.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return `${fechaTexto} a las ${hora}`;
  const hh = Number(match[1]);
  const mm = match[2];
  const suffix = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${fechaTexto} a las ${h12}:${mm} ${suffix}`;
}

function getHumanOrderStatus(sol: SolicitudCiudadano): {
  title: string;
  detail: string;
  tone: "amber" | "teal" | "green" | "rose";
} {
  if (sol.estado === "recolectada") {
    const pesoTexto =
      sol.peso_ingresado != null && sol.unidad_medida
        ? `${sol.peso_ingresado.toFixed(1)} ${sol.unidad_medida}`
        : `${(sol.peso_kg_registrado ?? 0).toFixed(1)} kg`;
    return {
      title: "Ya recogido",
      detail: `Se pesaron ${pesoTexto} y ganaste +${formatPts(
        sol.puntos_otorgados
      )} puntos.`,
      tone: "green",
    };
  }
  if (sol.estado === "programada") {
    return {
      title: `Programado para el ${formatScheduledDateTime(
        sol.fecha_programada,
        sol.hora_programada
      )}`,
      detail: "Ten tus bolsas listas y limpias en la puerta a esa hora.",
      tone: "teal",
    };
  }
  if (sol.estado === "cancelada") {
    return {
      title: "Cancelado",
      detail: "Si lo necesitas, puedes pedir una nueva recolección por WhatsApp.",
      tone: "rose",
    };
  }
  return {
    title: "Recibido",
    detail:
      "El coordinador revisará tu pedido y te avisará el día y la hora por WhatsApp.",
    tone: "amber",
  };
}

export default function MiCuentaView() {
  const { user, loading, isCoordinatorOrAdmin, logout, refreshUser } =
    useAuth();
  const router = useRouter();

  const [solicitudes, setSolicitudes] = useState<SolicitudCiudadano[]>([]);
  const [puntos, setPuntos] = useState<MiResumenPuntos | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loggingOutRef = useRef(false);

  const userId = user?.id ?? null;

  const loadAccountData = useCallback(
    async (opts?: { syncProfile?: boolean }) => {
      setFetching(true);
      setLoadError(null);
      try {
        const [sols, pts] = await Promise.all([
          apiFetch<SolicitudCiudadano[]>("/solicitudes/mias"),
          apiFetch<MiResumenPuntos>("/solicitudes/mias/puntos"),
        ]);
        setSolicitudes(sols);
        setPuntos(pts);
        if (opts?.syncProfile) {
          await refreshUser();
        }
      } catch (err) {
        setLoadError(
          err instanceof Error
            ? err.message
            : "No pudimos cargar los datos de tu cuenta. Intenta de nuevo."
        );
      } finally {
        setFetching(false);
      }
    },
    [refreshUser]
  );

  // Depende únicamente de `loading` y `userId` (primitivo) para evitar bucles infinitos
  useEffect(() => {
    if (loading || loggingOutRef.current) return;
    if (!userId) {
      router.replace("/login?next=/cuenta");
      return;
    }
    void loadAccountData({ syncProfile: false });
  }, [loading, userId, router, loadAccountData]);

  const handleLogout = () => {
    loggingOutRef.current = true;
    logout();
    router.replace("/");
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-huerta-600" />
        <p className="text-lg font-bold text-gray-900">
          Cargando tu cuenta...
        </p>
      </div>
    );
  }

  const puntosDisponibles =
    puntos?.puntos_disponibles ?? user.puntos_acumulados ?? 0;
  const progreso = puntos?.progreso_nivel;
  const unlockedCount =
    puntos?.beneficios.filter((b) => b.desbloqueado).length ?? 0;

  const progresoFrase = progreso
    ? progreso.siguiente_beneficio_id
      ? `Te faltan ${formatPts(progreso.puntos_faltantes)} puntos para reclamar: ${progreso.siguiente_nivel_nombre}.`
      : "¡Felicitaciones! Ya tienes puntos para reclamar el nivel máximo de beneficios."
    : "Cada kilo de reciclaje u orgánico que entregues te suma puntos.";

  const audioPuntosTexto = `Hola ${user.nombre}. Tienes ${formatPts(
    puntosDisponibles
  )} puntos acumulados. ${progresoFrase}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <BackToHomeButton href="/" label="Volver al inicio" />

      {/* Encabezado sencillo y amigable */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black text-gray-900 sm:text-4xl">
            Hola, {user.nombre}
          </h1>
          {user.es_piloto && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-sol-500 bg-sol-100 px-4 py-1.5 text-base font-extrabold text-gray-900">
              <Sparkles className="h-5 w-5 text-sol-700" />
              Usuario Piloto
            </span>
          )}
        </div>
        <p className="text-lg leading-relaxed text-gray-900">
          Aquí puedes ver tus puntos, tus pedidos de recolección y tus datos.
        </p>

        {isCoordinatorOrAdmin && (
          <div className="pt-2">
            <Link href="/coordinacion" className="eco-btn-amber w-full sm:w-auto">
              <ClipboardList className="h-6 w-6 shrink-0" />
              <span>Ir al Panel de Coordinación</span>
            </Link>
          </div>
        )}
      </header>

      {/* Aviso de error con botón grande para reintentar */}
      {loadError && (
        <div className="mt-6 flex flex-col gap-4 rounded-3xl border-2 border-rose-400 bg-rose-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-3 text-lg font-bold text-rose-900">
            <AlertCircle className="mt-1 h-6 w-6 shrink-0" />
            <span>{loadError}</span>
          </p>
          <button
            type="button"
            onClick={() => void loadAccountData({ syncProfile: true })}
            className="eco-btn-danger shrink-0"
          >
            <RefreshCw className="h-5 w-5 shrink-0" />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {/* 3 BLOQUES LIMPIOS Y ESPACIADOS */}
      <div className="mt-8 space-y-8">
        {/* BLOQUE 1: MIS PUNTOS */}
        <section
          aria-labelledby="bloque-puntos"
          className="rounded-3xl border-2 border-huerta-500 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sol-400 text-gray-900">
                <Award className="h-7 w-7" />
              </span>
              <h2
                id="bloque-puntos"
                className="text-2xl font-black text-gray-900 sm:text-3xl"
              >
                Mis Puntos
              </h2>
            </div>

            <ListenButton text={audioPuntosTexto} label="Escuchar" />
          </div>

          <div className="mt-6 rounded-2xl border-2 border-sol-400 bg-sol-50 p-6">
            <p className="text-lg font-bold text-gray-900">
              Puntos disponibles ahora:
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <p className="text-4xl font-black text-gray-900 sm:text-5xl">
                {formatPts(puntosDisponibles)} puntos
              </p>
              {progreso && (
                <span className="inline-flex items-center rounded-full bg-huerta-700 px-4 py-1 text-base font-extrabold text-white">
                  Nivel: {progreso.nivel_actual}
                </span>
              )}
            </div>

            {/* Barra de progreso simple y gruesa */}
            <div className="mt-6">
              <div
                className="h-5 w-full overflow-hidden rounded-full border border-stone-300 bg-white"
                role="progressbar"
                aria-valuenow={Math.round(progreso?.porcentaje_avance ?? 0)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Avance hacia tu siguiente beneficio"
              >
                <div
                  className="h-full rounded-full bg-huerta-600 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      Math.max(progreso?.porcentaje_avance ?? 5, 5),
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-3 text-lg font-bold leading-relaxed text-gray-900">
                {progresoFrase}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <Link href="/mis-puntos" className="eco-btn-amber flex-1">
              <Gift className="h-6 w-6 shrink-0" />
              <span>
                {unlockedCount > 0
                  ? `Ver y reclamar beneficios (${unlockedCount} listo${
                      unlockedCount > 1 ? "s" : ""
                    })`
                  : "Ver catálogo de beneficios"}
              </span>
            </Link>
          </div>

          {/* Nota obligatoria RN-06 en contraste alto */}
          <p className="mt-5 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base leading-relaxed text-gray-900">
            <strong>Nota:</strong>{" "}
            {puntos?.nota_institucional ||
              "Puntos y beneficios referenciales, sujetos a validación oficial de la Fundación Santo Domingo."}
          </p>
        </section>

        {/* BLOQUE 2: MIS PEDIDOS */}
        <section
          aria-labelledby="bloque-pedidos"
          className="rounded-3xl border-2 border-stone-300 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-huerta-600 text-white">
                <Package className="h-7 w-7" />
              </span>
              <h2
                id="bloque-pedidos"
                className="text-2xl font-black text-gray-900 sm:text-3xl"
              >
                Mis Pedidos ({solicitudes.length})
              </h2>
            </div>

            <button
              type="button"
              onClick={() => void loadAccountData({ syncProfile: true })}
              disabled={fetching}
              className="eco-btn-outline"
            >
              <RefreshCw
                className={`h-5 w-5 shrink-0 ${fetching ? "animate-spin" : ""}`}
              />
              <span>Actualizar</span>
            </button>
          </div>

          {fetching ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Loader2 className="h-9 w-9 animate-spin text-huerta-600" />
              <p className="text-lg font-bold text-gray-900">
                Buscando tus pedidos...
              </p>
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="mt-6 rounded-2xl border-2 border-stone-200 bg-stone-50 p-6 text-center">
              <p className="text-xl font-extrabold text-gray-900">
                Aún no tienes pedidos registrados.
              </p>
              <p className="mt-2 text-lg leading-relaxed text-gray-900">
                Separa tus residuos y pide tu primera recolección por WhatsApp.
              </p>
              <div className="mt-6 flex justify-center">
                <WhatsAppCtaButton
                  label="Pedir Recolección por WhatsApp"
                  size="lg"
                  className="w-full sm:w-auto"
                />
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {solicitudes.map((sol) => {
                const status = getHumanOrderStatus(sol);
                const statusBoxStyle =
                  status.tone === "green"
                    ? "border-huerta-400 bg-huerta-50 text-gray-900"
                    : status.tone === "teal"
                      ? "border-reciclaje-400 bg-reciclaje-50 text-gray-900"
                      : status.tone === "rose"
                        ? "border-rose-400 bg-rose-50 text-rose-950"
                        : "border-sol-500 bg-sol-50 text-gray-900";

                const StatusIcon =
                  status.tone === "green"
                    ? CheckCircle2
                    : status.tone === "teal"
                      ? CalendarClock
                      : status.tone === "rose"
                        ? XCircle
                        : Clock;

                return (
                  <article
                    key={sol.id}
                    className="rounded-2xl border-2 border-stone-300 bg-stone-50/70 p-5 sm:p-6"
                  >
                    {/* Tipo de residuo + fecha + código */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-base font-extrabold ${
                          sol.flujo === "organico"
                            ? "border-huerta-500 bg-huerta-100 text-huerta-900"
                            : "border-reciclaje-500 bg-reciclaje-100 text-reciclaje-900"
                        }`}
                      >
                        {sol.flujo === "organico" ? (
                          <Leaf className="h-5 w-5 shrink-0" />
                        ) : (
                          <Recycle className="h-5 w-5 shrink-0" />
                        )}
                        <span>
                          {sol.flujo === "organico" ? "Orgánico" : "Reciclable"}
                        </span>
                      </span>

                      <span className="font-mono text-base font-black text-gray-900">
                        {sol.codigo}
                      </span>
                    </div>

                    <p className="mt-3 text-lg font-bold text-gray-900">
                      Pedido del {formatHumanDate(sol.creado_en)}
                    </p>

                    {/* Estado en lenguaje humano muy claro */}
                    <div
                      className={`mt-4 flex items-start gap-3 rounded-2xl border-2 p-4 ${statusBoxStyle}`}
                    >
                      <StatusIcon className="mt-0.5 h-6 w-6 shrink-0" />
                      <div>
                        <p className="text-lg font-black">{status.title}</p>
                        <p className="mt-1 text-base leading-relaxed">
                          {status.detail}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}

              {!isCoordinatorOrAdmin && (
                <div className="pt-2">
                  <WhatsAppCtaButton
                    label="Pedir nueva recolección por WhatsApp"
                    size="lg"
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}
        </section>

        {/* BLOQUE 3: MIS DATOS Y SALIR */}
        <section
          aria-labelledby="bloque-datos"
          className="rounded-3xl border-2 border-stone-300 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-900 text-white">
              {user.rol === "unidad_productiva" ? (
                <Building2 className="h-7 w-7" />
              ) : (
                <User className="h-7 w-7" />
              )}
            </span>
            <div>
              <h2
                id="bloque-datos"
                className="text-2xl font-black text-gray-900 sm:text-3xl"
              >
                Mis Datos y Salir
              </h2>
              <p className="text-base font-bold text-gray-800">
                {ROLE_LABEL[user.rol] || user.rol}
                {user.es_piloto ? " · Usuario Piloto" : ""}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border border-stone-300 bg-stone-50 p-4">
              <Home className="mt-1 h-6 w-6 shrink-0 text-huerta-700" />
              <div className="min-w-0">
                <p className="text-base font-bold text-gray-800">Nombre</p>
                <p className="text-lg font-black text-gray-900">
                  {user.nombre}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-stone-300 bg-stone-50 p-4">
              <Phone className="mt-1 h-6 w-6 shrink-0 text-huerta-700" />
              <div className="min-w-0">
                <p className="text-base font-bold text-gray-800">
                  Teléfono / WhatsApp
                </p>
                <p className="text-lg font-black text-gray-900">
                  {user.telefono || "Sin teléfono registrado"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-stone-300 bg-stone-50 p-4">
              <MapPin className="mt-1 h-6 w-6 shrink-0 text-huerta-700" />
              <div className="min-w-0">
                <p className="text-base font-bold text-gray-800">Dirección</p>
                <p className="text-lg font-black text-gray-900">
                  {user.direccion || "Pendiente de completar"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-stone-300 bg-stone-50 p-4">
              <Mail className="mt-1 h-6 w-6 shrink-0 text-reciclaje-700" />
              <div className="min-w-0">
                <p className="text-base font-bold text-gray-800">Correo</p>
                <p className="break-all text-lg font-black text-gray-900">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t-2 border-stone-200 pt-6">
            <button
              type="button"
              onClick={handleLogout}
              className="eco-btn-danger w-full"
            >
              <LogOut className="h-6 w-6 shrink-0" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
