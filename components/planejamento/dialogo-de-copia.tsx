"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AvisoDoFormulario } from "@/components/auth/campos";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ehDataIso, formatarPeriodo, segundaDaSemana, somarDias } from "@/lib/data-iso";
import { copiarDia, copiarSemana } from "@/lib/planejamento/copiar";
import { DIAS } from "@/lib/semana";
import type { DiaDaSemana } from "@/lib/supabase/database.types";

export type EstadoDaCopia =
  | { modo: "dia"; dia: DiaDaSemana; diaLongo: string }
  | { modo: "semana" };

/**
 * Para onde copiar.
 *
 * A semana de destino é um campo de data em vez de uma lista de "anterior /
 * próxima": qualquer dia daquela semana serve, e o rótulo abaixo mostra o
 * período resolvido, então não há ambiguidade sobre qual semana foi escolhida.
 */
export function DialogoDeCopia({
  estado,
  planId,
  semanaDoPlano,
  aoFechar,
}: {
  estado: EstadoDaCopia | null;
  planId: string;
  semanaDoPlano: string;
  aoFechar: () => void;
}) {
  const [semanaDestino, setSemanaDestino] = useState("");
  const [diaDestino, setDiaDestino] = useState<DiaDaSemana>("segunda");
  const [erro, setErro] = useState<string | null>(null);
  const [copiando, iniciarTransicao] = useTransition();

  const modo = estado?.modo;
  // Dia: mesma semana por padrão. Semana: a seguinte, que é o caso comum.
  const padrao = modo === "dia" ? semanaDoPlano : somarDias(semanaDoPlano, 7);
  const escolhida = semanaDestino || padrao;
  const valida = ehDataIso(escolhida);
  const segunda = valida ? segundaDaSemana(escolhida) : null;

  function fechar() {
    setSemanaDestino("");
    setErro(null);
    aoFechar();
  }

  function confirmar() {
    if (!estado || !segunda) return;

    iniciarTransicao(async () => {
      setErro(null);
      const resultado =
        estado.modo === "dia"
          ? await copiarDia({
              planOrigemId: planId,
              diaOrigem: estado.dia,
              semanaDestino: segunda,
              diaDestino,
            })
          : await copiarSemana({
              planOrigemId: planId,
              semanaDestino: segunda,
            });

      if (resultado.sucesso) {
        toast.success(
          estado.modo === "dia" ? "Dia copiado." : "Semana copiada.",
        );
        fechar();
      } else {
        setErro(resultado.erro ?? "Não consegui copiar.");
      }
    });
  }

  return (
    <Dialog open={estado !== null} onOpenChange={(a) => !a && fechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {modo === "dia" ? "Copiar dia" : "Copiar semana"}
          </DialogTitle>
          <DialogDescription>
            {estado?.modo === "dia"
              ? `As refeições de ${estado.diaLongo} substituem as do dia escolhido.`
              : "As sete colunas substituem as da semana escolhida."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          {erro && <AvisoDoFormulario tipo="erro">{erro}</AvisoDoFormulario>}

          <div className="grid gap-2">
            <Label htmlFor="semana-destino">Semana de destino</Label>
            <Input
              id="semana-destino"
              type="date"
              value={escolhida}
              onChange={(evento) => setSemanaDestino(evento.target.value)}
              aria-describedby="semana-destino-resolvida"
            />
            <p
              id="semana-destino-resolvida"
              className="px-4 text-sm text-text-muted"
            >
              {segunda
                ? formatarPeriodo(segunda, somarDias(segunda, 6))
                : "Escolha uma data para ver a semana."}
            </p>
          </div>

          {estado?.modo === "dia" && (
            <div className="grid gap-2">
              <Label htmlFor="dia-destino">Dia de destino</Label>
              <select
                id="dia-destino"
                value={diaDestino}
                onChange={(evento) =>
                  setDiaDestino(evento.target.value as DiaDaSemana)
                }
                className="h-12 w-full rounded-pill border border-input bg-white px-5 text-base text-text-dark outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {DIAS.map((dia) => (
                  <option key={dia.slug} value={dia.slug}>
                    {dia.longo}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={confirmar}
            disabled={copiando || !valida}
          >
            {copiando ? "Copiando…" : "Copiar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
