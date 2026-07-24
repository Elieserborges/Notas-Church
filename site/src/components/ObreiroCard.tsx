"use client";

import { useCallback, useEffect, useState } from "react";
import { AvisoPrazoPagamento } from "@/components/AvisoPrazoPagamento";
import { ContaBar } from "@/components/ContaBar";
import { EVENT, formatBRL } from "@/lib/event";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Inscricao = {
  id: string;
  name: string;
  tipo: string;
  status: string;
  total: number;
  payUrl: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  approved: "Pagamento confirmado",
  pending: "Aguardando pagamento",
  rejected: "Pagamento recusado",
};

type Props = {
  userEmail?: string;
  onSignOut?: () => void;
};

/**
 * Inscrição de obreiro: sem ficha completa. Só confere o nome, confirma
 * e paga. Não gera ingresso nem e-mail com QR Code.
 */
export function ObreiroCard({ userEmail, onSignOut }: Props) {
  // undefined = ainda carregando · null = ainda não inscrito
  const [inscricao, setInscricao] = useState<Inscricao | null | undefined>(
    undefined
  );
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const sb = supabaseBrowser();
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;

      // Sugere o nome da conta Google, se houver
      const meta = data.session?.user.user_metadata as
        | Record<string, unknown>
        | undefined;
      const sugerido = String(meta?.full_name ?? meta?.name ?? "").trim();
      if (sugerido) setNome((atual) => atual || sugerido);

      if (!token) {
        setInscricao(null);
        return;
      }
      const res = await fetch("/api/minha-inscricao", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Não foi possível carregar.");
      const lista = (json.orders ?? []) as Inscricao[];
      setInscricao(lista.find((o) => o.tipo === "obreiro") ?? null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
      setInscricao(null);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function confirmar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const formData = new FormData(e.currentTarget);
      const sb = supabaseBrowser();
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/checkout-obreiro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({
          name: nome,
          website: String(formData.get("website") ?? ""),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "Não foi possível enviar a inscrição.");
      }
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  // ---- Carregando ---------------------------------------------------
  if (inscricao === undefined) {
    return (
      <div className="form-card">
        <div className="spinner" />
      </div>
    );
  }

  // ---- Já inscrito como obreiro -------------------------------------
  if (inscricao) {
    return (
      <div className="form-card">
        <p className="form-title">Inscrição de obreiro ✅</p>
        <p className="form-sub">
          Você já está inscrito como obreiro no {EVENT.name}.
        </p>

        <ContaBar userEmail={userEmail} onSignOut={onSignOut} />

        {erro && <p className="form-error">{erro}</p>}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <strong style={{ color: "var(--brown-dark)" }}>
            {inscricao.name}
          </strong>
          <span className={`pay-chip pay-${inscricao.status}`}>
            {STATUS_LABEL[inscricao.status] ?? inscricao.status}
          </span>
        </div>

        <div className="total-row">
          <span className="label">Valor de obreiro</span>
          <span className="value">{formatBRL(inscricao.total)}</span>
        </div>

        {inscricao.status === "pending" && (
          <>
            <AvisoPrazoPagamento />
            {inscricao.payUrl ? (
              <a className="btn btn-block" href={inscricao.payUrl}>
                Pagar agora
              </a>
            ) : (
              <p className="hint">
                Acerte o pagamento com a equipe da {EVENT.church}. Sua vaga já
                está guardada.
              </p>
            )}
          </>
        )}

        {inscricao.status === "approved" && (
          <p className="hint">
            Pagamento confirmado. Nos vemos no encontro! 🙌
          </p>
        )}
      </div>
    );
  }

  // ---- Ainda não inscrito -------------------------------------------
  return (
    <form className="form-card" onSubmit={confirmar}>
      <p className="form-title">Sou obreiro</p>
      <p className="form-sub">
        Inscrição de obreiro do {EVENT.name}. É só conferir seu nome e
        confirmar — sem ficha para preencher.
      </p>

      <ContaBar userEmail={userEmail} onSignOut={onSignOut} />

      {erro && (
        <p className="form-error" role="alert">
          {erro}
        </p>
      )}

      <div className="field">
        <label htmlFor="ob-nome">Nome completo</label>
        <input
          id="ob-nome"
          type="text"
          autoComplete="name"
          placeholder="Seu nome e sobrenome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          minLength={3}
          maxLength={120}
        />
      </div>

      {/* honeypot: humanos não veem; bots preenchem e são bloqueados */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="ob-website">Não preencha este campo</label>
        <input
          id="ob-website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="total-row">
        <span className="label">Valor de obreiro</span>
        <span className="value">{formatBRL(EVENT.workerPrice)}</span>
      </div>

      <button className="btn btn-block" type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Confirmar inscrição"}
      </button>

      <p className="form-note">
        Sua vaga fica registrada na hora. O pagamento pode ser feito depois.
      </p>
    </form>
  );
}
