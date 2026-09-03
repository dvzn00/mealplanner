# Arquitetura — Meal Planner

Registro das decisões técnicas tomadas durante a construção. Cada decisão traz
o contexto que a motivou, para que uma escolha futura diferente seja consciente.

## Visão geral

Meal Planner é um planejador semanal de refeições. O usuário monta a semana
(segunda a domingo) arrastando receitas para horários que ele mesmo define, e a
lista de compras é somada automaticamente a partir dos ingredientes das receitas
que estão no plano.

O trabalho está dividido em blocos. Este arquivo é atualizado ao final de cada um.

| Bloco | Escopo                                          | Estado     |
| ----- | ----------------------------------------------- | ---------- |
| 1     | Setup do projeto, design tokens, tooling         | Concluído  |
| 2     | Supabase, schema, RLS, função e trigger, testes  | Concluído  |
| 3     | Seed de receitas e plano de exemplo              | Concluído  |
| 4     | Autenticação, layout base e páginas iniciais     | Concluído  |

## Stack instalada

| Peça          | Versão   | Observação                                         |
| ------------- | -------- | -------------------------------------------------- |
| Next.js       | 16.3.4   | App Router, Turbopack                              |
| React         | 19.2.8   | Server Components por padrão                       |
| TypeScript    | 5.x      | `strict: true`                                     |
| Tailwind CSS  | 4.x      | Configuração em CSS, sem `tailwind.config.js`      |
| shadcn/ui     | CLI 4.x  | Base Radix, preset `nova`                          |
| Supabase JS   | 2.114    | Com `@supabase/ssr` 0.12                           |
| dnd-kit       | core 6.3 | Usado a partir do Prompt 2                         |
| Zod           | 3.25     | Ver decisão 7                                      |
| Vitest        | 4.1      | jsdom + Testing Library                            |
| PGlite        | 0.5.8    | Postgres em WASM; só nos testes                    |
| Playwright    | 1.x      | capturas e teste de fluxo; só em desenvolvimento   |

---

## Decisões

### 1. O projeto vive na raiz do repositório

`create-next-app` foi executado em `.` em vez de criar `meal-planner/`. O
repositório Git já existia e já se chamava `mealplanner`; uma pasta aninhada só
acrescentaria um nível a todos os caminhos.

Sem `src/`: `app/`, `components/`, `lib/` ficam na raiz, exatamente como o
briefing descreve os caminhos (`lib/supabase/client.ts`).

### 2. Next.js 16, não 14

O briefing pede "Next.js 14+". A versão atual do `create-next-app` entrega a 16.
Duas mudanças afetam o que ainda será escrito:

- **`middleware.ts` virou `proxy.ts`.** O arquivo raiz que intercepta requisições
  agora se chama `proxy.ts` e exporta `proxy`. O Bloco 2 vai criar
  `lib/supabase/middleware.ts` (o helper que renova a sessão, nome que o briefing
  usa) e um `proxy.ts` na raiz que o consome.
- **Tipos de rota gerados.** `LayoutProps<"/">` e afins vêm de `.next/types`, que
  o comando `next typegen` produz. Por isso `npm run typecheck` é
  `next typegen && tsc --noEmit` — rodar `tsc` sozinho falha em projeto limpo.

### 3. Tailwind v4: tokens em CSS, não em `tailwind.config.js`

O briefing traz um `tailwind.config.js` com a paleta. O Tailwind v4 não lê mais
esse arquivo por padrão: o tema é declarado em CSS, no bloco `@theme`, dentro de
`app/globals.css`.

O resultado para quem escreve componentes é idêntico — `bg-primary`,
`text-text-dark`, `rounded-pill` continuam existindo, com os mesmos valores. O
que mudou foi o lugar onde a paleta é declarada.

Nomes em kebab-case em vez do camelCase do briefing, seguindo a convenção do
Tailwind: `grayLight` → `bg-gray-light`, `textDark` → `text-text-dark`,
`greenLight` → `bg-green-light`, `pinkLight` → `bg-pink-light`.

`app/globals.css` é a única fonte de verdade das cores. Nenhum HEX deve aparecer
solto em componente.

### 4. shadcn/ui sobre Radix, com os tokens semânticos apontando para a marca

