import type { Metadata, Viewport } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { EVENT, formatBRL } from "@/lib/event";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-accent",
  display: "swap",
});

const title = `${EVENT.name} · ${EVENT.dateLabel} · ${EVENT.church}`;
const description = `${EVENT.tagline}. ${EVENT.dateLabel} — ${EVENT.addressLabel}. Inscrição: ${formatBRL(EVENT.price)}, via Pix ou em até ${EVENT.maxInstallments}x no cartão.`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title,
  description,
  openGraph: {
    title,
    description,
    images: ["/face-a-face-banner.jpeg"],
    locale: "pt_BR",
    type: "website",
    siteName: EVENT.church,
  },
};

export const viewport: Viewport = {
  themeColor: "#2328D6",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} ${playfair.variable}`}>
      <body>
        {children}
        <WhatsAppFloat />
      </body>
    </html>
  );
}
