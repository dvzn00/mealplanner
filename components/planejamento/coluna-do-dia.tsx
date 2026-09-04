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
  return (
    <section
      aria-labelledby={`dia-${dia.slug}`}
      className={cn(
        "flex min-w-0 flex-col gap-2.5 rounded-3xl bg-gray-light-2 p-3",
        ehHoje && "ring-2 ring-primary",
      )}
    >
      {/*
        Só nome e data no cabeçalho. Um terceiro elemento aqui espremia
        "Segunda" até virar "Segu…" — a coluna tem cerca de 140px, e o nome do
        dia é a única coisa que ninguém deve precisar adivinhar.
      */}
      <header className="flex items-baseline justify-between gap-2 px-1">
        <h3
          id={`dia-${dia.slug}`}
          className={cn(
            "truncate text-sm font-semibold",
            ehHoje ? "text-primary-deep" : "text-text-dark",
          )}
        >
          {dia.longo}
        </h3>
        <span className="shrink-0 text-xs tabular-nums text-text-muted">
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
