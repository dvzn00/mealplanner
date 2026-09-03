"use client";

import { Plus } from "lucide-react";
import type { DiaDoPlano, SlotDoPlano } from "@/lib/data/planejamento";
import { cn } from "@/lib/utils";
import { CartaoDoSlot } from "./cartao-do-slot";

export function ColunaDoDia({
  dia,
  ehHoje,
  aoAdicionar,
  aoEditarSlot,
}: {
  dia: DiaDoPlano;
  ehHoje: boolean;
  aoAdicionar: () => void;
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
      <header className="flex items-baseline justify-between gap-1 px-1">
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
          aoEditar={() => aoEditarSlot(slot)}
        />
      ))}

      <button
        type="button"
        onClick={aoAdicionar}
        className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-pill border border-dashed border-input px-3 py-2.5 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
      >
        <Plus className="size-3.5" strokeWidth={2} aria-hidden="true" />
        Adicionar refeição
        <span className="sr-only">em {dia.longo}</span>
      </button>
    </section>
  );
}
