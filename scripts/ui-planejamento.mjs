#!/usr/bin/env node
/**
 * Exercita a grade semanal num navegador de verdade.
 *
 *   npm run dev            # em outro terminal
 *   npm run ui:plano
 *
 * Cobre o checkpoint do Bloco 5: a semana carrega, a navegação entre semanas
 * cria o plano seguinte com os horários padrão, dá para criar e editar uma
 * refeição, e editar o horário reordena o dia.
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secret) {
  console.error("Faltam as variáveis do Supabase.");
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const falhas = [];

function conferir(descricao, condicao, achado) {
  if (condicao) {
    console.log(`  ok    ${descricao}`);
  } else {
    falhas.push(descricao);
    console.log(`  FALHA ${descricao} — encontrei: ${achado}`);
  }
}

/** A segunda-feira da semana corrente, pela mesma conta do app (UTC). */
function segundaAtual() {
  const hoje = new Date();
  const dias = Date.UTC(
    hoje.getUTCFullYear(),
    hoje.getUTCMonth(),
    hoje.getUTCDate(),
  );
  const iso = new Date(dias - ((hoje.getUTCDay() + 6) % 7) * 86400000);
  return iso.toISOString().slice(0, 10);
}

function somarDias(iso, n) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000)
    .toISOString()
    .slice(0, 10);
}

/** Arraste de verdade: o dnd-kit só reage a pointer com deslocamento. */
async function arrastar(pagina, origem, destino) {
  const a = await origem.boundingBox();
  const b = await destino.boundingBox();
  if (!a || !b) throw new Error("elemento sem caixa para arrastar");

  await pagina.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await pagina.mouse.down();
  await pagina.mouse.move(a.x + a.width / 2 + 14, a.y + a.height / 2 + 14, {
    steps: 6,
  });
  await pagina.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 14 });
  await pagina.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + 3, {
    steps: 4,
  });
  await pagina.mouse.up();
  await pagina.waitForTimeout(1600);
}

function horarioDoDia(pagina, dia, indice) {
  return pagina.getByRole("region", { name: dia }).locator("article").nth(indice);
}

/**
 * Põe receitas em segunda e terça, como a semana de exemplo do cadastro faria.
 * O teste não depende dela para poder medir o que se propõe a medir.
 */
