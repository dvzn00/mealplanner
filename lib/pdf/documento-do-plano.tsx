import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatarPeriodo } from "@/lib/data-iso";
import type { RelatorioDaSemana } from "@/lib/data/relatorio";
import { formatarMedida } from "@/lib/unidades";

/**
 * O planejamento em papel.
 *
 * Helvetica é uma das fontes que todo leitor de PDF já tem, e cobre os acentos
 * do português — vale mais que embutir um arquivo de fonte só para manter a
 * Poppins da tela.
 *
 * A cor da marca aparece na faixa do topo e nos títulos de seção; o corpo é
 * preto sobre branco, porque isto vai para a impressora e para a geladeira.
 */

const VERDE = "#2F8437";
const CORAL = "#C44E4E";
const CINZA = "#6E6E6E";
const LINHA = "#E7EAE8";
const FAIXA = "#F5F7F5";

const estilos = StyleSheet.create({
  pagina: {
    paddingTop: 0,
    paddingBottom: 44,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#333333",
  },
  topo: {
    backgroundColor: VERDE,
    paddingVertical: 22,
    paddingHorizontal: 36,
    marginBottom: 24,
  },
  marca: { color: "#FFFFFF", fontSize: 17, fontFamily: "Helvetica-Bold" },
  subtitulo: { color: "#FFFFFF", fontSize: 10, marginTop: 5, opacity: 0.9 },
  corpo: { paddingHorizontal: 36 },
  secao: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginTop: 18,
    marginBottom: 8,
  },
  secaoLista: { color: CORAL },
  secaoRefeicoes: { color: VERDE },
  cabecalho: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: VERDE,
    paddingBottom: 5,
    marginBottom: 2,
  },
  rotulo: { fontFamily: "Helvetica-Bold", fontSize: 8, color: CINZA },
  linha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: LINHA,
    paddingVertical: 5,
  },
  linhaAlternada: { backgroundColor: FAIXA },
  vazio: { color: CINZA, fontStyle: "italic" },
  rodape: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 8,
    color: CINZA,
    textAlign: "center",
  },
  aviso: { color: CINZA, marginTop: 4 },
});

/** Larguras das colunas, em porcentagem, para as duas tabelas. */
const REFEICAO = ["16%", "20%", "11%", "38%", "15%"];
const INGREDIENTE = ["58%", "26%", "16%"];

/** O tipo de estilo do próprio StyleSheet — `Text` tem sobrecarga com SVG,
 *  e derivar dela traria uma união que não serve aqui. */
type EstiloDeTexto = (typeof estilos)[keyof typeof estilos];

function Celula({
  largura,
  children,
  estilo,
}: {
  largura: string;
  children: React.ReactNode;
  estilo?: EstiloDeTexto;
}) {
  return (
    <View style={{ width: largura, paddingRight: 6 }}>
      <Text style={estilo}>{children}</Text>
    </View>
  );
}

export function DocumentoDoPlano({
  relatorio,
  incluirLista,
}: {
  relatorio: RelatorioDaSemana;
  incluirLista: boolean;
}) {
  const periodo = formatarPeriodo(
    relatorio.semanaInicio,
    relatorio.semanaFim,
  );

  return (
    <Document
      title={`Meal Planner — ${periodo}`}
      author="Meal Planner"
      language="pt-BR"
    >
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.topo}>
          <Text style={estilos.marca}>Meal Planner</Text>
          <Text style={estilos.subtitulo}>Planejamento de {periodo}</Text>
        </View>

        <View style={estilos.corpo}>
          <Text style={[estilos.secao, estilos.secaoRefeicoes]}>
            Refeições da semana
          </Text>

          <View style={estilos.cabecalho}>
            <Celula largura={REFEICAO[0]} estilo={estilos.rotulo}>
              Dia
            </Celula>
            <Celula largura={REFEICAO[1]} estilo={estilos.rotulo}>
              Refeição
            </Celula>
            <Celula largura={REFEICAO[2]} estilo={estilos.rotulo}>
              Horário
            </Celula>
            <Celula largura={REFEICAO[3]} estilo={estilos.rotulo}>
              Receita
            </Celula>
            <Celula largura={REFEICAO[4]} estilo={estilos.rotulo}>
              Calorias
            </Celula>
          </View>

          {relatorio.refeicoes.map((refeicao, indice) => (
            <View
              key={`${refeicao.dia}-${refeicao.nomeRefeicao}-${refeicao.horario}`}
              style={
                indice % 2 === 1
                  ? [estilos.linha, estilos.linhaAlternada]
                  : estilos.linha
              }
              wrap={false}
            >
              <Celula largura={REFEICAO[0]}>
                {refeicao.dia} {refeicao.data}
              </Celula>
              <Celula largura={REFEICAO[1]}>{refeicao.nomeRefeicao}</Celula>
              <Celula largura={REFEICAO[2]}>{refeicao.horario}</Celula>
              <Celula
                largura={REFEICAO[3]}
                estilo={refeicao.receita ? undefined : estilos.vazio}
              >
                {refeicao.receita ?? "sem receita"}
              </Celula>
              <Celula largura={REFEICAO[4]}>
                {refeicao.calorias === null ? "—" : `${refeicao.calorias} kcal`}
              </Celula>
            </View>
          ))}

          {incluirLista && (
            <>
              <Text style={[estilos.secao, estilos.secaoLista]} break={false}>
                Lista de compras
              </Text>

              {relatorio.ingredientes.length === 0 ? (
                <Text style={estilos.vazio}>
                  Nenhum ingrediente — a semana ainda não tem receitas.
                </Text>
              ) : (
                <>
                  <View style={estilos.cabecalho}>
                    <Celula largura={INGREDIENTE[0]} estilo={estilos.rotulo}>
                      Ingrediente
                    </Celula>
                    <Celula largura={INGREDIENTE[1]} estilo={estilos.rotulo}>
                      Quantidade
                    </Celula>
                    <Celula largura={INGREDIENTE[2]} estilo={estilos.rotulo}>
                      Situação
                    </Celula>
                  </View>

                  {relatorio.ingredientes.map((item, indice) => (
                    <View
                      key={`${item.nome}-${item.unidade}`}
                      style={
                        indice % 2 === 1
                          ? [estilos.linha, estilos.linhaAlternada]
                          : estilos.linha
                      }
                      wrap={false}
                    >
                      <Celula largura={INGREDIENTE[0]}>{item.nome}</Celula>
                      <Celula largura={INGREDIENTE[1]}>
                        {formatarMedida(item.quantidade, item.unidade)}
                      </Celula>
                      <Celula
                        largura={INGREDIENTE[2]}
                        estilo={item.comprado ? undefined : estilos.vazio}
                      >
                        {item.comprado ? "no carrinho" : "a comprar"}
                      </Celula>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>

        <Text
          style={estilos.rodape}
          render={({ pageNumber, totalPages }) =>
            `Meal Planner · ${periodo} · página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
