"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { entrar } from "@/lib/auth/actions";
import { entrarSchema, type EntrarInput } from "@/lib/auth/schemas";
import { Button } from "@/components/ui/button";
import { AvisoDoFormulario, CampoDeSenha, CampoDeTexto } from "./campos";

export function FormularioDeLogin({ proximo }: { proximo?: string }) {
  const [erroDoServidor, setErroDoServidor] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EntrarInput>({
    resolver: zodResolver(entrarSchema),
    defaultValues: { email: "", senha: "", proximo },
  });

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={handleSubmit(async (dados) => {
        setErroDoServidor(null);
        const resultado = await entrar(dados);
        if (resultado?.erro) {
          setErroDoServidor(resultado.erro);
        }
      })}
    >
      {erroDoServidor && (
        <AvisoDoFormulario tipo="erro">{erroDoServidor}</AvisoDoFormulario>
      )}

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
        autoComplete="current-password"
        placeholder="Sua senha"
        erro={errors.senha?.message}
        {...register("senha")}
      />

      <input type="hidden" {...register("proximo")} />

      <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
