"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVertical, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTransition } from "react";
import type { SlotDoPlano } from "@/lib/data/planejamento";
import { limparReceitaDoSlot } from "@/lib/planejamento/actions";
import { idDoSlot } from "@/lib/planejamento/arraste";
import { formatarHorario } from "@/lib/semana";
import { cn } from "@/lib/utils";

/**
 * Um horário da grade. É alvo de arraste sempre, e origem quando tem receita.
 *
 * Uma coluna de dia tem cerca de 140px. Nome e horário lado a lado nessa
 * largura viram "Café d… 08:00" — por isso o horário vem em cima, como
 * sobretítulo, e o nome ocupa a linha inteira.
 */
export function CartaoDoSlot({
  slot,
  diaLongo,
  somenteLeitura,
  aoEditar,
}: {
  slot: SlotDoPlano;
  diaLongo: string;
  somenteLeitura: boolean;
  aoEditar: () => void;
}) {
  const [limpando, iniciarTransicao] = useTransition();
  const { receita } = slot;

  const { setNodeRef: referenciaDoAlvo, isOver } = useDroppable({
    id: idDoSlot(slot.id),
  });

  const {
    attributes,
    listeners,
    setNodeRef: referenciaDaOrigem,
    isDragging,
  } = useDraggable({
    id: idDoSlot(slot.id),
    disabled: somenteLeitura || receita === null,
    data: { receita },
  });

  const cabecalho = (
    <>
      <span className="block text-xs font-medium tabular-nums text-text-muted">
        {formatarHorario(slot.horario)}
      </span>
      <span className="mt-0.5 block text-sm font-semibold leading-snug text-text-dark">
        {slot.nomeRefeicao}
      </span>
    </>
  );

  return (
    <article
      ref={referenciaDoAlvo}
      className={cn(
        "rounded-2xl bg-card p-3 shadow-soft transition-all",
        isOver && "ring-2 ring-primary",
        limpando && "opacity-60",
      )}
    >
      {somenteLeitura ? (
        <div>{cabecalho}</div>
      ) : (
        <button
          type="button"
          onClick={aoEditar}
          className="block w-full rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
        >
          {cabecalho}
          <span className="sr-only">— editar nome e horário</span>
        </button>
      )}

      {receita ? (
        <div
          ref={referenciaDaOrigem}
          className={cn(
            "mt-2.5 rounded-xl bg-primary-soft p-2.5",
            isDragging && "opacity-40",
          )}
        >
          <div className="flex items-start gap-1.5">
            {/* A alça é só o punho: assim a lixeira continua clicável. */}
            {!somenteLeitura && (
            <button
              type="button"
              aria-label={`Arrastar ${receita.nome} de ${slot.nomeRefeicao} de ${diaLongo}`}
              className="-ml-1 mt-0.5 shrink-0 cursor-grab touch-none rounded text-primary-deep/60 transition-colors hover:text-primary-deep active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
              {...listeners}
              {...attributes}
            >
              <GripVertical
                className="size-3.5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </button>
            )}

            {receita.imagem_url ? (
              <Image
                src={receita.imagem_url}
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-lg object-cover"
              />
            ) : null}

            <p className="line-clamp-3 min-w-0 flex-1 text-xs font-semibold leading-snug text-primary-deep">
              {receita.nome}
            </p>
          </div>

          {/* Calorias e lixeira dividem a linha de baixo para que o nome da
              receita fique com a largura inteira do cartão. */}
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-xs tabular-nums text-text-muted">
              {receita.calorias} kcal
            </span>

            {!somenteLeitura && (
            <button
              type="button"
              aria-label={`Tirar ${receita.nome} de ${slot.nomeRefeicao} de ${diaLongo}`}
              disabled={limpando}
              onClick={() =>
                iniciarTransicao(async () => {
                  await limparReceitaDoSlot(slot.id);
                })
              }
              className="-mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-card hover:text-secondary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
            >
              <Trash2
                className="size-3.5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </button>
            )}
          </div>
        </div>
      ) : somenteLeitura ? (
        <p className="mt-2.5 rounded-xl border border-dashed border-input px-2 py-3.5 text-center text-xs text-text-muted">
          Sem receita
        </p>
      ) : (
        // O vazio é botão, não parágrafo: "arraste aqui" é uma instrução que o
        // dedo não consegue cumprir com sete colunas rolando de lado. Abre o
        // mesmo diálogo do cabeçalho, que agora escolhe receita.
        <button
          type="button"
          onClick={aoEditar}
          aria-label={`Escolher receita para ${slot.nomeRefeicao} de ${diaLongo}`}
          className={cn(
            "mt-2.5 block w-full rounded-xl border border-dashed border-input px-2 py-3.5 text-center text-xs text-text-muted transition-colors",
            "hover:border-primary hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong",
            isOver && "border-primary bg-primary-soft text-primary-deep",
          )}
        >
          <span aria-hidden="true" className="md:hidden">
            Toque para escolher
          </span>
          <span aria-hidden="true" className="hidden md:inline">
            Arraste ou clique aqui
          </span>
        </button>
      )}
    </article>
  );
}
