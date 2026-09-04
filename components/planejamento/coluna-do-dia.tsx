"use client";

import { Copy, Plus } from "lucide-react";
import type { DiaDoPlano, SlotDoPlano } from "@/lib/data/planejamento";
import { cn } from "@/lib/utils";
import { CartaoDoSlot } from "./cartao-do-slot";

export function ColunaDoDia({
  dia,
  ehHoje,
  somenteLeitura,
  aoAdicionar,
  aoCopiar,
  aoEditarSlot,
}: {
  dia: DiaDoPlano;
  ehHoje: boolean;
  somenteLeitura: boolean;
  aoAdicionar: () => void;
  aoCopiar: () => void;
  aoEditarSlot: (slot: SlotDoPlano) => void;
}) {
  const fimDeSemana = dia.slug === "sabado" || dia.slug === "domingo";

  return (
    <section
      aria-labelledby={`dia-${dia.slug}`}
      className={cn(
        "flex min-w-0 flex-col gap-2.5 rounded-3xl bg-gray-light-2 p-3",
        ehHoje && "ring-2 ring-primary",
      )}
    >
      {/*
        Duas cores, não sete. Fim de semana é uma categoria que a pessoa já usa
        para pensar — "o que eu como no sábado" é outra pergunta —, então a cor
        carrega significado em vez de virar um código a decorar. Sete matizes
        exigiriam inventar quatro que a marca não tem, mais catorze tokens por
        causa do tema escuro, e ainda assim quarta não é "mais lilás" que terça.

        Os dois pares já passam no teste de contraste nos dois temas.

        O cabeçalho gruda no celular: a página da semana tem uns 4.000px, e no
        meio das refeições de quinta o rótulo "Quinta" já saiu da tela faz
        tempo. Cor sozinha diria "você está na zona coral"; grudar responde
        "você está no sábado". No desktop as colunas ficam lado a lado e
        curtas, então não há o que grudar — daí o `max-md:`.

        `top-16` é a altura da barra do aplicativo, que também é grudenta.

        Só nome, marca de hoje e data. Um quarto elemento espremia "Segunda"
        até virar "Segu…" na coluna de 140px do desktop, e é por isso que a
        marca de hoje some acima de `md` — lá o anel e a posição já bastam.
      */}
      <header
        className={cn(
          // O respiro largo é só do celular. Na coluna de 133px do desktop,
          // 12px de padding a mais são o que transforma "Domingo" em "Domin…"
          // — e o nome do dia é a única coisa que ninguém deve adivinhar.
          "flex items-baseline gap-1.5 rounded-xl px-1 py-1.5 max-md:gap-2 max-md:rounded-2xl max-md:px-2.5",
          "max-md:sticky max-md:top-16 max-md:z-10",
          fimDeSemana
            ? "bg-secondary-soft text-secondary-deep"
            : "bg-primary-soft text-primary-deep",
        )}
      >
        <h3 id={`dia-${dia.slug}`} className="truncate text-sm font-semibold">
          {dia.longo}
        </h3>

        {ehHoje && (
          <span className="shrink-0 rounded-pill bg-card px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide md:hidden">
            Hoje
          </span>
        )}

        <span className="ml-auto shrink-0 text-xs tabular-nums">
          {dia.dataCurta}
        </span>
      </header>

      {dia.slots.map((slot) => (
        <CartaoDoSlot
          key={slot.id}
          slot={slot}
          diaLongo={dia.longo}
          somenteLeitura={somenteLeitura}
          aoEditar={() => aoEditarSlot(slot)}
        />
      ))}

      {/* As duas ações do dia moram juntas, no pé da coluna. */}
      {!somenteLeitura && (
        <div className="mt-auto flex items-stretch gap-1.5">
          <button
            type="button"
            onClick={aoAdicionar}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-pill border border-dashed border-input px-2 py-2.5 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
          >
            <Plus className="size-3.5" strokeWidth={2} aria-hidden="true" />
            Adicionar refeição
            <span className="sr-only">em {dia.longo}</span>
          </button>

          <button
            type="button"
            onClick={aoCopiar}
            aria-label={`Copiar ${dia.longo} para outro dia`}
            className="inline-flex w-9 shrink-0 items-center justify-center rounded-pill border border-dashed border-input text-text-muted transition-colors hover:border-primary hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
          >
            <Copy className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
