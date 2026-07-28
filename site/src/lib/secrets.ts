// ============================================================
//  Segredos do evento (Passo 1)
//
//  getSecret() resolve nesta ordem:
//    Vault (via painel)  →  process.env (Vercel, como hoje)
//
//  O checkout/mailer podem trocar `process.env.X` por getSecret(...)
//  sem risco: se o Vault estiver vazio, cai no env atual.
// ============================================================

import { supabaseAdmin } from "./supabase";

/** Nome da chave no painel → variável de ambiente equivalente. */
const ENV_MAP: Record<string, string> = {
  mp_access_token: "MP_ACCESS_TOKEN",
  mp_webhook_secret: "MP_WEBHOOK_SECRET",
  smtp_pass: "SMTP_PASS",
};

let cachedEventId: { at: number; id: string | null } | null = null;
const TTL_MS = 30_000;

/** Id do evento marcado como atual (com cache curto). */
export async function currentEventId(): Promise<string | null> {
  if (cachedEventId && Date.now() - cachedEventId.at < TTL_MS) return cachedEventId.id;
  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from("events")
      .select("id")
      .eq("is_current", true)
      .maybeSingle();
    const id = (data?.id as string) ?? null;
    cachedEventId = { at: Date.now(), id };
    return id;
  } catch {
    return null;
  }
}

/** Lê um segredo: Vault primeiro, senão a variável de ambiente. */
export async function getSecret(key: string): Promise<string | null> {
  try {
    const eventId = await currentEventId();
    if (eventId) {
      const db = supabaseAdmin();
      const { data, error } = await db.rpc("get_event_secret", {
        p_event_id: eventId,
        p_key: key,
      });
      if (!error && typeof data === "string" && data) return data;
    }
  } catch {
    // Vault indisponível / função ainda não criada → cai no env.
  }
  const envName = ENV_MAP[key];
  return envName ? process.env[envName] ?? null : null;
}

/** Grava/atualiza um segredo no Vault (chamado pelo painel admin). */
export async function setSecret(key: string, value: string): Promise<void> {
  const eventId = await currentEventId();
  if (!eventId) throw new Error("Nenhum evento atual para salvar o segredo.");
  const db = supabaseAdmin();
  const { error } = await db.rpc("set_event_secret", {
    p_event_id: eventId,
    p_key: key,
    p_value: value,
  });
  if (error) throw new Error(error.message);
}
