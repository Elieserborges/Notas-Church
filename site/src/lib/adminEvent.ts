// Helpers de servidor para o evento atual (usado pelas rotas do painel).
import { supabaseAdmin } from "./supabase";

export type EventRow = {
  id: string;
  slug: string;
  status: string;
  is_current: boolean;
  info: Record<string, unknown>;
  theme: Record<string, string>;
  branding: Record<string, unknown>;
  integrations: Record<string, unknown>;
};

/**
 * Devolve o evento marcado como atual. Se ainda não existir nenhum
 * (banco recém-criado), cria um vazio — assim o site segue no padrão
 * do código até o painel preencher algo.
 */
export async function ensureCurrentEvent(): Promise<EventRow> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("events")
    .select("*")
    .eq("is_current", true)
    .maybeSingle();
  if (data) return data as EventRow;

  const { data: created, error } = await db
    .from("events")
    .insert({ slug: "face-a-face", status: "active", is_current: true })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return created as EventRow;
}
