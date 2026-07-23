import { NextResponse } from "next/server";
import { EVENT } from "@/lib/event";
import { mpPreference } from "@/lib/mp";
import { siteUrl } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderRow } from "@/lib/types";

export const runtime = "nodejs";

const bad = (error: string, status = 400) =>
  NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("Requisição inválida.");
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").replace(/\D/g, "");
  const quantity = Number(body.quantity);
  const honeypot = String(body.website ?? "");

  if (honeypot) return bad("Não foi possível processar o pedido.");
  if (name.length < 3 || name.length > 120)
    return bad("Informe seu nome completo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160)
    return bad("Informe um e-mail válido — o ingresso será enviado para ele.");
  if (phone.length < 10 || phone.length > 13)
    return bad("Informe um WhatsApp válido, com DDD.");
  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > EVENT.maxQuantity
  )
    return bad("Quantidade inválida.");

  try {
    const db = supabaseAdmin();
    const { data: orderData, error: insErr } = await db
      .from("orders")
      .insert({
        name,
        email,
        phone,
        quantity,
        unit_price: EVENT.price,
        total: EVENT.price * quantity,
      })
      .select()
      .single();
    if (insErr) throw new Error(`orders/insert: ${insErr.message}`);
    const order = orderData as OrderRow;

    const site = siteUrl();
    const isPublic = site.startsWith("https://");

    const pref = await mpPreference().create({
      body: {
        items: [
          {
            id: "ingresso-cura-me",
            title: `Ingresso ${EVENT.name} · ${EVENT.dateLabel}`,
            description: EVENT.tagline,
            category_id: "tickets",
            quantity,
            unit_price: EVENT.price,
            currency_id: "BRL",
          },
        ],
        payer: { name, email },
        external_reference: order.id,
        metadata: { order_id: order.id },
        statement_descriptor: EVENT.statementDescriptor,
        payment_methods: { installments: EVENT.maxInstallments },
        back_urls: {
          success: `${site}/sucesso?pedido=${order.id}`,
          pending: `${site}/pendente?pedido=${order.id}`,
          failure: `${site}/erro?pedido=${order.id}`,
        },
        // auto_return e webhook exigem URL pública (https)
        ...(isPublic
          ? {
              auto_return: "approved",
              notification_url: `${site}/api/webhook`,
            }
          : {}),
      },
    });

    if (!pref.init_point) throw new Error("Mercado Pago não retornou o link.");

    await db
      .from("orders")
      .update({ mp_preference_id: pref.id ?? null })
      .eq("id", order.id);

    return NextResponse.json({ url: pref.init_point });
  } catch (e) {
    console.error("[checkout]", e);
    return bad(
      "Não foi possível iniciar o pagamento agora. Tente novamente em instantes.",
      500
    );
  }
}
