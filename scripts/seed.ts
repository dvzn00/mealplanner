#!/usr/bin/env node
/**
 * Popula o catálogo global: ingredientes, receitas (`user_id` nulo) e a ligação
 * entre os dois.
 *
 *   npm run db:seed
 *
 * Lê `receitas-seed.json` da raiz do projeto ou de `scripts/`. Se o arquivo não
 * existir, usa as receitas de `lib/seed/receitas-padrao.ts` — o seed nunca
 * trava por falta do arquivo.
 *
 * É reexecutável: receita global com o mesmo nome é atualizada, e a lista de
 * ingredientes dela é substituída. Então editar o JSON e rodar de novo funciona.
 *
 * Usa a chave de service_role, que ignora RLS. Só roda em linha de comando.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import { getServiceRoleKey } from "@/lib/env.admin";
import { RECEITAS_PADRAO } from "@/lib/seed/receitas-padrao";
import {
  catalogoDeIngredientes,
  chaveDoIngrediente,
  consolidarIngredientes,
  receitasSeedSchema,
  type ReceitaSeed,
} from "@/lib/seed/receitas";
import type { Database } from "@/lib/supabase/database.types";

const CAMINHOS = ["receitas-seed.json", join("scripts", "receitas-seed.json")];

type Cliente = SupabaseClient<Database>;

async function main() {
  const receitas = carregarReceitas();
  const supabase = criarCliente();

  const catalogo = catalogoDeIngredientes(receitas);
  console.log(
    `\n${receitas.length} receita(s), ${catalogo.length} ingrediente(s) no catálogo.`,
  );

  const idsPorChave = await semearIngredientes(supabase, catalogo);
  const { criadas, atualizadas, ligacoes } = await semearReceitas(
    supabase,
    receitas,
    idsPorChave,
  );

  console.log(
    `\nPronto. ${criadas} receita(s) criada(s), ${atualizadas} atualizada(s), ` +
      `${ligacoes} ligação(ões) de ingrediente.`,
  );
}

function criarCliente(): Cliente {
  const env = getPublicEnv();

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    getServiceRoleKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function carregarReceitas(): ReceitaSeed[] {
  for (const caminho of CAMINHOS) {
    let bruto: string;
    try {
      bruto = readFileSync(caminho, "utf8");
    } catch {
      continue;
    }

    console.log(`Lendo ${caminho}`);
    const resultado = receitasSeedSchema.safeParse(JSON.parse(bruto));

    if (!resultado.success) {
      console.error(`\n${caminho} não está no formato esperado:\n`);
      for (const issue of resultado.error.issues) {
        console.error(`  [${issue.path.join(".")}] ${issue.message}`);
      }
      process.exit(1);
    }

    return resultado.data;
  }

  console.log(
    `Nenhum receitas-seed.json encontrado. Usando as ${RECEITAS_PADRAO.length} receitas de exemplo.`,
  );
  return RECEITAS_PADRAO;
}

async function semearIngredientes(
  supabase: Cliente,
  catalogo: { nome: string; unidade_padrao: string }[],
): Promise<Map<string, string>> {
  const { error } = await supabase
    .from("ingredients")
    .upsert(catalogo, { onConflict: "nome", ignoreDuplicates: true });

  if (error) {
    throw new Error(`Falha ao inserir ingredientes: ${error.message}`);
  }

  const { data, error: erroLeitura } = await supabase
    .from("ingredients")
    .select("id, nome");

  if (erroLeitura) {
    throw new Error(`Falha ao ler ingredientes: ${erroLeitura.message}`);
  }

  const idsPorChave = new Map<string, string>();
  for (const linha of data ?? []) {
    idsPorChave.set(chaveDoIngrediente(linha.nome), linha.id);
  }

  return idsPorChave;
}

async function semearReceitas(
  supabase: Cliente,
  receitas: ReceitaSeed[],
  idsPorChave: Map<string, string>,
) {
  const existentes = await lerReceitasGlobais(supabase);
  let criadas = 0;
  let atualizadas = 0;
  let ligacoes = 0;

  for (const receita of receitas) {
    const campos = {
      user_id: null,
      nome: receita.nome,
      descricao: receita.descricao ?? null,
      modo_preparo: receita.modo_preparo,
      calorias: receita.calorias,
      tempo_preparo: receita.tempo_preparo,
      porcoes: receita.porcoes,
      imagem_url: receita.imagem_url ?? null,
    };

    const jaExistia = existentes.get(receita.nome.trim().toLowerCase());
    let recipeId: string;

    if (jaExistia) {
      const { error } = await supabase
        .from("recipes")
        .update(campos)
        .eq("id", jaExistia);
      if (error) {
        throw new Error(`Falha ao atualizar "${receita.nome}": ${error.message}`);
      }
      recipeId = jaExistia;
      atualizadas += 1;
    } else {
      const { data, error } = await supabase
        .from("recipes")
        .insert(campos)
        .select("id")
        .single();
      if (error || !data) {
        throw new Error(
          `Falha ao criar "${receita.nome}": ${error?.message ?? "sem retorno"}`,
        );
      }
      recipeId = data.id;
      criadas += 1;
    }

    ligacoes += await ligarIngredientes(
      supabase,
      receita,
      recipeId,
      idsPorChave,
    );
  }

  return { criadas, atualizadas, ligacoes };
}

async function lerReceitasGlobais(
  supabase: Cliente,
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("recipes")
    .select("id, nome")
    .is("user_id", null);

  if (error) {
    throw new Error(`Falha ao ler receitas globais: ${error.message}`);
  }

  return new Map((data ?? []).map((r) => [r.nome.trim().toLowerCase(), r.id]));
}

async function ligarIngredientes(
  supabase: Cliente,
  receita: ReceitaSeed,
  recipeId: string,
  idsPorChave: Map<string, string>,
): Promise<number> {
  const itens = consolidarIngredientes(receita).map((item) => {
    const ingredientId = idsPorChave.get(item.chave);
    if (!ingredientId) {
      throw new Error(
        `Ingrediente "${item.nome}" da receita "${receita.nome}" não entrou no catálogo.`,
      );
    }
    return {
      recipe_id: recipeId,
      ingredient_id: ingredientId,
      quantidade: item.quantidade,
      unidade: item.unidade,
    };
  });

  // Substitui a lista inteira: é o que faz o seed refletir edições no JSON.
  const { error: erroLimpeza } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", recipeId);

  if (erroLimpeza) {
    throw new Error(
      `Falha ao limpar ingredientes de "${receita.nome}": ${erroLimpeza.message}`,
    );
  }

  const { error } = await supabase.from("recipe_ingredients").insert(itens);

  if (error) {
    throw new Error(
      `Falha ao ligar ingredientes de "${receita.nome}": ${error.message}`,
    );
  }

  return itens.length;
}

main().catch((erro: unknown) => {
  console.error(`\n${erro instanceof Error ? erro.message : String(erro)}`);
  process.exit(1);
});
