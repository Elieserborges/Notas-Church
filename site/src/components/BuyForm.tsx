"use client";

import { useState } from "react";
import { AvisoPrazoPagamento } from "@/components/AvisoPrazoPagamento";
import { ContaBar } from "@/components/ContaBar";
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

function maskCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function maskDate(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "15/08/1990" → "1990-08-15" (null se a data não existir de verdade) */
function dateToISO(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const dt = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return null;
  // pega casos como 31/02
  if (dt.getUTCDate() !== Number(dd) || dt.getUTCMonth() + 1 !== Number(mm)) {
    return null;
  }
  const ano = Number(yyyy);
  if (ano < 1900 || ano > new Date().getFullYear()) return null;
  return `${yyyy}-${mm}-${dd}`;
}

const SHIRT_SIZES = ["P", "M", "G", "GG", "EXG"];

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "cartao", label: "Cartão" },
  { value: "dinheiro", label: "Dinheiro" },
];

const EMPTY = {
  name: "",
  birthDate: "",
  cpf: "",
  phone: "",
  shirtSize: "",
  familyName: "",
  familyRelationship: "",
  familyPhone: "",
  paymentMethod: "",
  usesMedication: "",
  medicationDetails: "",
  climbsStairs: "",
  sleepsTopBunk: "",
  gcLeader: "",
  closePersonName: "",
  closePersonPhone: "",
};

const sectionStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 12.5,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--brown)",
  margin: "26px 0 12px",
};

type BuyFormProps = {
  /** E-mail da conta logada — o ingresso é enviado para ele. */
  userEmail?: string;
  onSignOut?: () => void;
};

type Done = { orderId: string; payUrl: string | null };

