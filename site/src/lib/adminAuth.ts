// ============================================================
//  Autenticação do painel admin (Passo 1)
//
//  Reusa o login Google que o site já tem (emailDoUsuario) e
//  confere se o e-mail está autorizado. Autorização vem de:
//    - tabela public.admin_users, ou
//    - variável de ambiente ADMIN_EMAILS (lista separada por vírgula)
//
//  O ADMIN_EMAILS resolve o "ovo e galinha": você libera o
//  primeiro admin sem precisar de acesso ao banco.
// ============================================================

import { NextResponse } from "next/server";
import { emailDoUsuario } from "./authServer";
import { supabaseAdmin } from "./supabase";

function envAdmins(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Diz se o e-mail pode acessar o painel. */
export async function isAdminEmail(email: string): Promise<boolean> {
  const e = email.toLowerCase();
  if (envAdmins().includes(e)) return true;
  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from("admin_users")
      .select("email")
      .eq("email", e)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export type AdminCheck =
  | { ok: true; email: string }
  | { ok: false; res: NextResponse };

/**
 * Portão das rotas do painel. Uso:
 *   const a = await checarAdmin(req);
 *   if (!a.ok) return a.res;
 *   // ... a.email está autorizado
 */
export async function checarAdmin(req: Request): Promise<AdminCheck> {
  const email = await emailDoUsuario(req);
  if (!email) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "Faça login para acessar o painel." },
        { status: 401 }
      ),
    };
  }
  if (!(await isAdminEmail(email))) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "Seu e-mail não tem acesso ao painel." },
        { status: 403 }
      ),
    };
  }
  return { ok: true, email };
}
