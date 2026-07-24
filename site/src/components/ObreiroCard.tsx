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

const SHIRT_SIZES = ["P", "M", "G", "GG", "EXG"];

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "cartao", label: "Cartão" },
  { value: "dinheiro", label: "Dinheiro" },
];

function maskCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

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
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [liderCelula, setLiderCelula] = useState("");
  const [vaiDeCarro, setVaiDeCarro] = useState("");
  const [querCamiseta, setQuerCamiseta] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // O valor muda com a camiseta. O servidor recalcula por conta dele —
  // aqui é só para a pessoa ver o preço enquanto escolhe.
  const valor =
    querCamiseta === "sim" ? EVENT.workerPriceWithShirt : EVENT.workerPrice;

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
          cpf,
          phone: telefone,
          gcLeader: liderCelula,
          goesByCar: vaiDeCarro,
          wantsShirt: querCamiseta,
          shirtSize: tamanho,
          paymentMethod: formaPagamento,
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

      <div className="field">
        <label htmlFor="ob-cpf">CPF</label>
        <input
          id="ob-cpf"
          type="text"
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(maskCPF(e.target.value))}
          required
          minLength={14}
        />
      </div>

      <div className="field">
        <label htmlFor="ob-tel">Telefone (com DDD)</label>
        <input
          id="ob-tel"
          type="tel"
          autoComplete="tel-national"
          inputMode="numeric"
          placeholder="(44) 99999-9999"
          value={telefone}
          onChange={(e) => setTelefone(maskPhone(e.target.value))}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="ob-lider">Quem é o seu líder de Célula?</label>
        <input
          id="ob-lider"
          type="text"
          placeholder="Nome do líder da sua célula"
          value={liderCelula}
          onChange={(e) => setLiderCelula(e.target.value)}
          required
          maxLength={120}
        />
      </div>

      <div className="field">
        <label htmlFor="ob-carro">Vai de carro?</label>
        <select
          id="ob-carro"
          value={vaiDeCarro}
          onChange={(e) => setVaiDeCarro(e.target.value)}
          required
        >
          <option value="">Selecione…</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="ob-camiseta">Você quer a camiseta do evento?</label>
        <select
          id="ob-camiseta"
          value={querCamiseta}
          onChange={(e) => {
            setQuerCamiseta(e.target.value);
            if (e.target.value !== "sim") setTamanho("");
          }}
          required
        >
          <option value="">Selecione…</option>
          <option value="nao">
            Sem camiseta — {formatBRL(EVENT.workerPrice)}
          </option>
          <option value="sim">
            Com camiseta — {formatBRL(EVENT.workerPriceWithShirt)}
          </option>
        </select>
      </div>

      {querCamiseta === "sim" && (
        <div className="field">
          <label htmlFor="ob-tam">Tamanho da camiseta</label>
          <select
            id="ob-tam"
            value={tamanho}
            onChange={(e) => setTamanho(e.target.value)}
            required
          >
            <option value="">Selecione…</option>
            {SHIRT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="ob-pag">Como você pretende pagar?</label>
        <select
          id="ob-pag"
          value={formaPagamento}
          onChange={(e) => setFormaPagamento(e.target.value)}
          required
        >
          <option value="">Selecione…</option>
          {PAYMENT_METHODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <p className="hint">
          Você pode pagar depois — a inscrição já fica registrada.
        </p>
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
        <span className="label">
          {querCamiseta === "sim"
            ? "Obreiro + camiseta"
            : querCamiseta === "nao"
              ? "Obreiro sem camiseta"
              : "Valor de obreiro"}
        </span>
        <span className="value">{formatBRL(valor)}</span>
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
