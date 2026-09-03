import { describe, expect, it } from "vitest";
import { ehRotaDeEntrada, ehRotaPublica } from "./routes";

describe("ehRotaPublica", () => {
  it("libera as rotas de entrada", () => {
    expect(ehRotaPublica("/login")).toBe(true);
    expect(ehRotaPublica("/cadastro")).toBe(true);
    expect(ehRotaPublica("/auth/callback")).toBe(true);
    expect(ehRotaPublica("/")).toBe(true);
  });

  it("protege as rotas da aplicação", () => {
    expect(ehRotaPublica("/dashboard")).toBe(false);
    expect(ehRotaPublica("/receitas")).toBe(false);
    expect(ehRotaPublica("/lista-compras")).toBe(false);
    expect(ehRotaPublica("/perfil")).toBe(false);
  });

  it("não confunde prefixo com começo de palavra", () => {
    // "/loginhack" não é "/login".
    expect(ehRotaPublica("/loginhack")).toBe(false);
    expect(ehRotaPublica("/cadastro-antigo")).toBe(false);
    expect(ehRotaPublica("/authorization")).toBe(false);
  });

  it("a raiz não abre as rotas filhas", () => {
    expect(ehRotaPublica("/historico")).toBe(false);
  });
});

describe("ehRotaDeEntrada", () => {
  it("aponta só login e cadastro", () => {
    expect(ehRotaDeEntrada("/login")).toBe(true);
    expect(ehRotaDeEntrada("/cadastro")).toBe(true);
    expect(ehRotaDeEntrada("/")).toBe(false);
    expect(ehRotaDeEntrada("/auth/callback")).toBe(false);
    expect(ehRotaDeEntrada("/dashboard")).toBe(false);
  });
});
