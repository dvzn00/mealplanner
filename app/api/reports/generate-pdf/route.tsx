import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse, type NextRequest } from "next/server";
import { ehDataIso, segundaDaSemana } from "@/lib/data-iso";
import { obterRelatorioDaSemana } from "@/lib/data/relatorio";
import {
  DocumentoDoPlano,
  type ConteudoDoPdf,
} from "@/lib/pdf/documento-do-plano";
import { segundaDaSemanaAtual } from "@/lib/semana";
import { createClient } from "@/lib/supabase/server";

/**
 * O PDF do planejamento.
 *
 * É um GET, e não uma Server Action: assim o botão é um link comum, o download
 * funciona em qualquer navegador sem JavaScript de apoio, e a pessoa pode
 * guardar o endereço.
 *
 * Os dados são lidos aqui mesmo, com o cliente do servidor e a sessão da
 * requisição — a RLS continua sendo a fronteira, e não há uma ida a mais ao
 * banco só para atravessar uma Server Action.
 */
function lerConteudo(valor: string | null): ConteudoDoPdf {
  return valor === "cardapio" || valor === "lista" ? valor : "tudo";
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Sessão expirada.", { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const pedida = searchParams.get("semana");
  const semana =
    pedida && ehDataIso(pedida)
      ? segundaDaSemana(pedida)
      : segundaDaSemanaAtual();
  const conteudo = lerConteudo(searchParams.get("conteudo"));

  const relatorio = await obterRelatorioDaSemana(semana);

  if (!relatorio) {
    return new NextResponse("Semana não encontrada.", { status: 404 });
  }

  const pdf = await renderToBuffer(
    <DocumentoDoPlano relatorio={relatorio} conteudo={conteudo} />,
  );

  // O nome do arquivo diz o que tem dentro: na pasta de downloads, três PDFs
  // da mesma semana com o mesmo nome não ajudam ninguém.
  const sufixo = conteudo === "tudo" ? "" : `-${conteudo}`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="meal-planner${sufixo}-${semana}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
