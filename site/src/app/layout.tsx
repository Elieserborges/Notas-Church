import type { Metadata, Viewport } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import { EventConfigProvider } from "@/components/EventConfigProvider";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { getEventConfig } from "@/lib/config";
import { formatBRL } from "@/lib/event";
import { themeCss } from "@/lib/theme";
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

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
);

// O site depende da config do painel (textos, cores, status) → sempre
// renderiza no servidor, para as mudanças aparecerem sem novo deploy.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getEventConfig();
  const title = `${c.name} · ${c.dateLabel} · ${c.church}`;
  const description = `${c.tagline}. ${c.dateLabel} — ${c.addressLabel}. Inscrição: ${formatBRL(
    c.price
  )}, via Pix ou em até ${c.maxInstallments}x no cartão.`;
  const banner = c.branding.banner || "/face-a-face-banner.jpeg";
  return {
    metadataBase,
    title,
    description,
    ...(c.branding.favicon ? { icons: { icon: c.branding.favicon } } : {}),
    openGraph: {
      title,
      description,
      images: [banner],
      locale: "pt_BR",
      type: "website",
      siteName: c.church,
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const c = await getEventConfig();
  return { themeColor: c.theme.primary || "#2328D6" };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const config = await getEventConfig();
  const css = themeCss(config.theme);
  return (
    <html lang="pt-BR" className={`${montserrat.variable} ${playfair.variable}`}>
      <body>
        {/* Cores do painel sobrescrevem as variáveis CSS. Vazio = padrão. */}
        {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
        <EventConfigProvider value={config}>{children}</EventConfigProvider>
        <WhatsAppFloat whatsapp={config.supportWhatsapp} />
      </body>
    </html>
  );
}
