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

const email = `ui-${randomUUID()}@example.com`;
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
}

if (falhas.length > 0) {
  console.error(`\n${falhas.length} verificação(ões) falharam.`);
  process.exit(1);
}

console.log("\nOs fluxos do Bloco 4 funcionam.");
