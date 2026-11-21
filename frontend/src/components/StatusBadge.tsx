import type { EstadoSolicitud } from "@/lib/types";

const ESTADO_CONFIG: Record<
  EstadoSolicitud,
  { label: string; className: string }
> = {
  recibida: {
    label: "Recibida",
    className: "bg-sol-100 text-gray-900 border-sol-500",
  },
  en_revision: {
    label: "En revisión",
    className: "bg-sky-100 text-sky-950 border-sky-400",
  },
  asignada: {
    label: "Asignada",
    className: "bg-indigo-100 text-indigo-950 border-indigo-400",
  },
  programada: {
    label: "Programada",
    className: "bg-reciclaje-100 text-reciclaje-900 border-reciclaje-400",
  },
  recolectada: {
    label: "Ya recogido",
    className: "bg-huerta-100 text-huerta-900 border-huerta-400",
  },
  cancelada: {
    label: "Cancelada",
    className: "bg-rose-100 text-rose-900 border-rose-400",
  },
};

export function EstadoBadge({ estado }: { estado: EstadoSolicitud }) {
  const cfg = ESTADO_CONFIG[estado] ?? {
    label: estado,
    className: "bg-stone-100 text-gray-900 border-stone-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border-2 px-3.5 py-1 text-sm font-extrabold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

export function FlujoBadge({
  flujo,
}: {
  flujo: "organico" | "reciclable" | "no_aprovechable";
}) {
  if (flujo === "organico") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-huerta-400 bg-huerta-100 px-3.5 py-1 text-sm font-extrabold text-huerta-900">
        Orgánico · Huerta
      </span>
    );
  }
  if (flujo === "reciclable") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-reciclaje-400 bg-reciclaje-100 px-3.5 py-1 text-sm font-extrabold text-reciclaje-900">
        Reciclable · Recicladores
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-stone-400 bg-stone-200 px-3.5 py-1 text-sm font-extrabold text-gray-900">
      No aprovechable · Aseo
    </span>
  );
}
