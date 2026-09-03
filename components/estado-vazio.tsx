import type { LucideIcon } from "lucide-react";

interface EstadoVazioProps {
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  acao?: React.ReactNode;
  /** O tom do círculo do ícone. Verde por padrão. */
  tom?: "verde" | "coral" | "lilas";
}

const TONS = {
  verde: "bg-primary-soft text-primary-strong",
  coral: "bg-secondary-soft text-secondary-strong",
  lilas: "bg-tertiary-soft text-tertiary-strong",
} as const;

/** Tela vazia é convite para agir, não aviso de erro. */
export function EstadoVazio({
  icone: Icone,
  titulo,
  descricao,
  acao,
  tom = "verde",
}: EstadoVazioProps) {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-card px-6 py-14 text-center shadow-card">
      <span
        className={`inline-flex size-14 items-center justify-center rounded-3xl ${TONS[tom]}`}
        aria-hidden="true"
      >
        <Icone className="size-6" strokeWidth={1.75} />
      </span>
      <h2 className="mt-5 text-base font-semibold text-text-dark">{titulo}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-muted">
        {descricao}
      </p>
      {acao && <div className="mt-6">{acao}</div>}
    </div>
  );
}
