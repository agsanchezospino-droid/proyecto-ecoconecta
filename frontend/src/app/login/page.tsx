"use client";

import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Home,
  KeyRound,
  Leaf,
  Loader2,
  LogIn,
  Recycle,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import BackToHomeButton from "@/components/BackToHomeButton";
import { useAuth } from "@/context/AuthContext";
import { ApiError, apiFetch } from "@/lib/api";
import type { DemoAccount, Usuario } from "@/lib/types";

const DEFAULT_DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "coord.huerta@villas.demo",
    nombre: "Marta Lucía Herrera",
    rol: "coordinador_huerteros",
    etiqueta: "Coordinador de Huerteros",
    descripcion: "Panel /coordinacion — pedidos orgánicos de WhatsApp.",
    flujo: "organico",
  },
  {
    email: "coord.reciclaje@villas.demo",
    nombre: "Carlos Alberto Barrios",
    rol: "coordinador_recicladores",
    etiqueta: "Coordinador de Recicladores",
    descripcion: "Panel /coordinacion — pedidos reciclables de WhatsApp.",
    flujo: "reciclable",
  },
  {
    email: "admin@villas.demo",
    nombre: "Andrea Carolina Pacheco",
    rol: "administrador",
    etiqueta: "Administrador Comunitario",
    descripcion: "Supervisión general, reglas de puntos y piloto.",
    flujo: null,
  },
  {
    email: "piloto@villas.demo",
    nombre: "Comedor Comunitario Sabor Caribeño",
    rol: "unidad_productiva",
    etiqueta: "Unidad Productiva Piloto",
    descripcion: "Ver pedidos, puntos y beneficios en Mi Cuenta.",
    flujo: "organico",
  },
  {
    email: "hogar@villas.demo",
    nombre: "Familia Mendoza Polo",
    rol: "hogar",
    etiqueta: "Hogar Ciudadano",
    descripcion: "Ver entregas, puntos y canjes en Mi Cuenta.",
    flujo: "reciclable",
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientWakeupError(err: unknown): boolean {
  if (err instanceof ApiError) {
    return (
      err.status === 502 ||
      err.status === 503 ||
      err.status === 504 ||
      err.status === 408
    );
  }
  return err instanceof TypeError;
}

function roleRedirect(user: Usuario, nextPath: string | null): string {
  const isCoord =
    user.rol === "coordinador_huerteros" ||
    user.rol === "coordinador_recicladores" ||
    user.rol === "administrador";
  if (nextPath && nextPath.startsWith("/")) {
    if (nextPath.startsWith("/coordinacion") && !isCoord) {
      return "/cuenta";
    }
    return nextPath;
  }
  return isCoord ? "/coordinacion" : "/cuenta";
}

function demoBadgeStyle(rol: DemoAccount["rol"]) {
  switch (rol) {
    case "coordinador_huerteros":
      return {
        card: "border-huerta-400 bg-huerta-50 hover:border-huerta-700",
        pill: "bg-huerta-700 text-white",
        Icon: Leaf,
      };
    case "coordinador_recicladores":
      return {
        card: "border-reciclaje-400 bg-reciclaje-50 hover:border-reciclaje-700",
        pill: "bg-reciclaje-700 text-white",
        Icon: Recycle,
      };
    case "administrador":
      return {
        card: "border-gray-500 bg-stone-100 hover:border-gray-900",
        pill: "bg-gray-900 text-white",
        Icon: ShieldCheck,
      };
    case "unidad_productiva":
      return {
        card: "border-sol-500 bg-sol-50 hover:border-sol-700",
        pill: "bg-sol-400 text-gray-900",
        Icon: Building2,
      };
    default:
      return {
        card: "border-stone-400 bg-white hover:border-huerta-700",
        pill: "bg-huerta-600 text-white",
        Icon: Home,
      };
  }
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const { login, demoLogin, register } = useAuth();

  const [tab, setTab] = useState<"login" | "register">("login");
  // Precarga inmediata de las 5 cuentas demo para que nunca se vea vacío durante el arranque en frío de Render
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>(
    DEFAULT_DEMO_ACCOUNTS
  );
  const [demoSyncState, setDemoSyncState] = useState<
    "checking" | "ready" | "waking" | "offline" | "disabled"
  >("checking");
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [regNombre, setRegNombre] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRol, setRegRol] = useState<"hogar" | "unidad_productiva">("hogar");
  const [regTelefono, setRegTelefono] = useState("");
  const [regDireccion, setRegDireccion] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Reintenta hasta ~75 segundos para cubrir por completo el arranque en frío del plan gratuito de Render
  const syncDemoAccounts = useCallback(async () => {
    setDemoSyncState("checking");
    const maxAttempts = 12;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (!mountedRef.current) return;
      try {
        const live = await apiFetch<DemoAccount[]>("/auth/demo-accounts", {
          auth: false,
        });
        if (!mountedRef.current) return;
        if (live.length === 0) {
          setDemoAccounts([]);
          setDemoSyncState("disabled");
        } else {
          setDemoAccounts(live);
          setDemoSyncState("ready");
        }
        return;
      } catch {
        if (!mountedRef.current) return;
        if (attempt < maxAttempts) {
          setDemoSyncState("waking");
          await sleep(5000);
        } else {
          setDemoAccounts(DEFAULT_DEMO_ACCOUNTS);
          setDemoSyncState("offline");
        }
      }
    }
  }, []);

  useEffect(() => {
    void syncDemoAccounts();
  }, [syncDemoAccounts]);

  const handleDemoClick = async (demoEmail: string) => {
    setError(null);
    setStatusMessage(null);
    setBusyEmail(demoEmail);
    try {
      // Hasta ~60 segundos de espera automática si Render Free Tier estaba dormido
      const maxAttempts = 10;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const user = await demoLogin(demoEmail);
          setStatusMessage(null);
          setDemoSyncState("ready");
          router.push(roleRedirect(user, nextPath));
          return;
        } catch (err) {
          if (isTransientWakeupError(err) && attempt < maxAttempts) {
            setDemoSyncState("waking");
            setStatusMessage(
              `El servidor gratuito de Render está encendiendo (tarda 25 a 50 segundos la primera vez). Reintentando automáticamente (${attempt}/${maxAttempts - 1})...`
            );
            await sleep(5000);
            continue;
          }
          throw err;
        }
      }
    } catch (err) {
      setStatusMessage(null);
      setError(
        err instanceof Error
          ? err.message
          : "El servidor tardó demasiado en responder. Toca 'Reintentar conexión' y prueba de nuevo."
      );
    } finally {
      setBusyEmail(null);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);
    setSubmitting(true);
    try {
      const maxAttempts = 8;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const user = await login(email, password);
          setStatusMessage(null);
          setDemoSyncState("ready");
          router.push(roleRedirect(user, nextPath));
          return;
        } catch (err) {
          if (isTransientWakeupError(err) && attempt < maxAttempts) {
            setDemoSyncState("waking");
            setStatusMessage(
              `Encendiendo el servidor en Render... reintentando inicio de sesión (${attempt}/${maxAttempts - 1}).`
            );
            await sleep(5000);
            continue;
          }
          throw err;
        }
      }
    } catch (err) {
      setStatusMessage(null);
      setError(
        err instanceof Error ? err.message : "Error al iniciar sesión."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);
    setSubmitting(true);
    try {
      const user = await register({
        nombre: regNombre,
        email: regEmail,
        password: regPassword,
        rol: regRol,
        telefono: regTelefono,
        direccion: regDireccion,
        barrio_sector: "Villas de San Pablo",
      });
      router.push(roleRedirect(user, nextPath));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear la cuenta."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <BackToHomeButton href="/" label="Volver al inicio" />

      <header className="max-w-3xl">
        <h1 className="text-3xl font-black text-gray-900 sm:text-4xl">
          Ingresa a tu cuenta
        </h1>
        <p className="mt-2 text-lg leading-relaxed text-gray-900">
          Entra para ver tus puntos y pedidos, o toca un usuario de prueba con
          un solo clic.
        </p>
      </header>

      {statusMessage && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border-2 border-sol-500 bg-sol-50 px-5 py-4 text-lg font-bold text-gray-900">
          <Loader2 className="h-6 w-6 shrink-0 animate-spin text-sol-700" />
          <span>{statusMessage}</span>
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border-2 border-rose-500 bg-rose-50 px-5 py-4 text-lg font-bold text-rose-900">
          <AlertCircle className="mt-1 h-6 w-6 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Máximo 2 columnas en escritorio, 1 sola columna en celular */}
      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Bloque 1: Acceso rápido demo en 1 clic */}
        <section className="rounded-3xl border-2 border-stone-300 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-black text-gray-900">
              Usuarios de prueba (1 clic)
            </h2>
            {demoSyncState === "waking" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sol-500 bg-sol-100 px-3 py-1 text-sm font-extrabold text-gray-900">
                <Loader2 className="h-4 w-4 animate-spin" />
                Encendiendo servidor...
              </span>
            )}
            {demoSyncState === "ready" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-huerta-500 bg-huerta-100 px-3 py-1 text-sm font-extrabold text-huerta-900">
                <CheckCircle2 className="h-4 w-4" />
                Servidor listo
              </span>
            )}
          </div>

          <p className="mt-2 text-base leading-relaxed text-gray-900">
            Toca cualquier perfil para entrar sin escribir clave. Clave manual
            para todos:{" "}
            <code className="rounded bg-stone-200 px-2 py-0.5 font-bold text-gray-900">
              EcoDemo2026!
            </code>
          </p>

          {demoSyncState === "waking" && (
            <p className="mt-4 rounded-2xl border-2 border-sol-400 bg-sol-50 px-4 py-3 text-base font-bold text-gray-900">
              El servidor gratuito en Render estaba en reposo y se está
              encendiendo (tarda 25 a 50 segundos). Puedes tocar tu perfil y
              entrará automáticamente apenas termine.
            </p>
          )}

          {demoSyncState === "offline" && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border-2 border-sol-500 bg-sol-50 p-4">
              <p className="text-base font-bold text-gray-900">
                El servidor en la nube todavía está encendiendo. Espera unos
                segundos o toca aquí para verificar:
              </p>
              <button
                type="button"
                onClick={() => void syncDemoAccounts()}
                className="eco-btn-amber w-full"
              >
                <RefreshCw className="h-5 w-5 shrink-0" />
                <span>Reintentar conexión</span>
              </button>
            </div>
          )}

          {demoSyncState === "disabled" ? (
            <p className="mt-5 rounded-2xl border-2 border-stone-200 bg-stone-50 p-5 text-base font-bold text-gray-900">
              El acceso rápido de prueba está desactivado en este entorno. Usa
              tu correo y contraseña en el formulario.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {demoAccounts.map((acc) => {
                const style = demoBadgeStyle(acc.rol);
                const Icon = style.Icon;
                const isLoading = busyEmail === acc.email;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={busyEmail !== null}
                    onClick={() => handleDemoClick(acc.email)}
                    className={`flex min-h-[82px] w-full items-center gap-4 rounded-2xl border-2 p-4 text-left shadow-sm transition ${style.card} disabled:opacity-60`}
                  >
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.pill}`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-black text-gray-900">
                        {acc.etiqueta}
                      </p>
                      <p className="truncate text-base font-bold text-gray-800">
                        {acc.nombre}
                      </p>
                      <p className="truncate font-mono text-sm font-semibold text-gray-700">
                        {acc.email}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Bloque 2: Formulario manual Ingresar / Crear cuenta */}
        <section className="h-fit rounded-3xl border-2 border-stone-300 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTab("login")}
              className={`inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 px-4 text-lg font-extrabold transition ${
                tab === "login"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-stone-300 bg-stone-50 text-gray-900 hover:bg-stone-100"
              }`}
            >
              <KeyRound className="h-5 w-5 shrink-0" />
              <span>Ingresar</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("register")}
              className={`inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 px-4 text-lg font-extrabold transition ${
                tab === "register"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-stone-300 bg-stone-50 text-gray-900 hover:bg-stone-100"
              }`}
            >
              <UserPlus className="h-5 w-5 shrink-0" />
              <span>Crear cuenta</span>
            </button>
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-lg font-bold text-gray-900"
                >
                  Correo electrónico
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hogar@villas.demo"
                  className="eco-input"
                />
              </div>
              <div>
                <label
                  htmlFor="login-password"
                  className="mb-2 block text-lg font-bold text-gray-900"
                >
                  Contraseña
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  className="eco-input"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="eco-btn-primary w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-6 w-6 shrink-0" />
                    <span>Entrar a mi cuenta</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="mt-6 space-y-5">
              <div>
                <p className="mb-2 text-lg font-bold text-gray-900">
                  ¿Quién eres?
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setRegRol("hogar")}
                    className={`inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 px-4 text-lg font-extrabold ${
                      regRol === "hogar"
                        ? "border-huerta-700 bg-huerta-600 text-white"
                        : "border-stone-300 bg-white text-gray-900"
                    }`}
                  >
                    <Home className="h-5 w-5 shrink-0" />
                    <span>Hogar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRol("unidad_productiva")}
                    className={`inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 px-4 text-lg font-extrabold ${
                      regRol === "unidad_productiva"
                        ? "border-huerta-700 bg-huerta-600 text-white"
                        : "border-stone-300 bg-white text-gray-900"
                    }`}
                  >
                    <Building2 className="h-5 w-5 shrink-0" />
                    <span>Negocio</span>
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-nombre"
                  className="mb-2 block text-lg font-bold text-gray-900"
                >
                  Tu nombre o nombre del negocio
                </label>
                <input
                  id="reg-nombre"
                  type="text"
                  required
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                  placeholder="Ej: Familia Gómez"
                  className="eco-input"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="mb-2 block text-lg font-bold text-gray-900"
                >
                  Correo electrónico
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="eco-input"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-tel"
                  className="mb-2 block text-lg font-bold text-gray-900"
                >
                  Número de WhatsApp
                </label>
                <input
                  id="reg-tel"
                  type="tel"
                  required
                  value={regTelefono}
                  onChange={(e) => setRegTelefono(e.target.value)}
                  placeholder="+57 300 000 0000"
                  className="eco-input"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-dir"
                  className="mb-2 block text-lg font-bold text-gray-900"
                >
                  Dirección en Villas de San Pablo
                </label>
                <input
                  id="reg-dir"
                  type="text"
                  required
                  value={regDireccion}
                  onChange={(e) => setRegDireccion(e.target.value)}
                  placeholder="Manzana X, Casa Y"
                  className="eco-input"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-pass"
                  className="mb-2 block text-lg font-bold text-gray-900"
                >
                  Contraseña (mínimo 6 letras o números)
                </label>
                <input
                  id="reg-pass"
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="eco-input"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="eco-btn-primary w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Creando cuenta...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-6 w-6 shrink-0" />
                    <span>Crear mi cuenta</span>
                  </>
                )}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-huerta-600" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
