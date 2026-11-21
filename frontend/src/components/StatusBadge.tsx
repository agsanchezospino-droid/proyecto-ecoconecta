import type { EstadoSolicitud } from "@/lib/types";

const ESTADO_CONFIG: Record<
  EstadoSolicitud,
  { label: string; className: string }
> = {
  recibida: {
    label: "Recibida",
    className: "bg-sol-100 text-sol-700 border-sol-400/50",
  },
  en_revision: {
    label: "En revisión",
    className: "bg-sky-100 text-sky-800 border-sky-300",
  },
  asignada: {
    label: "Asignada",
    className: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  programada: {
    label: "Programada",
    className: "bg-reciclaje-100 text-reciclaje-700 border-reciclaje-200",
  },
  recolectada: {
    label: "Recolectada",
    className: "bg-huerta-100 text-huerta-700 border-huerta-200",
  },
  cancelada: {
    label: "Cancelada",
    className: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

export function EstadoBadge({ estado }: { estado: EstadoSolicitud }) {
  const cfg = ESTADO_CONFIG[estado] ?? {
    label: estado,
    className: "bg-stone-100 text-stone-700 border-stone-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.className}`}
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
      <span className="inline-flex items-center gap-1 rounded-full bg-huerta-100 px-2.5 py-0.5 text-xs font-bold text-huerta-700">
        Orgánico · Huerta
      </span>
    );
  }
  if (flujo === "reciclable") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-reciclaje-100 px-2.5 py-0.5 text-xs font-bold text-reciclaje-700">
        Reciclable · Recicladores
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-bold text-stone-700">
      No aprovechable · Aseo ordinario
    </span>
  );
}
