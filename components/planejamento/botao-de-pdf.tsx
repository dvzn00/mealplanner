"use client";

import { FileDown } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * O PDF sai por um link comum para a rota de relatório.
 *
 * Nada de `fetch` e `blob`: o navegador já sabe baixar um arquivo cujo
 * cabeçalho diz que é anexo, e um link funciona com clique do meio, "salvar
 * como" e sem JavaScript. O diálogo existe só para a escolha de incluir ou não
 * a lista de compras.
 */
export function BotaoDePdf({ semana }: { semana: string }) {
  const idDaLista = useId();
  const [incluirLista, setIncluirLista] = useState(true);
  const [aberto, setAberto] = useState(false);

  const endereco = `/api/reports/generate-pdf?semana=${semana}&lista=${
    incluirLista ? "1" : "0"
  }`;

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
            As refeições da semana, com dia, horário, receita e calorias.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-2xl bg-gray-light-2 px-4 py-3.5">
          <Checkbox
            id={idDaLista}
            className="size-5"
            checked={incluirLista}
            onCheckedChange={(valor) => setIncluirLista(valor === true)}
          />
          <label
            htmlFor={idDaLista}
            className="cursor-pointer text-sm font-medium text-text-dark"
          >
            Incluir a lista de compras
          </label>
        </div>

        <DialogFooter>
          <Button asChild onClick={() => setAberto(false)}>
            <a href={endereco}>Baixar</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