export function BuyForm({ userEmail, onSignOut }: BuyFormProps) {
  const [f, setF] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  function set(key: keyof typeof EMPTY, value: string) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const birthISO = dateToISO(f.birthDate);
      if (!birthISO) {
        throw new Error(
          "Confira a data de nascimento — use o formato dia/mês/ano."
        );
      }
      const formData = new FormData(e.currentTarget);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          birthDate: birthISO,
          email: userEmail ?? "",
          website: String(formData.get("website") ?? ""), // honeypot anti-bot
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível enviar a inscrição.");
      }
      setDone({ orderId: data.orderId, payUrl: data.payUrl ?? null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
    }
  }

  // ---- Inscrição enviada -------------------------------------------
  if (done) {
    return (
      <div className="form-card">
        <p className="form-title">Inscrição confirmada! ✅</p>
        <p className="form-sub">
          Sua vaga está registrada. O pagamento pode ser feito{" "}
          <strong>quando você quiser</strong> — sua inscrição fica guardada como{" "}
          <strong>pendente</strong> até lá.
        </p>

        <AvisoPrazoPagamento />

        <div className="total-row">
          <span className="label">Valor da inscrição</span>
          <span className="value">{formatBRL(EVENT.price)}</span>
        </div>

        {done.payUrl ? (
          <a className="btn btn-block" href={done.payUrl}>
            Pagar agora
          </a>
        ) : (
          <p className="hint">
            Em breve o pagamento online estará disponível. Enquanto isso, acerte
            com a equipe da {EVENT.church} pela forma que você escolheu.
          </p>
        )}

        <p className="form-note">
          O ingresso com QR Code chega no seu e-mail assim que o pagamento for
          confirmado.
        </p>

        <button
          className="link-btn"
          type="button"
          onClick={() => {
            setF({ ...EMPTY });
            setDone(null);
            setLoading(false);
          }}
        >
          Fazer outra inscrição
        </button>
      </div>
    );
  }

  // ---- Formulário ---------------------------------------------------
  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <p className="form-title">Ficha de inscrição</p>
      <p className="form-sub">
        Preencha todos os campos — são informações que a equipe precisa para
        organizar a hospedagem e cuidar de você durante o encontro.
      </p>

      <ContaBar userEmail={userEmail} onSignOut={onSignOut} />

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {/* ---------- Seus dados ---------- */}
      <p style={sectionStyle}>Seus dados</p>

      <div className="field">
        <label htmlFor="f-name">Nome completo</label>
        <input
          id="f-name"
          type="text"
          autoComplete="name"
          placeholder="Seu nome e sobrenome"
          value={f.name}
          onChange={(e) => set("name", e.target.value)}
          required
          minLength={3}
          maxLength={120}
        />
      </div>

      <div className="field">
        <label htmlFor="f-birth">Data de nascimento</label>
        <input
          id="f-birth"
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          value={f.birthDate}
          onChange={(e) => set("birthDate", maskDate(e.target.value))}
          required
          minLength={10}
          maxLength={10}
        />
        <p className="hint">Digite só os números — ex.: 15081990</p>
      </div>

      <div className="field">
        <label htmlFor="f-cpf">CPF</label>
        <input
          id="f-cpf"
          type="text"
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={f.cpf}
          onChange={(e) => set("cpf", maskCPF(e.target.value))}
          required
          minLength={14}
        />
      </div>

      <div className="field">
        <label htmlFor="f-phone">Telefone (com DDD)</label>
        <input
          id="f-phone"
          type="tel"
          autoComplete="tel-national"
          inputMode="numeric"
          placeholder="(44) 99999-9999"
          value={f.phone}
          onChange={(e) => set("phone", maskPhone(e.target.value))}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="f-shirt">Tamanho de camiseta</label>
        <select
          id="f-shirt"
          value={f.shirtSize}
          onChange={(e) => set("shirtSize", e.target.value)}
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

      {/* ---------- Contato de emergência ---------- */}
      <p style={sectionStyle}>Contato de um familiar</p>

      <div className="field">
        <label htmlFor="f-fam-name">Nome do familiar</label>
        <input
          id="f-fam-name"
          type="text"
          placeholder="Nome completo"
          value={f.familyName}
          onChange={(e) => set("familyName", e.target.value)}
          required
          maxLength={120}
        />
      </div>

      <div className="field">
        <label htmlFor="f-fam-rel">Parentesco</label>
        <input
          id="f-fam-rel"
          type="text"
          placeholder="Ex.: esposa, mãe, irmão"
          value={f.familyRelationship}
          onChange={(e) => set("familyRelationship", e.target.value)}
          required
          maxLength={60}
        />
      </div>

      <div className="field">
        <label htmlFor="f-fam-phone">Telefone do familiar</label>
        <input
          id="f-fam-phone"
          type="tel"
          inputMode="numeric"
          placeholder="(44) 99999-9999"
          value={f.familyPhone}
          onChange={(e) => set("familyPhone", maskPhone(e.target.value))}
          required
        />
      </div>

      {/* ---------- Saúde e hospedagem ---------- */}
      <p style={sectionStyle}>Saúde e hospedagem</p>

      <div className="field">
        <label htmlFor="f-med">Faz uso de medicamento?</label>
        <select
          id="f-med"
          value={f.usesMedication}
          onChange={(e) => set("usesMedication", e.target.value)}
          required
        >
          <option value="">Selecione…</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </div>

      {f.usesMedication === "sim" && (
        <div className="field">
          <label htmlFor="f-med-det">
            Qual(is) medicamento(s) e em quais horários?
          </label>
          <input
            id="f-med-det"
            type="text"
            placeholder="Ex.: Losartana 50mg — 8h e 20h"
            value={f.medicationDetails}
            onChange={(e) => set("medicationDetails", e.target.value)}
            required
            maxLength={300}
          />
        </div>
      )}

      <div className="field">
        <label htmlFor="f-stairs">Sobe escada?</label>
        <select
          id="f-stairs"
          value={f.climbsStairs}
          onChange={(e) => set("climbsStairs", e.target.value)}
          required
        >
          <option value="">Selecione…</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="f-bunk">Dorme na parte de cima do beliche?</label>
        <select
          id="f-bunk"
          value={f.sleepsTopBunk}
          onChange={(e) => set("sleepsTopBunk", e.target.value)}
          required
        >
          <option value="">Selecione…</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </div>

      {/* ---------- Igreja ---------- */}
      <p style={sectionStyle}>Sua igreja</p>

      <div className="field">
        <label htmlFor="f-gc">Quem é o seu líder de Célula?</label>
        <input
          id="f-gc"
          type="text"
          placeholder="Nome do líder da sua célula"
          value={f.gcLeader}
          onChange={(e) => set("gcLeader", e.target.value)}
          required
          maxLength={120}
        />
      </div>

      <div className="field">
        <label htmlFor="f-close-name">
          Alguém bem próximo a você na igreja
        </label>
        <input
          id="f-close-name"
          type="text"
          placeholder="Nome dessa pessoa"
          value={f.closePersonName}
          onChange={(e) => set("closePersonName", e.target.value)}
          required
          maxLength={120}
        />
      </div>

      <div className="field">
        <label htmlFor="f-close-phone">Telefone dessa pessoa</label>
        <input
          id="f-close-phone"
          type="tel"
          inputMode="numeric"
          placeholder="(44) 99999-9999"
          value={f.closePersonPhone}
          onChange={(e) => set("closePersonPhone", maskPhone(e.target.value))}
          required
        />
      </div>

      {/* ---------- Pagamento ---------- */}
      <p style={sectionStyle}>Pagamento</p>

      <div className="field">
        <label htmlFor="f-pay">Como você pretende pagar?</label>
        <select
          id="f-pay"
          value={f.paymentMethod}
          onChange={(e) => set("paymentMethod", e.target.value)}
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
        <label htmlFor="f-website">Não preencha este campo</label>
        <input
          id="f-website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="total-row">
        <span className="label">Valor da inscrição</span>
        <span className="value">{formatBRL(EVENT.price)}</span>
      </div>

      <button className="btn btn-block" type="submit" disabled={loading}>
        {loading ? "Enviando…" : "Confirmar inscrição"}
      </button>

      <p className="form-note">
        Sua vaga fica registrada na hora. O pagamento pode ser feito depois. 🔒
      </p>
    </form>
  );
}
