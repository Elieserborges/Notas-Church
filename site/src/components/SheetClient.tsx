"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { EVENT, formatBRL } from "@/lib/event";

type SheetOrder = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  quantity: number;
  total: number;
  status: string;
  tipo: string;
  birth_date: string | null;
  cpf: string | null;
  shirt_size: string | null;
  family_name: string | null;
  family_relationship: string | null;
  family_phone: string | null;
  payment_method: string | null;
  uses_medication: boolean | null;
  medication_details: string | null;
  climbs_stairs: boolean | null;
  sleeps_top_bunk: boolean | null;
  gc_leader: string | null;
  close_person_name: string | null;
  close_person_phone: string | null;
  goes_by_car: boolean | null;
  tickets: { code: string; used_at: string | null }[];
};

const PIN_KEY = "curame_pin";

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function fmtPhone(d: string): string {
  if (!d) return "—";
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

function fmtCPF(d: string | null): string {
  if (!d) return "—";
  if (d.length !== 11) return d;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtBirth(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return y && m && day ? `${day}/${m}/${y}` : d;
}

function simNao(v: boolean | null): string {
  return v === true ? "Sim" : v === false ? "Não" : "—";
}

const STATUS_LABEL: Record<string, string> = {
  approved: "Pago",
  pending: "Pendente",
  rejected: "Recusado",
};

const PAY_LABEL: Record<string, string> = {
  pix: "PIX",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
};

/** Valor líquido estimado: desconta a taxa do Mercado Pago pela forma. */
const liquidoDe = (total: number, metodo: string | null) =>
  total * (1 - (EVENT.mpFees[metodo ?? ""] ?? 0));

const dash = (v: string | null) => (v && v.trim() ? v : "—");

type StatusFilter = "todos" | "pending" | "approved";
type TipoFilter = "todos" | "participante" | "obreiro";

const TIPO_LABEL: Record<string, string> = {
  participante: "Participante",
  obreiro: "Obreiro",
};

const selectStyle: React.CSSProperties = {
  border: "1.5px solid #eadbc8",
  borderRadius: 12,
  padding: "9px 12px",
  background: "var(--cream)",
  font: "inherit",
  color: "inherit",
};

export function SheetClient() {
  const [pin, setPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [orders, setOrders] = useState<SheetOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("todos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [marcando, setMarcando] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const load = useCallback(async (thePin: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: thePin }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        sessionStorage.removeItem(PIN_KEY);
        setPin(null);
        setError("PIN incorreto. Entre novamente.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Não foi possível carregar.");
        return;
      }
      setOrders(data.orders ?? []);
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(PIN_KEY);
    setPin(saved);
    if (saved) load(saved);
  }, [load]);

  // Atualiza sozinho a cada 60s enquanto a página estiver aberta
  useEffect(() => {
    if (!pin) return;
    const t = setInterval(() => load(pin), 60_000);
    return () => clearInterval(t);
  }, [pin, load]);

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = pinInput.trim();
    if (!value) return;
    sessionStorage.setItem(PIN_KEY, value);
    setPin(value);
    setPinInput("");
    load(value);
  }

  /** Confirma na mão um pagamento em dinheiro/Pix direto com a equipe. */
  async function marcarComoPago(o: SheetOrder) {
    if (!pin) return;
    const ok = window.confirm(
      `Confirmar o pagamento de ${o.name}?\n\n` +
        `Isso marca a inscrição como PAGA, gera o ingresso e envia o ` +
        `e-mail com o QR Code para ${o.email}.`
    );
    if (!ok) return;
    setMarcando(o.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, orderId: o.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível confirmar.");
      await load(pin);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao confirmar o pagamento."
      );
    } finally {
      setMarcando(null);
    }
  }

  /** Apaga uma inscrição (desistência, cadastro duplicado etc.). */
  async function excluirInscricao(o: SheetOrder) {
    if (!pin) return;
    const ok = window.confirm(
      `Excluir a inscrição de ${o.name}?\n\n` +
        `O registro é apagado de vez e não dá para desfazer.`
    );
    if (!ok) return;
    setExcluindo(o.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, orderId: o.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível excluir.");
      await load(pin);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir a inscrição.");
    } finally {
      setExcluindo(null);
    }
  }

  function downloadCSV() {
    if (!orders) return;
    const header = [
      "Nome",
      "Tipo",
      "E-mail",
      "Telefone",
      "Data de nascimento",
      "CPF",
      "Camiseta",
      "Forma de pagamento",
      "Status pagamento",
      "Valor",
      "Valor liquido (est.)",
      "Familiar - nome",
      "Familiar - parentesco",
      "Familiar - telefone",
      "Usa medicamento",
      "Medicamentos e horarios",
      "Sobe escada",
      "Dorme em cima do beliche",
      "Lider de Celula",
      "Vai de carro",
      "Pessoa proxima - nome",
      "Pessoa proxima - telefone",
      "Data da inscricao",
      "Codigos",
      "Entradas confirmadas",
    ];
    const lines = orders.map((o) =>
      [
        o.name,
        TIPO_LABEL[o.tipo || "participante"] ?? o.tipo,
        o.email,
        fmtPhone(o.phone),
        fmtBirth(o.birth_date),
        fmtCPF(o.cpf),
        dash(o.shirt_size),
        o.payment_method ? (PAY_LABEL[o.payment_method] ?? o.payment_method) : "—",
        STATUS_LABEL[o.status] ?? o.status,
        String(o.total).replace(".", ","),
        liquidoDe(o.total, o.payment_method).toFixed(2).replace(".", ","),
        dash(o.family_name),
        dash(o.family_relationship),
        fmtPhone(o.family_phone ?? ""),
        simNao(o.uses_medication),
        dash(o.medication_details),
        simNao(o.climbs_stairs),
        simNao(o.sleeps_top_bunk),
        dash(o.gc_leader),
        simNao(o.goes_by_car),
        dash(o.close_person_name),
        fmtPhone(o.close_person_phone ?? ""),
        fmtDate(o.created_at),
        o.tickets.map((t) => t.code).join(" "),
        String(o.tickets.filter((t) => t.used_at).length),
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(";")
    );
    // BOM + ponto-e-vírgula → abre certinho no Excel brasileiro
    const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${EVENT.slug}-inscritos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ---- Tela de PIN -------------------------------------------------
  if (!pin) {
    return (
      <div className="validate-card">
        <form className="form-card" onSubmit={handlePinSubmit}>
          <p className="form-title">Planilha · {EVENT.name}</p>
          <p className="form-sub">
            Área da equipe. Digite o PIN para ver os inscritos.
          </p>
          {error && <p className="form-error">{error}</p>}
          <div className="field">
            <label htmlFor="s-pin">PIN da equipe</label>
            <input
              id="s-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="••••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-block" type="submit">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  const todas = orders ?? [];
  const tipoDe = (o: SheetOrder) => o.tipo || "participante";
  // Os números do topo seguem o filtro de tipo: escolher "Obreiros"
  // mostra os totais só dos obreiros.
  const all = todas.filter(
    (o) => tipoFilter === "todos" || tipoDe(o) === tipoFilter
  );
  const qtdParticipantes = todas.filter(
    (o) => tipoDe(o) === "participante"
  ).length;
  const qtdObreiros = todas.filter((o) => tipoDe(o) === "obreiro").length;
  const approved = all.filter((o) => o.status === "approved");
  const pending = all.filter((o) => o.status === "pending");
  const paidPeople = approved.length;
  const enteredCount = all.reduce(
    (s, o) => s + o.tickets.filter((t) => t.used_at).length,
    0
  );
  const recebidoLiq = approved.reduce((s, o) => s + liquidoDe(o.total, o.payment_method), 0);
  const recebidoBruto = approved.reduce((s, o) => s + o.total, 0);
  const aReceberLiq = pending.reduce((s, o) => s + liquidoDe(o.total, o.payment_method), 0);
  const aReceberBruto = pending.reduce((s, o) => s + o.total, 0);

  const term = fold(filter);
  const visible = all
    .filter((o) => statusFilter === "todos" || o.status === statusFilter)
    .filter(
      (o) => !term || fold(o.name).includes(term) || fold(o.email).includes(term)
    );

  return (
    <div className="sheet-wrap">
      <div className="v-topbar">
        <strong style={{ color: "var(--brown-dark)" }}>
          📋 Inscritos · {EVENT.name}
        </strong>
        <button
          className="link-btn"
          type="button"
          onClick={() => {
            sessionStorage.removeItem(PIN_KEY);
            setPin(null);
            setOrders(null);
          }}
        >
          Sair
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{paidPeople}</span>
          <span className="stat-label">✅ Pagos</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{pending.length}</span>
          <span className="stat-label">⏳ Aguardando pagamento</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatBRL(recebidoLiq)}</span>
          <span className="stat-label">💰 Recebido (líquido)</span>
          <span style={{ fontSize: 11.5, color: "var(--brown)", marginTop: 3 }}>
            bruto {formatBRL(recebidoBruto)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatBRL(aReceberLiq)}</span>
          <span className="stat-label">📌 A receber (líquido)</span>
          <span style={{ fontSize: 11.5, color: "var(--brown)", marginTop: 3 }}>
            bruto {formatBRL(aReceberBruto)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{enteredCount}</span>
          <span className="stat-label">🚪 Já entraram</span>
        </div>
      </div>

      <p
        style={{
          fontSize: 12,
          color: "var(--brown)",
          margin: "0 2px 14px",
          lineHeight: 1.5,
        }}
      >
        💡 <strong>Líquido</strong> = já com as taxas do Mercado Pago descontadas
        (PIX 0,99% · Cartão 4,98% · Dinheiro sem taxa), estimado pela forma de
        pagamento escolhida.
      </p>

      <div className="sheet-toolbar">
        <input
          type="search"
          placeholder="Filtrar por nome ou e-mail…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filtrar inscritos"
        />
        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value as TipoFilter)}
          aria-label="Filtrar por tipo de inscrição"
          style={selectStyle}
        >
          <option value="todos">Todos os tipos ({todas.length})</option>
          <option value="participante">
            Participantes ({qtdParticipantes})
          </option>
          <option value="obreiro">Obreiros ({qtdObreiros})</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="Filtrar por situação do pagamento"
          style={selectStyle}
        >
          <option value="todos">Todos ({all.length})</option>
          <option value="pending">
            Só quem falta pagar ({pending.length})
          </option>
          <option value="approved">Só quem já pagou ({approved.length})</option>
        </select>
        <button
          className="btn btn-sm btn-outline"
          type="button"
          onClick={() => load(pin)}
          disabled={loading}
        >
          {loading ? "Atualizando…" : "🔄 Atualizar"}
        </button>
        <button className="btn btn-sm" type="button" onClick={downloadCSV}>
          ⬇ Baixar planilha
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {orders === null ? (
        <div className="spinner" />
      ) : visible.length === 0 ? (
        <p className="sheet-empty">
          {all.length === 0
            ? "Nenhuma inscrição ainda. Assim que alguém se inscrever, aparece aqui."
            : "Nenhum resultado para esse filtro."}
        </p>
      ) : (
        <div className="sheet-table-wrap">
          <table className="sheet-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Telefone</th>
                <th>Camiseta</th>
                <th>Forma</th>
                <th>Pagamento</th>
                <th>Ingressos</th>
                <th>Inscrição</th>
                <th>Ficha</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => (
                <Fragment key={o.id}>
                  <tr>
                    <td>
                      <span className="cell-name">{o.name}</span>
                      <span className="cell-email">{o.email}</span>
                    </td>
                    <td className="nowrap">
                      {TIPO_LABEL[tipoDe(o)] ?? tipoDe(o)}
                    </td>
                    <td className="nowrap">{fmtPhone(o.phone)}</td>
                    <td>{dash(o.shirt_size)}</td>
                    <td className="nowrap">
                      {o.payment_method
                        ? (PAY_LABEL[o.payment_method] ?? o.payment_method)
                        : "—"}
                    </td>
                    <td>
                      <span className={`pay-chip pay-${o.status}`}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                      {o.status === "pending" && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: 6,
                            marginTop: 8,
                          }}
                        >
                          {o.payment_method === "dinheiro" && (
                            <button
                              type="button"
                              className="sheet-action sheet-action--pagar"
                              onClick={() => marcarComoPago(o)}
                              disabled={marcando === o.id || excluindo === o.id}
                            >
                              {marcando === o.id
                                ? "confirmando…"
                                : "✓ Confirmar pagamento"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="sheet-action sheet-action--excluir"
                            onClick={() => excluirInscricao(o)}
                            disabled={marcando === o.id || excluindo === o.id}
                          >
                            {excluindo === o.id ? "excluindo…" : "🗑 Excluir"}
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      {o.tickets.length === 0 ? (
                        <span className="cell-email">—</span>
                      ) : (
                        o.tickets.map((t) => (
                          <span
                            className={`code-chip ${t.used_at ? "code-used" : ""}`}
                            key={t.code}
                            title={
                              t.used_at ? "Entrada confirmada" : "Ainda não entrou"
                            }
                          >
                            {t.used_at ? "✓ " : ""}
                            {t.code}
                          </span>
                        ))
                      )}
                    </td>
                    <td className="nowrap">{fmtDate(o.created_at)}</td>
                    <td>
                      <button
                        className="sheet-action"
                        type="button"
                        onClick={() =>
                          setExpanded(expanded === o.id ? null : o.id)
                        }
                      >
                        {expanded === o.id ? "Fechar" : "Ver"}
                      </button>
                    </td>
                  </tr>
                  {expanded === o.id && (
                    <tr>
                      <td colSpan={9}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: "10px 22px",
                            padding: "12px 4px 16px",
                            fontSize: 14,
                            lineHeight: 1.6,
                          }}
                        >
                          <div>
                            <strong>Nascimento:</strong> {fmtBirth(o.birth_date)}
                          </div>
                          <div>
                            <strong>CPF:</strong> {fmtCPF(o.cpf)}
                          </div>
                          <div>
                            <strong>Familiar:</strong> {dash(o.family_name)}
                            {o.family_relationship
                              ? ` (${o.family_relationship})`
                              : ""}{" "}
                            — {fmtPhone(o.family_phone ?? "")}
                          </div>
                          <div>
                            <strong>Usa medicamento:</strong>{" "}
                            {simNao(o.uses_medication)}
                            {o.uses_medication && o.medication_details
                              ? ` — ${o.medication_details}`
                              : ""}
                          </div>
                          <div>
                            <strong>Sobe escada:</strong> {simNao(o.climbs_stairs)}
                          </div>
                          <div>
                            <strong>Beliche de cima:</strong>{" "}
                            {simNao(o.sleeps_top_bunk)}
                          </div>
                          <div>
                            <strong>Líder de Célula:</strong>{" "}
                            {dash(o.gc_leader)}
                          </div>
                          <div>
                            <strong>Vai de carro:</strong>{" "}
                            {simNao(o.goes_by_car)}
                          </div>
                          <div>
                            <strong>Pessoa próxima:</strong>{" "}
                            {dash(o.close_person_name)} —{" "}
                            {fmtPhone(o.close_person_phone ?? "")}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="sheet-foot">
        A lista atualiza sozinha a cada minuto. “✓” no ingresso = entrada já
        confirmada na portaria. Clique em <strong>Ver</strong> para abrir a
        ficha completa da pessoa.
      </p>
      <p className="team-links">
        <a href="/validar">🎟️ Ir para a validação de ingressos</a>
      </p>
    </div>
  );
}
