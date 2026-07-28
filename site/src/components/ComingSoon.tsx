"use client";

import { useState } from "react";
import { useEventConfig } from "@/components/EventConfigProvider";

/**
 * Landing simplificada exibida quando o evento não está "ativo".
 * "coming_soon" mostra captura de lead; "closed" só avisa que encerrou.
 */
export function ComingSoon() {
  const cfg = useEventConfig();
  const encerrado = cfg.status === "closed";

  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: nome }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Não foi possível cadastrar.");
      setOk(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao cadastrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="coming-wrap">
      <div className="coming-card">
        <span className="coming-kicker">{cfg.church}</span>
        <h1 className="display coming-title">{cfg.name}</h1>
        <p className="coming-tagline">{cfg.tagline}</p>
        <div className="coming-chips">
          <span className="chip">📅 {cfg.dateLabel}</span>
        </div>

        {encerrado ? (
          <p className="coming-msg">
            As inscrições estão <strong>encerradas</strong>. Obrigado a todos que
            participaram — até a próxima! 🙌
          </p>
        ) : ok ? (
          <p className="coming-msg">
            ✅ Prontinho! Vamos te avisar assim que as inscrições abrirem.
          </p>
        ) : (
          <>
            <p className="coming-msg">
              As inscrições abrem <strong>em breve</strong>. Deixe seu e-mail que a
              gente avisa você primeiro.
            </p>
            <form className="coming-form" onSubmit={enviar}>
              <input
                type="text"
                placeholder="Seu nome (opcional)"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={120}
              />
              <input
                type="email"
                required
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={160}
              />
              {err && <p className="form-error">{err}</p>}
              <button className="btn btn-block" type="submit" disabled={busy}>
                {busy ? "Enviando…" : "Quero ser avisado"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
