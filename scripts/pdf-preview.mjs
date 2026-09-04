#!/usr/bin/env node
/**
 * Gera o PDF e o transforma em imagem, para dar para olhar o resultado.
 *
 *   npm run dev          # em outro terminal
 *   npm run pdf:preview
 *
 * O Chromium sem interface baixa PDF em vez de desenhar, então a rasterização
 * é feita pelo pdf.js dentro da própria página. As folhas saem em
 * `.screenshots/pdf-folha-N.png`.
 *
 * Cria um usuário descartável, marca três itens como comprados — para as duas
 * caixinhas aparecerem — e apaga o usuário no final.
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
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

const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174";

function segundaAtual() {
  const hoje = new Date();
  return new Date(
    Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()) -
      ((hoje.getUTCDay() + 6) % 7) * 86400000,
  )
    .toISOString()
    .slice(0, 10);
}

const email = `pdf-${randomUUID()}@example.com`;
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

  await pagina.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await pagina.getByLabel("E-mail").fill(email);
  await pagina.getByLabel("Senha", { exact: true }).fill(senha);
  await pagina.getByRole("button", { name: "Entrar" }).click();
  await pagina.waitForURL("**/dashboard", { timeout: 20000 });

  const semana = segundaAtual();
  const { data: plano } = await supabase
    .from("weekly_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("semana_inicio", semana)
    .maybeSingle();

  if (plano) {
    const { data: itens } = await supabase
      .from("shopping_list")
      .select("id")
      .eq("plan_id", plano.id)
      .limit(3);

    for (const item of itens ?? []) {
      await supabase
        .from("shopping_list")
        .update({ comprado: true })
        .eq("id", item.id);
    }
  }

  const resposta = await pagina.request.get(
    `${BASE}/api/reports/generate-pdf?semana=${semana}&conteudo=tudo`,
  );
  const bytes = await resposta.body();
  writeFileSync(".screenshots/planejamento.pdf", bytes);
  console.log(`pdf gerado, ${bytes.length} bytes`);

  const leitor = await navegador.newPage({
    viewport: { width: 900, height: 1300 },
  });
  await leitor.goto("about:blank");
  await leitor.addScriptTag({ url: `${PDFJS}/pdf.min.js` });

  const folhas = await leitor.evaluate(
    async ({ base64, worker }) => {
      const lib = window.pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = worker;

      const dados = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const documento = await lib.getDocument({ data: dados }).promise;
      const imagens = [];

      for (let numero = 1; numero <= documento.numPages; numero++) {
        const folha = await documento.getPage(numero);
        const viewport = folha.getViewport({ scale: 1.6 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await folha.render({
          canvasContext: canvas.getContext("2d"),
          viewport,
        }).promise;
        imagens.push(canvas.toDataURL("image/png"));
      }

      return imagens;
    },
    { base64: bytes.toString("base64"), worker: `${PDFJS}/pdf.worker.min.js` },
  );

  folhas.forEach((dataUrl, indice) => {
    const arquivo = `.screenshots/pdf-folha-${indice + 1}.png`;
    writeFileSync(arquivo, Buffer.from(dataUrl.split(",")[1], "base64"));
    console.log(`  ${arquivo}`);
  });
} finally {
  if (navegador) await navegador.close();
  if (userId) {
    await supabase.auth.admin.deleteUser(userId);
    console.log("usuário de teste apagado");
  }
}
