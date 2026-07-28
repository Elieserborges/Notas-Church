import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Captura de leads da página "Em breve". Público. body: { email, name? }
 * E-mail repetido não dá erro (upsert silencioso).
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    const { error } = await db
      .from("leads")
      .upsert({ email, name: name || null }, { onConflict: "email" });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[lead]", e);
    return NextResponse.json(
      { error: "Não foi possível cadastrar agora. Tente de novo em instantes." },
      { status: 500 }
    );
  }
}
