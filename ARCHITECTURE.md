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
| 2     | Supabase, schema, RLS, função e trigger, testes  | Pendente   |
| 3     | Seed de receitas e plano de exemplo              | Pendente   |
| 4     | Autenticação, layout base e páginas iniciais     | Pendente   |

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

| Token             | Verde     | Coral     | Lilás     | Onde usar                                   |
| ----------------- | --------- | --------- | --------- | ------------------------------------------- |
| `*-soft`          | `#E8F5E9` | `#FFE4E1` | `#F2EDFB` | fundo de ícone, chip, faixa                 |
| base              | `#5DBB63` | `#F76C6C` | `#B39DDB` | superfície grande, ícone ativo, borda       |
| `*-strong`        | `#2F8437` | `#C44E4E` | `#7A5FBF` | qualquer coisa com texto branco por cima    |

As variantes `-strong` passam com folga: 4.67:1, 4.62:1 e 4.98:1. Mesma lógica
para texto auxiliar — `--text-gray` (`#888888`) fica para uso decorativo e
`--text-muted` (`#6E6E6E`, 5.10:1) é o que aparece em texto corrido.

**Ponto em aberto para o Bloco 4:** o briefing pede botão primário com fundo
`#5DBB63` e texto branco, o que reprova em AA. Duas saídas viáveis — fundo
`#2F8437` com texto branco, ou fundo `#5DBB63` com texto escuro. A decisão fica
para quando os componentes forem estilizados.

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

---

## Estrutura

```
app/            rotas (App Router); tudo é Server Component por padrão
components/ui/  primitivos do shadcn/ui
lib/            utilitários e, a partir do Bloco 2, os clientes Supabase
public/         estáticos
```

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
