import crypto from "crypto";
import { NextResponse } from "next/server";
import { processPaymentById } from "@/lib/orders";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Valida a assinatura x-signature do Mercado Pago (se MP_WEBHOOK_SECRET
 * estiver configurada). Docs: manifest `id:{data.id};request-id:{id};ts:{ts};`
 */
function isSignatureValid(req: Request, dataId: string | null): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // sem secret configurada, não valida

  const signature = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";
  const parts: Record<string, string> = {};
  for (const piece of signature.split(",")) {
    const [k, v] = piece.trim().split("=");
    if (k && v) parts[k] = v;
  }
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  let manifest = "";
  if (dataId) manifest += `id:${String(dataId).toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;

  const digest = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(v1));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  let body: { type?: string; data?: { id?: unknown } } | null = null;
  try {
    body = await req.json();
  } catch {
    // notificações antigas podem vir só com query params
  }

  const queryDataId =
    url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const type =
    body?.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const paymentId =
    body?.data?.id != null ? String(body.data.id) : queryDataId;

  // Só nos interessam eventos de pagamento
  if (type !== "payment" || !paymentId) {
    return NextResponse.json({ ok: true });
  }

  if (!isSignatureValid(req, queryDataId ?? paymentId)) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  try {
    await processPaymentById(paymentId);
  } catch (e) {
    console.error("[webhook]", e);
    // 500 → Mercado Pago reenvia a notificação depois
    return NextResponse.json({ error: "erro interno" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// O painel do MP às vezes testa a URL com GET
export async function GET() {
  return NextResponse.json({ ok: true });
}
