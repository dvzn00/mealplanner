import type { ReceitaSeed } from "./receitas";

/**
 * Receitas usadas quando não existe `receitas-seed.json` no projeto.
 *
 * Escolhidas para que a demonstração mostre o que o produto faz: azeite, sal e
 * peito de frango aparecem em mais de uma receita, então a lista de compras já
 * nasce com quantidades somadas em vez de uma linha por receita.
 *
 * A ordem de calorias importa. A semana de exemplo preenche os horários em
 * ordem cronológica com as receitas ordenadas da mais leve para a mais
 * calórica, então a primeira daqui é a que cai no café da manhã de segunda.
 */
export const RECEITAS_PADRAO: ReceitaSeed[] = [
  {
    nome: "Omelete de Claras com Espinafre",
    descricao: "Leve e nutritivo, perfeito para o café da manhã.",
    modo_preparo:
      "Refogue o espinafre no azeite. Bata as claras com o sal, junte o espinafre e cozinhe em frigideira antiaderente até firmar.",
    tempo_preparo: 10,
    porcoes: 1,
    calorias: 150,
    ingredientes: [
      { nome: "Claras de ovo", quantidade: 3, unidade: "unidades" },
      { nome: "Espinafre fresco", quantidade: 50, unidade: "g" },
      { nome: "Azeite de oliva", quantidade: 5, unidade: "ml" },
      { nome: "Sal", quantidade: 1, unidade: "pitada" },
    ],
  },
  {
    nome: "Vitamina de Banana com Aveia",
    descricao: "Cinco minutos e sai da cozinha com o café da manhã na mão.",
    modo_preparo:
      "Bata tudo no liquidificador até ficar homogêneo. Sirva na hora, com a canela por cima.",
    tempo_preparo: 5,
    porcoes: 1,
    calorias: 240,
    ingredientes: [
      { nome: "Banana", quantidade: 1, unidade: "unidades" },
      { nome: "Aveia em flocos", quantidade: 30, unidade: "g" },
      { nome: "Leite desnatado", quantidade: 200, unidade: "ml" },
      { nome: "Canela em pó", quantidade: 1, unidade: "pitada" },
    ],
  },
  {
    nome: "Salada de Grão-de-bico",
    descricao: "Rende duas porções e aguenta bem a marmita do dia seguinte.",
    modo_preparo:
      "Pique o tomate, a cebola e a salsinha. Misture com o grão-de-bico já cozido, tempere com azeite e sal e deixe descansar dez minutos antes de servir.",
    tempo_preparo: 15,
    porcoes: 2,
    calorias: 330,
    ingredientes: [
      { nome: "Grão-de-bico cozido", quantidade: 200, unidade: "g" },
      { nome: "Tomate", quantidade: 2, unidade: "unidades" },
      { nome: "Cebola roxa", quantidade: 1, unidade: "unidades" },
      { nome: "Salsinha", quantidade: 10, unidade: "g" },
      { nome: "Azeite de oliva", quantidade: 15, unidade: "ml" },
      { nome: "Sal", quantidade: 1, unidade: "pitada" },
    ],
  },
  {
    nome: "Sopa de Legumes com Frango",
    descricao: "Faça no domingo, coma na semana. Congela bem.",
    modo_preparo:
      "Doure a cebola no azeite, junte o frango em cubos e sele. Acrescente os legumes picados, cubra com água, tempere com sal e cozinhe em fogo baixo por trinta minutos.",
    tempo_preparo: 40,
    porcoes: 4,
    calorias: 380,
    ingredientes: [
      { nome: "Peito de frango", quantidade: 250, unidade: "g" },
      { nome: "Cenoura", quantidade: 2, unidade: "unidades" },
      { nome: "Batata", quantidade: 2, unidade: "unidades" },
      { nome: "Abobrinha", quantidade: 1, unidade: "unidades" },
      { nome: "Cebola", quantidade: 1, unidade: "unidades" },
      { nome: "Azeite de oliva", quantidade: 10, unidade: "ml" },
      { nome: "Sal", quantidade: 1, unidade: "pitada" },
    ],
  },
  {
    nome: "Frango Grelhado com Brócolis",
    descricao: "O almoço de sempre, pronto em meia hora.",
    modo_preparo:
      "Tempere o frango com alho e sal e grelhe até dourar dos dois lados. Cozinhe o brócolis no vapor por cinco minutos e regue com azeite.",
    tempo_preparo: 30,
    porcoes: 2,
    calorias: 420,
    ingredientes: [
      { nome: "Peito de frango", quantidade: 300, unidade: "g" },
      { nome: "Brócolis", quantidade: 200, unidade: "g" },
      { nome: "Alho", quantidade: 2, unidade: "dentes" },
      { nome: "Azeite de oliva", quantidade: 10, unidade: "ml" },
      { nome: "Sal", quantidade: 1, unidade: "pitada" },
    ],
  },
];
