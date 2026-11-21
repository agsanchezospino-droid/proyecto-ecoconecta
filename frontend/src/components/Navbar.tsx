"use client";

import {
  ClipboardList,
  Gift,
  HelpCircle,
  Leaf,
  LogIn,
  LogOut,
  Menu,
  Recycle,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import WhatsAppCtaButton from "@/components/WhatsAppCtaButton";
import { useAuth } from "@/context/AuthContext";
import { formatPts } from "@/lib/types";

const ROLE_LABELS: Record<string, string> = {
  hogar: "Hogar",
  unidad_productiva: "Unidad Productiva",
  coordinador_huerteros: "Coord. Huerteros",
  coordinador_recicladores: "Coord. Recicladores",
  administrador: "Administrador",
};

export default function Navbar() {
  const { user, isCoordinatorOrAdmin, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const isCoordRoute = pathname?.startsWith("/coordinacion");

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    router.push("/");
  };

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-md ${
        isCoordRoute
          ? "border-stone-800 bg-stone-900/95 text-white"
          : "border-stone-200/90 bg-white/95 text-stone-900"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href={isCoordRoute ? "/coordinacion" : "/"}
          className="flex items-center gap-2.5"
          onClick={() => setMenuOpen(false)}
        >
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${
              isCoordRoute
                ? "bg-sol-500 text-stone-950"
                : "bg-huerta-600 text-white"
            }`}
          >
            {isCoordRoute ? (
              <ShieldCheck className="h-6 w-6" />
            ) : (
              <Leaf className="h-6 w-6" />
            )}
          </span>
          <div className="leading-tight">
            <span className="block text-base font-extrabold tracking-tight sm:text-lg">
              EcoConecta
            </span>
            <span
              className={`block text-xs font-medium ${
                isCoordRoute ? "text-sol-400" : "text-huerta-600"
              }`}
            >
              {isCoordRoute
                ? "Panel de Coordinación"
                : "Villas de San Pablo · Barranquilla"}
            </span>
          </div>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1.5 lg:flex">
          <Link
            href="/"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              pathname === "/"
                ? "bg-huerta-50 text-huerta-700"
                : isCoordRoute
                  ? "text-stone-300 hover:bg-stone-800 hover:text-white"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            Inicio
          </Link>
          <Link
            href="/#guia"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              isCoordRoute
                ? "text-stone-300 hover:bg-stone-800 hover:text-white"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            Separar
          </Link>
          <Link
            href="/ayuda"
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              pathname === "/ayuda"
                ? "bg-huerta-50 text-huerta-700"
                : isCoordRoute
                  ? "text-stone-300 hover:bg-stone-800 hover:text-white"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            Ayuda y Reglas
          </Link>

          {!isCoordinatorOrAdmin && (
            <WhatsAppCtaButton
              label="Pedir por WhatsApp"
              size="sm"
              variant="nav"
            />
          )}

          {user && !isCoordinatorOrAdmin && (
            <>
              <Link
                href="/mis-puntos"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  pathname === "/mis-puntos"
                    ? "bg-sol-100 text-stone-900"
                    : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                <Gift className="h-4 w-4 text-sol-600" />
                Puntos
                <span className="rounded-full bg-sol-400 px-2 py-0.5 text-xs font-bold text-stone-950">
                  {formatPts(user.puntos_acumulados)} pts
                </span>
              </Link>
              <Link
                href="/mi-cuenta"
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  pathname === "/mi-cuenta"
                    ? "bg-stone-900 text-white"
                    : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                <User className="h-4 w-4" />
                Mi Cuenta
              </Link>
            </>
          )}

          {isCoordinatorOrAdmin && (
            <Link
              href="/coordinacion"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition ${
                isCoordRoute
                  ? "bg-sol-500 text-stone-950"
                  : "bg-stone-900 text-white hover:bg-stone-800"
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Panel /coordinacion
            </Link>
          )}

          {user ? (
            <div className="ml-2 flex items-center gap-2 border-l border-stone-300/40 pl-3">
              {!isCoordinatorOrAdmin ? (
                <Link
                  href="/mi-cuenta"
                  className="rounded-lg px-1.5 py-0.5 text-right leading-tight transition hover:bg-stone-100"
                  title="Ir a Mi Cuenta"
                >
                  <p className="max-w-[140px] truncate text-xs font-bold text-stone-800">
                    {user.nombre}
                  </p>
                  <p className="text-[11px] font-medium text-stone-500">
                    {ROLE_LABELS[user.rol] || user.rol}
                  </p>
                </Link>
              ) : (
                <div className="text-right leading-tight">
                  <p
                    className={`max-w-[140px] truncate text-xs font-bold ${
                      isCoordRoute ? "text-white" : "text-stone-800"
                    }`}
                  >
                    {user.nombre}
                  </p>
                  <p
                    className={`text-[11px] font-medium ${
                      isCoordRoute ? "text-stone-400" : "text-stone-500"
                    }`}
                  >
                    {ROLE_LABELS[user.rol] || user.rol}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={handleLogout}
                title="Cerrar sesión"
                className={`rounded-lg p-2 transition ${
                  isCoordRoute
                    ? "text-stone-300 hover:bg-stone-800 hover:text-white"
                    : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-1 inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              <LogIn className="h-4 w-4" />
              Ingresar
            </Link>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Abrir menú"
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl lg:hidden ${
            isCoordRoute
              ? "bg-stone-800 text-white"
              : "bg-stone-100 text-stone-800"
          }`}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          className={`border-t px-4 pb-5 pt-3 lg:hidden ${
            isCoordRoute
              ? "border-stone-800 bg-stone-900 text-white"
              : "border-stone-200 bg-white text-stone-900"
          }`}
        >
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-base font-semibold hover:bg-huerta-50 hover:text-huerta-700"
            >
              Inicio
            </Link>
            <Link
              href="/#guia"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-base font-semibold hover:bg-huerta-50 hover:text-huerta-700"
            >
              <Recycle className="h-5 w-5 text-reciclaje-600" />
              Aprender a Separar
            </Link>
            <Link
              href="/ayuda"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-base font-semibold hover:bg-huerta-50 hover:text-huerta-700"
            >
              <HelpCircle className="h-5 w-5 text-huerta-600" />
              Centro de Ayuda y Reglamentos
            </Link>
            {!isCoordinatorOrAdmin && (
              <WhatsAppCtaButton
                label="Pedir Recolección por WhatsApp"
                size="md"
                className="w-full"
              />
            )}
            {user && !isCoordinatorOrAdmin && (
              <>
                <Link
                  href="/mis-puntos"
                  onClick={() => setMenuOpen(false)}
                  className="eco-btn-amber w-full"
                >
                  <Gift className="h-5 w-5" />
                  Mis Puntos y Beneficios ({formatPts(user.puntos_acumulados)}{" "}
                  pts)
                </Link>
                <Link
                  href="/mi-cuenta"
                  onClick={() => setMenuOpen(false)}
                  className="eco-btn-outline w-full"
                >
                  <User className="h-5 w-5" />
                  Mi Cuenta y Pedidos
                </Link>
              </>
            )}
            {isCoordinatorOrAdmin && (
              <Link
                href="/coordinacion"
                onClick={() => setMenuOpen(false)}
                className="eco-btn-amber w-full"
              >
                <ClipboardList className="h-5 w-5" />
                Ir a /coordinacion
              </Link>
            )}
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 py-3 text-base font-semibold"
              >
                <LogOut className="h-5 w-5" />
                Cerrar sesión ({user.nombre})
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="eco-btn-outline w-full"
              >
                <LogIn className="h-5 w-5" />
                Ingresar / Coordinadores
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
