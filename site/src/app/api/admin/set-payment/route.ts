import { NextResponse } from "next/server";
import { entregarIngressos } from "@/lib/orders";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderRow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const METODOS = ["pix", "cartao", "dinheiro"];
const STATUSES = ["pending", "approved", "cortesia", "rejected"];

/**
 * Ajusta manualmente a forma de pagamento e/ou a situação de uma inscrição,
 * pela planilha da equipe. Ao marcar como "approved" (Pago), gera o ingresso
 * e envia o e-mail com QR Code (participante) — obreiro/cortesia não recebem.
 * Protegida pelo PIN. body: { pin, orderId, paymentMethod?, status? }
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
    return NextResponse.json({ error: "Inscrição não informada." }, { status: 400 });
  }

  const metodo = body.paymentMethod ? String(body.paymentMethod) : null;
  const status = body.status ? String(body.status) : null;
  if (metodo && !METODOS.includes(metodo)) {
    return NextResponse.json({ error: "Forma de pagamento inválida." }, { status: 400 });
  }
  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Situação inválida." }, { status: 400 });
  }
  if (!metodo && !status) {
    return NextResponse.json({ error: "Nada para alterar." }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    const { data: encontrado } = await db
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    const atual = encontrado as OrderRow | null;
    if (!atual) {
      return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};
    if (metodo) patch.payment_method = metodo;
    if (status) patch.status = status;

    const { data: upd, error } = await db
      .from("orders")
      .update(patch)
      .eq("id", orderId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const order = upd as OrderRow;

    // Virou "Pago" → entrega o ingresso (participante) / registra (obreiro).
    if (order.status === "approved") {
      await entregarIngressos(order);
    }

    return NextResponse.json({ ok: true, status: order.status, tipo: order.tipo });
  } catch (e) {
    console.error("[admin/set-payment]", e);
    return NextResponse.json(
      { error: "Não foi possível salvar a alteração." },
      { status: 500 }
    );
  }
}
