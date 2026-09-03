"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { AvisoDoFormulario, CampoDeTexto } from "@/components/auth/campos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { perfilSchema, type PerfilInput } from "@/lib/auth/schemas";
import { atualizarPerfil } from "@/lib/perfil/actions";

export function FormularioDePerfil({
  nome,
  email,
}: {
  nome: string;
  email: string;
}) {
  const idDoEmail = useId();
  const idDaNota = `${idDoEmail}-nota`;
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  // A gravação precisa acontecer dentro de uma transição: é o que faz o
  // router aplicar o `revalidatePath` da action e a navbar mostrar o nome
  // novo sem recarregar a página.
  const [salvando, iniciarTransicao] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PerfilInput>({
    resolver: zodResolver(perfilSchema),
    defaultValues: { nome },
  });

  return (
    <form
      noValidate
      className="grid max-w-md gap-5"
      onSubmit={handleSubmit((dados) =>
        iniciarTransicao(async () => {
          setErro(null);
          setSucesso(null);
          const resultado = await atualizarPerfil(dados);
          if (resultado.erro) setErro(resultado.erro);
          if (resultado.sucesso) {
            setSucesso(resultado.sucesso);
            reset(dados);
          }
        }),
      )}
    >
      {erro && <AvisoDoFormulario tipo="erro">{erro}</AvisoDoFormulario>}
      {sucesso && <AvisoDoFormulario tipo="aviso">{sucesso}</AvisoDoFormulario>}

      <CampoDeTexto
        rotulo="Nome"
        autoComplete="name"
        erro={errors.nome?.message}
        {...register("nome")}
      />

      <div className="grid gap-2">
        <Label htmlFor={idDoEmail}>E-mail</Label>
        <Input
          id={idDoEmail}
          value={email}
          readOnly
          aria-describedby={idDaNota}
          className="bg-gray-light-2 text-text-muted"
        />
        <p id={idDaNota} className="px-4 text-sm text-text-muted">
          O e-mail é o seu login e não pode ser trocado por aqui.
        </p>
      </div>

      <Button
        type="submit"
        size="lg"
        className="mt-1 justify-self-start"
        disabled={salvando || !isDirty}
      >
        {salvando ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
