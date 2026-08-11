import { NextResponse } from "next/server";
import { ensureTickets, processPaymentById, trySendTicketsEmail } from "@/lib/orders";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderRow } from "@/lib/types";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getOrder(id: string): Promise<OrderRow | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as OrderRow) ?? null;
}

/**
 * Status do pedido — usado pelas páginas de retorno do pagamento.
 * Se o webhook ainda não chegou, consulta o pagamento direto no MP
 * (payment_id vem na URL de retorno) e processa na hora.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  try {
    let order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }

    const paymentId = new URL(req.url).searchParams.get("payment_id");
    if (order.status !== "approved" && paymentId && /^\d+$/.test(paymentId)) {
      // Autocorreção: confirma direto no MP sem esperar o webhook.
      // Seguro: processPaymentById só aprova o pedido que o próprio MP
      // aponta no external_reference do pagamento.
      await processPaymentById(paymentId);
      order = (await getOrder(id)) ?? order;
    }

    let tickets: { code: string; used_at: string | null }[] = [];
    // Obreiro não recebe ingresso nem e-mail (mesma trava de entregarIngressos).
    if (order.status === "approved" && order.tipo !== "obreiro") {
      const full = await ensureTickets(order.id, order.quantity);
      await trySendTicketsEmail(order, full);
      tickets = full.map((t) => ({ code: t.code, used_at: t.used_at }));
    }

    return NextResponse.json({
      id: order.id,
      status: order.status,
      tipo: order.tipo,
      name: order.name,
      email: order.email,
      quantity: order.quantity,
      total: Number(order.total),
      tickets,
    });
  } catch (e) {
    console.error("[order]", e);
    return NextResponse.json(
      { error: "Erro ao consultar o pedido." },
      { status: 500 }
    );
  }
}
