"use client";

import { useCallback, useEffect, useState } from "react";
import { AvisoPrazoPagamento } from "@/components/AvisoPrazoPagamento";
import { BuyForm } from "@/components/BuyForm";
import { ContaBar } from "@/components/ContaBar";
import { EVENT, formatBRL } from "@/lib/event";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Inscricao = {
  id: string;
  created_at: string;
  name: string;
  status: string;
  total: number;
  payment_method: string | null;
  payUrl: string | null;
  tickets: { code: string; used_at: string | null }[];
};

const STATUS_LABEL: Record<string, string> = {
  approved: "Pagamento confirmado",
  pending: "Aguardando pagamento",
  rejected: "Pagamento recusado",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #eadbc8",
  borderRadius: 14,
  padding: "14px 16px",
  marginBottom: 14,
  background: "var(--cream)",
};

type Props = {
  userEmail?: string;
  onSignOut?: () => void;
};

/**
 * Quem já se inscreveu vê a situação do pagamento ao voltar, em vez de
 * receber o formulário em branco de novo.
 */
export function MinhaInscricao({ userEmail, onSignOut }: Props) {
  const [inscricoes, setInscricoes] = useState<Inscricao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novaInscricao, setNovaInscricao] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const sb = supabaseBrowser();
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setInscricoes([]);
        return;
      }
      const res = await fetch("/api/minha-inscricao", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Não foi possível carregar.");
      setInscricoes(json.orders ?? []);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Erro ao carregar sua inscrição."
      );
      setInscricoes([]);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ---- Carregando ---------------------------------------------------
  if (inscricoes === null) {
    return (
      <div className="form-card">
        <div className="spinner" />
      </div>
    );
  }

  // ---- Sem inscrição ainda (ou pediu para inscrever outra pessoa) ----
  if (novaInscricao || inscricoes.length === 0) {
    return (
      <>
        {novaInscricao && inscricoes.length > 0 && (
          <p style={{ textAlign: "center", marginBottom: 10 }}>
            <button
              className="link-btn"
              type="button"
              onClick={() => setNovaInscricao(false)}
            >
              ← voltar para a minha inscrição
            </button>
          </p>
        )}
        <BuyForm userEmail={userEmail} onSignOut={onSignOut} />
      </>
    );
  }

  // ---- Já inscrito ---------------------------------------------------
  return (
    <div className="form-card">
      <p className="form-title">Sua inscrição ✅</p>
      <p className="form-sub">
        Você já está inscrito no {EVENT.name} — não precisa preencher de novo.
      </p>

      <ContaBar userEmail={userEmail} onSignOut={onSignOut} />

      {erro && <p className="form-error">{erro}</p>}

      {inscricoes.map((i) => (
        <div key={i.id} style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            <strong style={{ color: "var(--brown-dark)" }}>{i.name}</strong>
            <span className={`pay-chip pay-${i.status}`}>
              {STATUS_LABEL[i.status] ?? i.status}
            </span>
          </div>

          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--brown)" }}>
            Valor: <strong>{formatBRL(i.total)}</strong>
          </p>

          {i.status === "pending" && (
            <>
              <AvisoPrazoPagamento />
              {i.payUrl ? (
                <>
                  <a className="btn btn-block" href={i.payUrl}>
                    Pagar agora
                  </a>
                  <p
                    className="hint"
                    style={{ textAlign: "center", marginTop: 8 }}
                  >
                    Pode pagar quando quiser — sua vaga já está guardada.
                  </p>
                </>
              ) : (
                <p className="hint">
                  Acerte o pagamento com a equipe da {EVENT.church}. Sua vaga já
                  está guardada.
                </p>
              )}
            </>
          )}

          {i.status === "approved" && (
            <>
              <p
                style={{ margin: "0 0 10px", fontSize: 14, color: "var(--brown)" }}
              >
                Seu ingresso foi enviado por e-mail. Também dá para abrir aqui:
              </p>
              {i.tickets.length === 0 ? (
                <p className="hint">
                  Gerando seu ingresso… atualize a página em instantes.
                </p>
              ) : (
                i.tickets.map((t) => (
                  <a
                    key={t.code}
                    className="btn btn-outline btn-block"
                    href={`/ingresso/${t.code}`}
                    style={{ marginBottom: 8 }}
                  >
                    🎟️ Ver ingresso {t.code}
                  </a>
                ))
              )}
            </>
          )}
        </div>
      ))}

      <button
        className="link-btn"
        type="button"
        onClick={() => setNovaInscricao(true)}
      >
        Inscrever outra pessoa
      </button>
    </div>
  );
}
