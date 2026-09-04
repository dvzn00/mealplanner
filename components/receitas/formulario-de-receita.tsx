"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AvisoDoFormulario,
  CampoDeTexto,
  CampoDeTextoLongo,
} from "@/components/auth/campos";
import { Button } from "@/components/ui/button";
import { criarReceita } from "@/lib/receitas/actions";
import { receitaSchema, type ReceitaInput } from "@/lib/receitas/schemas";
import { UNIDADES_SUGERIDAS } from "@/lib/unidades";

const INGREDIENTE_VAZIO = { nome: "", quantidade: 0, unidade: "" };

export function FormularioDeReceita({
  ingredientesConhecidos,
}: {
  ingredientesConhecidos: string[];
}) {
  const router = useRouter();
  const listaDeIngredientes = useId();
  const listaDeUnidades = useId();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciarTransicao] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReceitaInput>({
    resolver: zodResolver(receitaSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      modo_preparo: "",
      ingredientes: [{ ...INGREDIENTE_VAZIO }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "ingredientes",
  });

  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={handleSubmit((dados) =>
        iniciarTransicao(async () => {
          setErro(null);
          const resultado = await criarReceita(dados);

          if (resultado.sucesso) {
            toast.success(`"${dados.nome}" entrou nas suas receitas.`);
            router.push("/receitas");
          } else {
            setErro(resultado.erro ?? "Não consegui salvar.");
          }
        }),
      )}
    >
      {erro && <AvisoDoFormulario tipo="erro">{erro}</AvisoDoFormulario>}

      <section className="grid gap-5 rounded-3xl bg-card p-6 shadow-card sm:p-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
          A receita
        </h2>

        <CampoDeTexto
          rotulo="Nome"
          placeholder="Panqueca de aveia"
          erro={errors.nome?.message}
          {...register("nome")}
        />

        <CampoDeTextoLongo
          rotulo="Descrição"
          className="min-h-20"
          placeholder="Uma linha sobre quando você faz essa receita."
          dica="Opcional. Aparece no cartão da receita."
          erro={errors.descricao?.message}
          {...register("descricao")}
        />

        <CampoDeTextoLongo
          rotulo="Modo de preparo"
          placeholder="Misture os secos, junte o leite e leve à frigideira em fogo médio."
          erro={errors.modo_preparo?.message}
          {...register("modo_preparo")}
        />

        <div className="grid gap-5 sm:grid-cols-3">
          <CampoDeTexto
            rotulo="Tempo (min)"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="20"
            erro={errors.tempo_preparo?.message}
            {...register("tempo_preparo", { valueAsNumber: true })}
          />
          <CampoDeTexto
            rotulo="Porções"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="2"
            erro={errors.porcoes?.message}
            {...register("porcoes", { valueAsNumber: true })}
          />
          <CampoDeTexto
            rotulo="Calorias"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="320"
            erro={errors.calorias?.message}
            {...register("calorias", { valueAsNumber: true })}
          />
        </div>
      </section>

      <section className="grid gap-5 rounded-3xl bg-card p-6 shadow-card sm:p-8">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            Ingredientes
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
            É daqui que sai a lista de compras. Ingrediente que já existe no
            catálogo é reaproveitado, então a soma da semana continua certa.
          </p>
        </div>

        {errors.ingredientes?.root?.message && (
          <AvisoDoFormulario tipo="erro">
            {errors.ingredientes.root.message}
          </AvisoDoFormulario>
        )}

        <ul className="grid gap-4">
          {fields.map((campo, indice) => (
            <li
              key={campo.id}
              className="grid gap-3 rounded-2xl bg-gray-light-2 p-4 sm:grid-cols-[1fr_7rem_9rem_auto] sm:items-start"
            >
              <CampoDeTexto
                rotulo="Ingrediente"
                list={listaDeIngredientes}
                placeholder="Aveia em flocos"
                erro={errors.ingredientes?.[indice]?.nome?.message}
                {...register(`ingredientes.${indice}.nome`)}
              />
              <CampoDeTexto
                rotulo="Quantidade"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                placeholder="30"
                erro={errors.ingredientes?.[indice]?.quantidade?.message}
                {...register(`ingredientes.${indice}.quantidade`, {
                  valueAsNumber: true,
                })}
              />
              <CampoDeTexto
                rotulo="Unidade"
                list={listaDeUnidades}
                placeholder="g"
                erro={errors.ingredientes?.[indice]?.unidade?.message}
                {...register(`ingredientes.${indice}.unidade`)}
              />

              <div className="sm:pt-8">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Tirar o ingrediente ${indice + 1} da receita`}
                  disabled={fields.length === 1}
                  onClick={() => remove(indice)}
                  className="text-text-muted hover:text-secondary-deep"
                >
                  <X className="size-4" strokeWidth={2} aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          variant="outline"
          className="justify-self-start"
          onClick={() => append({ ...INGREDIENTE_VAZIO })}
        >
          <Plus strokeWidth={2} aria-hidden="true" />
          Adicionar ingrediente
        </Button>
      </section>

      <datalist id={listaDeIngredientes}>
        {ingredientesConhecidos.map((nome) => (
          <option key={nome} value={nome} />
        ))}
      </datalist>

      <datalist id={listaDeUnidades}>
        {UNIDADES_SUGERIDAS.map((unidade) => (
          <option key={unidade} value={unidade} />
        ))}
      </datalist>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar receita"}
        </Button>
        <Button asChild variant="ghost" size="lg" type="button">
          <a href="/receitas">Cancelar</a>
        </Button>
      </div>
    </form>
  );
}
