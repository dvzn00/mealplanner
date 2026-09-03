"use client";

import { useState } from "react";
import type { PlanoDaSemana, SlotDoPlano } from "@/lib/data/planejamento";
import type { DiaDaSemana } from "@/lib/supabase/database.types";
import { ColunaDoDia } from "./coluna-do-dia";
import {
  DialogoDeSlot,
  type EstadoDoDialogo,
  type ReceitaParaEscolha,
} from "./dialogo-de-slot";

/**
 * A grade da semana.
 *
 * É um componente de cliente, mas não busca nada: os dados chegam prontos do
 * servidor por props. O que vive aqui é só o estado de interface — qual
 * diálogo está aberto — e, a partir do Bloco 6, o contexto de arraste.
 *
 * Um único diálogo para os 21 horários, em vez de um por cartão: mantém o
 * foco previsível e evita 21 instâncias de Radix na árvore.
 */
export function PlanejadorSemanal({
  plano,
  receitas,
  diaDeHoje,
}: {
  plano: PlanoDaSemana;
  receitas: ReceitaParaEscolha[];
  /** `null` quando a semana mostrada não é a corrente. */
  diaDeHoje: DiaDaSemana | null;
}) {
  const [dialogo, setDialogo] = useState<EstadoDoDialogo | null>(null);

  return (
    <>
      {/*
        Sete colunas precisam de uns 140px cada para caber "Café da manhã" e o
        nome de uma receita. Abaixo disso a semana rola na horizontal em vez de
        espremer o texto até virar reticências. No celular, cada dia ocupa a
        largura inteira.
      */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="grid gap-3 md:min-w-[63rem] md:grid-cols-7">
        {plano.dias.map((dia) => (
          <ColunaDoDia
            key={dia.slug}
            dia={dia}
            ehHoje={dia.slug === diaDeHoje}
            aoAdicionar={() =>
              setDialogo({ modo: "novo", dia: dia.slug, diaLongo: dia.longo })
            }
            aoEditarSlot={(slot: SlotDoPlano) =>
              setDialogo({
                modo: "editar",
                slotId: slot.id,
                diaLongo: dia.longo,
                nomeRefeicao: slot.nomeRefeicao,
                horario: slot.horario,
              })
            }
          />
        ))}
        </div>
      </div>

      <DialogoDeSlot
        estado={dialogo}
        planId={plano.id}
        receitas={receitas}
        aoFechar={() => setDialogo(null)}
      />
    </>
  );
}
