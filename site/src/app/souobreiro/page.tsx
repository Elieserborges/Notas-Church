import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { ComingSoon } from "@/components/ComingSoon";
import { FaixaPrazo } from "@/components/FaixaPrazo";
import { TopoAoCarregar } from "@/components/TopoAoCarregar";
import { getEventConfig } from "@/lib/config";
import { formatBRL } from "@/lib/event";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getEventConfig();
  return {
    title: `Sou obreiro · ${cfg.name}`,
    description: `Inscrição de obreiro do ${cfg.name} — ${cfg.church}.`,
  };
}

export default async function SouObreiroPage() {
  const cfg = await getEventConfig();
  if (cfg.status !== "active") return <ComingSoon />;
  return (
    <>
      <TopoAoCarregar />
      <FaixaPrazo />

      {/* ---------- Header ---------- */}
      <header className="header">
        <div className="container header-inner">
          <a className="brand" href="/">
            <span className="brand-mark">FF</span>
            <span className="brand-name">{cfg.church}</span>
          </a>
          <nav className="nav">
            <a href="/">Início</a>
            <a className="btn btn-sm btn-outline" href="/#ingressos">
              Inscrição
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="buy-section" id="obreiro">
          <div className="container buy-wrap">
            <div className="buy-side">
              <h2 className="display">Sou obreiro</h2>
              <p>
                Inscrição para quem vai <strong>servir</strong> no{" "}
                {cfg.name}. Você escolhe entre duas opções:{" "}
                <strong>{formatBRL(cfg.workerPrice)}</strong> sem camiseta ou{" "}
                <strong>{formatBRL(cfg.workerPriceWithShirt)}</strong> com a
                camiseta do evento.
              </p>
              <ol className="buy-steps">
                <li>
                  <span className="n">1</span>
                  <span>Entre com sua conta (Google ou e-mail e senha).</span>
                </li>
                <li>
                  <span className="n">2</span>
                  <span>
                    Preencha nome, telefone, se quer{" "}
                    <strong>camiseta</strong> e a forma de pagamento — bem
                    rápido, sem a ficha completa.
                  </span>
                </li>
                <li>
                  <span className="n">3</span>
                  <span>
                    Pague quando quiser, até{" "}
                    <strong>{cfg.registrationDeadlineLabel}</strong>. Sua vaga
                    já fica guardada.
                  </span>
                </li>
              </ol>
              <p className="hint">
                É participante e não obreiro?{" "}
                <a href="/#ingressos">Ir para a inscrição normal →</a>
              </p>
            </div>
            <AuthGate modo="obreiro" />
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="footer">
        <div className="container footer-inner">
          <div className="brand">
            <span className="brand-mark">FF</span>
            <span className="brand-name">{cfg.church}</span>
          </div>
          <p>
            {cfg.name} · {cfg.dateLabel} · {cfg.addressLabel}
          </p>
          <a className="footer-admin" href="/planilha">
            📋 Planilha
          </a>
        </div>
      </footer>
    </>
  );
}
