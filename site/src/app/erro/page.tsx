import Link from "next/link";

export const metadata = { title: "Pagamento não concluído · Face a Face" };

export default function ErroPage() {
  return (
    <main className="status-page">
      <div className="status-card">
        <div className="status-emoji">😕</div>
        <h1>Pagamento não concluído</h1>
        <p>
          Tudo bem, acontece! Nenhum valor foi cobrado. Você pode tentar de novo
          quando quiser — leva menos de um minuto.
        </p>
        <Link className="btn" href="/#ingressos">
          Tentar novamente
        </Link>
      </div>
    </main>
  );
}
