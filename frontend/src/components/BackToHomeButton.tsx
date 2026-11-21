import Link from "next/link";

interface BackToHomeButtonProps {
  href?: string;
  label?: string;
  className?: string;
}

export default function BackToHomeButton({
  href = "/",
  label = "Volver al inicio",
  className = "",
}: BackToHomeButtonProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <Link
        href={href}
        className="inline-flex min-h-[56px] items-center gap-3 rounded-2xl border-2 border-gray-900 bg-white px-5 py-3 text-lg font-extrabold text-gray-900 shadow-sm transition hover:bg-stone-100 active:scale-[0.99]"
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-2xl font-black leading-none text-gray-900"
        >
          ←
        </span>
        <span>{label}</span>
      </Link>
    </div>
  );
}
