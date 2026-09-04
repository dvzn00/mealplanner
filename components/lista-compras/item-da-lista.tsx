"use client";

import { RotateCcw, X } from "lucide-react";
import { useId, useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import type { ItemDeCompra } from "@/lib/data/lista-compras";
import {
  alternarComprado,
  alternarDispensado,
} from "@/lib/lista-compras/actions";
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
            const resultado = await alternarComprado(item.id, marcado);
            if (!resultado.sucesso) toast.error(resultado.erro);
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

      <button
        type="button"
        aria-label={`Dispensar ${item.nome} da lista`}
        disabled={pendente}
        onClick={() =>
          iniciarTransicao(async () => {
            const resultado = await alternarDispensado(item.id, true);
            if (!resultado.sucesso) toast.error(resultado.erro);
          })
        }
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-pill text-text-muted transition-colors hover:bg-secondary-soft hover:text-secondary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
      >
        <X className="size-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </li>
  );
}

/** Um item que o usuário tirou da lista, com o caminho de volta. */
export function ItemDispensado({ item }: { item: ItemDeCompra }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-gray-light-2 px-4 py-3 transition-opacity sm:px-5",
        pendente && "opacity-70",
      )}
    >
      <span className="flex flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-text-muted">
        <span className="font-medium">{item.nome}</span>
        <span className="text-sm tabular-nums">
          {formatarMedida(item.quantidade_total, item.unidade)}
        </span>
      </span>

      <button
        type="button"
        aria-label={`Trazer ${item.nome} de volta para a lista`}
        disabled={pendente}
        onClick={() =>
          iniciarTransicao(async () => {
            const resultado = await alternarDispensado(item.id, false);
            if (!resultado.sucesso) toast.error(resultado.erro);
          })
        }
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-pill text-text-muted transition-colors hover:bg-card hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
      >
        <RotateCcw className="size-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </li>
  );
}
