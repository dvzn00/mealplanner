"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  useSensor,
  useSensors,
  TouchSensor,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import type {
  PlanoDaSemana,
  ReceitaDoSlot,
  SlotDoPlano,
} from "@/lib/data/planejamento";
import {
  atribuirReceitaAoSlot,
  moverReceitaEntreSlots,
} from "@/lib/planejamento/actions";
import { lerAlvo, lerArrastavel } from "@/lib/planejamento/arraste";
import {
  aplicarMovimento,
  receitaDoSlot,
  type Movimento,
} from "@/lib/planejamento/movimentos";
import type { DiaDaSemana } from "@/lib/supabase/database.types";
import { ColunaDoDia } from "./coluna-do-dia";
import {
  DialogoDeSlot,
  type EstadoDoDialogo,
  type ReceitaParaEscolha,
} from "./dialogo-de-slot";
import { PainelDeReceitas } from "./painel-de-receitas";
import { EtiquetaArrastada } from "./receita-arrastavel";

/**
 * A grade da semana e o painel de receitas, sob um contexto de arraste só.
 *
 * É um componente de cliente, mas não busca nada: os dados chegam prontos do
 * servidor por props. O que vive aqui é estado de interface — qual diálogo
 * está aberto, o que está sendo arrastado — e a versão otimista da semana.
 *
 * `useOptimistic` cuida do desfazer sozinho: se a ação falhar, o servidor
 * devolve a semana como estava e a mudança some da tela. O aviso de erro é o
 * que impede que isso pareça um bug.
 */
export function PlanejadorSemanal({
  plano,
  receitas,
  receitasParaEscolha,
  diaDeHoje,
}: {
  plano: PlanoDaSemana;
  receitas: ReceitaDoSlot[];
  receitasParaEscolha: ReceitaParaEscolha[];
  /** `null` quando a semana mostrada não é a corrente. */
  diaDeHoje: DiaDaSemana | null;
}) {
  const [dialogo, setDialogo] = useState<EstadoDoDialogo | null>(null);
  const [arrastando, setArrastando] = useState<ReceitaDoSlot | null>(null);
  const [dias, aplicar] = useOptimistic(plano.dias, aplicarMovimento);
  const [, iniciarTransicao] = useTransition();

  const sensores = useSensors(
    // Uma distância curta antes de começar: sem isso, clicar na lixeira dentro
    // do cartão viraria um arraste de um pixel.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // No toque, o atraso separa arrastar de rolar a tela.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 6 },
    }),
    useSensor(KeyboardSensor),
  );

  function aoComecar(evento: DragStartEvent) {
    const arrastavel = lerArrastavel(String(evento.active.id));
    if (!arrastavel) return;

    setArrastando(
      arrastavel.tipo === "receita"
        ? (receitas.find((r) => r.id === arrastavel.receitaId) ?? null)
        : receitaDoSlot(dias, arrastavel.slotId),
    );
  }

  function aoSoltar(evento: DragEndEvent) {
    setArrastando(null);

    const arrastavel = lerArrastavel(String(evento.active.id));
    const destinoId = evento.over ? lerAlvo(String(evento.over.id)) : null;
    if (!arrastavel || !destinoId) return;

    const movimento: Movimento | null =
      arrastavel.tipo === "receita"
        ? montarAtribuicao(receitas, arrastavel.receitaId, destinoId)
        : { tipo: "mover", origemId: arrastavel.slotId, destinoId };

    if (!movimento) return;
    if (movimento.tipo === "mover" && movimento.origemId === destinoId) return;

    iniciarTransicao(async () => {
      aplicar(movimento);

      const resultado =
        movimento.tipo === "atribuir"
          ? await atribuirReceitaAoSlot(movimento.slotId, movimento.receita.id)
          : await moverReceitaEntreSlots(movimento.origemId, destinoId);

      if (!resultado.sucesso) {
        toast.error(resultado.erro ?? "Não consegui salvar essa mudança.");
      }
    });
  }

  return (
    <DndContext
      /*
       * O id fixo é obrigatório com renderização no servidor: sem ele o
       * dnd-kit numera os `aria-describedby` a partir de um contador que
       * recomeça no cliente, e a hidratação acusa divergência de atributo.
       */
      id="planejamento-semanal"
      sensors={sensores}
      collisionDetection={porOndeOPonteiroEsta}
      onDragStart={aoComecar}
      onDragEnd={aoSoltar}
      onDragCancel={() => setArrastando(null)}
      accessibility={{ announcements: AVISOS }}
    >
      <div className="grid gap-4">
        <PainelDeReceitas receitas={receitas} />

        {/*
          Sete colunas precisam de uns 140px cada para caber "Café da manhã" e
          o nome de uma receita. Abaixo disso a semana rola na horizontal em vez
          de espremer o texto até virar reticências. No celular, cada dia ocupa
          a largura inteira.
        */}
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="grid gap-3 md:min-w-[63rem] md:grid-cols-7">
            {dias.map((dia) => (
              <ColunaDoDia
                key={dia.slug}
                dia={dia}
                ehHoje={dia.slug === diaDeHoje}
                aoAdicionar={() =>
                  setDialogo({
                    modo: "novo",
                    dia: dia.slug,
                    diaLongo: dia.longo,
                  })
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
      </div>

      <DragOverlay dropAnimation={null}>
        {arrastando ? <EtiquetaArrastada receita={arrastando} /> : null}
      </DragOverlay>

      <DialogoDeSlot
        estado={dialogo}
        planId={plano.id}
        receitas={receitasParaEscolha}
        aoFechar={() => setDialogo(null)}
      />
    </DndContext>
  );
}

/**
 * O alvo é onde o ponteiro está, não o retângulo com maior sobreposição.
 *
 * A regra padrão do dnd-kit compara áreas, e a etiqueta arrastada tem 160px
 * de largura em colunas de 140px — ela cobre duas colunas ao mesmo tempo e a
 * receita cai no dia errado. Sem ponteiro (arraste por teclado), volta a valer
 * o centro mais próximo.
 */
const porOndeOPonteiroEsta: CollisionDetection = (argumentos) => {
  const sobOPonteiro = pointerWithin(argumentos);

  return sobOPonteiro.length > 0 ? sobOPonteiro : closestCenter(argumentos);
};

function montarAtribuicao(
  receitas: ReceitaDoSlot[],
  receitaId: string,
  slotId: string,
): Movimento | null {
  const receita = receitas.find((candidata) => candidata.id === receitaId);

  return receita ? { tipo: "atribuir", slotId, receita } : null;
}

/** O que o leitor de tela narra durante o arraste. */
const AVISOS = {
  onDragStart: () => "Receita levantada. Use as setas para escolher o horário.",
  onDragOver: () => "Sobre um horário da semana.",
  onDragEnd: ({ over }: { over: { id: string | number } | null }) =>
    over ? "Receita solta no horário." : "Arraste cancelado.",
  onDragCancel: () => "Arraste cancelado. A receita voltou para o lugar.",
};