A CLI atual pergunta por uma "base" (Base UI, Radix ou React Aria) e por um
preset. Escolhemos **Radix** — é o que o briefing pressupõe (`@radix-ui/react-slot`
está na lista de dependências) e o que tem mais rodagem em produção.

O preset `nova` e a base color `neutral` são apenas o ponto de partida da CLI:
as variáveis `--primary`, `--secondary`, `--background`, `--card` etc. foram
reescritas para a paleta do Meal Planner. Assim os componentes prontos do shadcn
já nascem com a identidade certa, sem `className` de correção em cada uso.

### 5. Paleta literal + variantes acessíveis

A paleta do briefing é a paleta do produto, e está no código exatamente como foi
especificada. Só que três das cores **não passam no WCAG AA com texto branco**:

| Fundo                | Texto     | Contraste | AA (4.5:1) |
| -------------------- | --------- | --------- | ---------- |
| `#5DBB63` primária   | `#FFFFFF` | 2.40:1    | reprovado  |
| `#5DBB63` primária   | `#333333` | 5.27:1    | aprovado   |
| `#F76C6C` secundária | `#FFFFFF` | 2.87:1    | reprovado  |
| `#B39DDB` terciária  | `#FFFFFF` | 2.40:1    | reprovado  |
| `#888888` texto aux. | `#FFFFFF` | 3.54:1    | reprovado  |

Cada cor da marca ganhou então três degraus, e a regra de uso é a mesma para as
três famílias:

| Token      | Verde     | Coral     | Lilás     | Onde usar                                 |
| ---------- | --------- | --------- | --------- | ----------------------------------------- |
| `*-soft`   | `#E8F5E9` | `#FFE4E1` | `#F2EDFB` | fundo de ícone, chip, faixa               |
| base       | `#5DBB63` | `#F76C6C` | `#B39DDB` | superfície grande, ícone ativo, borda     |
| `*-strong` | `#2F8437` | `#C44E4E` | `#7A5FBF` | **preenchimento** com texto branco por cima |
| `*-deep`   | `#276B2D` | `#A83C3C` | `#6A4CAE` | **texto** sobre branco ou sobre `-soft`    |

A regra em uma linha: **preenchimento usa `-strong`, texto usa `-deep`.**

O quarto degrau nasceu no Bloco 4, olhando as telas prontas. `-strong` sobre
branco passa (4.67:1), mas `-strong` sobre `-soft` cai para 4.15:1 — e era
exatamente essa a combinação do item ativo do menu, do aviso de erro e das
iniciais no avatar. `-deep` passa nos dois fundos: 6.51:1 no branco e 5.79:1
no `-soft`.

Mesma lógica para texto auxiliar — `--text-gray` (`#888888`) fica para uso
decorativo e `--text-muted` (`#6E6E6E`, 5.10:1) é o que aparece em texto
corrido.

**Decidido pelo usuário:** abordagem híbrida. Texto branco sobre cor sempre usa
a variante `-strong`; a cor base do briefing continua nos fundos de card, nos
ícones, nas superfícies grandes e em qualquer lugar sem texto claro por cima.
A identidade fica de pé e o contraste passa.

### 6. Tema claro único

O briefing descreve um produto claro e ensolarado, sem menção a modo escuro. O
bloco `.dark` que a CLI gera foi removido em vez de ficar com um tema escuro
não projetado e nunca ativado. Se o modo escuro entrar depois, ele volta como
redefinição das mesmas variáveis em `:root.dark`.

### 7. Zod na linha 3.x

`eslint-plugin-react-hooks@7` (parte do `eslint-config-next`) depende de Zod 3, e
o npm resolveu uma única cópia para a árvore inteira. Forçar a 4.x criaria uma
segunda cópia aninhada sem ganho real: a API que o projeto usa — `z.object`,
`z.string().email()`, `safeParse` — é a mesma nas duas versões, e
`@hookform/resolvers@5` aceita ambas.

### 8. Vitest com pool `threads`, config em `.mts`

O pool padrão (`forks`) não sobe worker neste ambiente Windows — o processo
estoura o timeout de inicialização. `pool: "threads"` roda a suíte inteira.

