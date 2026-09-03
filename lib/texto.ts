/**
 * Comparação de texto para busca e para reconhecer receita repetida.
 *
 * Quem digita "grao de bico" espera achar "Grão-de-bico". Acento e caixa saem
 * da conta; o hífen vira espaço, porque ele separa palavras tanto quanto o
 * espaço na hora de procurar.
 */
export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** `true` quando o termo aparece em algum dos textos. */
export function contemTermo(termo: string, textos: string[]): boolean {
  const procurado = normalizarTexto(termo);
  if (!procurado) return true;

  return textos.some((texto) => normalizarTexto(texto).includes(procurado));
}
