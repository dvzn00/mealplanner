import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CartaoDeNumeroProps {
  icone: LucideIcon;
  rotulo: string;
  valor: string;
  detalhe: string;
  /** Sem href, o cartão é só leitura — não finge ser clicável. */
  href?: string;
  tom: "verde" | "coral" | "lilas";
}

const TONS = {
  verde: "bg-primary-soft text-primary-strong",
  coral: "bg-secondary-soft text-secondary-strong",
  lilas: "bg-tertiary-soft text-tertiary-strong",
} as const;

const BASE = "flex flex-col gap-4 rounded-3xl bg-card p-6 shadow-card";
const CLICAVEL =
  "transition-shadow hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong";

export function CartaoDeNumero({
  icone: Icone,
  rotulo,
  valor,
  detalhe,
  href,
  tom,
}: CartaoDeNumeroProps) {
  const conteudo = (
    <>
      <span
        className={`inline-flex size-11 items-center justify-center rounded-2xl ${TONS[tom]}`}
        aria-hidden="true"
      >
        <Icone className="size-5" strokeWidth={1.75} />
      </span>

      <span>
        <span className="block text-sm font-medium text-text-muted">
          {rotulo}
        </span>
        <span className="mt-1 block text-3xl font-semibold leading-none text-text-dark">
          {valor}
        </span>
        <span className="mt-2 block text-sm text-text-muted">{detalhe}</span>
      </span>
    </>
  );

  if (!href) {
    return <div className={BASE}>{conteudo}</div>;
  }

  return (
    <Link href={href} className={cn(BASE, CLICAVEL)}>
      {conteudo}
    </Link>
  );
}
