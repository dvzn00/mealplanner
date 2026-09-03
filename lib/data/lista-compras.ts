import { createClient } from "@/lib/supabase/server";
import {
  obterPlanoAtual,
  obterPlanoDaSemana,
  type PlanoDaSemana,
} from "./planos";

export interface ItemDeCompra {
  id: string;
  nome: string;
  quantidade_total: number;
  unidade: string;
  comprado: boolean;
  ignorado: boolean;
}

export interface ListaDeCompras {
  plano: PlanoDaSemana | null;
  pendentes: ItemDeCompra[];
  comprados: ItemDeCompra[];
  dispensados: ItemDeCompra[];
}

const VAZIA = { pendentes: [], comprados: [], dispensados: [] };

/**
 * A lista de uma semana, separada entre o que falta, o que já foi e o que o
 * usuário dispensou.
 *
 * Ninguém escreve quantidade nesta tabela pela aplicação: ela é recalculada
 * pelo gatilho de `plan_slots`. Os únicos campos que o usuário move são
 * `comprado` e `ignorado`.
 */
export async function obterListaDeCompras(
  semanaIso?: string,
): Promise<ListaDeCompras> {
  const supabase = await createClient();
  const plano = semanaIso
    ? await obterPlanoDaSemana(supabase, semanaIso)
    : await obterPlanoAtual(supabase);

  if (!plano) {
    return { plano: null, ...VAZIA };
  }

  const { data, error } = await supabase
    .from("shopping_list")
    .select(
      "id, quantidade_total, unidade, comprado, ignorado, ingredients(nome)",
    )
    .eq("plan_id", plano.id);

  if (error || !data) {
    return { plano, ...VAZIA };
  }

  const itens: ItemDeCompra[] = data
    .map((linha) => ({
      id: linha.id,
      nome: linha.ingredients?.nome ?? "Ingrediente",
      quantidade_total: linha.quantidade_total,
      unidade: linha.unidade,
      comprado: linha.comprado,
      ignorado: linha.ignorado,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return {
    plano,
    pendentes: itens.filter((item) => !item.ignorado && !item.comprado),
    comprados: itens.filter((item) => !item.ignorado && item.comprado),
    dispensados: itens.filter((item) => item.ignorado),
  };
}
