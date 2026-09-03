import { formatarDiaEMes, somarDias } from "@/lib/data-iso";
import { DIAS } from "@/lib/semana";
import { createClient } from "@/lib/supabase/server";
import { obterPlanoDaSemana } from "./planos";

export interface RefeicaoDoRelatorio {
  dia: string;
  data: string;
  nomeRefeicao: string;
  horario: string;
  receita: string | null;
  calorias: number | null;
}

export interface IngredienteDoRelatorio {
  nome: string;
  quantidade: number;
  unidade: string;
  comprado: boolean;
}

export interface RelatorioDaSemana {
  semanaInicio: string;
  semanaFim: string;
  refeicoes: RefeicaoDoRelatorio[];
  ingredientes: IngredienteDoRelatorio[];
}

/**
 * Os dados que o PDF imprime.
 *
 * Ao contrário de `obterOuCriarPlano`, esta leitura não cria nada: gerar um
 * relatório de uma semana que não existe deve devolver nada, não inventar uma
 * semana vazia no banco.
 */
export async function obterRelatorioDaSemana(
  semanaIso: string,
): Promise<RelatorioDaSemana | null> {
  const supabase = await createClient();
  const plano = await obterPlanoDaSemana(supabase, semanaIso);

  if (!plano) return null;

  const [{ data: slots }, { data: itens }] = await Promise.all([
    supabase
      .from("plan_slots")
      .select(
        "dia_da_semana, nome_refeicao, horario, posicao, recipes(nome, calorias)",
      )
      .eq("plan_id", plano.id)
      .order("posicao"),
    supabase
      .from("shopping_list")
      .select("quantidade_total, unidade, comprado, ingredients(nome)")
      .eq("plan_id", plano.id)
      .eq("ignorado", false),
  ]);

  const refeicoes = DIAS.flatMap((dia, indice) =>
    (slots ?? [])
      .filter((slot) => slot.dia_da_semana === dia.slug)
      .map((slot) => ({
        dia: dia.longo,
        data: formatarDiaEMes(somarDias(plano.semana_inicio, indice)),
        nomeRefeicao: slot.nome_refeicao,
        horario: slot.horario.slice(0, 5),
        receita: slot.recipes?.nome ?? null,
        calorias: slot.recipes?.calorias ?? null,
      })),
  );

  const ingredientes = (itens ?? [])
    .map((item) => ({
      nome: item.ingredients?.nome ?? "Ingrediente",
      quantidade: item.quantidade_total,
      unidade: item.unidade,
      comprado: item.comprado,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return {
    semanaInicio: plano.semana_inicio,
    semanaFim: plano.semana_fim,
    refeicoes,
    ingredientes,
  };
}
