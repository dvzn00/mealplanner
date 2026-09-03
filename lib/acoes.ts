/**
 * O contrato das Server Actions do produto.
 *
 * Toda ação devolve `{ sucesso }` — nunca lança para o cliente. Uma exceção
 * que escapa de uma Server Action vira um erro genérico no navegador, sem
 * mensagem que a pessoa possa usar. `protegida` é o último anteparo: erro
 * inesperado (rede caindo no meio, banco indisponível) vira a mesma resposta
 * que qualquer outra falha.
 *
 * Ações que redirecionam não passam por aqui: `redirect()` funciona lançando,
 * e o `catch` engoliria o redirecionamento.
 */

export interface ResultadoDaAcao {
  sucesso: boolean;
  erro?: string;
}

export const OK: ResultadoDaAcao = { sucesso: true };

export function falha(erro: string): ResultadoDaAcao {
  return { sucesso: false, erro };
}

export async function protegida(
  mensagemGenerica: string,
  corpo: () => Promise<ResultadoDaAcao>,
): Promise<ResultadoDaAcao> {
  try {
    return await corpo();
  } catch (erro) {
    // A mensagem original pode conter nome de tabela e coluna; o usuário
    // recebe a frase amigável, e o servidor guarda o resto.
    console.error("[acao]", mensagemGenerica, erro);
    return falha(mensagemGenerica);
  }
}

/**
 * Uma escrita que não alcançou nenhuma linha não é sucesso.
 *
 * Com RLS, tentar alterar a linha de outra pessoa não dá erro: afeta zero
 * linhas em silêncio. Sem esta checagem, a interface diria "salvo" para uma
 * gravação que não aconteceu.
 */
export function exigirLinha<T>(
  linha: T | null | undefined,
  erro: string,
): ResultadoDaAcao | null {
  return linha ? null : falha(erro);
}
