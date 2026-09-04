/**
 * Medidas da lista de compras.
 *
 * "1 unidades" e "5 pitada" são o tipo de detalhe que faz um produto parecer
 * inacabado. Unidades escritas por extenso flexionam com a quantidade;
 * abreviações (g, ml, kg) não mudam nunca.
 */

const PARES: readonly (readonly [string, string])[] = [
  ["unidade", "unidades"],
  ["dente", "dentes"],
  ["pitada", "pitadas"],
  ["colher de sopa", "colheres de sopa"],
  ["colher de chá", "colheres de chá"],
  ["xícara", "xícaras"],
  ["fatia", "fatias"],
  ["folha", "folhas"],
  ["ramo", "ramos"],
  ["maço", "maços"],
  ["lata", "latas"],
  ["pacote", "pacotes"],
  ["punhado", "punhados"],
];

const FORMAS = new Map<string, readonly [string, string]>();
for (const par of PARES) {
  FORMAS.set(par[0], par);
  FORMAS.set(par[1], par);
}

/** Unidade desconhecida volta como veio: melhor intacta que flexionada errado. */
export function flexionarUnidade(quantidade: number, unidade: string): string {
  const par = FORMAS.get(unidade.trim().toLowerCase());
  if (!par) return unidade.trim();

  return quantidade === 1 ? par[0] : par[1];
}

const NUMERO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** `2` vira `"2"`; `0.5` vira `"0,5"`. */
export function formatarQuantidade(valor: number): string {
  return NUMERO.format(valor);
}

/** `"550 g"`, `"1 unidade"`, `"5 pitadas"`. */
export function formatarMedida(quantidade: number, unidade: string): string {
  return `${formatarQuantidade(quantidade)} ${flexionarUnidade(quantidade, unidade)}`;
}

/** O que aparece na lista de sugestões do campo de unidade. */
export const UNIDADES_SUGERIDAS: readonly string[] = [
  "g",
  "kg",
  "ml",
  "l",
  ...PARES.map((par) => par[1]),
];
