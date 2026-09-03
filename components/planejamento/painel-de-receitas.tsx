"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import type { ReceitaDoSlot } from "@/lib/data/planejamento";
import { ReceitaArrastavel } from "./receita-arrastavel";

/**
 * A paleta de receitas, em faixa acima da grade.
 *
 * Já foi coluna lateral. O problema é aritmético: sete dias precisam de uns
 * 1000px para o texto não virar reticências, e uma coluna de 260px empurrava a
 * semana para fora da tela em 1440px. A semana é o produto — ela fica com a
 * largura inteira, e as receitas ocupam uma faixa de 70px em cima.
 *
 * Nunca um modal: um overlay entre a receita e o horário quebraria o arraste.
 */
export function PainelDeReceitas({ receitas }: { receitas: ReceitaDoSlot[] }) {
  return (
    <aside
      aria-label="Receitas para arrastar"
      // `min-w-0` não é enfeite: sem ele o item de grade adota a largura do
      // conteúdo, a faixa de receitas empurra a página e a tela inteira passa
      // a rolar na horizontal no celular.
      className="min-w-0 rounded-3xl bg-card p-4 shadow-card"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-text-dark">Receitas</h2>

        {receitas.length > 0 && (
          <p className="text-xs leading-relaxed text-text-muted">
            Arraste para um horário da semana.
          </p>
        )}

        <Link
          href="/receitas"
          className="ml-auto rounded-md text-xs font-medium text-primary-deep underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
        >
          Ver todas
        </Link>
      </div>

      {receitas.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-xs leading-relaxed text-text-muted">
          <BookOpen
            className="size-4 shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          Nenhuma receita ainda. Importe uma sugestão para começar.
        </p>
      ) : (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {receitas.map((receita) => (
            <li key={receita.id} className="flex">
              <ReceitaArrastavel receita={receita} />
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
