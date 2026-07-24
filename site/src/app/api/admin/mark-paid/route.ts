import { NextResponse } from "next/server";
import { entregarIngressos } from "@/lib/orders";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderRow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Confirma manualmente o pagamento de uma inscrição (dinheiro, Pix na
 * mão, etc.). Gera os ingressos e dispara o e-mail com o QR Code —
 * igual acontece quando o pagamento cai pelo Mercado Pago.
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

    // Aprova só quem ainda não estava aprovado (evita e-mail duplicado
    // se dois da equipe clicarem ao mesmo tempo).
    const { data: won } = await db
      .from("orders")
      .update({ status: "approved" })
      .eq("id", orderId)
      .neq("status", "approved")
      .select();

    let order = (won?.[0] ?? null) as OrderRow | null;
    if (!order) {
      const { data } = await db
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      order = data as OrderRow | null;
      if (!order) {
        return NextResponse.json(
          { error: "Inscrição não encontrada." },
          { status: 404 }
        );
      }
    }

    // Obreiro não recebe ingresso nem e-mail.
    await entregarIngressos(order);

    return NextResponse.json({ ok: true, tipo: order.tipo });
  } catch (e) {
    console.error("[admin/mark-paid]", e);
    return NextResponse.json(
      { error: "Não foi possível confirmar o pagamento." },
      { status: 500 }
    );
  }
}