async function prepararSemana(userId) {
  const { data: plano } = await supabase
    .from("weekly_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("semana_inicio", segundaAtual())
    .maybeSingle();

  if (!plano) return;

  const [{ data: slots }, { data: receitas }] = await Promise.all([
    supabase
      .from("plan_slots")
      .select("id, dia_da_semana, posicao")
      .eq("plan_id", plano.id)
      .in("dia_da_semana", ["segunda", "terca"])
      .order("posicao"),
    supabase.from("recipes").select("id").is("user_id", null).order("calorias"),
  ]);

  if (!slots?.length || !receitas?.length) return;

  const emOrdem = [...slots].sort(
    (a, b) =>
      a.dia_da_semana.localeCompare(b.dia_da_semana) || a.posicao - b.posicao,
  );

  for (const [indice, slot] of emOrdem.entries()) {
    await supabase
      .from("plan_slots")
      .update({ recipe_id: receitas[indice % receitas.length].id })
      .eq("id", slot.id);
  }
}

async function todosOsSlots(userId, semanaInicio) {
  const { data: plano } = await supabase
    .from("weekly_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("semana_inicio", semanaInicio)
    .maybeSingle();

  if (!plano) return [];

  const { data } = await supabase
    .from("plan_slots")
    .select("id, dia_da_semana, nome_refeicao, horario, recipe_id")
    .eq("plan_id", plano.id);

  return data ?? [];
}

async function slotsDoDia(userId, semanaInicio, dia) {
  const { data: plano } = await supabase
    .from("weekly_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("semana_inicio", semanaInicio)
    .maybeSingle();

  if (!plano) return [];

  const { data } = await supabase
    .from("plan_slots")
    .select("id, nome_refeicao, horario, posicao, recipe_id")
    .eq("plan_id", plano.id)
    .eq("dia_da_semana", dia)
    .order("posicao");

  return data ?? [];
}

const email = `plano-${randomUUID()}@example.com`;
const senha = randomUUID();
let userId;
let navegador;

try {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: "Ana Beatriz Souza" },
  });
  if (error || !data.user) throw new Error(error?.message ?? "sem usuário");
  userId = data.user.id;

  navegador = await chromium.launch();
  const pagina = await navegador.newPage({
    viewport: { width: 1440, height: 900 },
    locale: "pt-BR",
  });

  await pagina.goto(`${BASE}/login`);
  await pagina.getByLabel("E-mail").fill(email);
  await pagina.getByLabel("Senha", { exact: true }).fill(senha);
  await pagina.getByRole("button", { name: "Entrar" }).click();
  await pagina.waitForURL("**/dashboard", { timeout: 20000 });

  // A visita acima criou o plano; agora entram as receitas.
  await prepararSemana(userId);
  await pagina.reload({ waitUntil: "networkidle" });

  // --- a semana corrente carrega inteira ---
  // Seletor pelas colunas de dia, e não por `role=region`: o painel de
  // receitas também é uma marca de região e entraria na conta.
  const colunas = await pagina
    .locator('section[aria-labelledby^="dia-"]')
    .count();
  conferir("sete colunas, uma por dia", colunas === 7, colunas);

  const horarios = await pagina.getByText("08:00").count();
  conferir("café da manhã em todos os dias", horarios === 7, horarios);

  // --- navegação para a próxima semana cria o plano ---
  const proxima = somarDias(segundaAtual(), 7);
  await pagina.getByRole("link", { name: "Próxima semana" }).click();
  await pagina.waitForURL(`**/dashboard?semana=${proxima}`, { timeout: 20000 });

  const slotsDaProxima = await slotsDoDia(userId, proxima, "segunda");
  conferir(
    "a semana seguinte nasce com os três horários padrão",
    slotsDaProxima.length === 3,
    `${slotsDaProxima.length} horário(s)`,
  );
  conferir(
    "os horários padrão são café, almoço e jantar",
    slotsDaProxima.map((s) => s.horario).join(" ") ===
      "08:00:00 12:00:00 20:00:00",
    slotsDaProxima.map((s) => s.horario).join(" "),
  );

  await pagina.getByRole("link", { name: "Voltar para esta semana" }).click();
  await pagina.waitForURL("**/dashboard", { timeout: 20000 });

  // --- criar uma refeição ---
  await pagina
    .getByRole("button", { name: "Adicionar refeição em Segunda" })
    .click();
  const dialogo = pagina.getByRole("dialog");
  await dialogo.getByLabel("Nome").fill("Lanche da tarde");
  await dialogo.getByLabel("Horário").fill("16:00");
  await dialogo.getByRole("button", { name: "Adicionar" }).click();
  await pagina.waitForTimeout(1500);

  const comLanche = await slotsDoDia(userId, segundaAtual(), "segunda");
  const lanche = comLanche.find((s) => s.nome_refeicao === "Lanche da tarde");
  conferir(
    "a refeição nova entra no dia certo",
    comLanche.length === 4 && lanche !== undefined,
    `${comLanche.length} horário(s)`,
  );
  conferir(
    "e entra na posição cronológica, entre almoço e jantar",
    lanche?.posicao === 2,
    lanche?.posicao,
  );

  // Espera em vez de olhar uma vez: a revalidação repinta a grade, e um
  // `isVisible()` solto pode cair no instante entre o antigo e o novo nó.
  let visivel = true;
  try {
    await pagina
      .getByRole("button", { name: /Lanche da tarde/ })
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
  } catch {
    visivel = false;
  }
  conferir("a refeição nova aparece na grade", visivel, visivel);

  // --- editar o horário reordena o dia ---
  await pagina.getByRole("button", { name: /Lanche da tarde/ }).first().click();
  const edicao = pagina.getByRole("dialog");
  await edicao.getByLabel("Horário").fill("07:00");
  await edicao.getByRole("button", { name: "Salvar" }).click();
  await pagina.waitForTimeout(1500);

  const reordenados = await slotsDoDia(userId, segundaAtual(), "segunda");
  conferir(
    "mudar o horário para 07:00 leva a refeição para o começo do dia",
    reordenados[0]?.nome_refeicao === "Lanche da tarde",
    reordenados.map((s) => `${s.nome_refeicao} ${s.horario}`).join(" | "),
  );
  conferir(
    "as posições continuam sem buraco",
    reordenados.map((s) => s.posicao).join(",") === "0,1,2,3",
    reordenados.map((s) => s.posicao).join(","),
  );

  // --- tirar a receita de um horário ---
  const antes = await slotsDoDia(userId, segundaAtual(), "segunda");
  const comReceita = antes.find((s) => s.recipe_id);
  if (comReceita) {
    await pagina
      .getByRole("button", { name: /^Tirar .* de Segunda$/ })
      .first()
      .click();
    await pagina.waitForTimeout(1500);

    const depois = await slotsDoDia(userId, segundaAtual(), "segunda");
    const aindaTem = depois.find((s) => s.id === comReceita.id)?.recipe_id;
    conferir("a lixeira tira a receita e mantém o horário", !aindaTem, aindaTem);
  } else {
    conferir("havia uma receita para tirar", false, "nenhum horário preenchido");
  }

  // --- remover o horário criado ---
  await pagina.getByRole("button", { name: /Lanche da tarde/ }).first().click();
  await pagina
    .getByRole("dialog")
    .getByRole("button", { name: "Remover horário" })
    .click();
  await pagina.waitForTimeout(1500);

  const semLanche = await slotsDoDia(userId, segundaAtual(), "segunda");
  conferir(
    "remover o horário devolve o dia a três refeições",
    semLanche.length === 3 &&
      semLanche.map((s) => s.posicao).join(",") === "0,1,2",
    `${semLanche.length} horário(s), posições ${semLanche.map((s) => s.posicao).join(",")}`,
  );
  // --- Bloco 6: arraste ---
  console.log("");

  const doPainel = pagina
    .getByRole("button", { name: /para um horário$/ })
    .first();
  const nomeDoPainel = (await doPainel.getAttribute("aria-label"))
    ?.replace("Arrastar ", "")
    .replace(" para um horário", "");

  await arrastar(pagina, doPainel, horarioDoDia(pagina, "Quarta", 0));

  let quarta = await slotsDoDia(userId, segundaAtual(), "quarta");
  conferir(
    `arrastar "${nomeDoPainel}" do painel preenche o horário vazio`,
    quarta[0]?.recipe_id !== null,
    quarta[0]?.recipe_id ?? "vazio",
  );

  // --- arrastar entre dias diferentes ---
  const receitaDaQuarta = quarta[0]?.recipe_id;
  await arrastar(
    pagina,
    pagina.getByRole("button", { name: /^Arrastar .* de Café da manhã de Quarta$/ }),
    horarioDoDia(pagina, "Quinta", 1),
  );

  quarta = await slotsDoDia(userId, segundaAtual(), "quarta");
  const quinta = await slotsDoDia(userId, segundaAtual(), "quinta");
  conferir(
    "arrastar entre dias esvazia a origem",
    quarta[0]?.recipe_id === null,
    quarta[0]?.recipe_id,
  );
  conferir(
    "e preenche o destino com a receita que veio",
    quinta[1]?.recipe_id === receitaDaQuarta,
    quinta[1]?.recipe_id,
  );

  // --- soltar sobre horário ocupado troca as duas ---
  // Segunda perdeu o café da manhã para o teste da lixeira; a troca usa dois
  // horários que continuam preenchidos.
  const tercaAntes = await slotsDoDia(userId, segundaAtual(), "terca");
  const segundaAntes = await slotsDoDia(userId, segundaAtual(), "segunda");

  await arrastar(
    pagina,
    pagina.getByRole("button", {
      name: /^Arrastar .* de Café da manhã de Terça$/,
    }),
    horarioDoDia(pagina, "Segunda", 1),
  );

  const tercaDepois = await slotsDoDia(userId, segundaAtual(), "terca");
  const segundaDepois = await slotsDoDia(userId, segundaAtual(), "segunda");
  conferir(
    "soltar sobre horário ocupado troca as duas receitas",
    segundaDepois[1]?.recipe_id === tercaAntes[0]?.recipe_id &&
      tercaDepois[0]?.recipe_id === segundaAntes[1]?.recipe_id,
    `segunda almoço ${segundaDepois[1]?.recipe_id} / terça café ${tercaDepois[0]?.recipe_id}`,
  );

  // --- a lista de compras acompanha ---
  const { data: plano } = await supabase
    .from("weekly_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("semana_inicio", segundaAtual())
    .maybeSingle();
  const { count: itens } = await supabase
    .from("shopping_list")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", plano?.id ?? "");

  conferir(
    "a lista de compras continua sendo refeita a cada mudança",
    (itens ?? 0) > 0,
    `${itens} item(ns)`,
  );
  // --- Bloco 8: copiar dia, copiar semana, histórico, somente leitura ---
  console.log("");

  await pagina.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  const segundaOrigem = await slotsDoDia(userId, segundaAtual(), "segunda");

  await pagina
    .getByRole("button", { name: "Copiar Segunda para outro dia" })
    .click();
  const dialogoCopia = pagina.getByRole("dialog");
  await dialogoCopia.getByLabel("Dia de destino").selectOption("quarta");
  await dialogoCopia.getByRole("button", { name: "Copiar" }).click();
  await pagina.waitForTimeout(2000);

  const quartaCopiada = await slotsDoDia(userId, segundaAtual(), "quarta");
  conferir(
    "copiar dia deixa o destino igual à origem",
    quartaCopiada.length === segundaOrigem.length &&
      quartaCopiada.map((s) => `${s.nome_refeicao}|${s.horario}|${s.recipe_id}`)
        .join(" ") ===
        segundaOrigem
          .map((s) => `${s.nome_refeicao}|${s.horario}|${s.recipe_id}`)
          .join(" "),
    `${quartaCopiada.length} horário(s) contra ${segundaOrigem.length}`,
  );

  // --- copiar a semana inteira para a seguinte ---
  await pagina.getByRole("button", { name: "Copiar semana" }).click();
  await pagina
    .getByRole("dialog")
    .getByRole("button", { name: "Copiar" })
    .click();
  await pagina.waitForTimeout(2500);

  const origemDaSemana = await todosOsSlots(userId, segundaAtual());
  const destinoDaSemana = await todosOsSlots(userId, proxima);
  conferir(
    "copiar semana replica todos os horários",
    destinoDaSemana.length === origemDaSemana.length &&
      destinoDaSemana.filter((s) => s.recipe_id).length ===
        origemDaSemana.filter((s) => s.recipe_id).length,
    `${destinoDaSemana.length} horário(s) contra ${origemDaSemana.length}`,
  );

  // --- histórico ---
  await pagina.goto(`${BASE}/historico`, { waitUntil: "networkidle" });
  const semanasNoHistorico = await pagina.getByRole("article").count();
  conferir(
    "o histórico lista as semanas do usuário",
    semanasNoHistorico >= 2,
    semanasNoHistorico,
  );

  const temBadge = await pagina
    .getByText(/^Copiada da semana de/)
    .first()
    .isVisible()
    .catch(() => false);
  conferir("a semana copiada mostra de onde veio", temBadge, temBadge);

  // --- semana passada: só leitura ---
  const passada = somarDias(segundaAtual(), -14);
  await pagina.goto(`${BASE}/dashboard?semana=${passada}`, {
    waitUntil: "networkidle",
  });

  const temBanner = await pagina
    .getByText(/já passou|Você está vendo uma semana que já passou/)
    .first()
    .isVisible()
    .catch(() => false);
  conferir("semana passada mostra o aviso de leitura", temBanner, temBanner);

  const semAdicionar =
    (await pagina.getByRole("button", { name: /^Adicionar refeição/ }).count()) ===
    0;
  conferir(
    "semana passada não oferece adicionar refeição",
    semAdicionar,
    semAdicionar,
  );

  const semPainel =
    (await pagina.getByRole("button", { name: /para um horário$/ }).count()) === 0;
  conferir("semana passada esconde o painel de arraste", semPainel, semPainel);

  await pagina
    .getByRole("button", { name: "Copiar para esta semana" })
    .click();
  await pagina.waitForURL("**/dashboard", { timeout: 20000 });
  await pagina.waitForTimeout(1500);

  const atualDepois = await todosOsSlots(userId, segundaAtual());
  const daPassada = await todosOsSlots(userId, passada);
  conferir(
    "copiar a semana passada para a atual traz os horários dela",
    atualDepois.length === daPassada.length,
    `${atualDepois.length} contra ${daPassada.length}`,
  );
} finally {
  if (navegador) await navegador.close();
  if (userId) {
    await supabase.auth.admin.deleteUser(userId);
    console.log("\nusuário de teste apagado");
  }
}

if (falhas.length > 0) {
  console.error(`\n${falhas.length} verificação(ões) falharam.`);
  process.exit(1);
}

console.log("\nA grade semanal funciona.");
