import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatarPeriodo } from "@/lib/data-iso";
import type {
  IngredienteDoRelatorio,
  RefeicaoDoRelatorio,
  RelatorioDaSemana,
} from "@/lib/data/relatorio";
import { formatarMedida } from "@/lib/unidades";

/**
 * O planejamento em papel.
 *
 * Duas folhas com trabalhos diferentes: a primeira fica na geladeira e
 * responde "o que é hoje"; a segunda vai para o mercado e é uma lista de
 * marcar. Por isso a lista de compras tem página própria — ninguém quer
 * carregar o cardápio da semana inteira no bolso do casaco.
 *
 * Decisões de impressão, não de tela:
 *
 * - Fundo colorido só na faixa do topo. Zebra em tabela consome tinta e não
 *   ajuda a ler; filete fino e espaço em branco fazem o mesmo trabalho.
 * - Helvetica, uma das fontes que todo leitor de PDF já tem, e que cobre os
 *   acentos do português. Embutir a Poppins somaria uns 100 KB por arquivo
 *   para uma coerência que ninguém nota numa folha impressa.
 * - Os dias viram blocos, não linhas de tabela. Uma tabela de 21 linhas repete
 *   "Segunda" três vezes e some com a forma da semana.
 */

const VERDE = "#2F8437";
const VERDE_CLARO = "#E8F5E9";
const TINTA = "#1F2421";
const CINZA = "#6E6E6E";
const FILETE = "#DCE2DD";

