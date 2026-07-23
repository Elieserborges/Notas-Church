import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderRow, TicketRow } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Lista completa de pedidos + ingressos para a página /planilha.
 * Protegida pelo PIN da equipe. body: { pin }
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

  try {
    const db = supabaseAdmin();
    const { data: ordersData, error: oe } = await db
      .from("orders")
      .select("id,created_at,name,email,phone,quantity,total,status")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (oe) throw new Error(oe.message);

    const { data: ticketsData, error: te } = await db
      .from("tickets")
      .select("order_id,code,used_at")
      .limit(10000);
    if (te) throw new Error(te.message);

    const orders = (ordersData ?? []) as (Pick<
      OrderRow,
      "id" | "created_at" | "name" | "email" | "phone" | "quantity" | "total" | "status"
    >)[];
    const tickets = (ticketsData ?? []) as Pick<
      TicketRow,
      "order_id" | "code" | "used_at"
    >[];

    return NextResponse.json({
      orders: orders.map((o) => ({
        ...o,
        total: Number(o.total),
        tickets: tickets
          .filter((t) => t.order_id === o.id)
          .map(({ code, used_at }) => ({ code, used_at })),
      })),
    });
  } catch (e) {
    console.error("[admin/list]", e);
    return NextResponse.json(
      { error: "Erro ao carregar a lista." },
      { status: 500 }
    );
  }
}
