import { NextResponse } from "next/server";
import { checarAdmin } from "@/lib/adminAuth";
import { ensureCurrentEvent } from "@/lib/adminEvent";
import { clearConfigCache } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** Lê a configuração bruta do evento atual (o que o painel edita). */
export async function GET(req: Request) {
  const a = await checarAdmin(req);
  if (!a.ok) return a.res;
  try {
    const event = await ensureCurrentEvent();
    return NextResponse.json({ event });
  } catch (e) {
    console.error("[admin/config GET]", e);
    return NextResponse.json({ error: "Não foi possível carregar." }, { status: 500 });
  }
}

/**
 * Atualiza blocos do evento. Faz merge por bloco: o que não vier no
 * corpo não é tocado. body: { info?, theme?, branding?, integrations?, status? }
 */
export async function PUT(req: Request) {
  const a = await checarAdmin(req);
  if (!a.ok) return a.res;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  try {
    const ev = await ensureCurrentEvent();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.info && typeof body.info === "object")
      patch.info = { ...ev.info, ...(body.info as Record<string, unknown>) };
    if (body.theme && typeof body.theme === "object")
      patch.theme = { ...ev.theme, ...(body.theme as Record<string, string>) };
    if (body.branding && typeof body.branding === "object")
      patch.branding = { ...ev.branding, ...(body.branding as Record<string, unknown>) };
    if (body.integrations && typeof body.integrations === "object")
      patch.integrations = { ...ev.integrations, ...(body.integrations as Record<string, unknown>) };
    if (body.status === "active" || body.status === "coming_soon" || body.status === "closed")
      patch.status = body.status;

    const db = supabaseAdmin();
    const { data, error } = await db
      .from("events")
      .update(patch)
      .eq("id", ev.id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    clearConfigCache();
    return NextResponse.json({ event: data });
  } catch (e) {
    console.error("[admin/config PUT]", e);
    return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 });
  }
}