O arquivo é `vitest.config.mts` porque o Vite carregaria um `.ts` como CommonJS e
avisaria sobre a sintaxe ESM a cada execução.

### 9. `.env.local` fora do Git, `.env.example` dentro

`.gitignore` ignora `.env*` e reabre exceção para `.env.example`, que documenta
quais variáveis existem sem carregar segredo nenhum.

`SUPABASE_SERVICE_ROLE_KEY` ignora RLS por completo. Ela só pode ser lida em
código que roda no servidor — scripts de seed e rotinas administrativas — e nunca
em arquivo com `"use client"`.

### 10. Migrações versionadas, aplicáveis pelos dois caminhos

O SQL mora em `supabase/migrations/`, em arquivos numerados por data. Quem usa
a CLI roda `supabase db push`. Quem prefere o SQL Editor roda `npm run db:sql`,
que imprime tudo na ordem certa em um bloco só para colar.

Ter os arquivos versionados é o que permite testá-los — e é o que evita que o
schema real e o repositório sigam caminhos diferentes.

### 11. O nome do usuário mora em `public.profiles`

O briefing fala em estender `auth.users` com `name`. O Supabase Auth não aceita
colunas novas nessa tabela, então o caminho é uma tabela pública ligada por
chave estrangeira, preenchida por trigger no cadastro
(`handle_new_user`, que lê `raw_user_meta_data`).

A coluna se chama `nome`, e não `name`, para o banco não ficar meio em inglês e
meio em português — todo o resto do schema é `nome`, `descricao`, `porcoes`.

### 12. `dia_da_semana` sem acento

`'terca'`, não `'terça'`. O valor vira chave de React, parâmetro de URL e termo
de comparação; acento nesses três lugares é fonte de bug silencioso. O rótulo
com acento é responsabilidade da interface.

### 13. A lista agrupa por (ingrediente, unidade)

300 g de farinha em uma receita e 0,5 kg em outra produzem **duas linhas**.
Somar exigiria uma tabela de conversão que ainda não existe; converter errado
é pior do que listar separado. Quando a conversão entrar, ela muda só a função
`generate_shopping_list`.

`comprado` sobrevive ao recálculo de propósito: acrescentar uma receita muda a
quantidade do item, não desmarca o que já foi ao carrinho.

### 14. Gatilho por linha, não por comando

`generate_shopping_list` é chamada por um gatilho `for each row` em
`plan_slots` — e por outro em `recipe_ingredients`, para que editar uma receita
atualize todo plano que a usa.

Um gatilho `for each statement` com transition tables recalcularia uma vez por
comando em vez de uma por linha. Não vale ainda: uma semana tem algumas dezenas
de slots, e o Postgres proíbe transition tables em gatilho com mais de um
evento, o que exigiria três gatilhos e três funções. Se a escrita em lote
crescer, é essa a evolução.

### 15. A lista de compras é protegida por privilégio de coluna

Política de RLS diz quais linhas o usuário enxerga; ela não diz quais colunas
ele pode escrever. Como `quantidade_total` e `unidade` pertencem à função e não
à pessoa, a proteção é um `GRANT` estreito:

```sql
grant select            on public.shopping_list to authenticated;
grant update (comprado) on public.shopping_list to authenticated;
```

Tentar alterar a quantidade pela API devolve `permission denied`, e há teste
para isso.

### 16. As migrações são testadas em um Postgres de verdade

`supabase/tests/` sobe PGlite (Postgres compilado para WASM), aplica as mesmas
migrações e exercita a função, os gatilhos e as políticas. Não há mock: o que
roda no teste é o SQL que vai para produção.

O schema `auth` e os papéis `anon` / `authenticated` / `service_role` são
recriados em versão mínima no `db.ts`, inclusive `auth.uid()` — que lê a mesma
variável de sessão preenchida pelo PostgREST a partir do JWT. Por isso as
políticas rodam sem adaptação. A migração de storage fica de fora, porque
depende de um schema que só existe no Supabase.

A suíte tem 35 testes: 11 sobre a lista de compras e o cadastro, 17 sobre RLS,
5 sobre a classificação de rotas do proxy e 2 sobre o utilitário de classes.

