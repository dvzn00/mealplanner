// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contraste } from "./contraste";

/**
 * A paleta é lida do CSS, não copiada para cá: trocar um token em
 * `app/globals.css` tem que quebrar este teste, não passar despercebido.
 */
const css = readFileSync(
  join(fileURLToPath(new URL(".", import.meta.url)), "..", "app", "globals.css"),
  "utf8",
);

function token(nome: string): string {
  const encontrado = css.match(
    new RegExp(`^\\s*--${nome}:\\s*(#[0-9a-fA-F]{3,8})`, "m"),
  );

  if (!encontrado) throw new Error(`token --${nome} não encontrado`);
  return encontrado[1];
}

const AA_TEXTO = 4.5;
const AA_INTERFACE = 3;

/** Texto corrido: fundo × cor do texto. */
const TEXTO: [string, string, string][] = [
  ["texto principal sobre o cartão branco", "card", "text-dark"],
  ["texto principal sobre o fundo da aplicação", "background", "text-dark"],
  ["texto principal sobre o verde da marca", "primary", "text-dark"],
  ["texto auxiliar sobre o cartão branco", "card", "text-muted"],
  ["texto auxiliar sobre o fundo da aplicação", "background", "text-muted"],
  ["botão primário: branco sobre o verde forte", "primary-strong", "card"],
  ["botão secundário: branco sobre o coral forte", "secondary-strong", "card"],
  ["botão terciário: branco sobre o lilás forte", "tertiary-strong", "card"],
  ["link verde sobre branco", "card", "primary-deep"],
  ["texto verde sobre o verde claro", "primary-soft", "primary-deep"],
  ["texto coral sobre branco", "card", "secondary-deep"],
  ["texto coral sobre o rosa bebê", "secondary-soft", "secondary-deep"],
  ["texto lilás sobre branco", "card", "tertiary-deep"],
  ["texto lilás sobre o lilás claro", "tertiary-soft", "tertiary-deep"],
  ["item ativo do menu", "accent", "accent-foreground"],
];

/** Elementos de interface: bordas, anéis, indicadores. */
const INTERFACE: [string, string, string][] = [
  ["contorno de foco sobre o cartão", "card", "primary-strong"],
  ["contorno de foco sobre o fundo da aplicação", "background", "primary-strong"],
  ["marcador de hoje sobre o cartão", "card", "secondary-strong"],
];

describe("contraste da paleta", () => {
  it.each(TEXTO)("%s passa em AA para texto", (_descricao, fundo, frente) => {
    expect(contraste(token(fundo), token(frente))).toBeGreaterThanOrEqual(
      AA_TEXTO,
    );
  });

  it.each(INTERFACE)("%s passa em AA para interface", (_d, fundo, frente) => {
    expect(contraste(token(fundo), token(frente))).toBeGreaterThanOrEqual(
      AA_INTERFACE,
    );
  });

  it("registra que as cores base do briefing reprovam com texto branco", () => {
    // É por isso que existem as variantes -strong e -deep. Se algum dia
    // alguém apontar texto branco para a cor base, esta é a explicação.
    expect(contraste(token("primary"), "#ffffff")).toBeLessThan(AA_TEXTO);
    expect(contraste(token("secondary"), "#ffffff")).toBeLessThan(AA_TEXTO);
    expect(contraste(token("tertiary"), "#ffffff")).toBeLessThan(AA_TEXTO);
  });
});

describe("contraste", () => {
  it("preto sobre branco é 21:1", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("não depende da ordem", () => {
    expect(contraste("#2f8437", "#ffffff")).toBeCloseTo(
      contraste("#ffffff", "#2f8437"),
      10,
    );
  });
});
