import Image from "next/image";
import { AuthGate } from "@/components/AuthGate";
import { EVENT, formatBRL } from "@/lib/event";

function initials(fullName: string): string {
  const parts = fullName.replace(/^Pr[a]?\.\s*/i, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function Home() {
  const hasSpeakers = EVENT.speakers.length > 0;
  const hasMap = Boolean(EVENT.mapsUrl);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${EVENT.name} — ${EVENT.tagline}`,
    startDate: EVENT.isoStart,
    endDate: EVENT.isoEnd,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: EVENT.church,
      address: EVENT.addressLabel,
    },
    image: ["/face-a-face-banner.jpeg"],
    organizer: { "@type": "Organization", name: EVENT.church },
    offers: {
      "@type": "Offer",
      price: EVENT.price,
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ---------- Aviso: prazo de inscrição ---------- */}
      <div
        role="note"
        style={{
          background: "#FACC15",
          color: "#1f2937",
          textAlign: "center",
          padding: "10px 16px",
          fontWeight: 700,
          fontSize: "0.9rem",
          textTransform: "uppercase",
          letterSpacing: "0.03em",
        }}
      >
        Inscrições até dia {EVENT.registrationDeadlineLabel}
      </div>

      {/* ---------- Header ---------- */}
      <header className="header">
        <div className="container header-inner">
          <a className="brand" href="#">
            <span className="brand-mark">FF</span>
            <span className="brand-name">{EVENT.church}</span>
          </a>
          <nav className="nav">
            {hasSpeakers && <a href="#preletores">Preletores</a>}
            <a href="#infos">Informações</a>
            <a href="#faq">Dúvidas</a>
            <a className="btn btn-sm" href="#ingressos">
              Inscrição
            </a>
          </nav>
        </div>
      </header>

      <main>
        {/* ---------- Hero ---------- */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="hero-kicker">{EVENT.church} apresenta</span>
              <h1 className="display hero-title">{EVENT.name}</h1>
              <p className="hero-tagline">{EVENT.tagline}</p>
              <p className="hero-sub">
                Dois dias de palavra, comunhão e desafio — um encontro{" "}
                {EVENT.audience}. Chega mais: essa mesa também é sua.
              </p>
              <div className="hero-chips">
                <span className="chip">📅 {EVENT.dateLabel}</span>
                <span className="chip">🕓 {EVENT.timeLabel}</span>
                <span className="chip">
                  📍{" "}
                  {hasMap ? (
                    <a href={EVENT.mapsUrl} target="_blank" rel="noreferrer">
                      {EVENT.addressLabel}
                    </a>
                  ) : (
                    EVENT.addressLabel
                  )}
                </span>
              </div>
              <div className="price-badge">
                <span className="label">Inscrição</span>
                <span className="value">{formatBRL(EVENT.price)}</span>
              </div>
              <p className="pay-note">
                💳 Pix à vista ou em até {EVENT.maxInstallments}x no cartão
              </p>
              <div className="hero-cta">
                <a className="btn" href="#ingressos">
                  Garantir minha vaga
                </a>
                {hasMap && (
                  <a
                    className="btn btn-outline"
                    href={EVENT.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Como chegar
                  </a>
                )}
              </div>
            </div>
            <div className="hero-art">
              <Image
                src="/face-a-face-banner.jpeg"
                alt={`Arte oficial do evento ${EVENT.name} — ${EVENT.audience}, ${EVENT.dateLabel}`}
                width={1280}
                height={720}
                priority
                sizes="(max-width: 920px) 90vw, 520px"
              />
            </div>
          </div>
        </section>

        {/* ---------- Preletores (aparece quando definir em event.ts) ---------- */}
        {hasSpeakers && (
          <section className="section" id="preletores">
            <div className="container">
              <div className="section-head">
                <h2 className="display section-title">Preletores</h2>
              </div>
              <div className="speakers-grid">
                {EVENT.speakers.map((s) => (
                  <div className="speaker-card" key={s}>
                    <div className="speaker-avatar">{initials(s)}</div>
                    <p className="speaker-role">Preletor</p>
                    <p className="speaker-name">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------- Informações ---------- */}
        <section className="section" id="infos">
          <div className="container">
            <div className="section-head">
              <h2 className="display section-title">Informações</h2>
            </div>
            <div className="info-grid">
              <div className="info-card">
                <div className="info-icon">📍</div>
                <h3>Local</h3>
                <p>
                  {EVENT.addressLabel}.{" "}
                  {hasMap && (
                    <a href={EVENT.mapsUrl} target="_blank" rel="noreferrer">
                      Ver no mapa →
                    </a>
                  )}
                </p>
              </div>
              <div className="info-card">
                <div className="info-icon">🕓</div>
                <h3>Data e horário</h3>
                <p>
                  {EVENT.dateLabel}. {EVENT.timeLabel}.
                </p>
              </div>
              <div className="info-card">
                <div className="info-icon">🎟️</div>
                <h3>Inscrição digital</h3>
                <p>
                  Pague com Pix ou em até {EVENT.maxInstallments}x no cartão
                  pelo Mercado Pago e receba o QR Code no seu e-mail. É só
                  apresentar na entrada.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Compra ---------- */}
        <section className="buy-section" id="ingressos">
          <div className="container buy-wrap">
            <div className="buy-side">
              <h2 className="display">Garanta sua vaga</h2>
              <p>
                Inscrição de <strong>{formatBRL(EVENT.price)}</strong> por
                pessoa — Pix à vista ou em até{" "}
                <strong>{EVENT.maxInstallments}x no cartão</strong>. Comprando
                para os amigos? Aumente a quantidade: cada um recebe o próprio
                QR Code.
              </p>
              <ol className="buy-steps">
                <li>
                  <span className="n">1</span>
                  <span>Preencha seus dados ao lado.</span>
                </li>
                <li>
                  <span className="n">2</span>
                  <span>
                    Pague com <strong>Pix ou cartão</strong> no ambiente seguro
                    do Mercado Pago.
                  </span>
                </li>
                <li>
                  <span className="n">3</span>
                  <span>
                    Receba a inscrição com <strong>QR Code por e-mail</strong>{" "}
                    na hora e apresente na entrada do evento.
                  </span>
                </li>
              </ol>
            </div>
            <AuthGate />
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section className="section" id="faq">
          <div className="container">
            <div className="section-head">
              <h2 className="display section-title">Dúvidas frequentes</h2>
            </div>
            <div className="faq-list">
              <details>
                <summary>Como recebo minha inscrição?</summary>
                <p>
                  Assim que o pagamento for aprovado, você recebe um e-mail com
                  o ingresso e o QR Code. A tela de confirmação também mostra
                  seus códigos na hora.
                </p>
              </details>
              <details>
                <summary>Quais formas de pagamento?</summary>
                <p>
                  Pix à vista ou cartão de crédito em até{" "}
                  {EVENT.maxInstallments}x, pelo ambiente seguro do Mercado
                  Pago. No Pix a confirmação leva só alguns segundos.
                </p>
              </details>
              <details>
                <summary>Posso inscrever mais de uma pessoa?</summary>
                <p>
                  Pode! Escolha a quantidade (até {EVENT.maxQuantity} por
                  compra). Cada inscrição tem um QR Code próprio — é só
                  encaminhar para cada um.
                </p>
              </details>
              <details>
                <summary>Não recebi o e-mail. E agora?</summary>
                <p>
                  Confira a caixa de spam/lixo eletrônico. Se não estiver lá,
                  fale com a organização da {EVENT.church} levando o comprovante
                  do pagamento — seu pedido fica registrado no sistema.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="footer">
        <div className="container footer-inner">
          <div className="brand">
            <span className="brand-mark">FF</span>
            <span className="brand-name">{EVENT.church}</span>
          </div>
          <p>
            {EVENT.name} · {EVENT.dateLabel} · {EVENT.addressLabel}
          </p>
          <a className="footer-admin" href="/planilha">
            📋 Planilha
          </a>
        </div>
      </footer>
    </>
  );
}
