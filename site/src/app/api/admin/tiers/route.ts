import { NextResponse } from "next/server";
import { checarAdmin } from "@/lib/adminAuth";
import { ensureCurrentEvent } from "@/lib/adminEvent";
import { clearConfigCache } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const KINDS = ["participante", "obreiro", "obreiro_camiseta", "custom"];
const STATUSES = ["active", "sold_out", "hidden"];

function limparCampos(body: Record<string, unknown>) {
  const kind = String(body.kind ?? "custom");
  const status = String(body.status ?? "active");
  const qty = body.qty_available;
  return {
    kind: KINDS.includes(kind) ? kind : "custom",
    name: String(body.name ?? "").trim().slice(0, 120),
    price: Number(body.price) || 0,
    qty_available:
      qty === null || qty === "" || qty === undefined ? null : Number(qty),
    status: STATUSES.includes(status) ? status : "active",
    sort_order: Number(body.sort_order) || 0,
  };
}

/** Lista os lotes do evento atual. */
export async function GET(req: Request) {
  const a = await checarAdmin(req);
  if (!a.ok) return a.res;
  try {
    const ev = await ensureCurrentEvent();
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("ticket_tiers")
      .select("*")
      .eq("event_id", ev.id)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ tiers: data ?? [] });
  } catch (e) {
    console.error("[admin/tiers GET]", e);
    return NextResponse.json({ error: "Não foi possível carregar os lotes." }, { status: 500 });
  }
}

/** Cria um lote. */
export async function POST(req: Request) {
  const a = await checarAdmin(req);
  if (!a.ok) return a.res;
  try {
    const ev = await ensureCurrentEvent();
    const body = (await req.json()) as Record<string, unknown>;
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("ticket_tiers")
      .insert({ event_id: ev.id, ...limparCampos(body) })
      .select()
      .single();
    if (error) throw new Error(error.message);
    clearConfigCache();
    return NextResponse.json({ tier: data });
  } catch (e) {
    console.error("[admin/tiers POST]", e);
    return NextResponse.json({ error: "Não foi possível criar o lote." }, { status: 500 });
  }
}

/** Atualiza um lote. body: { id, ...campos } */
export async function PUT(req: Request) {
  const a = await checarAdmin(req);
  if (!a.ok) return a.res;
  try {
    const ev = await ensureCurrentEvent();
    const body = (await req.json()) as Record<string, unknown>;
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "Lote não informado." }, { status: 400 });
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("ticket_tiers")
      .update(limparCampos(body))
      .eq("id", id)
      .eq("event_id", ev.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    clearConfigCache();
    return NextResponse.json({ tier: data });
  } catch (e) {
    console.error("[admin/tiers PUT]", e);
    return NextResponse.json({ error: "Não foi possível salvar o lote." }, { status: 500 });
  }
}

/** Exclui um lote. ?id=… */
export async function DELETE(req: Request) {
  const a = await checarAdmin(req);
  if (!a.ok) return a.res;
  try {
    const ev = await ensureCurrentEvent();
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!id) return NextResponse.json({ error: "Lote não informado." }, { status: 400 });
    const db = supabaseAdmin();
    const { error } = await db
      .from("ticket_tiers")
      .delete()
      .eq("id", id)
      .eq("event_id", ev.id);
    if (error) throw new Error(error.message);
    clearConfigCache();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/tiers DELETE]", e);
    return NextResponse.json({ error: "Não foi possível excluir o lote." }, { status: 500 });
  }
}
