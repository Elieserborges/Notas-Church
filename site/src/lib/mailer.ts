import nodemailer from "nodemailer";
import { getEventConfig } from "./config";
import { formatBRL } from "./event";
import { siteUrl } from "./site";
import type { OrderRow, TicketRow } from "./types";

function transporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error("SMTP não configurado (SMTP_HOST / SMTP_USER / SMTP_PASS)");
  }
  const port = Number(process.env.SMTP_PORT ?? 465);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const P = {
  pink: "#2328D6", // azul primário (nomes herdados do template)
  pinkSoft: "#AEB6FF",
  yellow: "#DCE2FF",
  cream: "#F6F7FF",
  brown: "#5A6096",
  brownDark: "#14184F",
};

function ticketBlock(t: TicketRow, index: number, total: number): string {
  const site = siteUrl();
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="background:${P.cream};border:2px dashed ${P.pinkSoft};border-radius:16px;margin:0 0 16px;">
    <tr>
      <td style="padding:20px 24px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${P.brown};font-weight:bold;">
          Ingresso ${index + 1} de ${total}
        </p>
        <p style="margin:0 0 12px;font-size:24px;font-weight:bold;letter-spacing:2px;color:${P.brownDark};">
          ${t.code}
        </p>
        <img src="${site}/api/qr/${t.code}" width="200" height="200" alt="QR Code do ingresso ${t.code}"
          style="display:block;margin:0 auto 12px;border-radius:12px;width:200px;height:200px;" />
        <p style="margin:0;font-size:13px;color:${P.brown};">
          Apresente este QR Code na entrada ·
          <a href="${site}/ingresso/${t.code}" style="color:${P.pink};font-weight:bold;">ver online</a>
        </p>
      </td>
    </tr>
  </table>`;
}

export async function sendTicketsEmail(
  order: OrderRow,
  tickets: TicketRow[]
): Promise<void> {
  const cfg = await getEventConfig();
  const t = transporter();
  const site = siteUrl();
  const firstName = order.name.trim().split(/\s+/)[0];

  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <body style="margin:0;padding:0;background:${P.cream};font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${P.cream};padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0"
          style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="background:${P.pink};padding:32px 24px;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:${P.yellow};font-weight:bold;">
                ${cfg.church}
              </p>
              <h1 style="margin:0;font-size:36px;color:#ffffff;">${cfg.name}</h1>
              <p style="margin:6px 0 0;font-style:italic;color:${P.yellow};font-size:15px;">
                ${cfg.tagline}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <h2 style="margin:0 0 8px;font-size:20px;color:${P.brownDark};">
                Oba, ${firstName}! Sua inscrição está confirmada
              </h2>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#6d5638;">
                Recebemos o seu pagamento. ${
                  tickets.length > 1
                    ? `Seguem os seus <strong>${tickets.length} ingressos</strong> — cada pessoa apresenta o próprio QR Code na entrada.`
                    : "Segue o seu ingresso — é só apresentar o QR Code na entrada."
                }
              </p>
              ${tickets.map((tk, i) => ticketBlock(tk, i, tickets.length)).join("")}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background:${P.yellow};border-radius:14px;margin:6px 0 20px;">
                <tr>
                  <td style="padding:16px 20px;font-size:14px;line-height:1.8;color:${P.brownDark};">
                    <strong>Data:</strong> ${cfg.dateLabel}<br/>
                    <strong>Horário:</strong> ${cfg.timeLabel}<br/>
                    <strong>Local:</strong> ${cfg.addressLabel}<br/>
                    <strong>Valor pago:</strong> ${formatBRL(Number(order.total))}
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:12px;line-height:1.6;color:${P.brown};">
                Guarde este e-mail. Se preferir, salve os QR Codes no celular.
                Qualquer dúvida, é só responder esta mensagem.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:${P.cream};padding:18px 24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:${P.brown};">
                ${cfg.church} · ${cfg.addressLabel}
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>`;

  // Versão em texto puro (melhora a entrega e evita filtros de spam)
  const text = [
    `Olá, ${firstName}!`,
    ``,
    `Seu pagamento foi confirmado. ${
      tickets.length > 1 ? `Seus ${tickets.length} ingressos:` : `Seu ingresso:`
    }`,
    ``,
    ...tickets.map((tk) => `- ${tk.code}  →  ${site}/ingresso/${tk.code}`),
    ``,
    `Data: ${cfg.dateLabel}`,
    `Horário: ${cfg.timeLabel}`,
    `Local: ${cfg.addressLabel}`,
    `Valor pago: ${formatBRL(Number(order.total))}`,
    ``,
    `Apresente o QR Code (ou o código acima) na entrada do evento.`,
    ``,
    `${cfg.church}`,
  ].join("\n");

  const fromName = process.env.MAIL_FROM_NAME || cfg.church;
  await t.sendMail({
    from: `"${fromName}" <${process.env.SMTP_USER}>`,
    to: order.email,
    subject: `Seu ingresso — ${cfg.name} · ${cfg.dateLabel}`,
    text,
    html,
  });
}
