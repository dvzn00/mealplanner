import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatarPeriodo, somarDias } from "@/lib/data-iso";
import { segundaDaSemanaAtual } from "@/lib/semana";

/**
 * A semana vive na URL (`?semana=YYYY-MM-DD`), não em estado de cliente.
 * Assim o botão de voltar do navegador funciona, o link é compartilhável e
 * cada semana é uma renderização de servidor limpa.
 */
export function NavegacaoDeSemanas({
  semanaInicio,
  semanaFim,
}: {
  semanaInicio: string;
  semanaFim: string;
}) {
  const anterior = somarDias(semanaInicio, -7);
  const proxima = somarDias(semanaInicio, 7);
  const ehSemanaAtual = semanaInicio === segundaDaSemanaAtual();

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="icon"
          aria-label="Semana anterior"
        >
          <Link href={`/dashboard?semana=${anterior}`}>
            <ChevronLeft strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </Button>

        {/* Cresce para ocupar o meio no celular e encolhe no desktop, para as
            setas ficarem sempre coladas no texto. */}
        <p className="flex-1 text-center text-sm font-medium text-balance text-text-dark sm:flex-none">
          {formatarPeriodo(semanaInicio, semanaFim)}
        </p>

        <Button
          asChild
          variant="outline"
          size="icon"
          aria-label="Próxima semana"
        >
          <Link href={`/dashboard?semana=${proxima}`}>
            <ChevronRight strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {!ehSemanaAtual && (
        <Button asChild variant="ghost" size="sm" className="self-center sm:self-end">
          <Link href="/dashboard">Voltar para esta semana</Link>
        </Button>
      )}
    </div>
  );
}
