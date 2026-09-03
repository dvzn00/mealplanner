"use client";

import { useId, useOptimistic, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { ItemDeCompra } from "@/lib/data/lista-compras";
import { alternarComprado } from "@/lib/lista-compras/actions";
import { formatarMedida } from "@/lib/unidades";
import { cn } from "@/lib/utils";

/**
 * Marcar um item precisa responder na hora — daí `useOptimistic`: a marca
 * aparece antes da ida ao servidor e volta sozinha se a escrita falhar.
 */
export function ItemDaLista({ item }: { item: ItemDeCompra }) {
  const id = useId();
  const [comprado, definirComprado] = useOptimistic(item.comprado);
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5 shadow-soft transition-opacity sm:px-5",
        pendente && "opacity-70",
      )}
    >
      <Checkbox
        id={id}
        className="size-5"
        checked={comprado}
        onCheckedChange={(valor) =>
          iniciarTransicao(async () => {
            const marcado = valor === true;
            definirComprado(marcado);
            await alternarComprado({ id: item.id, comprado: marcado });
          })
        }
      />

      <label
        htmlFor={id}
        className="flex flex-1 cursor-pointer flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
      >
        <span
          className={cn(
            "font-medium text-text-dark",
            comprado && "text-text-muted line-through",
          )}
        >
          {item.nome}
        </span>
        <span
          className={cn(
            "text-sm tabular-nums text-text-muted",
            comprado && "line-through",
          )}
        >
          {formatarMedida(item.quantidade_total, item.unidade)}
        </span>
      </label>
    </li>
  );
}
