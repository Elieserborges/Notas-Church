import { NextResponse } from "next/server";
import { normalizeCode } from "@/lib/codes";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderRow, TicketRow } from "@/lib/types";

export const runtime = "nodejs";

const bad = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

/** "maria@gmail.com" → "ma•••@gmail.com" */
function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user.slice(0, 2)}•••@${domain}`;
}

/** Remove acentos e caixa para busca tolerante ("João" ~ "joao") */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Portaria (página /validar).
 * body: { pin, action: "check" | "use" | "search", code?, name? }
 */
export async function POST(req: Request) {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return bad("ADMIN_PIN não configurado no servidor.", 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("Requisição inválida.", 400);
  }

  if (String(body.pin ?? "") !== adminPin) return bad("PIN incorreto.", 401);

  const action =
    body.action === "use" ? "use" : body.action === "search" ? "search" : "check";

  try {
    const db = supabaseAdmin();

    // ---- Busca por nome do comprador -----------------------------
    if (action === "search") {
      const term = String(body.name ?? "").trim();
      if (term.length < 3) return bad("Digite pelo menos 3 letras do nome.", 400);

      const { data: ordersData, error: soErr } = await db
        .from("orders")
        .select("id,name,email,quantity")
        .eq("status", "approved")
        .limit(2000);
      if (soErr) throw new Error(soErr.message);

      const t = fold(term);
      const matches = (
        (ordersData ?? []) as Pick<OrderRow, "id" | "name" | "email" | "quantity">[]
      )
        .filter((o) => fold(o.name).includes(t))
        .slice(0, 8);

      if (matches.length === 0) return NextResponse.json({ results: [] });

      const { data: tksData, error: stErr } = await db
        .from("tickets")
        .select("order_id,code,used_at")
        .in(
          "order_id",
          matches.map((o) => o.id)
        )
        .order("created_at", { ascending: true });
      if (stErr) throw new Error(stErr.message);

      const tks = (tksData ?? []) as Pick<TicketRow, "order_id" | "code" | "used_at">[];
      const results = matches.map((o) => ({
        name: o.name,
        email: maskEmail(o.email),
        quantity: o.quantity,
        tickets: tks
          .filter((tk) => tk.order_id === o.id)
          .map(({ code, used_at }) => ({ code, used_at })),
      }));
      return NextResponse.json({ results });
    }

    // ---- Verificar / confirmar por código ------------------------
    const code = normalizeCode(String(body.code ?? ""));
    if (!code) return bad("Informe o código do ingresso.", 400);

    const { data: ticketData } = await db
      .from("tickets")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    const ticket = ticketData as TicketRow | null;
    if (!ticket) return bad("Ingresso não encontrado.", 404);

    const { data: orderData } = await db
      .from("orders")
      .select("*")
      .eq("id", ticket.order_id)
      .maybeSingle();
    const order = orderData as OrderRow | null;
    if (!order || order.status !== "approved") {
      return bad("Pagamento deste ingresso não está confirmado.", 409);
    }

    const base = { code: ticket.code, name: order.name, quantity: order.quantity };

    if (action === "check") {
      return NextResponse.json({
        ...base,
        status: ticket.used_at ? "used" : "valid",
        used_at: ticket.used_at,
      });
    }

    // action === "use": marca como utilizado (à prova de duplo clique)
    const now = new Date().toISOString();
    const { data: updated } = await db
      .from("tickets")
      .update({ used_at: now })
      .eq("id", ticket.id)
      .is("used_at", null)
      .select();

    if (!updated || updated.length === 0) {
      const { data: fresh } = await db
        .from("tickets")
        .select("used_at")
        .eq("id", ticket.id)
        .single();
      return NextResponse.json({
        ...base,
        status: "already_used",
        used_at: (fresh as { used_at: string | null } | null)?.used_at ?? null,
      });
    }

    return NextResponse.json({ ...base, status: "admitted", used_at: now });
  } catch (e) {
    console.error("[validate]", e);
    return bad("Erro ao validar o ingresso.", 500);
  }
}
