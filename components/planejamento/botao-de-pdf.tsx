"use client";

import { FileDown } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ConteudoDoPdf } from "@/lib/pdf/documento-do-plano";
import { cn } from "@/lib/utils";

const OPCOES: { valor: ConteudoDoPdf; rotulo: string; detalhe: string }[] = [
  {
    valor: "tudo",
    rotulo: "As duas folhas",
    detalhe: "O cardápio da semana e a lista de compras.",
  },
  {
    valor: "cardapio",
    rotulo: "Só o cardápio",
    detalhe: "A folha da geladeira, com os horários e as receitas.",
  },
  {
    valor: "lista",
    rotulo: "Só a lista de compras",
    detalhe: "A folha do mercado, com as caixinhas para marcar.",
  },
];

/**
 * O PDF sai por um link comum para a rota de relatório.
 *
 * Nada de `fetch` e `blob`: o navegador já sabe baixar um arquivo cujo
 * cabeçalho diz que é anexo, e um link funciona com clique do meio, "salvar
 * como" e sem JavaScript. O diálogo existe só para escolher o que imprimir.
 *
 * Rádios nativos, e não um grupo de botões: a escolha é entre três coisas
 * exclusivas, e é isso que o rádio já significa para quem navega por teclado
 * ou leitor de tela — as setas percorrem as opções sozinhas.
 */
export function BotaoDePdf({ semana }: { semana: string }) {
  const grupo = useId();
  const [conteudo, setConteudo] = useState<ConteudoDoPdf>("tudo");
  const [aberto, setAberto] = useState(false);

  const endereco = `/api/reports/generate-pdf?semana=${semana}&conteudo=${conteudo}`;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileDown strokeWidth={1.75} aria-hidden="true" />
          Gerar PDF
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar PDF</DialogTitle>
          <DialogDescription>
            Cada folha tem um trabalho: uma fica na geladeira, a outra vai no
            bolso para o mercado.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="grid gap-2">
          <legend className="sr-only">O que imprimir</legend>

          {OPCOES.map((opcao) => {
            const id = `${grupo}-${opcao.valor}`;
            const escolhida = conteudo === opcao.valor;

            return (
              <label
                key={opcao.valor}
                htmlFor={id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
                  escolhida
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-card hover:bg-gray-light-2",
                )}
              >
                <input
                  type="radio"
                  id={id}
                  name={grupo}
                  value={opcao.valor}
                  checked={escolhida}
                  onChange={() => setConteudo(opcao.valor)}
                  className="mt-0.5 size-4 shrink-0 accent-primary-strong"
                />

                <span className="grid gap-0.5">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      escolhida ? "text-primary-deep" : "text-text-dark",
                    )}
                  >
                    {opcao.rotulo}
                  </span>
                  <span className="text-xs leading-relaxed text-text-muted">
                    {opcao.detalhe}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <DialogFooter>
          <Button asChild onClick={() => setAberto(false)}>
            <a href={endereco}>Baixar</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
