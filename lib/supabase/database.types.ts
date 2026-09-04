/**
 * Tipos do banco, espelhando `supabase/migrations`.
 *
 * Escrito à mão porque `supabase gen types` precisa de um projeto acessível.
 * Quando as credenciais estiverem no lugar, este arquivo pode ser regerado com:
 *
 *   npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts
 *
 * O formato abaixo é o mesmo que o gerador produz, então a troca é direta.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Slug sem acento: vai para chave de React, URL e comparação. */
export type DiaDaSemana =
  | "segunda"
  | "terca"
  | "quarta"
  | "quinta"
  | "sexta"
  | "sabado"
  | "domingo";

export const DIAS_DA_SEMANA = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
] as const satisfies readonly DiaDaSemana[];

export type TipoDeCopia = "dia" | "semana";

type Profile = {
  id: string;
  nome: string;
  created_at: string;
  updated_at: string;
};

type Recipe = {
  id: string;
  user_id: string | null;
  nome: string;
  descricao: string | null;
  modo_preparo: string;
  calorias: number;
  tempo_preparo: number;
  porcoes: number;
  imagem_url: string | null;
  created_at: string;
  updated_at: string;
};

type Ingredient = {
  id: string;
  nome: string;
  unidade_padrao: string;
};

type RecipeIngredient = {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantidade: number;
  unidade: string;
};

type WeeklyPlan = {
  id: string;
  user_id: string;
  semana_inicio: string;
  semana_fim: string;
  created_at: string;
  updated_at: string;
};

type PlanSlot = {
  id: string;
  plan_id: string;
  dia_da_semana: DiaDaSemana;
  nome_refeicao: string;
  horario: string;
  recipe_id: string | null;
  posicao: number;
  created_at: string;
  updated_at: string;
};

type ShoppingListItem = {
  id: string;
  user_id: string;
  plan_id: string;
  ingredient_id: string;
  quantidade_total: number;
  unidade: string;
  comprado: boolean;
  /** Item tirado da lista pelo usuário; sobrevive ao recálculo. */
  ignorado: boolean;
  created_at: string;
  updated_at: string;
};

type PlanCopy = {
  id: string;
  user_id: string;
  plan_origem_id: string | null;
  plan_destino_id: string;
  tipo: TipoDeCopia;
  dia_origem: DiaDaSemana | null;
  created_at: string;
};

/** Colunas com default no banco viram opcionais na escrita. */
type ComDefault<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type Carimbos = "id" | "created_at" | "updated_at";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ComDefault<Profile, "nome" | "created_at" | "updated_at">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      recipes: {
        Row: Recipe;
        Insert: ComDefault<
          Recipe,
          Carimbos | "user_id" | "descricao" | "imagem_url"
        >;
        Update: Partial<Recipe>;
        Relationships: [];
      };
      ingredients: {
        Row: Ingredient;
        Insert: ComDefault<Ingredient, "id">;
        Update: Partial<Ingredient>;
        Relationships: [];
      };
      recipe_ingredients: {
        Row: RecipeIngredient;
        Insert: ComDefault<RecipeIngredient, "id">;
        Update: Partial<RecipeIngredient>;
        Relationships: [
        {
          foreignKeyName: "recipe_ingredients_recipe_id_fkey";
          columns: ["recipe_id"];
          isOneToOne: false;
          referencedRelation: "recipes";
          referencedColumns: ["id"];
        },
        {
          foreignKeyName: "recipe_ingredients_ingredient_id_fkey";
          columns: ["ingredient_id"];
          isOneToOne: false;
          referencedRelation: "ingredients";
          referencedColumns: ["id"];
        },
        ];
      };
      weekly_plans: {
        Row: WeeklyPlan;
        Insert: ComDefault<WeeklyPlan, Carimbos>;
        Update: Partial<WeeklyPlan>;
        Relationships: [];
      };
      plan_slots: {
        Row: PlanSlot;
        Insert: ComDefault<PlanSlot, Carimbos | "recipe_id">;
        Update: Partial<PlanSlot>;
        Relationships: [
        {
          foreignKeyName: "plan_slots_plan_id_fkey";
          columns: ["plan_id"];
          isOneToOne: false;
          referencedRelation: "weekly_plans";
          referencedColumns: ["id"];
        },
        {
          foreignKeyName: "plan_slots_recipe_id_fkey";
          columns: ["recipe_id"];
          isOneToOne: false;
          referencedRelation: "recipes";
          referencedColumns: ["id"];
        },
        ];
      };
      shopping_list: {
        Row: ShoppingListItem;
        Insert: ComDefault<ShoppingListItem, Carimbos | "comprado" | "ignorado">;
        // Pela RLS, o cliente só escreve as duas colunas de decisão pessoal.
        Update: { comprado?: boolean; ignorado?: boolean };
        Relationships: [
        {
          foreignKeyName: "shopping_list_plan_id_fkey";
          columns: ["plan_id"];
          isOneToOne: false;
          referencedRelation: "weekly_plans";
          referencedColumns: ["id"];
        },
        {
          foreignKeyName: "shopping_list_ingredient_id_fkey";
          columns: ["ingredient_id"];
          isOneToOne: false;
          referencedRelation: "ingredients";
          referencedColumns: ["id"];
        },
        ];
      };
      plan_copies: {
        Row: PlanCopy;
        Insert: ComDefault<
          PlanCopy,
          "id" | "created_at" | "plan_origem_id" | "dia_origem"
        >;
        Update: Partial<PlanCopy>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      generate_shopping_list: {
        Args: { p_plan_id: string };
        Returns: undefined;
      };
      obter_ou_criar_ingrediente: {
        Args: { p_nome: string; p_unidade: string };
        Returns: string;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
