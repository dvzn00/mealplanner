import { z } from "zod";

/**
 * O formulário de receita própria. Mesmo schema no `zodResolver` do cliente e
 * na Server Action — o cliente avisa enquanto se digita, o servidor decide.
 */

const numero = (mensagem: string) =>
  z.number({ invalid_type_error: mensagem, required_error: mensagem });

export const ingredienteDaReceitaSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Nome do ingrediente")
    .max(60, "Use no máximo 60 caracteres"),
  quantidade: numero("Informe um número")
    .positive("Precisa ser maior que zero")
    .max(100000, "Quantidade grande demais"),
  unidade: z
    .string()
    .trim()
    .min(1, "Informe a unidade")
    .max(20, "Use no máximo 20 caracteres"),
});

export const receitaSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, "Dê um nome com pelo menos 3 letras")
    .max(80, "Use no máximo 80 caracteres"),
  descricao: z
    .string()
    .trim()
    .max(200, "Use no máximo 200 caracteres")
    .optional(),
  modo_preparo: z
    .string()
    .trim()
    .min(10, "Conte como se faz, mesmo que em uma frase")
    .max(4000, "Use no máximo 4000 caracteres"),
  tempo_preparo: numero("Informe os minutos")
    .int("Use minutos inteiros")
    .positive("Precisa ser maior que zero")
    .max(1440, "Mais de um dia inteiro?"),
  porcoes: numero("Informe as porções")
    .int("Use um número inteiro")
    .positive("Precisa ser maior que zero")
    .max(50, "No máximo 50 porções"),
  calorias: numero("Informe as calorias")
    .int("Use um número inteiro")
    .nonnegative("Não pode ser negativo")
    .max(20000, "Valor alto demais"),
  ingredientes: z
    .array(ingredienteDaReceitaSchema)
    .min(1, "A receita precisa de pelo menos um ingrediente")
    .max(30, "No máximo 30 ingredientes"),
});

export type ReceitaInput = z.infer<typeof receitaSchema>;
