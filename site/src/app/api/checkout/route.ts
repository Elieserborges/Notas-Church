import { NextResponse } from "next/server";
import { EVENT } from "@/lib/event";
import { mpPreference } from "@/lib/mp";
import { siteUrl } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderRow } from "@/lib/types";

export const runtime = "nodejs";

const bad = (error: string, status = 400) =>
  NextResponse.json({ error }, { status });

const SHIRT_SIZES = ["P", "M", "G", "GG", "EXG"];
const PAYMENT_METHODS = ["pix", "cartao", "dinheiro"];

const str = (v: unknown) => String(v ?? "").trim();
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const simNao = (v: unknown) => {
  const s = str(v).toLowerCase();
  return s === "sim" ? true : s === "nao" ? false : null;
};

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("Requisição inválida.");
  }

  if (str(body.website)) return bad("Não foi possível processar a inscrição.");

  // ---- Dados pessoais ----
  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const birthDate = str(body.birthDate);
  const cpf = digits(body.cpf);
  const phone = digits(body.phone);
  const shirtSize = str(body.shirtSize).toUpperCase();

  if (name.length < 3 || name.length > 120)
    return bad("Informe seu nome completo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160)
    return bad("Sua sessão expirou. Entre novamente para se inscrever.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate))
    return bad("Informe sua data de nascimento.");
  if (cpf.length !== 11) return bad("Informe um CPF válido (11 dígitos).");
  if (phone.length < 10 || phone.length > 13)
    return bad("Informe um telefone válido, com DDD.");
  if (!SHIRT_SIZES.includes(shirtSize))
    return bad("Escolha o tamanho da camiseta.");

  // ---- Contato do familiar ----
  const familyName = str(body.familyName);
  const familyRelationship = str(body.familyRelationship);
  const familyPhone = digits(body.familyPhone);

  if (familyName.length < 3) return bad("Informe o nome do familiar.");
  if (!familyRelationship) return bad("Informe o parentesco do familiar.");
  if (familyPhone.length < 10 || familyPhone.length > 13)
    return bad("Informe um telefone válido do familiar, com DDD.");

  // ---- Saúde e hospedagem ----
  const usesMedication = simNao(body.usesMedication);
  const medicationDetails = str(body.medicationDetails);
  const climbsStairs = simNao(body.climbsStairs);
  const sleepsTopBunk = simNao(body.sleepsTopBunk);

  if (usesMedication === null)
    return bad("Responda se faz uso de medicamento.");
  if (usesMedication && !medicationDetails)
    return bad("Informe quais medicamentos e os horários.");
  if (climbsStairs === null) return bad("Responda se sobe escada.");
  if (sleepsTopBunk === null)
    return bad("Responda se dorme na parte de cima do beliche.");

  // ---- Igreja ----
  const gcLeader = str(body.gcLeader);
  const closePersonName = str(body.closePersonName);
  const closePersonPhone = digits(body.closePersonPhone);

  if (!gcLeader) return bad("Informe quem é o seu líder de GC.");
  if (closePersonName.length < 3)
    return bad("Informe o nome de alguém próximo a você na igreja.");
  if (closePersonPhone.length < 10 || closePersonPhone.length > 13)
    return bad("Informe um telefone válido dessa pessoa, com DDD.");

  // ---- Pagamento (informativo) ----
  const paymentMethod = str(body.paymentMethod).toLowerCase();
  if (!PAYMENT_METHODS.includes(paymentMethod))
    return bad("Escolha a forma de pagamento.");

  try {
    const db = supabaseAdmin();
    const { data: orderData, error: insErr } = await db
      .from("orders")
      .insert({
        name,
        email,
        phone,
        quantity: 1,
        unit_price: EVENT.price,
        total: EVENT.price,
        birth_date: birthDate,
        cpf,
        shirt_size: shirtSize,
        family_name: familyName,
        family_relationship: familyRelationship,
        family_phone: familyPhone,
        payment_method: paymentMethod,
        uses_medication: usesMedication,
        medication_details: usesMedication ? medicationDetails : null,
        climbs_stairs: climbsStairs,
        sleeps_top_bunk: sleepsTopBunk,
        gc_leader: gcLeader,
        close_person_name: closePersonName,
        close_person_phone: closePersonPhone,
      })
      .select()
      .single();
    if (insErr) throw new Error(`orders/insert: ${insErr.message}`);
    const order = orderData as OrderRow;

    // A inscrição já está garantida. O pagamento é opcional e pode ser
    // feito depois — se o Mercado Pago não estiver configurado ou falhar,
    // seguimos normalmente sem link de pagamento.
    let payUrl: string | null = null;
    if (process.env.MP_ACCESS_TOKEN) {
      try {
        const site = siteUrl();
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
        // Inscrição continua válida; só ficou sem link de pagamento agora.
        console.error("[checkout/mercadopago]", e);
      }
    }

    return NextResponse.json({ orderId: order.id, payUrl });
  } catch (e) {
    console.error("[checkout]", e);
    return bad(
      "Não foi possível registrar sua inscrição agora. Tente novamente em instantes.",
      500
    );
  }
}
