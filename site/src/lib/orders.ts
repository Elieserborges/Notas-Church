import { newTicketCode } from "./codes";
import { sendTicketsEmail } from "./mailer";
import { mpPayment } from "./mp";
import { supabaseAdmin } from "./supabase";
import type { OrderRow, TicketRow } from "./types";

/**
 * Garante que o pedido aprovado tenha `quantity` ingressos criados.
 * Idempotente: pode ser chamado quantas vezes for preciso.
 */
export async function ensureTickets(
  orderId: string,
  quantity: number
): Promise<TicketRow[]> {
  const db = supabaseAdmin();
  const { data: existing, error } = await db
    .from("tickets")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`tickets/select: ${error.message}`);

  const tickets = (existing ?? []) as TicketRow[];
  let attempts = 0;
  while (tickets.length < quantity && attempts < 30) {
    attempts++;
    const { data: created, error: insErr } = await db
      .from("tickets")
      .insert({ order_id: orderId, code: newTicketCode() })
      .select()
      .single();
    if (insErr) {
      // 23505 = código duplicado (raríssimo) → tenta outro
      if ((insErr as { code?: string }).code === "23505") continue;
      throw new Error(`tickets/insert: ${insErr.message}`);
    }
    tickets.push(created as TicketRow);
  }
  return tickets;
}

/**
 * Envia o e-mail com os ingressos uma única vez (claim atômico em
 * email_sent_at evita duplicidade mesmo com webhooks concorrentes).
 */
export async function trySendTicketsEmail(
  order: OrderRow,
  tickets: TicketRow[]
): Promise<void> {
  const db = supabaseAdmin();
  const { data: claimed } = await db
    .from("orders")
    .update({ email_sent_at: new Date().toISOString() })
    .eq("id", order.id)
    .is("email_sent_at", null)
    .select();
  if (!claimed || claimed.length === 0) return; // já enviado (ou em envio)

  try {
    await sendTicketsEmail(order, tickets);
    await db.from("orders").update({ email_error: null }).eq("id", order.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[email] falha ao enviar para pedido ${order.id}:`, msg);
    // Libera para nova tentativa no próximo webhook/consulta
    await db
      .from("orders")
      .update({ email_sent_at: null, email_error: msg.slice(0, 500) })
      .eq("id", order.id);
  }
}

/**
 * Busca o pagamento no Mercado Pago e atualiza o pedido correspondente.
 * Chamado pelo webhook e também pela página de retorno (autocorreção).
 * Idempotente e à prova de chamadas concorrentes.
 */
export async function processPaymentById(paymentId: string): Promise<void> {
  let payment;
  try {
    payment = await mpPayment().get({ id: paymentId });
  } catch (e) {
    console.error(`[mp] pagamento ${paymentId} não encontrado:`, e);
    return;
  }

  const orderId = payment.external_reference;
  const status = payment.status;
  if (!orderId || !status) return;

  const db = supabaseAdmin();
  const { data: orderData } = await db
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  const order = orderData as OrderRow | null;
  if (!order) return;

  if (order.status === "approved") {
    // Já aprovado: só garante ingressos + e-mail (retentativa)
    const tickets = await ensureTickets(order.id, order.quantity);
    await trySendTicketsEmail(order, tickets);
    return;
  }

  if (status === "approved") {
    // Update condicional: apenas um chamador "vence" e envia o e-mail
    const { data: won } = await db
      .from("orders")
      .update({ status: "approved", mp_payment_id: String(payment.id) })
      .eq("id", orderId)
      .neq("status", "approved")
      .select();
    if (!won || won.length === 0) return;

    const updated = won[0] as OrderRow;
    const tickets = await ensureTickets(updated.id, updated.quantity);
    await trySendTicketsEmail(updated, tickets);
    return;
  }

  if (status === "rejected" || status === "cancelled") {
    await db
      .from("orders")
      .update({ status: "rejected", mp_payment_id: String(payment.id) })
      .eq("id", orderId)
      .eq("status", "pending");
  }
  // pending / in_process: mantém como está
}
