"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useTransition } from "react";
import type { SlotDoPlano } from "@/lib/data/planejamento";
import { limparReceitaDoSlot } from "@/lib/planejamento/actions";
import { formatarHorario } from "@/lib/semana";
import { cn } from "@/lib/utils";

/**
 * Uma coluna de dia tem cerca de 140px. Nome e horário lado a lado nessa
 * largura viram "Café d… 08:00" — por isso o horário vem em cima, como
 * sobretítulo, e o nome ocupa a linha inteira e quebra se precisar.
 */
export function CartaoDoSlot({
  slot,
  diaLongo,
  aoEditar,
}: {
  slot: SlotDoPlano;
  diaLongo: string;
  aoEditar: () => void;
}) {
  const [limpando, iniciarTransicao] = useTransition();
  const { receita } = slot;

  return (
    <article
      className={cn(
        "rounded-2xl bg-card p-3 shadow-soft transition-opacity",
        limpando && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={aoEditar}
        className="block w-full rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
      >
        <span className="block text-xs font-medium tabular-nums text-text-muted">
          {formatarHorario(slot.horario)}
        </span>
        <span className="mt-0.5 block text-sm font-semibold leading-snug text-text-dark">
          {slot.nomeRefeicao}
        </span>
        <span className="sr-only">— editar nome e horário</span>
      </button>

      {receita ? (
        <div className="mt-2.5 rounded-xl bg-primary-soft p-2.5">
          <div className="flex items-start gap-2">
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

            <button
              type="button"
              aria-label={`Tirar ${receita.nome} de ${slot.nomeRefeicao} de ${diaLongo}`}
              disabled={limpando}
              onClick={() =>
                iniciarTransicao(async () => {
                  await limparReceitaDoSlot(slot.id);
                })
              }
              className="-mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-white hover:text-secondary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
            >
              <Trash2
                className="size-3.5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2.5 rounded-xl border border-dashed border-input px-2 py-3.5 text-center text-xs text-text-muted">
          Sem receita ainda
        </p>
      )}
    </article>
  );
}
