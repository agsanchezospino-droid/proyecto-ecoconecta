"use client";

import {
  ClipboardList,
  HelpCircle,
  Home,
  Leaf,
  LogIn,
  ShieldCheck,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, isCoordinatorOrAdmin } = useAuth();
  const pathname = usePathname();

  const isCoordRoute = pathname?.startsWith("/coordinacion");
  const isAccountRoute =
    pathname === "/cuenta" ||
    pathname === "/mi-cuenta" ||
    pathname === "/mis-puntos";

  return (
    <header
      className={`sticky top-0 z-40 border-b-2 ${
        isCoordRoute
          ? "border-stone-800 bg-stone-900 text-white"
          : "border-stone-200 bg-white text-gray-900 shadow-sm"
      }`}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        {/* Logo */}
        <Link
          href={isCoordRoute ? "/coordinacion" : "/"}
          className="flex items-center gap-3"
        >
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
              isCoordRoute
                ? "bg-sol-400 text-gray-900"
                : "bg-huerta-600 text-white"
            }`}
          >
            {isCoordRoute ? (
              <ShieldCheck className="h-7 w-7" />
            ) : (
              <Leaf className="h-7 w-7" />
            )}
          </span>
          <div className="leading-tight">
            <span className="block text-xl font-black tracking-tight">
              EcoConecta
            </span>
            <span
              className={`block text-sm font-bold ${
                isCoordRoute ? "text-sol-300" : "text-huerta-700"
              }`}
            >
              {isCoordRoute ? "Panel de Coordinación" : "Villas de San Pablo"}
            </span>
          </div>
        </Link>

        {/* Menú minimalista: exactamente 3 opciones siempre visibles (sin menús ocultos) */}
        <nav
          aria-label="Navegación principal"
          className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3"
        >
          <Link
            href="/"
            className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 px-3 py-2 text-center text-base font-extrabold transition sm:px-5 sm:text-lg ${
              pathname === "/"
                ? "border-huerta-700 bg-huerta-600 text-white shadow-sm"
                : isCoordRoute
                  ? "border-stone-700 bg-stone-800 text-white hover:bg-stone-700"
                  : "border-stone-300 bg-stone-50 text-gray-900 hover:bg-stone-100"
            }`}
          >
            <Home className="h-5 w-5 shrink-0" />
            <span>Inicio</span>
          </Link>

          <Link
            href="/ayuda"
            className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 px-3 py-2 text-center text-base font-extrabold transition sm:px-5 sm:text-lg ${
              pathname === "/ayuda"
                ? "border-huerta-700 bg-huerta-600 text-white shadow-sm"
                : isCoordRoute
                  ? "border-stone-700 bg-stone-800 text-white hover:bg-stone-700"
                  : "border-stone-300 bg-stone-50 text-gray-900 hover:bg-stone-100"
            }`}
          >
            <HelpCircle className="h-5 w-5 shrink-0" />
            <span className="leading-tight">Ayuda y Reglas</span>
          </Link>

          {isCoordinatorOrAdmin ? (
            <Link
              href="/coordinacion"
              className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 px-3 py-2 text-center text-base font-extrabold transition sm:px-5 sm:text-lg ${
                isCoordRoute
                  ? "border-sol-500 bg-sol-400 text-gray-900 shadow-sm"
                  : "border-gray-900 bg-gray-900 text-white hover:bg-gray-800"
              }`}
            >
              <ClipboardList className="h-5 w-5 shrink-0" />
              <span>Panel</span>
            </Link>
          ) : user ? (
            <Link
              href="/cuenta"
              className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 px-3 py-2 text-center text-base font-extrabold transition sm:px-5 sm:text-lg ${
                isAccountRoute
                  ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                  : "border-huerta-700 bg-huerta-50 text-huerta-900 hover:bg-huerta-100"
              }`}
            >
              <User className="h-5 w-5 shrink-0" />
              <span>Mi Cuenta</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 px-3 py-2 text-center text-base font-extrabold transition sm:px-5 sm:text-lg ${
                pathname === "/login"
                  ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                  : "border-gray-900 bg-gray-900 text-white hover:bg-gray-800"
              }`}
            >
              <LogIn className="h-5 w-5 shrink-0" />
              <span>Ingresar</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
