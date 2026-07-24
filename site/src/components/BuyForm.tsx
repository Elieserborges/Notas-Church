"use client";

import { useState } from "react";
import { EVENT, formatBRL } from "@/lib/event";

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

type BuyFormProps = {
  /** E-mail da conta logada — pré-preenche o campo (continua editável). */
  userEmail?: string;
  onSignOut?: () => void;
};

export function BuyForm({ userEmail, onSignOut }: BuyFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(userEmail ?? "");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          quantity,
          website: String(form.get("website") ?? ""), // honeypot anti-bot
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(
          data.error ?? "Não foi possível iniciar o pagamento. Tente novamente."
        );
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <p className="form-title">Inscrição</p>
      <p className="form-sub">
        Preencha seus dados — o ingresso com QR Code chega no seu e-mail assim
        que o pagamento for aprovado.
      </p>

      {userEmail && (
        <p className="hint">
          Conectado como <strong>{userEmail}</strong>
          {onSignOut && (
            <>
              {" · "}
              <button type="button" className="link-btn" onClick={onSignOut}>
                Sair
              </button>
            </>
          )}
        </p>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="field">
        <label htmlFor="buy-name">Nome completo</label>
        <input
          id="buy-name"
          type="text"
          autoComplete="name"
          placeholder="Seu nome e sobrenome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={3}
          maxLength={120}
        />
      </div>

      <div className="field">
        <label htmlFor="buy-email">E-mail</label>
        <input
          id="buy-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={160}
        />
        <p className="hint">O ingresso será enviado para este e-mail.</p>
      </div>

      <div className="field">
        <label htmlFor="buy-phone">WhatsApp (com DDD)</label>
        <input
          id="buy-phone"
          type="tel"
          autoComplete="tel-national"
          inputMode="numeric"
          placeholder="(44) 99999-9999"
          value={phone}
          onChange={(e) => setPhone(maskPhone(e.target.value))}
          required
        />
      </div>

      {/* honeypot: humanos não veem; bots preenchem e são bloqueados */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="buy-website">Não preencha este campo</label>
        <input id="buy-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="qty-row">
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Quantidade de ingressos</label>
          <div className="qty-stepper">
            <button
              type="button"
              aria-label="Diminuir quantidade"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || loading}
            >
              −
            </button>
            <span className="qty-value" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Aumentar quantidade"
              onClick={() =>
                setQuantity((q) => Math.min(EVENT.maxQuantity, q + 1))
              }
              disabled={quantity >= EVENT.maxQuantity || loading}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="total-row">
        <span className="label">
          Total ({quantity} {quantity === 1 ? "ingresso" : "ingressos"})
        </span>
        <span className="value">{formatBRL(EVENT.price * quantity)}</span>
      </div>

      <button className="btn btn-block" type="submit" disabled={loading}>
        {loading ? "Abrindo pagamento…" : "Ir para o pagamento"}
      </button>

      <p className="form-note">
        🔒 Pagamento seguro pelo <strong>Mercado Pago</strong> — Pix ou cartão
        em até {EVENT.maxInstallments}x.
      </p>
    </form>
  );
}
