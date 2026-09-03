"use client";

import { Copy, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copiarSemana } from "@/lib/planejamento/copiar";
import { segundaDaSemanaAtual } from "@/lib/semana";
import { DialogoDeCopia, type EstadoDaCopia } from "./dialogo-de-copia";

/** O botão de copiar a semana inteira, no cabeçalho da grade. */
export function BotaoCopiarSemana({
  planId,
  semanaDoPlano,
}: {
  planId: string;
  semanaDoPlano: string;
}) {
  const [copia, setCopia] = useState<EstadoDaCopia | null>(null);

  return (
    <>
      <Button variant="outline" onClick={() => setCopia({ modo: "semana" })}>
        <Copy strokeWidth={1.75} aria-hidden="true" />
        Copiar semana
      </Button>

      <DialogoDeCopia
        estado={copia}
        planId={planId}
        semanaDoPlano={semanaDoPlano}
        aoFechar={() => setCopia(null)}
      />
    </>
  );
}

/**
 * O aviso de semana passada.
 *
 * Copiar daqui não abre diálogo: o destino é sempre a semana corrente, que é o
 * único motivo de alguém estar olhando um cardápio antigo com vontade de
 * reaproveitá-lo.
 */
export function BannerSomenteLeitura({ planId }: { planId: string }) {
  const router = useRouter();
  const [copiando, iniciarTransicao] = useTransition();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-tertiary-soft px-5 py-4 sm:px-6">
      <p className="flex items-center gap-2.5 text-sm leading-relaxed text-tertiary-deep">
        <Eye className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        Você está vendo uma semana que já passou. Para editar, copie este
        cardápio para a semana atual.
      </p>

      <Button
        disabled={copiando}
        onClick={() =>
          iniciarTransicao(async () => {
            const resultado = await copiarSemana({
              planOrigemId: planId,
              semanaDestino: segundaDaSemanaAtual(),
            });

            if (resultado.sucesso) {
              toast.success("Cardápio copiado para esta semana.");
              router.push("/dashboard");
            } else {
              toast.error(resultado.erro ?? "Não consegui copiar.");
            }
          })
        }
      >
        {copiando ? "Copiando…" : "Copiar para esta semana"}
      </Button>
    </div>
  );
}
