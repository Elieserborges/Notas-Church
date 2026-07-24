import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para uso NO NAVEGADOR (login e cadastro).
 * Usa a chave publicável — pode aparecer no site sem problema.
 * Nunca use a service role key aqui.
 */
let client: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Login indisponível: falta configurar NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}
