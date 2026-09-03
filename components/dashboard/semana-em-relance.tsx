import type { DiaDoResumo } from "@/lib/data/dashboard";
import { cn } from "@/lib/utils";

/**
 * A semana inteira em uma tira: cada dia com um ponto por refeição, cheio
 * quando já tem receita. É a leitura que o produto existe para dar — dá para
 * ver de relance onde a semana está furada.
 */
export function SemanaEmRelance({
  dias,
  hoje,
}: {
  dias: DiaDoResumo[];
  hoje: string | null;
}) {
  return (
    <ol className="grid grid-cols-4 gap-2.5 sm:grid-cols-7 sm:gap-3">
      {dias.map((dia) => {
        const ehHoje = dia.slug === hoje;

        return (
          <li
            key={dia.slug}
            className={cn(
              "rounded-2xl bg-card px-2 py-4 text-center shadow-soft",
              ehHoje && "ring-2 ring-secondary",
            )}
          >
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                ehHoje ? "text-secondary-deep" : "text-text-muted",
              )}
            >
              <span aria-hidden="true">{dia.curto}</span>
              <span className="sr-only">{dia.longo}</span>
            </p>

            <div className="mt-3 flex items-center justify-center gap-1.5">
              {Array.from({ length: Math.max(dia.total, 1) }, (_, indice) => (
                <span
                  key={indice}
                  className={cn(
                    "size-2 rounded-full",
                    indice < dia.preenchidos
                      ? "bg-primary"
                      : "bg-gray-light-2 ring-1 ring-border",
                  )}
                />
              ))}
            </div>

            <p className="mt-3 text-xs text-text-muted">
              <span className="sr-only">
                {dia.preenchidos} de {dia.total} refeições planejadas
              </span>
              <span aria-hidden="true">
                {dia.preenchidos}/{dia.total}
              </span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
