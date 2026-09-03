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
      <header className="flex items-center justify-between gap-1 px-1">
        <h3
          id={`dia-${dia.slug}`}
          className={cn(
            "truncate text-sm font-semibold",
            ehHoje ? "text-primary-deep" : "text-text-dark",
          )}
        >
          {dia.longo}
        </h3>

        <div className="flex shrink-0 items-center gap-1">
          <span className="text-xs tabular-nums text-text-muted">
            {dia.dataCurta}
          </span>

          {!somenteLeitura && (
            <button
              type="button"
              onClick={aoCopiar}
              aria-label={`Copiar ${dia.longo} para outro dia`}
              className="inline-flex size-6 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-card hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
            >
              <Copy className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
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

      {!somenteLeitura && (
        <button
          type="button"
          onClick={aoAdicionar}
          className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-pill border border-dashed border-input px-3 py-2.5 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
        >
          <Plus className="size-3.5" strokeWidth={2} aria-hidden="true" />
          Adicionar refeição
          <span className="sr-only">em {dia.longo}</span>
        </button>
      )}
    </section>
  );
}
