"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import type { ReceitaDoSlot } from "@/lib/data/planejamento";
import { idDaReceita } from "@/lib/planejamento/arraste";
import { cn } from "@/lib/utils";

/**
 * Uma receita do painel, pronta para ser levada até um horário.
 *
 * O elemento inteiro é a alça: no painel não há mais nada para clicar, então
 * exigir uma pegada estreita só atrapalharia. Dentro de um horário a história
 * é outra — lá a alça é o `GripVertical`, para a lixeira continuar clicável.
 */
export function ReceitaArrastavel({ receita }: { receita: ReceitaDoSlot }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: idDaReceita(receita.id),
    data: { receita },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label={`Arrastar ${receita.nome} para um horário`}
      className={cn(
        // `touch-pan-y`, e não `touch-none`: o painel é uma grade dentro de uma
        // página que rola para baixo. Com `touch-none` o dnd-kit fica com todo
        // gesto sobre o cartão e a página trava quando o dedo começa em cima de
        // uma receita — no celular o painel ocupa o topo, então é onde o dedo
        // começa. Deixando o pan vertical com o navegador, deslizar rola a
        // página e segurar arrasta, que é a separação que o atraso de 220ms do
        // TouchSensor já fazia no tempo.
        "flex w-full min-w-0 cursor-grab touch-pan-y items-start gap-2 rounded-2xl bg-card p-3 text-left shadow-soft transition-shadow active:cursor-grabbing",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong",
        isDragging ? "opacity-40" : "hover:shadow-card",
      )}
      {...listeners}
      {...attributes}
    >
      <GripVertical
        className="mt-0.5 size-4 shrink-0 text-text-muted"
        strokeWidth={1.75}
        aria-hidden="true"
      />

      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-xs font-semibold leading-snug text-text-dark">
          {receita.nome}
        </span>
        <span className="mt-1 block text-xs tabular-nums text-text-muted">
          {receita.calorias} kcal
        </span>
      </span>
    </button>
  );
}

/** O que aparece sob o cursor durante o arraste. */
export function EtiquetaArrastada({ receita }: { receita: ReceitaDoSlot }) {
  return (
    <div className="w-40 cursor-grabbing rounded-2xl bg-card p-3 shadow-float ring-2 ring-primary">
      <p className="line-clamp-2 text-xs font-semibold leading-snug text-text-dark">
        {receita.nome}
      </p>
      <p className="mt-1 text-xs tabular-nums text-text-muted">
        {receita.calorias} kcal
      </p>
    </div>
  );
}
