// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contraste } from "./contraste";

/**
 * A paleta é lida do CSS, não copiada para cá: trocar um token em
 * `app/globals.css` tem que quebrar este teste, não passar despercebido.
 *
 * Os dois temas passam pelas mesmas afirmações. É por isso que os pares são
 * escritos com os nomes semânticos — `primary-strong` × `primary-foreground`,
 * e não "verde escuro × branco". No tema escuro os papéis trocam de cor, mas
 * continuam sendo os mesmos papéis.
 */
const css = readFileSync(
  join(fileURLToPath(new URL(".", import.meta.url)), "..", "app", "globals.css"),
  "utf8",
);

function lerBloco(seletor: string): Map<string, string> {
  const inicio = css.indexOf(`${seletor} {`);
  if (inicio < 0) throw new Error(`bloco ${seletor} não encontrado`);

  const fim = css.indexOf("\n}", inicio);
  const corpo = css.slice(inicio, fim);
  const tokens = new Map<string, string>();

  for (const linha of corpo.matchAll(
    /^\s*--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})/gm,
  )) {
    tokens.set(linha[1], linha[2]);
  }

  return tokens;
}

const TEMAS = {
  claro: lerBloco(":root"),
  escuro: lerBloco(":root.dark"),
};

const AA_TEXTO = 4.5;
const AA_INTERFACE = 3;

/** Texto corrido: [descrição, token do fundo, token do texto]. */
const TEXTO: [string, string, string][] = [
  ["texto principal no cartão", "card", "text-dark"],
  ["texto principal no fundo da aplicação", "background", "text-dark"],
  ["texto auxiliar no cartão", "card", "text-muted"],
  ["texto auxiliar no fundo da aplicação", "background", "text-muted"],
  ["texto no balão flutuante", "popover", "popover-foreground"],
  ["texto sobre o cinza de apoio", "muted", "muted-foreground"],
  ["botão primário", "primary-strong", "primary-foreground"],
  ["botão secundário", "secondary-strong", "secondary-foreground"],
  ["botão terciário", "tertiary-strong", "tertiary-foreground"],
  ["link verde no cartão", "card", "primary-deep"],
  ["texto verde no verde suave", "primary-soft", "primary-deep"],
  ["texto coral no cartão", "card", "secondary-deep"],
  ["texto coral no coral suave", "secondary-soft", "secondary-deep"],
  ["texto lilás no cartão", "card", "tertiary-deep"],
  ["texto lilás no lilás suave", "tertiary-soft", "tertiary-deep"],
  ["item ativo do menu", "accent", "accent-foreground"],
];

/** Bordas, anéis e indicadores: [descrição, fundo, elemento]. */
const INTERFACE: [string, string, string][] = [
  ["contorno de foco no cartão", "card", "primary-strong"],
  ["contorno de foco no fundo da aplicação", "background", "primary-strong"],
  ["marcador de hoje no cartão", "card", "secondary-strong"],
];

function cor(tema: keyof typeof TEMAS, token: string): string {
  const valor = TEMAS[tema].get(token);
  if (!valor) throw new Error(`token --${token} ausente no tema ${tema}`);
  return valor;
}

describe.each(Object.keys(TEMAS) as (keyof typeof TEMAS)[])(
  "contraste da paleta — tema %s",
  (tema) => {
    it.each(TEXTO)("%s passa em AA para texto", (_d, fundo, frente) => {
      expect(contraste(cor(tema, fundo), cor(tema, frente))).toBeGreaterThanOrEqual(
        AA_TEXTO,
      );
    });

    it.each(INTERFACE)("%s passa em AA para interface", (_d, fundo, frente) => {
      expect(contraste(cor(tema, fundo), cor(tema, frente))).toBeGreaterThanOrEqual(
        AA_INTERFACE,
      );
    });
  },
);

describe("as cores base do briefing", () => {
  it("reprovam com texto branco, e é por isso que existem -strong e -deep", () => {
    // Se algum dia alguém apontar texto branco para a cor base, esta é a
    // explicação de por que a interface não faz isso em lugar nenhum.
    expect(contraste(cor("claro", "primary"), "#ffffff")).toBeLessThan(AA_TEXTO);
    expect(contraste(cor("claro", "secondary"), "#ffffff")).toBeLessThan(
      AA_TEXTO,
    );
    expect(contraste(cor("claro", "tertiary"), "#ffffff")).toBeLessThan(
      AA_TEXTO,
    );
  });

  it("a marca sobre o verde da entrada fica numa pastilha por causa disso", () => {
    // O nome "Meal Planner" em branco direto no verde daria 2.4:1. A pastilha
    // de `bg-card` põe o texto sobre o cartão, que passa.
    expect(contraste(cor("claro", "canvas-marca"), "#ffffff")).toBeLessThan(
      AA_TEXTO,
    );
    expect(
      contraste(cor("claro", "card"), cor("claro", "text-dark")),
    ).toBeGreaterThanOrEqual(AA_TEXTO);
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