### 17. `proxy.ts`, e o que fazer sem credenciais

O arquivo raiz do Next 16 é `proxy.ts`; ele delega para
`lib/supabase/middleware.ts`, que é onde a documentação do Supabase manda
procurar. A lista de rotas públicas fica em `lib/supabase/routes.ts`, separada
para poder ser testada sem subir o Next.

Sem `NEXT_PUBLIC_SUPABASE_URL` configurada, o proxy deixa a requisição passar
**em desenvolvimento** — não há sessão para renovar nem dado para proteger, e é
o que permite abrir o projeto antes das chaves chegarem. Em produção a mesma
situação levanta erro: aplicação sem Supabase é falha de deploy, não modo de
operação.

Comparação de prefixo é por segmento: `/loginhack` não é rota pública.

### 18. `Database` precisa ser `type`, nunca `interface`

`lib/supabase/database.types.ts` é escrito à mão, no mesmo formato que
`supabase gen types` produz, para poder ser substituído pelo gerador quando
houver projeto acessível.

Uma armadilha custou tempo e merece registro: o supabase-js exige
`Record<string, unknown>` em cada linha, e **interface não tem index signature
implícita**. Declarar as linhas com `interface` não gera erro — faz toda
consulta passar a devolver `never`, silenciosamente. `database.types.assert.ts`
existe só para essa regressão falhar no `typecheck`.

### 19. Validação de ambiente preguiçosa

`getPublicEnv()` valida com Zod na primeira chamada, não na importação do
módulo. Assim `next build` roda em um clone sem `.env.local`, e quem esquecer
de preencher recebe a falha na primeira requisição, dizendo qual variável
falta — nunca o valor.

`SUPABASE_SERVICE_ROLE_KEY` fica em `lib/env.admin.ts`, sem `server-only`, para
que scripts de linha de comando possam usá-la. A barreira contra o bundle do
cliente está em `lib/supabase/admin.ts`, que importa `server-only` e é por onde
a aplicação consome a chave.

### 20. A semana de exemplo é determinística

O briefing pede receitas em "slots aleatórios". Aleatório foi trocado por
determinístico: o catálogo global é ordenado por calorias e distribuído em
ordem cronológica a partir do café da manhã de segunda, ciclando quando há
menos receitas que horários.

Duas razões. Determinismo é o que permite o teste afirmar alguma coisa — e o
que faz duas contas novas verem a mesma demonstração, em vez de uma cair numa
combinação sem graça. De brinde, ordenar por calorias põe a receita mais leve
no café da manhã, que é onde ela faz sentido, sem precisar de nenhum campo
novo no schema.

Preenche só segunda e terça. O resto da semana fica vazio de propósito: é o
convite para arrastar. Com o catálogo padrão de 5 receitas em 6 horários, a
primeira repete — e a lista de compras já nasce mostrando a soma funcionando.

### 21. Dado de demonstração não impede ninguém de criar conta

`handle_new_user` roda em gatilho sobre `auth.users`: se ele levantar erro, o
cadastro falha. Então a montagem da semana vai dentro de um bloco de exceção
que registra `warning` e segue. O perfil, esse sim essencial, fica fora do
bloco.

### 22. As funções SECURITY DEFINER não são chamáveis pela API

`generate_shopping_list` e `montar_semana_de_exemplo` recebem um id como
parâmetro e rodam como dono do schema. Expostas via RPC — e o Postgres concede
`EXECUTE` a `PUBLIC` por padrão — deixariam um usuário agir sobre o plano de
outro. As duas são revogadas de `public` e concedidas apenas a `service_role`.
Os gatilhos continuam funcionando porque rodam como dono.

Há teste: `authenticated` chamando qualquer uma das duas recebe
`permission denied`.

### 23. O seed é reexecutável

`npm run db:seed` lê `receitas-seed.json` da raiz ou de `scripts/`. Sem o
arquivo, usa as 5 receitas de `lib/seed/receitas-padrao.ts` — nunca trava por
falta dele.

Rodar de novo atualiza a receita global de mesmo nome e substitui a lista de
ingredientes dela, então editar o JSON e repetir funciona. Duas regras que
valem registro:

