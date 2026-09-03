import { formatarDiaEMes, somarDias } from "@/lib/data-iso";
import { DIAS } from "@/lib/semana";
import type { DiaDaSemana } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export interface ReceitaDoSlot {
  id: string;
  nome: string;
  calorias: number;
  imagem_url: string | null;
}

export interface SlotDoPlano {
  id: string;
  dia: DiaDaSemana;
  nomeRefeicao: string;
  horario: string;
  posicao: number;
  receita: ReceitaDoSlot | null;
}

export interface DiaDoPlano {
  slug: DiaDaSemana;
  longo: string;
  curto: string;
  dataIso: string;
  dataCurta: string;
  slots: SlotDoPlano[];
}

export interface PlanoDaSemana {
  id: string;
  semanaInicio: string;
  semanaFim: string;
  dias: DiaDoPlano[];
}

/** As três refeições que toda semana nova recebe. */
const REFEICOES_PADRAO = [
  { nome: "Café da manhã", horario: "08:00:00", posicao: 0 },
  { nome: "Almoço", horario: "12:00:00", posicao: 1 },
  { nome: "Jantar", horario: "20:00:00", posicao: 2 },
] as const;

const CAMPOS_DO_SLOT =
  "id, dia_da_semana, nome_refeicao, horario, posicao, recipes(id, nome, calorias, imagem_url)";

/**
 * O plano de uma semana, criando-o se ainda não existir.
 *
 * Sim, isto escreve durante a renderização — o que normalmente se evita. A
 * alternativa seria a pessoa abrir uma semana futura e encontrar uma tela
 * vazia com um botão "criar", o que não é planejamento, é burocracia.
 *
 * O que torna aceitável: as duas escritas são idempotentes. O plano depende do
 * índice único `(user_id, semana_inicio)`, e os horários só entram se o plano
 * estiver sem nenhum. Executar duas vezes dá o mesmo resultado que executar
 * uma. Nada de `revalidatePath` aqui: quem revalida são as ações.
 */
export async function obterOuCriarPlano(
  segundaIso: string,
): Promise<PlanoDaSemana | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const plano = await garantirPlano(supabase, user.id, segundaIso);
  if (!plano) return null;

  await garantirHorariosPadrao(supabase, plano.id);

  const { data: slots } = await supabase
    .from("plan_slots")
    .select(CAMPOS_DO_SLOT)
    .eq("plan_id", plano.id)
    .order("posicao");

  return montarSemana(plano, slots ?? []);
}

type Cliente = Awaited<ReturnType<typeof createClient>>;

interface LinhaDoPlano {
  id: string;
  semana_inicio: string;
  semana_fim: string;
}

async function garantirPlano(
  supabase: Cliente,
  userId: string,
  segundaIso: string,
): Promise<LinhaDoPlano | null> {
  const colunas = "id, semana_inicio, semana_fim";

  const { data: existente } = await supabase
    .from("weekly_plans")
    .select(colunas)
    .eq("semana_inicio", segundaIso)
    .maybeSingle();

  if (existente) return existente;

  const { data: criado } = await supabase
    .from("weekly_plans")
    .insert({
      user_id: userId,
      semana_inicio: segundaIso,
      semana_fim: somarDias(segundaIso, 6),
    })
    .select(colunas)
    .maybeSingle();

  if (criado) return criado;

  // Corrida com outra aba: o índice único barrou o insert, então o plano
  // existe — basta ler de novo.
  const { data: deOutraAba } = await supabase
    .from("weekly_plans")
    .select(colunas)
    .eq("semana_inicio", segundaIso)
    .maybeSingle();

  return deOutraAba ?? null;
}

async function garantirHorariosPadrao(supabase: Cliente, planId: string) {
  const { count } = await supabase
    .from("plan_slots")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", planId);

  if ((count ?? 0) > 0) return;

  await supabase.from("plan_slots").insert(
    DIAS.flatMap((dia) =>
      REFEICOES_PADRAO.map((refeicao) => ({
        plan_id: planId,
        dia_da_semana: dia.slug,
        nome_refeicao: refeicao.nome,
        horario: refeicao.horario,
        posicao: refeicao.posicao,
      })),
    ),
  );
}

interface LinhaDoSlot {
  id: string;
  dia_da_semana: DiaDaSemana;
  nome_refeicao: string;
  horario: string;
  posicao: number;
  recipes: ReceitaDoSlot | null;
}

function montarSemana(
  plano: LinhaDoPlano,
  slots: LinhaDoSlot[],
): PlanoDaSemana {
  return {
    id: plano.id,
    semanaInicio: plano.semana_inicio,
    semanaFim: plano.semana_fim,
    dias: DIAS.map((dia, indice) => {
      const dataIso = somarDias(plano.semana_inicio, indice);

      return {
        slug: dia.slug,
        longo: dia.longo,
        curto: dia.curto,
        dataIso,
        dataCurta: formatarDiaEMes(dataIso),
        slots: slots
          .filter((slot) => slot.dia_da_semana === dia.slug)
          .map((slot) => ({
            id: slot.id,
            dia: slot.dia_da_semana,
            nomeRefeicao: slot.nome_refeicao,
            horario: slot.horario,
            posicao: slot.posicao,
            receita: slot.recipes,
          })),
      };
    }),
  };
}
