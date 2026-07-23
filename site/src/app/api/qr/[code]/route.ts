import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { normalizeCode } from "@/lib/codes";
import { siteUrl } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderRow, TicketRow } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Serve a imagem PNG do QR Code de um ingresso válido.
 * Usada dentro do e-mail (<img src="https://site/api/qr/CODIGO">),
 * assim o QR aparece no lugar certo em qualquer cliente de e-mail.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: raw } = await params;
  const code = normalizeCode(decodeURIComponent(raw));

  try {
    const db = supabaseAdmin();
    const { data: ticketData } = await db
      .from("tickets")
      .select("code,order_id")
      .eq("code", code)
      .maybeSingle();
    const ticket = ticketData as Pick<TicketRow, "code" | "order_id"> | null;
    if (!ticket) {
      return NextResponse.json({ error: "não encontrado" }, { status: 404 });
    }

    const { data: orderData } = await db
      .from("orders")
      .select("status")
      .eq("id", ticket.order_id)
      .maybeSingle();
    const order = orderData as Pick<OrderRow, "status"> | null;
    if (!order || order.status !== "approved") {
      return NextResponse.json({ error: "não encontrado" }, { status: 404 });
    }

    const png = await QRCode.toBuffer(
      `${siteUrl()}/validar?codigo=${ticket.code}`,
      {
        errorCorrectionLevel: "M",
        width: 480,
        margin: 2,
        color: { dark: "#43301c", light: "#FFFFFF" },
      }
    );

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("[qr]", e);
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
}
