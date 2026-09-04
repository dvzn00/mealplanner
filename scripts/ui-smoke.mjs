#!/usr/bin/env node
/**
 * Percorre os fluxos do Bloco 4 em um navegador de verdade.
 *
 *   npm run dev          # em outro terminal
 *   npm run ui:smoke
 *
 * Cadastra um usuário descartável, entra pela tela de login, marca um item da
 * lista, troca o nome no perfil, confere que os dois sobrevivem a um recarregar
 * e sai. O usuário é apagado no final.
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

/** Garante que o usuário tenha pelo menos uma receita no plano. */
async function prepararLista(userId) {
  const { data: plano } = await supabase
    .from("weekly_plans")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!plano) return;

  const [{ data: slots }, { data: receitas }] = await Promise.all([
    supabase
      .from("plan_slots")
      .select("id, recipe_id")
      .eq("plan_id", plano.id)
      .limit(3),
    supabase.from("recipes").select("id").is("user_id", null).limit(1),
  ]);

  const vazio = slots?.find((slot) => !slot.recipe_id);
  if (vazio && receitas?.[0]) {
    await supabase
      .from("plan_slots")
      .update({ recipe_id: receitas[0].id })
      .eq("id", vazio.id);
  }
}

const email = `ui-${randomUUID()}@example.com`;
const senha = randomUUID();
let userId;
let navegador;
let ingredienteInventado;

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
  const pagina = await navegador.newPage({ locale: "pt-BR" });

  // --- rota protegida sem sessão manda para o login ---
  await pagina.goto(`${BASE}/dashboard`);
  await pagina.waitForURL("**/login**");
  conferir(
    "rota protegida sem sessão cai no login, guardando o destino",
    pagina.url().includes("proximo=%2Fdashboard"),
    pagina.url(),
  );

  // --- login ---
  await pagina.getByLabel("E-mail").fill(email);
  await pagina.getByLabel("Senha", { exact: true }).fill(senha);
  await pagina.getByRole("button", { name: "Entrar" }).click();
  await pagina.waitForURL("**/dashboard", { timeout: 20000 });
  conferir("login leva para o destino guardado", true, "dashboard");

  // Garante conteúdo na lista antes de medi-la. A visita ao dashboard acima
  // já criou o plano da semana; aqui só entra a receita.
  await prepararLista(userId);

  // --- lista de compras: marcar um item e recarregar ---
  await pagina.goto(`${BASE}/lista-compras`, { waitUntil: "networkidle" });
  const primeiro = pagina.getByRole("checkbox").first();
  const nomeDoItem = await pagina
    .locator("label")
    .first()
    .locator("span")
    .first()
    .textContent();

  await primeiro.click();
  await pagina.waitForTimeout(1200);
  await pagina.reload({ waitUntil: "networkidle" });

  const comprados = await supabase
    .from("shopping_list")
    .select("comprado")
    .eq("user_id", userId)
    .eq("comprado", true);

  conferir(
    `marcar "${nomeDoItem?.trim()}" como comprado sobrevive ao recarregar`,
    (comprados.data?.length ?? 0) === 1,
    `${comprados.data?.length ?? 0} item(ns) marcados`,
  );

  const secaoCarrinho = await pagina
    .getByRole("heading", { name: "Já no carrinho" })
    .isVisible();
  conferir("o item marcado muda de seção na tela", secaoCarrinho, secaoCarrinho);

  // --- lista: dispensar, sobreviver ao recálculo, restaurar, filtrar ---
  const nomeDispensado = await pagina
    .getByRole("button", { name: /^Dispensar .* da lista$/ })
    .first()
    .getAttribute("aria-label");
  const soONome = nomeDispensado
    ?.replace("Dispensar ", "")
    .replace(" da lista", "");

  await pagina
    .getByRole("button", { name: /^Dispensar .* da lista$/ })
    .first()
    .click();
  await pagina.waitForTimeout(1500);

  const { data: dispensados } = await supabase
    .from("shopping_list")
    .select("id")
    .eq("user_id", userId)
    .eq("ignorado", true);

  conferir(
    `dispensar "${soONome}" tira o item da lista`,
    (dispensados?.length ?? 0) === 1,
    `${dispensados?.length ?? 0} dispensado(s)`,
  );

  const temSecao = await pagina
    .getByRole("heading", { name: "Dispensados" })
    .isVisible();
  conferir("o item dispensado ganha seção própria", temSecao, temSecao);

  // O gatilho refaz a lista quando o plano muda; a marca precisa sobreviver.
  const { data: slotComReceita } = await supabase
    .from("plan_slots")
    .select("id, recipe_id, plan_id")
    .not("recipe_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (slotComReceita) {
    await supabase
      .from("plan_slots")
      .update({ recipe_id: slotComReceita.recipe_id })
      .eq("id", slotComReceita.id);
    await pagina.waitForTimeout(800);

    const { data: aindaDispensados } = await supabase
      .from("shopping_list")
      .select("id")
      .eq("user_id", userId)
      .eq("ignorado", true);

    conferir(
      "e continua dispensado depois de o plano mudar",
      (aindaDispensados?.length ?? 0) === 1,
      `${aindaDispensados?.length ?? 0} dispensado(s)`,
    );
  }

  await pagina.reload({ waitUntil: "networkidle" });
  await pagina
    .getByRole("button", { name: /de volta para a lista$/ })
    .first()
    .click();
  await pagina.waitForTimeout(1500);

  const { data: depoisDeVoltar } = await supabase
    .from("shopping_list")
    .select("id")
    .eq("user_id", userId)
    .eq("ignorado", true);

  conferir(
    "trazer de volta devolve o item para a lista",
    (depoisDeVoltar?.length ?? 0) === 0,
    `${depoisDeVoltar?.length ?? 0} dispensado(s)`,
  );

  await pagina.getByRole("button", { name: "Mostrar só o que falta" }).click();
  await pagina.waitForTimeout(300);
  const carrinhoEscondido = !(await pagina
    .getByRole("heading", { name: "Já no carrinho" })
    .isVisible()
    .catch(() => false));
  conferir(
    "o filtro esconde o que já está no carrinho",
    carrinhoEscondido,
    carrinhoEscondido,
  );

  // --- perfil: trocar o nome ---
  await pagina.goto(`${BASE}/perfil`, { waitUntil: "networkidle" });
  await pagina.getByLabel("Nome").fill("Ana Souza");
  await pagina.getByRole("button", { name: "Salvar" }).click();
  await pagina.waitForTimeout(1500);

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", userId)
    .maybeSingle();

  conferir(
    "o nome novo chega ao banco",
    perfil?.nome === "Ana Souza",
    perfil?.nome,
  );

  const naNavbar = await pagina.getByText("Ana Souza").first().isVisible();
  conferir("a navbar passa a mostrar o nome novo", naNavbar, naNavbar);

  // --- sugestões: buscar e importar ---
  await pagina.goto(`${BASE}/sugestoes`, { waitUntil: "networkidle" });

  const noCatalogo = await pagina.getByRole("article").count();
  conferir("o catálogo lista as receitas globais", noCatalogo > 0, noCatalogo);

  await pagina.getByLabel("Buscar").fill("brocolis");
  await pagina.waitForTimeout(300);
  const filtradas = await pagina.getByRole("article").count();
  conferir(
    "a busca acha por ingrediente, mesmo sem acento",
    filtradas > 0 && filtradas < noCatalogo,
    `${filtradas} de ${noCatalogo}`,
  );

  await pagina.getByLabel("Buscar").fill("");
  await pagina.waitForTimeout(300);

  const antesDeImportar = await pagina.getByRole("article").count();
  const nomeImportado = await pagina
    .getByRole("article")
    .first()
    .getByRole("heading")
    .textContent();

  await pagina.getByRole("button", { name: "Importar" }).first().click();
  await pagina.waitForTimeout(2000);

  const { count: minhas } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  conferir(
    `importar "${nomeImportado?.trim()}" cria a cópia do usuário`,
    minhas === 1,
    `${minhas} receita(s) próprias`,
  );

  const { count: ligacoes } = await supabase
    .from("recipe_ingredients")
    .select("id", { count: "exact", head: true })
    .in(
      "recipe_id",
      (
        await supabase.from("recipes").select("id").eq("user_id", userId)
      ).data?.map((r) => r.id) ?? [],
    );
  conferir(
    "com os ingredientes junto",
    (ligacoes ?? 0) > 0,
    `${ligacoes} ligação(ões)`,
  );

  const jaImportada = await pagina
    .getByText("Já está nas suas receitas")
    .first()
    .isVisible()
    .catch(() => false);
  conferir("o cartão passa a dizer que já foi importada", jaImportada, jaImportada);

  await pagina.goto(`${BASE}/receitas`, { waitUntil: "networkidle" });
  const emMinhasReceitas = await pagina.getByRole("article").count();
  const temEtiqueta = await pagina
    .getByText("Sua receita")
    .first()
    .isVisible()
    .catch(() => false);

  conferir(
    "a importada aparece como sua, sem duplicar o catálogo",
    emMinhasReceitas === antesDeImportar && temEtiqueta,
    `${emMinhasReceitas} receitas, etiqueta ${temEtiqueta}`,
  );

  // --- receita própria: criar, usar e apagar ---
  const nomeDaReceita = `Panqueca de teste ${randomUUID().slice(0, 6)}`;
  ingredienteInventado = `Farinha de teff ${randomUUID().slice(0, 6)}`;

  await pagina.goto(`${BASE}/receitas`, { waitUntil: "networkidle" });
  await pagina.getByRole("link", { name: "Nova receita" }).first().click();
  await pagina.waitForURL("**/receitas/nova", { timeout: 20000 });

  await pagina.getByLabel("Nome", { exact: true }).fill(nomeDaReceita);
  await pagina
    .getByLabel("Modo de preparo")
    .fill("Misture tudo e leve à frigideira em fogo médio.");
  await pagina.getByLabel("Tempo (min)").fill("15");
  await pagina.getByLabel("Porções").fill("2");
  await pagina.getByLabel("Calorias").fill("320");

  await pagina.getByLabel("Ingrediente", { exact: true }).first().fill(ingredienteInventado);
  await pagina.getByLabel("Quantidade").first().fill("60");
  await pagina.getByLabel("Unidade").first().fill("g");

  // Segunda linha com um ingrediente que já existe: exercita o botão de
  // acrescentar e prova que o catálogo é reaproveitado em vez de duplicado.
  const { count: antesDoCatalogo } = await supabase
    .from("ingredients")
    .select("id", { count: "exact", head: true });

  await pagina.getByRole("button", { name: "Adicionar ingrediente" }).click();
  await pagina.getByLabel("Ingrediente", { exact: true }).nth(1).fill("Sal");
  await pagina.getByLabel("Quantidade").nth(1).fill("1");
  await pagina.getByLabel("Unidade").nth(1).fill("pitada");

  await pagina.getByRole("button", { name: "Salvar receita" }).click();
  await pagina.waitForURL("**/receitas", { timeout: 20000 });

  const { data: criada } = await supabase
    .from("recipes")
    .select("id, calorias, porcoes, recipe_ingredients(quantidade, unidade)")
    .eq("user_id", userId)
    .eq("nome", nomeDaReceita)
    .maybeSingle();

  conferir(
    "a receita própria é salva com os campos informados",
    criada?.calorias === 320 && criada?.porcoes === 2,
    `${criada?.calorias} kcal, ${criada?.porcoes} porções`,
  );
  conferir(
    "com os dois ingredientes",
    criada?.recipe_ingredients?.length === 2,
    `${criada?.recipe_ingredients?.length ?? 0} ingrediente(s)`,
  );

  const { data: ingredienteNovo } = await supabase
    .from("ingredients")
    .select("id, unidade_padrao")
    .eq("nome", ingredienteInventado)
    .maybeSingle();

  conferir(
    "o ingrediente que não existia entra no catálogo",
    ingredienteNovo?.unidade_padrao === "g",
    ingredienteNovo?.unidade_padrao ?? "ausente",
  );

  const { count: depoisDoCatalogo } = await supabase
    .from("ingredients")
    .select("id", { count: "exact", head: true });

  conferir(
    "o que já existia é reaproveitado, não duplicado",
    (depoisDoCatalogo ?? 0) === (antesDoCatalogo ?? 0) + 1,
    `catálogo foi de ${antesDoCatalogo} para ${depoisDoCatalogo}`,
  );

  const marcadaComoSua = await pagina
    .getByRole("article")
    .filter({ hasText: nomeDaReceita })
    .getByText("Sua receita")
    .isVisible()
    .catch(() => false);
  conferir("aparece em Minhas receitas como sua", marcadaComoSua, marcadaComoSua);

  // --- usar a receita nova no planejamento ---
  await pagina.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  const noPainel = await pagina
    .getByRole("button", { name: new RegExp(`Arrastar ${nomeDaReceita}`) })
    .isVisible()
    .catch(() => false);
  conferir("e pode ser arrastada da paleta", noPainel, noPainel);

  const { data: slotVazio } = await supabase
    .from("plan_slots")
    .select("id, plan_id")
    .is("recipe_id", null)
    .limit(1)
    .maybeSingle();

  if (slotVazio && criada) {
    await supabase
      .from("plan_slots")
      .update({ recipe_id: criada.id })
      .eq("id", slotVazio.id);
    await pagina.waitForTimeout(800);

    const { data: naLista } = await supabase
      .from("shopping_list")
      .select("quantidade_total, unidade")
      .eq("plan_id", slotVazio.plan_id)
      .eq("ingredient_id", ingredienteNovo?.id ?? "")
      .maybeSingle();

    conferir(
      "o ingrediente novo entra na lista de compras somado",
      Number(naLista?.quantidade_total) === 60 && naLista?.unidade === "g",
      `${naLista?.quantidade_total} ${naLista?.unidade}`,
    );
  }

  // --- apagar a receita própria ---
  await pagina.goto(`${BASE}/receitas`, { waitUntil: "networkidle" });
  await pagina
    .getByRole("button", { name: `Apagar a receita ${nomeDaReceita}` })
    .click();
  await pagina
    .getByRole("alertdialog")
    .getByRole("button", { name: "Apagar", exact: true })
    .click();
  await pagina.waitForTimeout(2000);

  const { count: sobraram } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("nome", nomeDaReceita);

  conferir("apagar a receita própria funciona", sobraram === 0, sobraram);

  // --- navegação por teclado ---
  await pagina.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await pagina.keyboard.press("Tab");
  const primeiroFoco = await pagina.evaluate(
    () => document.activeElement?.textContent?.trim() ?? "",
  );
  conferir(
    "o primeiro Tab chega em um elemento navegável",
    primeiroFoco.length > 0,
    primeiroFoco || "nada focado",
  );

  // --- sair ---
  await pagina.getByRole("button", { name: "Sair da conta" }).click();
  await pagina.waitForURL("**/login**", { timeout: 20000 });
  conferir("sair devolve para o login", true, "login");

  await pagina.goto(`${BASE}/dashboard`);
  await pagina.waitForURL("**/login**");
  conferir("depois de sair, a rota protegida barra de novo", true, "login");
} finally {
  if (navegador) await navegador.close();
  if (userId) {
    await supabase.auth.admin.deleteUser(userId);
    console.log("\nusuário de teste apagado");
  }
  // O catálogo de ingredientes é compartilhado e não pertence a ninguém: o
  // ingrediente inventado sobreviveria ao usuário de teste e ficaria sujando
  // as sugestões de todo mundo.
  if (ingredienteInventado) {
    const { error } = await supabase
      .from("ingredients")
      .delete()
      .eq("nome", ingredienteInventado);

    console.log(
      error
        ? `ingrediente de teste NÃO foi apagado: ${error.message}`
        : "ingrediente de teste apagado",
    );
  }
}

if (falhas.length > 0) {
  console.error(`\n${falhas.length} verificação(ões) falharam.`);
  process.exit(1);
}

console.log("\nOs fluxos do Bloco 4 funcionam.");
