"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CampoProps = Omit<React.ComponentProps<"input">, "id"> & {
  rotulo: string;
  erro?: string;
};

export function CampoDeTexto({ rotulo, erro, ...props }: CampoProps) {
  const id = useId();
  const idDoErro = `${id}-erro`;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idDoErro : undefined}
        {...props}
      />
      <MensagemDeErro id={idDoErro} mensagem={erro} />
    </div>
  );
}

type CampoLongoProps = Omit<React.ComponentProps<"textarea">, "id"> & {
  rotulo: string;
  erro?: string;
  dica?: string;
};

export function CampoDeTextoLongo({
  rotulo,
  erro,
  dica,
  ...props
}: CampoLongoProps) {
  const id = useId();
  const idDoErro = `${id}-erro`;
  const idDaDica = `${id}-dica`;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <Textarea
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idDoErro : dica ? idDaDica : undefined}
        {...props}
      />
      {dica && !erro && (
        <p id={idDaDica} className="px-4 text-sm text-text-muted">
          {dica}
        </p>
      )}
      <MensagemDeErro id={idDoErro} mensagem={erro} />
    </div>
  );
}

export function CampoDeSenha({ rotulo, erro, ...props }: CampoProps) {
  const id = useId();
  const idDoErro = `${id}-erro`;
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visivel ? "text" : "password"}
          className="pr-14"
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idDoErro : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisivel((atual) => !atual)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          className="absolute inset-y-0 right-1 my-1 inline-flex w-11 items-center justify-center rounded-pill text-text-muted transition-colors hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
        >
          {visivel ? (
            <EyeOff className="size-4.5" strokeWidth={1.75} />
          ) : (
            <Eye className="size-4.5" strokeWidth={1.75} />
          )}
        </button>
      </div>
      <MensagemDeErro id={idDoErro} mensagem={erro} />
    </div>
  );
}

function MensagemDeErro({ id, mensagem }: { id: string; mensagem?: string }) {
  if (!mensagem) return null;

  return (
    <p id={id} role="alert" className="px-4 text-sm text-secondary-deep">
      {mensagem}
    </p>
  );
}

/** Erro do servidor: o que não dá para descobrir antes de enviar. */
export function AvisoDoFormulario({
  tipo,
  children,
}: {
  tipo: "erro" | "aviso";
  children: React.ReactNode;
}) {
  return (
    <p
      role="alert"
      className={
        tipo === "erro"
          ? "rounded-2xl bg-secondary-soft px-5 py-3 text-sm text-secondary-deep"
          : "rounded-2xl bg-primary-soft px-5 py-3 text-sm text-primary-deep"
      }
    >
      {children}
    </p>
  );
}
