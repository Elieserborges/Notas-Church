import { NextResponse } from "next/server";
import { entregarIngressos } from "@/lib/orders";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderRow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Confirma manualmente o pagamento de uma inscrição. Só vale para quem
 * escolheu pagar em DINHEIRO (acertado direto com a equipe) — PIX e
 * cartão são confirmados sozinhos pelo Mercado Pago. Gera os ingressos
 * e dispara o e-mail com o QR Code (obreiro não recebe nada disso).
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

    // Busca o pedido antes de mexer em qualquer coisa.
    const { data: encontrado } = await db
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    const atual = encontrado as OrderRow | null;
    if (!atual) {
      return NextResponse.json(
        { error: "Inscrição não encontrada." },
        { status: 404 }
      );
    }

    // Confirmação manual é só para dinheiro. PIX e cartão são
    // confirmados automaticamente pelo Mercado Pago.
    if (atual.payment_method !== "dinheiro") {
      return NextResponse.json(
        {
          error:
            "Só dá para confirmar na mão os pagamentos em dinheiro. PIX e cartão são confirmados automaticamente pelo Mercado Pago quando a pessoa paga.",
        },
        { status: 400 }
      );
    }

    // Aprova só quem ainda não estava aprovado (evita e-mail duplicado
    // se dois da equipe clicarem ao mesmo tempo).
    const { data: won } = await db
      .from("orders")
      .update({ status: "approved" })
      .eq("id", orderId)
      .neq("status", "approved")
      .select();

    const order = (won?.[0] ?? atual) as OrderRow;

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
