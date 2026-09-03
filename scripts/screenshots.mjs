#!/usr/bin/env node
/**
 * Fotografa as telas em várias larguras, para conferir as quebras de layout
 * sem depender de imaginação.
 *
 *   npm run dev            # em outro terminal
 *   npm run screenshots
 *
 * Cria um usuário descartável pela API de administração, entra pela tela de
 * login como qualquer pessoa entraria, percorre as rotas e apaga o usuário no
 * final. As imagens vão para `.screenshots/`, que não é versionado.
 */
import { mkdirSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SAIDA = ".screenshots";

const LARGURAS = [375, 768, 1024, 1440];
const PUBLICAS = ["/login", "/cadastro"];
const PRIVADAS = [
  "/dashboard",
  "/receitas",
  "/lista-compras",
  "/sugestoes",
  "/historico",
  "/perfil",
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secret) {
  console.error("Faltam as variáveis do Supabase.");
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `visual-${randomUUID()}@example.com`;
const senha = randomUUID();
let userId;

function nomeDoArquivo(largura, rota) {
  return `${SAIDA}/${largura}${rota.replace(/\//g, "-")}.png`;
}

try {
  rmSync(SAIDA, { recursive: true, force: true });
  mkdirSync(SAIDA, { recursive: true });

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: "Ana Beatriz Souza" },
  });
  if (error || !data.user) throw new Error(error?.message ?? "sem usuário");
  userId = data.user.id;

  const navegador = await chromium.launch();

  for (const largura of LARGURAS) {
    const contexto = await navegador.newContext({
      viewport: { width: largura, height: largura < 700 ? 780 : 900 },
      locale: "pt-BR",
    });
    const pagina = await contexto.newPage();

    for (const rota of PUBLICAS) {
      await pagina.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
      await pagina.screenshot({ path: nomeDoArquivo(largura, rota) });
    }

    await pagina.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await pagina.getByLabel("E-mail").fill(email);
    await pagina.getByLabel("Senha", { exact: true }).fill(senha);
    await pagina.getByRole("button", { name: "Entrar" }).click();
    await pagina.waitForURL("**/dashboard", { timeout: 20000 });

    for (const rota of PRIVADAS) {
      await pagina.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
      await pagina.screenshot({
        path: nomeDoArquivo(largura, rota),
        fullPage: true,
      });
    }

    // O menu deslizante só existe abaixo de lg.
    if (largura < 1024) {
      await pagina.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
      await pagina.getByRole("button", { name: "Abrir menu" }).click();
      await pagina.waitForTimeout(400);
      await pagina.screenshot({ path: nomeDoArquivo(largura, "/menu") });
    }

    await contexto.close();
    console.log(`  ${largura}px capturado`);
  }

  await navegador.close();
} finally {
  if (userId) {
    await supabase.auth.admin.deleteUser(userId);
    console.log("usuário de teste apagado");
  }
}

console.log(`\nImagens em ${SAIDA}/`);