const estilos = StyleSheet.create({
  pagina: {
    paddingBottom: 46,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: TINTA,
  },

  topo: {
    backgroundColor: VERDE,
    paddingVertical: 20,
    paddingHorizontal: 36,
    marginBottom: 22,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  marca: { color: "#FFFFFF", fontSize: 16, fontFamily: "Helvetica-Bold" },
  secaoDoTopo: {
    color: VERDE_CLARO,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  periodo: { color: "#FFFFFF", fontSize: 9, textAlign: "right" },

  corpo: { paddingHorizontal: 36 },

  colunas: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  dia: {
    width: "47.6%",
    borderWidth: 0.7,
    borderColor: FILETE,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  cabecalhoDoDia: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    borderBottomWidth: 0.7,
    borderBottomColor: FILETE,
    paddingBottom: 5,
    marginBottom: 5,
  },
  nomeDoDia: { color: VERDE, fontSize: 10, fontFamily: "Helvetica-Bold" },
  dataDoDia: { color: CINZA, fontSize: 8 },
  refeicao: { flexDirection: "row", gap: 7, marginTop: 4 },
  horario: {
    width: 30,
    color: CINZA,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  nomeDaRefeicao: { color: CINZA, fontSize: 8 },
  receita: { fontSize: 9, lineHeight: 1.3 },
  semReceita: { fontSize: 9, color: "#A8B0AA" },
  calorias: { fontSize: 8, color: CINZA, textAlign: "right", width: 40 },

  resumo: { fontSize: 9, color: CINZA, marginBottom: 12, lineHeight: 1.4 },
  itens: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  item: {
    width: "47.6%",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderBottomWidth: 0.7,
    borderBottomColor: FILETE,
    paddingVertical: 5,
  },
  caixa: {
    width: 11,
    height: 11,
    borderWidth: 0.9,
    borderColor: "#8A938C",
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  caixaMarcada: { backgroundColor: VERDE_CLARO, borderColor: VERDE },
  marcaDeCheque: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: VERDE,
    lineHeight: 1,
  },
  nomeDoItem: { flex: 1, fontSize: 9 },
  itemComprado: { color: CINZA },
  medida: { fontSize: 9, color: CINZA, textAlign: "right" },

  anotacoes: { marginTop: 26 },
  tituloDeSecao: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: CINZA,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  linhaEmBranco: {
    borderBottomWidth: 0.7,
    borderBottomColor: FILETE,
    height: 19,
  },

  vazio: { color: CINZA },
  rodape: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    fontSize: 7.5,
    color: CINZA,
    textAlign: "center",
  },
});

function Topo({ secao, periodo }: { secao: string; periodo: string }) {
  return (
    <View style={estilos.topo} fixed>
      <Text style={estilos.marca}>Meal Planner</Text>
      <View>
        <Text style={estilos.secaoDoTopo}>{secao}</Text>
        <Text style={estilos.periodo}>{periodo}</Text>
      </View>
    </View>
  );
}

function Rodape({ periodo }: { periodo: string }) {
  return (
    <Text
      style={estilos.rodape}
      render={({ pageNumber, totalPages }) =>
        `Meal Planner · ${periodo} · página ${pageNumber} de ${totalPages}`
      }
      fixed
    />
  );
}

/** As refeições agrupadas por dia, na ordem em que vêm do plano. */
function agruparPorDia(refeicoes: RefeicaoDoRelatorio[]) {
  const dias: { dia: string; data: string; itens: RefeicaoDoRelatorio[] }[] = [];

  for (const refeicao of refeicoes) {
    const ultimo = dias.at(-1);
    if (ultimo?.dia === refeicao.dia) {
      ultimo.itens.push(refeicao);
    } else {
      dias.push({ dia: refeicao.dia, data: refeicao.data, itens: [refeicao] });
    }
  }

  return dias;
}

function BlocoDoDia({
  dia,
  data,
  itens,
}: {
  dia: string;
  data: string;
  itens: RefeicaoDoRelatorio[];
}) {
  const total = itens.reduce((soma, item) => soma + (item.calorias ?? 0), 0);

  return (
    <View style={estilos.dia} wrap={false}>
      <View style={estilos.cabecalhoDoDia}>
        <Text style={estilos.nomeDoDia}>{dia}</Text>
        <Text style={estilos.dataDoDia}>
          {data}
          {total > 0 ? ` · ${total} kcal` : ""}
        </Text>
      </View>

      {itens.map((item) => (
        <View
          key={`${item.nomeRefeicao}-${item.horario}`}
          style={estilos.refeicao}
        >
          <Text style={estilos.horario}>{item.horario}</Text>
          <View style={{ flex: 1 }}>
            <Text style={estilos.nomeDaRefeicao}>{item.nomeRefeicao}</Text>
            <Text style={item.receita ? estilos.receita : estilos.semReceita}>
              {item.receita ?? "—"}
            </Text>
          </View>
          <Text style={estilos.calorias}>
            {item.calorias === null ? "" : `${item.calorias} kcal`}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ItemDaLista({ item }: { item: IngredienteDoRelatorio }) {
  return (
    <View style={estilos.item} wrap={false}>
      <View
        style={
          item.comprado ? [estilos.caixa, estilos.caixaMarcada] : estilos.caixa
        }
      >
        {item.comprado ? <Text style={estilos.marcaDeCheque}>X</Text> : null}
      </View>

      <Text
        style={
          item.comprado
            ? [estilos.nomeDoItem, estilos.itemComprado]
            : estilos.nomeDoItem
        }
      >
        {item.nome}
      </Text>
      <Text style={estilos.medida}>
        {formatarMedida(item.quantidade, item.unidade)}
      </Text>
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
  const periodo = formatarPeriodo(relatorio.semanaInicio, relatorio.semanaFim);
  const dias = agruparPorDia(relatorio.refeicoes);
  const aComprar = relatorio.ingredientes.filter((item) => !item.comprado);

  return (
    <Document
      title={`Meal Planner — ${periodo}`}
      author="Meal Planner"
      language="pt-BR"
    >
      <Page size="A4" style={estilos.pagina}>
        <Topo secao="REFEIÇÕES DA SEMANA" periodo={periodo} />

        <View style={estilos.corpo}>
          {dias.length === 0 ? (
            <Text style={estilos.vazio}>
              Esta semana ainda não tem horários.
            </Text>
          ) : (
            <View style={estilos.colunas}>
              {dias.map((grupo) => (
                <BlocoDoDia key={grupo.dia} {...grupo} />
              ))}
            </View>
          )}
        </View>

        <Rodape periodo={periodo} />
      </Page>

      {/*
        Folha separada de propósito: esta é a que vai no bolso, no mercado.
        Quem só quer comprar não precisa carregar o cardápio junto.
      */}
      {incluirLista && (
        <Page size="A4" style={estilos.pagina}>
          <Topo secao="LISTA DE COMPRAS" periodo={periodo} />

          <View style={estilos.corpo}>
            <Text style={estilos.resumo}>
              {relatorio.ingredientes.length === 0
                ? "Nenhum ingrediente — a semana ainda não tem receitas."
                : `${aComprar.length} ${aComprar.length === 1 ? "item a comprar" : "itens a comprar"}${
                    aComprar.length === relatorio.ingredientes.length
                      ? ""
                      : ` de ${relatorio.ingredientes.length}`
                  }. Quantidades somadas a partir das receitas da semana.`}
            </Text>

            <View style={estilos.itens}>
              {relatorio.ingredientes.map((item) => (
                <ItemDaLista key={`${item.nome}-${item.unidade}`} item={item} />
              ))}
            </View>

            {/* Sempre falta lembrar de alguma coisa no corredor do mercado. */}
            <View style={estilos.anotacoes}>
              <Text style={estilos.tituloDeSecao}>OUTRAS COISAS</Text>
              {Array.from({ length: 5 }, (_, indice) => (
                <View key={indice} style={estilos.linhaEmBranco} />
              ))}
            </View>
          </View>

          <Rodape periodo={periodo} />
        </Page>
      )}
    </Document>
  );
}