- **A deduplicação do catálogo usa `lower(nome)`**, exatamente o índice único
  que existe em `ingredients`. Normalizar mais que o banco (tirando acento,
  digamos) faria o script juntar o que o banco considera diferente.
- **O mesmo ingrediente duas vezes na mesma receita** é somado quando a unidade
  bate e levanta erro quando não bate. `recipe_ingredients` tem
  `UNIQUE(recipe_id, ingredient_id)`, e converter às cegas estraga a lista de
  compras em silêncio.

A lógica pura vive em `lib/seed/`, separada do script, para ser testável sem
projeto Supabase.

### 24. Três scripts de administração

| Script            | Para quê                                                    |
| ----------------- | ----------------------------------------------------------- |
| `npm run db:check`| as tabelas e a função existem? quanto já foi semeado?        |
| `npm run db:seed` | popula o catálogo global de ingredientes e receitas          |
| `npm run db:smoke`| cria um usuário descartável, confere o cadastro e o apaga    |

Rodam com `--env-file-if-exists=.env.local`, recurso nativo do Node — sem
`dotenv`. O de seed passa por `tsx` para resolver o alias `@/`.

`db:smoke` é a verificação de ponta a ponta do cadastro: perfil, semana,
21 horários, 6 preenchidos, lista somada. O usuário é apagado no `finally`,
aconteça o que acontecer, e o `on delete cascade` leva o resto junto.

### 25. Os arquivos de teste rodam em série

`pool: "threads"` compartilha um processo só, e cada arquivo de teste de banco
sobe um Postgres em WASM. Três heaps desses ao mesmo tempo derrubam o V8 com
erro fatal. `fileParallelism: false` resolve, ao custo de alguns segundos.

### 26. O contraste está travado em teste

`lib/contraste.test.ts` lê os tokens direto de `app/globals.css` — não copia os
valores — e afirma 4.5:1 para cada par de texto que a interface usa de verdade,
3:1 para bordas e contornos de foco. Trocar um token e piorar o contraste
quebra `npm run test`.

Um dos casos de teste afirma o contrário: que as três cores base do briefing
**reprovam** com texto branco. É a explicação do porquê de `-strong` e `-deep`
existirem, escrita onde ninguém apaga sem perceber.

### 27. Server Action fora de transição não atualiza a interface

Achado olhando o teste de fluxo falhar: salvar o perfil gravava o nome no banco,
mas a navbar continuava com o nome antigo.

A causa é sutil. Quando uma Server Action é chamada de dentro de
`startTransition`, o router aplica os dados que o `revalidatePath` produziu.
Chamada solta — como `handleSubmit` do react-hook-form faz por padrão — a
resposta revalidada é descartada em silêncio, sem erro nenhum. A gravação
funciona, a tela não acompanha.

Por isso o formulário de perfil envolve a chamada em `useTransition`, e o item
da lista de compras usa `useTransition` junto com `useOptimistic`. Vale para
toda action que revalida algo visível fora do próprio componente.

### 28. Grupos de rota separam as duas cascas

`app/(auth)/` tem o cartão branco sobre o verde; `app/(app)/` tem a barra
lateral, a navbar e o fundo cinza. Grupos não entram na URL, então `/login` e
`/dashboard` continuam na raiz.

`/` não tem tela própria: redireciona para o dashboard ou para o login. Uma
página de apresentação pode ocupar esse lugar quando houver o que mostrar para
quem ainda não entrou.

O layout de `(app)` refaz a checagem de sessão que o proxy já fez. Não é
desconfiança do proxy — é de lá que sai o usuário que a navbar mostra, e uma
tranca a mais no caminho de dados não custa nada.

### 29. Validação nos dois lados, com o mesmo schema

`lib/auth/schemas.ts` é importado pelo `zodResolver` no cliente e pela Server
Action no servidor. O cliente valida enquanto a pessoa digita; o servidor
valida de novo antes de falar com o Supabase. Mensagem de erro em português,
escrita para quem preenche o formulário, não para quem lê o log.

`destinoSeguro()` guarda o `?proximo=` do proxy: só aceita caminho interno
começando com uma barra. Sem isso, `?proximo=https://outro.site` transformaria
a tela de login em redirecionamento aberto.

