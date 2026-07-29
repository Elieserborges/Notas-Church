import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { normalizeCode } from "@/lib/codes";
import { getEventConfig } from "@/lib/config";
import { siteUrl } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderRow, TicketRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getEventConfig();
  return {
    title: `Meu ingresso · ${cfg.name}`,
    robots: { index: false },
  };
}

export default async function IngressoPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const cfg = await getEventConfig();
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
          <p className="church">{cfg.church}</p>
          <h1>{cfg.name}</h1>
          <p className="tagline">{cfg.tagline}</p>
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
            <span>📅 {cfg.dateLabel}</span>
            <br />
            <span>🕓 {cfg.timeLabel}</span>
            <br />
            <span>📍 {cfg.addressLabel}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
