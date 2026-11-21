"use client";

import {
  Building2,
  Home,
  KeyRound,
  Leaf,
  Loader2,
  Recycle,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

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
      return "/mi-cuenta";
    }
    return nextPath;
  }
  return isCoord ? "/coordinacion" : "/mi-cuenta";
}

function demoBadgeStyle(rol: DemoAccount["rol"]) {
  switch (rol) {
    case "coordinador_huerteros":
      return {
        card: "border-huerta-200 bg-huerta-50/70 hover:border-huerta-500",
        pill: "bg-huerta-600 text-white",
        Icon: Leaf,
      };
    case "coordinador_recicladores":
      return {
        card: "border-reciclaje-200 bg-reciclaje-50/70 hover:border-reciclaje-500",
        pill: "bg-reciclaje-600 text-white",
        Icon: Recycle,
      };
    case "administrador":
      return {
        card: "border-stone-300 bg-stone-100/80 hover:border-stone-700",
        pill: "bg-stone-900 text-white",
        Icon: ShieldCheck,
      };
    case "unidad_productiva":
      return {
        card: "border-sol-400/50 bg-sol-50/80 hover:border-sol-500",
        pill: "bg-sol-500 text-stone-950",
        Icon: Building2,
      };
    default:
      return {
        card: "border-stone-200 bg-white hover:border-huerta-500",
        pill: "bg-huerta-100 text-huerta-800",
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
        err instanceof Error ? err.message : "No se pudo iniciar sesión demo."
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
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-huerta-100 px-3 py-1 text-xs font-bold text-huerta-700">
          <Sparkles className="h-4 w-4 text-sol-600" />
          EcoConecta · Villas de San Pablo
        </span>
        <h1 className="mt-3 text-2xl font-black text-stone-900 sm:text-3xl">
          Ingresa a tu cuenta o prueba la demo en 1 clic
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-stone-600">
          Los pedidos de recolección se envían desde la app móvil de WhatsApp.
          Inicia sesión aquí si eres{" "}
          <strong>coordinador de colectivo</strong> para ingresar a{" "}
          <code className="font-bold text-stone-800">/coordinacion</code> o si
          deseas consultar tus puntos y entregas.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        {/* Acceso rápido demo */}
        <div className="eco-card p-6 lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-stone-900">
                Acceso rápido demo (datos 100 % ficticios)
              </h2>
              <p className="text-xs text-stone-500">
                Haz clic en cualquier rol para entrar automáticamente. Clave
                manual para todos:{" "}
                <code className="rounded bg-stone-100 px-1.5 py-0.5 font-bold text-stone-800">
                  EcoDemo2026!
                </code>
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
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
                  className={`flex w-full items-start gap-3.5 rounded-2xl border-2 p-4 text-left transition ${style.card} disabled:opacity-60`}
                >
                  <span
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.pill}`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-extrabold text-stone-900">
                        {acc.etiqueta}
                      </span>
                      <span className="font-mono text-xs font-semibold text-stone-600">
                        {acc.email}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-stone-700">
                      {acc.nombre}
                    </p>
                    <p className="mt-1 text-xs text-stone-600">
                      {acc.descripcion}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Formulario manual Login / Registro */}
        <div className="eco-card p-6 lg:col-span-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setTab("login")}
              className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-sm font-bold transition ${
                tab === "login"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600"
              }`}
            >
              <KeyRound className="h-4 w-4" />
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => setTab("register")}
              className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-sm font-bold transition ${
                tab === "register"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Registrarme
            </button>
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-stone-800">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hogar@villas.demo"
                  className="eco-input"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-stone-800">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="eco-input"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="eco-btn-primary w-full"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Entrar con mi cuenta"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="mt-5 space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700">
                  Tipo de participante
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRol("hogar")}
                    className={`rounded-xl border-2 px-3 py-2.5 text-xs font-bold ${
                      regRol === "hogar"
                        ? "border-huerta-600 bg-huerta-50 text-huerta-800"
                        : "border-stone-200 text-stone-600"
                    }`}
                  >
                    Hogar
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRol("unidad_productiva")}
                    className={`rounded-xl border-2 px-3 py-2.5 text-xs font-bold ${
                      regRol === "unidad_productiva"
                        ? "border-huerta-600 bg-huerta-50 text-huerta-800"
                        : "border-stone-200 text-stone-600"
                    }`}
                  >
                    Unidad Productiva
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700">
                  Nombre completo o del negocio
                </label>
                <input
                  type="text"
                  required
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                  placeholder="Ej: Familia Gómez / Tienda La Esquina"
                  className="eco-input py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="eco-input py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700">
                  WhatsApp / Teléfono
                </label>
                <input
                  type="tel"
                  required
                  value={regTelefono}
                  onChange={(e) => setRegTelefono(e.target.value)}
                  placeholder="+57 300 000 0000"
                  className="eco-input py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700">
                  Dirección en Villas de San Pablo
                </label>
                <input
                  type="text"
                  required
                  value={regDireccion}
                  onChange={(e) => setRegDireccion(e.target.value)}
                  placeholder="Manzana X, Casa Y, Villas de San Pablo"
                  className="eco-input py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700">
                  Contraseña (mín. 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="eco-input py-2.5 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="eco-btn-primary w-full"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Crear cuenta y continuar"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-huerta-600" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
