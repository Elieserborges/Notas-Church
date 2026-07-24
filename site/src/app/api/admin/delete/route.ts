import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Apaga uma inscrição pela planilha (ex.: alguém desistiu ou se
 * inscreveu duas vezes). Os ingressos saem junto, em cascata.
 * Protegida pelo PIN da equipe. body: { pin, orderId }
 */
export async function POST(req: Request) {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    return NextResponse.json(
      { error: "ADMIN_PIN não configurado no servidor." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (String(body.pin ?? "") !== adminPin) {
    return NextResponse.json({ error: "PIN incorreto." }, { status: 401 });
  }

  const orderId = String(body.orderId ?? "").trim();
  if (!orderId) {
    return NextResponse.json(
      { error: "Inscrição não informada." },
      { status: 400 }
    );
  }

  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("orders")
      .delete()
      .eq("id", orderId)
      .select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Inscrição não encontrada." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/delete]", e);
    return NextResponse.json(
      { error: "Não foi possível excluir a inscrição." },
      { status: 500 }
    );
  }
}
