import { AuthGate } from "@/components/AuthGate";
import { FaixaPrazo } from "@/components/FaixaPrazo";
import { TopoAoCarregar } from "@/components/TopoAoCarregar";
import { EVENT, formatBRL } from "@/lib/event";

export const metadata = {
  title: `Sou obreiro · ${EVENT.name}`,
  description: `Inscrição de obreiro do ${EVENT.name} — ${EVENT.church}.`,
};

export default function SouObreiroPage() {
  return (
    <>
      <TopoAoCarregar />
      <FaixaPrazo />

      {/* ---------- Header ---------- */}
      <header className="header">
        <div className="container header-inner">
          <a className="brand" href="/">
            <span className="brand-mark">FF</span>
            <span className="brand-name">{EVENT.church}</span>
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
                {EVENT.name}. O valor de obreiro é{" "}
                <strong>{formatBRL(EVENT.workerPrice)}</strong>.
              </p>
              <ol className="buy-steps">
                <li>
                  <span className="n">1</span>
                  <span>Entre com sua conta (Google ou e-mail e senha).</span>
                </li>
                <li>
                  <span className="n">2</span>
                  <span>
                    Confira seu nome e clique em{" "}
                    <strong>Confirmar inscrição</strong> — sem ficha para
                    preencher.
                  </span>
                </li>
                <li>
                  <span className="n">3</span>
                  <span>
                    Pague quando quiser, até{" "}
                    <strong>{EVENT.registrationDeadlineLabel}</strong>. Sua vaga
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