Erros do Supabase chegam em inglês e falando de "credentials"; `traduzirErro`
converte os que a pessoa pode encontrar e devolve uma frase honesta para o
resto. Senha nunca aparece em retorno nem em log.

### 30. Duas ferramentas visuais

| Script                  | Para quê                                                   |
| ----------------------- | ---------------------------------------------------------- |
| `npm run screenshots`   | fotografa as telas em 375, 768, 1024 e 1440 px             |
| `npm run ui:smoke`      | percorre login, lista, perfil e logout em um navegador real |

As duas criam um usuário descartável pela API de administração, entram pela
tela de login como qualquer pessoa entraria e apagam o usuário no final. As
imagens vão para `.screenshots/`, que não é versionado.

Foi olhando essas capturas que apareceram quatro coisas que a leitura do código
não pegaria: "1 unidades" na lista, o ponto dobrado em "6 de set..", o cartão
de refeições linkando para a própria página, e o contraste do item ativo do
menu.

### 31. Medidas flexionam com a quantidade

`lib/unidades.ts` guarda os pares singular/plural das unidades escritas por
extenso — unidade, dente, pitada, colher de sopa. Abreviações (g, ml, kg) não
mudam, e unidade desconhecida volta intacta: melhor assim do que flexionada
errado.

---

## Estrutura

```
app/(auth)/           login e cadastro — cartão branco sobre o verde
app/(app)/            telas autenticadas — barra lateral, navbar, fundo cinza
app/auth/confirmar/   onde o link do e-mail de confirmação aterrissa
components/ui/        primitivos do shadcn/ui, com a identidade aplicada
components/           componentes do produto, por área
lib/auth/             schemas e Server Actions de sessão
lib/data/             leituras do servidor que as páginas consomem
lib/seed/             receitas padrão e a lógica pura do seed
lib/supabase/         clientes (browser, servidor, admin), rotas, tipos
proxy.ts              sessão e proteção de rotas (o antigo middleware.ts)
scripts/              seed, diagnóstico do banco e ferramentas visuais
supabase/migrations/  o schema, em ordem de aplicação
supabase/tests/       migrações exercitadas em Postgres real (PGlite)
public/               estáticos
```

## Como escolher o cliente Supabase

| Situação                                        | Módulo                     |
| ----------------------------------------------- | -------------------------- |
| ler dados em Server Component ou Server Action  | `lib/supabase/server.ts`   |
| interatividade no browser (realtime, upload)    | `lib/supabase/client.ts`   |
| manutenção do catálogo global, seed             | `lib/supabase/admin.ts`    |

Os dois primeiros usam a chave anônima, então a RLS continua sendo a fronteira.
O terceiro ignora RLS — use só quando não houver outro caminho.

## Convenções de código

- **Sem `any`.** Onde o tipo for genuinamente desconhecido, `unknown` com guarda.
- **Sem `useEffect` para buscar dados.** Leitura acontece em Server Component;
  escrita, em Server Action.
- **`"use client"` só onde há interatividade real** — o resto é servidor.
- **Nenhum arquivo passa de 500 linhas.** Chegou perto, é hora de separar.
- **Toda entrada de usuário passa por Zod** antes de tocar o banco.
- **Senha e token não vão para log nem para `localStorage`.**
- **RLS ligada em todas as tabelas** — o cliente nunca é a fronteira de segurança.

## Comandos

| Comando             | O que faz                                  |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | servidor de desenvolvimento em :3000       |
| `npm run build`     | build de produção                          |
| `npm run lint`      | ESLint                                     |
| `npm run typecheck` | gera tipos de rota e roda `tsc --noEmit`   |
| `npm run test`      | Vitest, execução única                     |
| `npm run test:watch`| Vitest em modo observação                  |
| `npm run db:sql`    | imprime as migrações em ordem, para colar  |
| `npm run db:check`  | confere o schema aplicado no projeto       |
| `npm run db:seed`   | popula o catálogo global de receitas       |
| `npm run db:smoke`  | testa o cadastro de ponta a ponta          |
| `npm run screenshots` | fotografa as telas em quatro larguras    |
| `npm run ui:smoke`  | percorre os fluxos em um navegador real    |
