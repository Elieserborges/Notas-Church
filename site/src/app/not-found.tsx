import Link from "next/link";

export default function NotFound() {
  return (
    <main className="status-page">
      <div className="status-card">
        <div className="status-emoji">🌸</div>
        <h1>Página não encontrada</h1>
        <p>
          O link que você acessou não existe ou o ingresso não foi localizado.
        </p>
        <Link className="btn" href="/">
          Ir para o site do evento
        </Link>
      </div>
    </main>
  );
}
