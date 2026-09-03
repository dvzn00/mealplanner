import { CalendarDays, History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoDePagina } from "@/components/cabecalho-de-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { Button } from "@/components/ui/button";
import { formatarPeriodo } from "@/lib/data-iso";
import { listarHistorico, type SemanaDoHistorico } from "@/lib/data/historico";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Histórico" };

const ETIQUETAS = {
  atual: { texto: "Esta semana", classe: "bg-primary-soft text-primary-deep" },
  futura: { texto: "Ainda vem", classe: "bg-tertiary-soft text-tertiary-deep" },
  passada: { texto: "Já passou", classe: "bg-gray-light-2 text-text-muted" },
} as const;

export default async function PaginaDeHistorico() {
  const semanas = await listarHistorico();

  return (
    <div className="mx-auto grid max-w-3xl gap-7">
      <CabecalhoDePagina
        titulo="Histórico"
        descricao="As semanas que você já planejou, para consultar ou copiar de novo."
      />

      {semanas.length === 0 ? (
        <EstadoVazio
          icone={History}
          titulo="Suas semanas ficam aqui"
          descricao="Assim que você montar uma semana, ela aparece nesta lista — com a opção de copiar um dia ou a semana inteira."
        />
      ) : (
        <ul className="grid gap-3">
          {semanas.map((semana) => (
            <li key={semana.id}>
              <CartaoDaSemana semana={semana} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CartaoDaSemana({ semana }: { semana: SemanaDoHistorico }) {
  const etiqueta = ETIQUETAS[semana.situacao];

  return (
    <article className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-card p-5 shadow-card sm:p-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-text-dark">
            {formatarPeriodo(semana.semanaInicio, semana.semanaFim)}
          </h2>
          <span
            className={cn(
              "rounded-pill px-3 py-1 text-xs font-semibold",
              etiqueta.classe,
            )}
          >
            {etiqueta.texto}
          </span>
        </div>

        <p className="mt-1.5 text-sm text-text-muted">
          {semana.refeicoesPlanejadas} de {semana.totalDeHorarios} horários com
          receita.
        </p>

        {semana.copiadaDe && (
          <p className="mt-1 text-xs text-text-muted">
            Copiada da semana de {semana.copiadaDe.split("-").reverse().join("/")}.
          </p>
        )}
      </div>

      <Button asChild variant="outline">
        <Link href={`/dashboard?semana=${semana.semanaInicio}`}>
          <CalendarDays strokeWidth={1.75} aria-hidden="true" />
          Ver cardápio
        </Link>
      </Button>
    </article>
  );
}
