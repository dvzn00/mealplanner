"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AvisoDoFormulario, CampoDeTexto } from "@/components/auth/campos";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  criarSlot,
  editarSlot,
  removerSlot,
} from "@/lib/planejamento/actions";
import { editarSlotSchema, type EditarSlotInput } from "@/lib/planejamento/schemas";
import { formatarHorario } from "@/lib/semana";
import type { DiaDaSemana } from "@/lib/supabase/database.types";

export interface ReceitaParaEscolha {
  id: string;
  nome: string;
}

export type EstadoDoDialogo =
  | { modo: "novo"; dia: DiaDaSemana; diaLongo: string }
  | {
      modo: "editar";
      slotId: string;
      diaLongo: string;
      nomeRefeicao: string;
      horario: string;
    };

/** Só nome e horário: a receita entra por arraste ou pelo seletor da criação. */
type Campos = Omit<EditarSlotInput, "slotId">;

const camposSchema = editarSlotSchema.omit({ slotId: true });

export function DialogoDeSlot({
  estado,
  planId,
  receitas,
  aoFechar,
}: {
  estado: EstadoDoDialogo | null;
  planId: string;
  receitas: ReceitaParaEscolha[];
  aoFechar: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [receitaId, setReceitaId] = useState("");
  const [salvando, iniciarTransicao] = useTransition();
  const criando = estado?.modo === "novo";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Campos>({
    resolver: zodResolver(camposSchema),
    values: {
      nomeRefeicao: estado?.modo === "editar" ? estado.nomeRefeicao : "",
      horario:
        estado?.modo === "editar" ? formatarHorario(estado.horario) : "12:00",
    },
  });

  function fechar() {
    setErro(null);
    setReceitaId("");
    aoFechar();
  }

  function enviar(campos: Campos) {
    if (!estado) return;

    iniciarTransicao(async () => {
      setErro(null);
      const resultado = criando
        ? await criarSlot({
            planId,
            dia: estado.dia,
            nomeRefeicao: campos.nomeRefeicao,
            horario: campos.horario,
            recipeId: receitaId || null,
          })
        : await editarSlot({ slotId: estado.slotId, ...campos });

      if (resultado.sucesso) {
        toast.success(criando ? "Refeição criada." : "Refeição salva.");
        fechar();
      } else {
        setErro(resultado.erro ?? "Não consegui salvar.");
      }
    });
  }

  function remover() {
    if (estado?.modo !== "editar") return;

    iniciarTransicao(async () => {
      const resultado = await removerSlot(estado.slotId);
      if (resultado.sucesso) {
        toast.success("Horário removido.");
        fechar();
      } else {
        setErro(resultado.erro ?? "Não consegui remover.");
      }
    });
  }

  return (
    <Dialog open={estado !== null} onOpenChange={(aberto) => !aberto && fechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {criando ? "Nova refeição" : "Editar refeição"}
          </DialogTitle>
          <DialogDescription>
            {estado ? `${estado.diaLongo} desta semana.` : ""}
          </DialogDescription>
        </DialogHeader>

        <form noValidate className="grid gap-5" onSubmit={handleSubmit(enviar)}>
          {erro && <AvisoDoFormulario tipo="erro">{erro}</AvisoDoFormulario>}

          <CampoDeTexto
            rotulo="Nome"
            placeholder="Lanche da tarde"
            erro={errors.nomeRefeicao?.message}
            {...register("nomeRefeicao")}
          />

          <CampoDeTexto
            rotulo="Horário"
            type="time"
            erro={errors.horario?.message}
            {...register("horario")}
          />

          {criando && (
            <div className="grid gap-2">
              <Label htmlFor="receita-do-slot">Receita (opcional)</Label>
              <select
                id="receita-do-slot"
                value={receitaId}
                onChange={(evento) => setReceitaId(evento.target.value)}
                className="h-12 w-full rounded-pill border border-input bg-card px-5 text-base text-text-dark outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Deixar o horário vazio</option>
                {receitas.map((receita) => (
                  <option key={receita.id} value={receita.id}>
                    {receita.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {!criando && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={salvando}>
                    Remover horário
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover este horário?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {estado?.modo === "editar"
                        ? `"${estado.nomeRefeicao}" sai de ${estado.diaLongo} e a receita que estiver nele volta para o painel. Os outros dias não mudam.`
                        : ""}
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Manter</AlertDialogCancel>
                    <AlertDialogAction onClick={remover}>
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : criando ? "Adicionar" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
