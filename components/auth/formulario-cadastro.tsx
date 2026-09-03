"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { cadastrar } from "@/lib/auth/actions";
import { cadastrarSchema, type CadastrarInput } from "@/lib/auth/schemas";
import { Button } from "@/components/ui/button";
import { AvisoDoFormulario, CampoDeSenha, CampoDeTexto } from "./campos";

export function FormularioDeCadastro() {
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CadastrarInput>({
    resolver: zodResolver(cadastrarSchema),
    defaultValues: { nome: "", email: "", senha: "" },
  });

  if (aviso) {
    return <AvisoDoFormulario tipo="aviso">{aviso}</AvisoDoFormulario>;
  }

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={handleSubmit(async (dados) => {
        setErro(null);
        const resultado = await cadastrar(dados);
        if (resultado?.erro) setErro(resultado.erro);
        if (resultado?.aviso) setAviso(resultado.aviso);
      })}
    >
      {erro && <AvisoDoFormulario tipo="erro">{erro}</AvisoDoFormulario>}

      <CampoDeTexto
        rotulo="Nome"
        autoComplete="name"
        placeholder="Como podemos te chamar"
        erro={errors.nome?.message}
        {...register("nome")}
      />

      <CampoDeTexto
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        placeholder="voce@exemplo.com"
        erro={errors.email?.message}
        {...register("email")}
      />

      <CampoDeSenha
        rotulo="Senha"
        autoComplete="new-password"
        placeholder="Pelo menos 8 caracteres"
        erro={errors.senha?.message}
        {...register("senha")}
      />

      <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Criando conta…" : "Criar conta"}
      </Button>
    </form>
  );
}
