import { NextResponse } from "next/server";
import { emailDoUsuario } from "@/lib/authServer";
import { EVENT } from "@/lib/event";
import { mpPreference } from "@/lib/mp";
import { siteUrl } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderRow } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Inscrição de obreiro: só nome + o e-mail do login. Sem ficha completa,
 * sem ingresso e sem e-mail com QR Code — vale o valor próprio de obreiro.
 */
export async function POST(req: Request) {
  const email = await emailDoUsuario(req);
  if (!email) {
    return NextResponse.json(
      { error: "Entre novamente para se inscrever." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (String(body.website ?? "").trim()) {
    return NextResponse.json(
      { error: "Não foi possível processar a inscrição." },
      { status: 400 }
    );
  }

  const name = String(body.name ?? "").trim();
  if (name.length < 3 || name.length > 120) {
    return NextResponse.json(
      { error: "Informe seu nome completo." },
      { status: 400 }
    );
  }

  try {
    const db = supabaseAdmin();
    const { data: orderData, error: insErr } = await db
      .from("orders")
      .insert({
        tipo: "obreiro",
        name,
        email,
        phone: "", // obreiro não preenche ficha
        quantity: 1,
        unit_price: EVENT.workerPrice,
        total: EVENT.workerPrice,
      })
      .select()
      .single();
    if (insErr) throw new Error(`orders/insert: ${insErr.message}`);
    const order = orderData as OrderRow;

    // Pagamento é opcional: a inscrição já está garantida.
    let payUrl: string | null = null;
    if (process.env.MP_ACCESS_TOKEN) {
      try {
        const site = siteUrl();
        const isPublic = site.startsWith("https://");
        const pref = await mpPreference().create({
          body: {
            items: [
              {
                id: "inscricao-obreiro-face-a-face",
                title: `Obreiro · ${EVENT.name} · ${EVENT.dateLabel}`,
                description: EVENT.tagline,
                category_id: "tickets",
                quantity: 1,
                unit_price: EVENT.workerPrice,
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
            ...(isPublic
              ? {
                  auto_return: "approved",
                  notification_url: `${site}/api/webhook`,
                }
              : {}),
          },
        });
        payUrl = pref.init_point ?? null;
        if (pref.id) {
          await db
            .from("orders")
            .update({ mp_preference_id: pref.id })
            .eq("id", order.id);
        }
      } catch (e) {
        console.error("[checkout-obreiro/mercadopago]", e);
      }
    }

    return NextResponse.json({ orderId: order.id, payUrl });
  } catch (e) {
    console.error("[checkout-obreiro]", e);
    return NextResponse.json(
      { error: "Não foi possível registrar sua inscrição agora." },
      { status: 500 }
    );
  }
}
