"use client";

import { KeyRound, Loader2, Lock, ShieldAlert, User } from "lucide-react";
import Link from "next/link";

import BackToHomeButton from "@/components/BackToHomeButton";
import CoordinatorConsole from "@/components/CoordinatorConsole";
import { useAuth } from "@/context/AuthContext";

export default function CoordinacionPage() {
  const { user, loading, isCoordinatorOrAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-huerta-600" />
        <p className="text-lg font-bold text-gray-900">
          Cargando panel de coordinación...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <BackToHomeButton href="/" label="Volver al inicio" />
        <div className="rounded-3xl border-2 border-stone-300 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900 text-sol-400">
            <Lock className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-3xl font-black text-gray-900">
            Panel de Coordinación
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-gray-900">
            Esta sección es solo para coordinadores de Huerteros, Recicladores o
            Administradores.
          </p>
          <Link
            href="/login?next=/coordinacion"
            className="eco-btn-primary mt-6 w-full"
          >
            <KeyRound className="h-6 w-6 shrink-0" />
            <span>Iniciar sesión</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!isCoordinatorOrAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <BackToHomeButton href="/" label="Volver al inicio" />
        <div className="rounded-3xl border-2 border-rose-400 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-800">
            <ShieldAlert className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-2xl font-black text-gray-900 sm:text-3xl">
            Solo para Coordinadores
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-gray-900">
            Tu cuenta (<strong>{user.nombre}</strong>) es del Portal Ciudadano.
            Para ver tus puntos y pedidos entra a <strong>Mi Cuenta</strong>.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/cuenta" className="eco-btn-primary flex-1">
              <User className="h-6 w-6 shrink-0" />
              <span>Ir a Mi Cuenta</span>
            </Link>
            <Link href="/login" className="eco-btn-outline flex-1">
              <KeyRound className="h-6 w-6 shrink-0" />
              <span>Cambiar cuenta</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <CoordinatorConsole />;
}
