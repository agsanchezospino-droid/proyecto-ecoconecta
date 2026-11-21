"use client";

import { Loader2, Lock, ShieldAlert } from "lucide-react";
import Link from "next/link";

import CoordinatorConsole from "@/components/CoordinatorConsole";
import { useAuth } from "@/context/AuthContext";

export default function CoordinacionPage() {
  const { user, loading, isCoordinatorOrAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-huerta-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="eco-card p-7 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-sol-400">
            <Lock className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-black text-stone-900">
            Página Alterna de Coordinación
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Esta ruta (<code>/coordinacion</code>) está protegida por inicio de
            sesión y rol. Ingresa como <strong>Coordinador de Huerteros</strong>
            , <strong>Coordinador de Recicladores</strong> o{" "}
            <strong>Administrador</strong>.
          </p>
          <Link
            href="/login?next=/coordinacion"
            className="eco-btn-primary mt-6 w-full"
          >
            Iniciar sesión / Acceso rápido demo
          </Link>
        </div>
      </div>
    );
  }

  if (!isCoordinatorOrAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="eco-card border-2 border-rose-200 p-7 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
            <ShieldAlert className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-black text-stone-900">
            Acceso Restringido a Coordinadores
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Tu cuenta actual (<strong>{user.nombre}</strong> · rol{" "}
            <code>{user.rol}</code>) pertenece al Portal Ciudadano. Para
            consultar tus pedidos de WhatsApp y tus puntos, usa{" "}
            <strong>Mi Cuenta</strong>.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href="/mi-cuenta" className="eco-btn-primary flex-1">
              Ir a Mi Cuenta
            </Link>
            <Link href="/login" className="eco-btn-outline flex-1">
              Cambiar cuenta demo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <CoordinatorConsole />;
}
