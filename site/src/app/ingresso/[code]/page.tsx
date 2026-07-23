import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { normalizeCode } from "@/lib/codes";
import { EVENT } from "@/lib/event";
import { siteUrl } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderRow, TicketRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Meu ingresso · ${EVENT.name}`,
  robots: { index: false },
};

export default async function IngressoPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = normalizeCode(decodeURIComponent(rawCode));

  const db = supabaseAdmin();
  const { data: ticketData } = await db
    .from("tickets")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  const ticket = ticketData as TicketRow | null;
  if (!ticket) notFound();

  const { data: orderData } = await db
    .from("orders")
    .select("*")
    .eq("id", ticket.order_id)
    .maybeSingle();
  const order = orderData as OrderRow | null;
  if (!order || order.status !== "approved") notFound();

  const qrDataUrl = await QRCode.toDataURL(
    `${siteUrl()}/validar?codigo=${ticket.code}`,
    {
      errorCorrectionLevel: "M",
      width: 480,
      margin: 2,
      color: { dark: "#43301c", light: "#FFFFFF" },
    }
  );

  const used = Boolean(ticket.used_at);

  return (
    <main className="ticket-page">
      <div className="ticket-card">
        <div className="ticket-card-head">
          <p className="church">{EVENT.church}</p>
          <h1>{EVENT.name}</h1>
          <p className="tagline">{EVENT.tagline}</p>
        </div>
        <div className="ticket-card-body">
          <p className="ticket-holder">Ingresso de</p>
          <p className="ticket-name">{order.name}</p>

          <span className={`badge ${used ? "badge-used" : "badge-valid"}`}>
            {used ? "Já utilizado" : "Válido"}
          </span>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="ticket-qr"
            src={qrDataUrl}
            alt={`QR Code do ingresso ${ticket.code}`}
            width={210}
            height={210}
          />
          <p className="ticket-code">{ticket.code}</p>

          <hr className="ticket-sep" />

          <div className="ticket-details">
            <span>📅 {EVENT.dateLabel}</span>
            <br />
            <span>🕓 {EVENT.timeLabel}</span>
            <br />
            <span>📍 {EVENT.addressLabel}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
