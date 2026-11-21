"use client";

import {
  Building2,
  Home,
  KeyRound,
  Leaf,
  Loader2,
  LogIn,
  Recycle,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

import BackToHomeButton from "@/components/BackToHomeButton";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import type { DemoAccount, Usuario } from "@/lib/types";

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
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    apiFetch<DemoAccount[]>("/auth/demo-accounts", { auth: false })
      .then(setDemoAccounts)
      .catch(() => setDemoAccounts([]));
  }, []);

  const handleDemoClick = async (demoEmail: string) => {
    setError(null);
    setBusyEmail(demoEmail);
    try {
      const user = await demoLogin(demoEmail);
      router.push(roleRedirect(user, nextPath));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar sesión."
      );
    } finally {
      setBusyEmail(null);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      router.push(roleRedirect(user, nextPath));
    } catch (err) {
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
          Entra para ver tus puntos y pedidos, o toca una cuenta de prueba con
          un solo clic.
        </p>
      </header>

      {error && (
        <div className="mt-6 rounded-2xl border-2 border-rose-500 bg-rose-50 px-5 py-4 text-lg font-bold text-rose-900">
          {error}
        </div>
      )}

      {/* Máximo 2 columnas en escritorio, 1 sola columna en celular */}
      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Bloque 1: Acceso rápido demo en 1 clic */}
        <section className="rounded-3xl border-2 border-stone-300 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-gray-900">
            Entrar en 1 clic (Demo)
          </h2>
          <p className="mt-2 text-base leading-relaxed text-gray-900">
            Toca un perfil para probar sin escribir clave. Clave manual:{" "}
            <code className="rounded bg-stone-200 px-2 py-0.5 font-bold text-gray-900">
              EcoDemo2026!
            </code>
          </p>

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
                  className={`flex min-h-[72px] w-full items-center gap-4 rounded-2xl border-2 p-4 text-left shadow-sm transition ${style.card} disabled:opacity-60`}
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
                  </div>
                </button>
              );
            })}
          </div>
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
