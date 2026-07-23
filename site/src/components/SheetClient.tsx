"use client";

import { useCallback, useEffect, useState } from "react";
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
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
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

const STATUS_LABEL: Record<string, string> = {
  approved: "Pago",
  pending: "Pendente",
  rejected: "Recusado",
};

export function SheetClient() {
  const [pin, setPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [orders, setOrders] = useState<SheetOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

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

  function downloadCSV() {
    if (!orders) return;
    const header = [
      "Nome",
      "E-mail",
      "WhatsApp",
      "Qtd ingressos",
      "Status pagamento",
      "Valor",
      "Data da compra",
      "Códigos",
      "Entradas confirmadas",
    ];
    const lines = orders.map((o) =>
      [
        o.name,
        o.email,
        fmtPhone(o.phone),
        String(o.quantity),
        STATUS_LABEL[o.status] ?? o.status,
        String(o.total).replace(".", ","),
        fmtDate(o.created_at),
        o.tickets.map((t) => t.code).join(" "),
        String(o.tickets.filter((t) => t.used_at).length),
      ]
        .map((v) => `"${v.replaceAll('"', '""')}"`)
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

  const approved = (orders ?? []).filter((o) => o.status === "approved");
  const paidPeople = approved.reduce((s, o) => s + o.quantity, 0);
  const enteredCount = (orders ?? []).reduce(
    (s, o) => s + o.tickets.filter((t) => t.used_at).length,
    0
  );
  const pendingCount = (orders ?? []).filter((o) => o.status === "pending").length;
  const revenue = approved.reduce((s, o) => s + o.total, 0);

  const term = fold(filter);
  const visible = (orders ?? []).filter(
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
          <span className="stat-label">🎟️ Pagantes</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{enteredCount}</span>
          <span className="stat-label">✅ Já entraram</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{pendingCount}</span>
          <span className="stat-label">⏳ Pendentes</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatBRL(revenue)}</span>
          <span className="stat-label">💰 Arrecadado</span>
        </div>
      </div>

      <div className="sheet-toolbar">
        <input
          type="search"
          placeholder="Filtrar por nome ou e-mail…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filtrar inscritos"
        />
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
          {orders.length === 0
            ? "Nenhuma inscrição ainda. Assim que alguém comprar, aparece aqui."
            : "Nenhum resultado para esse filtro."}
        </p>
      ) : (
        <div className="sheet-table-wrap">
          <table className="sheet-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>WhatsApp</th>
                <th>Qtd</th>
                <th>Pagamento</th>
                <th>Ingressos</th>
                <th>Valor</th>
                <th>Compra</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => (
                <tr key={o.id}>
                  <td>
                    <span className="cell-name">{o.name}</span>
                    <span className="cell-email">{o.email}</span>
                  </td>
                  <td className="nowrap">{fmtPhone(o.phone)}</td>
                  <td>{o.quantity}</td>
                  <td>
                    <span className={`pay-chip pay-${o.status}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td>
                    {o.tickets.length === 0 ? (
                      <span className="cell-email">—</span>
                    ) : (
                      o.tickets.map((t) => (
                        <span
                          className={`code-chip ${t.used_at ? "code-used" : ""}`}
                          key={t.code}
                          title={t.used_at ? "Entrada confirmada" : "Ainda não entrou"}
                        >
                          {t.used_at ? "✓ " : ""}
                          {t.code}
                        </span>
                      ))
                    )}
                  </td>
                  <td className="nowrap">{formatBRL(o.total)}</td>
                  <td className="nowrap">{fmtDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="sheet-foot">
        A lista atualiza sozinha a cada minuto. “✓” no ingresso = entrada já
        confirmada na portaria.
      </p>
      <p className="team-links">
        <a href="/validar">🎟️ Ir para a validação de ingressos</a>
      </p>
    </div>
  );
}
