#!/usr/bin/env node
/**
 * Confere no projeto real o que acontece quando alguém se cadastra.
 *
 *   npm run db:smoke
 *
 * Cria um usuário descartável pela API de administração, verifica o perfil, a
 * semana de exemplo, os horários e a lista de compras — e apaga o usuário no
 * final, aconteça o que acontecer. O `on delete cascade` leva plano, horários
 * e lista junto.
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secret) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const falhas = [];

function conferir(descricao, condicao, achado) {
  if (condicao) {
    console.log(`  ok   ${descricao}`);
  } else {
    falhas.push(descricao);
    console.log(`  FALHA ${descricao} — encontrei: ${achado}`);
  }
}

/** A segunda-feira da semana atual, no mesmo cálculo que o banco faz. */
function segundaDaSemanaAtual() {
  const hoje = new Date();
  const diaISO = (hoje.getUTCDay() + 6) % 7; // 0 = segunda
  const segunda = new Date(hoje);
  segunda.setUTCDate(hoje.getUTCDate() - diaISO);
  return segunda.toISOString().slice(0, 10);
}

const email = `smoke-${randomUUID()}@example.com`;
let userId;

try {
  const { data: criado, error: erroCadastro } =
    await supabase.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
      user_metadata: { nome: "Teste de fumaça" },
    });

  if (erroCadastro || !criado?.user) {
    throw new Error(erroCadastro?.message ?? "cadastro não devolveu usuário");
  }

  userId = criado.user.id;
  console.log(`\nusuário de teste criado\n`);

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", userId)
    .maybeSingle();

  conferir(
    "o perfil nasce com o nome do cadastro",
    perfil?.nome === "Teste de fumaça",
    perfil?.nome ?? "nenhum perfil",
  );

  const { data: plano } = await supabase
    .from("weekly_plans")
    .select("id, semana_inicio, semana_fim")
    .eq("user_id", userId)
    .maybeSingle();

  conferir(
    "a semana atual é criada, começando na segunda",
    plano?.semana_inicio === segundaDaSemanaAtual(),
    plano ? plano.semana_inicio : "nenhum plano",
  );

  if (plano) {
    const { data: slots } = await supabase
      .from("plan_slots")
      .select("dia_da_semana, nome_refeicao, horario, recipe_id")
      .eq("plan_id", plano.id);

    const total = slots?.length ?? 0;
    const preenchidos = (slots ?? []).filter((s) => s.recipe_id).length;
    const refeicoes = [...new Set((slots ?? []).map((s) => s.nome_refeicao))].sort();

    conferir("21 horários — 3 por dia, 7 dias", total === 21, total);
    conferir(
      "café da manhã, almoço e jantar",
      refeicoes.join(", ") === "Almoço, Café da manhã, Jantar",
      refeicoes.join(", ") || "nenhum",
    );
    conferir(
      "seis horários já vêm com receita",
      preenchidos === 6,
      preenchidos,
    );

    const { data: lista } = await supabase
      .from("shopping_list")
      .select("quantidade_total, unidade, comprado, ingredients(nome)")
      .eq("plan_id", plano.id)
      .order("quantidade_total", { ascending: false });

    conferir(
      "a lista de compras já vem preenchida",
      (lista?.length ?? 0) > 0,
      `${lista?.length ?? 0} item(ns)`,
    );

    if (lista?.length) {
      console.log("\n  lista gerada:");
      for (const item of lista) {
        const nome = item.ingredients?.nome ?? "?";
        console.log(`    ${item.quantidade_total} ${item.unidade} — ${nome}`);
      }
    }
  }
} finally {
  if (userId) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    console.log(
      error
        ? `\nusuário de teste NÃO foi apagado (${userId}): ${error.message}`
        : "\nusuário de teste apagado",
    );
  }
}

if (falhas.length > 0) {
  console.error(`\n${falhas.length} verificação(ões) falharam.`);
  process.exit(1);
}

console.log("\nCadastro entrega a semana de exemplo como esperado.");
