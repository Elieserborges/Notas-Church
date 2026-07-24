import { NextResponse } from "next/server";
import { emailDoUsuario } from "@/lib/authServer";
import { EVENT } from "@/lib/event";
import { mpPreference } from "@/lib/mp";
import { siteUrl } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderRow, TicketRow } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Inscrições da pessoa que está logada — para ela ver a situação do
 * pagamento ao voltar no site, em vez de preencher tudo de novo.
 */
export async function GET(req: Request) {
  const email = await emailDoUsuario(req);
  if (!email) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const db = supabaseAdmin();
    const { data: ordersData, error: oe } = await db
      .from("orders")
      .select(
        "id,created_at,name,status,total,payment_method,mp_preference_id,tipo"
      )
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(20);
    if (oe) throw new Error(oe.message);

    const orders = (ordersData ?? []) as Pick<
      OrderRow,
      | "id"
      | "created_at"
      | "name"
      | "status"
      | "total"
      | "payment_method"
      | "mp_preference_id"
      | "tipo"
    >[];

    if (orders.length === 0) return NextResponse.json({ orders: [] });

    const { data: ticketsData } = await db
      .from("tickets")
      .select("order_id,code,used_at")
      .in(
        "order_id",
        orders.map((o) => o.id)
      );
    const tickets = (ticketsData ?? []) as Pick<
      TicketRow,
      "order_id" | "code" | "used_at"
    >[];

    const site = siteUrl();

    const resultado = await Promise.all(
      orders.map(async (o) => {
        let payUrl: string | null = null;

        if (o.status === "pending" && process.env.MP_ACCESS_TOKEN) {
          if (o.mp_preference_id) {
            payUrl = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${o.mp_preference_id}`;
          } else {
            // Inscrição feita antes do Mercado Pago existir: cria o link agora.
            try {
              const isPublic = site.startsWith("https://");
              const pref = await mpPreference().create({
                body: {
                  items: [
                    {
                      id: "inscricao-face-a-face",
                      title: `Inscrição ${EVENT.name} · ${EVENT.dateLabel}`,
                      description: EVENT.tagline,
                      category_id: "tickets",
                      quantity: 1,
                      unit_price: Number(o.total),
                      currency_id: "BRL",
                    },
                  ],
                  payer: { name: o.name, email },
                  external_reference: o.id,
                  metadata: { order_id: o.id },
                  statement_descriptor: EVENT.statementDescriptor,
                  payment_methods: { installments: EVENT.maxInstallments },
                  back_urls: {
                    success: `${site}/sucesso?pedido=${o.id}`,
                    pending: `${site}/pendente?pedido=${o.id}`,
                    failure: `${site}/erro?pedido=${o.id}`,
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
                  .eq("id", o.id);
              }
            } catch (e) {
              console.error("[minha-inscricao/mercadopago]", e);
            }
          }
        }

        return {
          id: o.id,
          created_at: o.created_at,
          name: o.name,
          tipo: o.tipo,
          status: o.status,
          total: Number(o.total),
          payment_method: o.payment_method,
          payUrl,
          tickets: tickets
            .filter((t) => t.order_id === o.id)
            .map(({ code, used_at }) => ({ code, used_at })),
        };
      })
    );

    return NextResponse.json({ orders: resultado });
  } catch (e) {
    console.error("[minha-inscricao]", e);
    return NextResponse.json(
      { error: "Não foi possível carregar sua inscrição." },
      { status: 500 }
    );
  }
}
