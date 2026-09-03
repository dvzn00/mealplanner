import { DIAS } from "@/lib/semana";
import type { DiaDaSemana } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { obterPlanoAtual, type PlanoDaSemana } from "./planos";

export interface DiaDoResumo {
  slug: DiaDaSemana;
  curto: string;
  longo: string;
  preenchidos: number;
  total: number;
}

export interface ResumoDoDashboard {
  plano: PlanoDaSemana | null;
  receitasDisponiveis: number;
  receitasProprias: number;
  refeicoesPlanejadas: number;
  refeicoesTotais: number;
  itensNaLista: number;
  itensComprados: number;
  dias: DiaDoResumo[];
}

/**
 * Tudo que o dashboard mostra, em uma leitura só do servidor.
 * Nenhum `useEffect`: a página é Server Component e recebe isto pronto.
 */
export async function obterResumoDoDashboard(): Promise<ResumoDoDashboard> {
  const supabase = await createClient();
  const plano = await obterPlanoAtual(supabase);

  const [receitas, proprias, slots, lista] = await Promise.all([
    supabase.from("recipes").select("id", { count: "exact", head: true }),
    supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .not("user_id", "is", null),
    plano
      ? supabase
          .from("plan_slots")
          .select("dia_da_semana, recipe_id")
          .eq("plan_id", plano.id)
      : null,
    plano
      ? supabase.from("shopping_list").select("comprado").eq("plan_id", plano.id)
      : null,
  ]);

  const slotsDoPlano = slots?.data ?? [];
  const itensDaLista = lista?.data ?? [];

  const dias = DIAS.map((dia) => {
    const doDia = slotsDoPlano.filter((slot) => slot.dia_da_semana === dia.slug);

    return {
      slug: dia.slug,
      curto: dia.curto,
      longo: dia.longo,
      preenchidos: doDia.filter((slot) => slot.recipe_id !== null).length,
      total: doDia.length,
    };
  });

  return {
    plano,
    receitasDisponiveis: receitas.count ?? 0,
    receitasProprias: proprias.count ?? 0,
    refeicoesPlanejadas: slotsDoPlano.filter((s) => s.recipe_id !== null).length,
    refeicoesTotais: slotsDoPlano.length,
    itensNaLista: itensDaLista.length,
    itensComprados: itensDaLista.filter((item) => item.comprado).length,
    dias,
  };
}
