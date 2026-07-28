"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "./api";
import type { Notify } from "./AdminShell";

type Tier = {
  id?: string;
  kind: string;
  name: string;
  price: number;
  qty_available: number | null;
  qty_sold?: number;
  status: string;
  _key: string; // chave local estável (para linhas ainda sem id)
  _saving?: boolean;
};

const KINDS = [
  { v: "participante", l: "Participante" },
  { v: "obreiro", l: "Obreiro" },
  { v: "obreiro_camiseta", l: "Obreiro + camiseta" },
  { v: "custom", l: "Outro" },
];
const STATUSES = [
  { v: "active", l: "Ativo" },
  { v: "sold_out", l: "Esgotado" },
  { v: "hidden", l: "Oculto" },
];

let seq = 0;
const newKey = () => `tmp-${seq++}`;

export function TabLotes({ notify }: { notify: Notify }) {
  const [tiers, setTiers] = useState<Tier[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch("/api/admin/tiers");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Falha ao carregar.");
        setTiers(
          (json.tiers as Record<string, unknown>[]).map((t) => ({
            id: t.id as string,
            kind: (t.kind as string) ?? "custom",
            name: (t.name as string) ?? "",
            price: Number(t.price) || 0,
            qty_available: (t.qty_available as number | null) ?? null,
            qty_sold: (t.qty_sold as number) ?? 0,
            status: (t.status as string) ?? "active",
            _key: (t.id as string) ?? newKey(),
          }))
        );
      } catch (e) {
        notify(e instanceof Error ? e.message : "Erro ao carregar.", "error");
        setTiers([]);
      }
    })();
  }, [notify]);

  function patch(key: string, campo: Partial<Tier>) {
    setTiers((ts) => (ts ?? []).map((t) => (t._key === key ? { ...t, ...campo } : t)));
  }

  function adicionar() {
    setTiers((ts) => [
      ...(ts ?? []),
      { kind: "participante", name: "", price: 0, qty_available: null, status: "active", _key: newKey() },
    ]);
  }

  async function salvarLinha(t: Tier) {
    if (!t.name.trim()) {
      notify("Dê um nome ao lote antes de salvar.", "error");
      return;
    }
    patch(t._key, { _saving: true });
    const payload = {
      id: t.id,
      kind: t.kind,
      name: t.name,
      price: t.price,
      qty_available: t.qty_available,
      status: t.status,
    };
    try {
      const res = await adminFetch("/api/admin/tiers", {
        method: t.id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Falha ao salvar.");
      const saved = json.tier as Record<string, unknown>;
      setTiers((ts) =>
        (ts ?? []).map((x) =>
          x._key === t._key
            ? {
                ...x,
                id: saved.id as string,
                qty_sold: (saved.qty_sold as number) ?? 0,
                _saving: false,
              }
            : x
        )
      );
      notify("Lote salvo");
    } catch (e) {
      patch(t._key, { _saving: false });
      notify(e instanceof Error ? e.message : "Erro ao salvar.", "error");
    }
  }

  async function excluir(t: Tier) {
    if (!t.id) {
      setTiers((ts) => (ts ?? []).filter((x) => x._key !== t._key));
      return;
    }
    if (!window.confirm(`Excluir o lote "${t.name}"?`)) return;
    try {
      const res = await adminFetch(`/api/admin/tiers?id=${encodeURIComponent(t.id)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Falha ao excluir.");
      setTiers((ts) => (ts ?? []).filter((x) => x._key !== t._key));
      notify("Lote excluído");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Erro ao excluir.", "error");
    }
  }

  if (tiers === null) {
    return (
      <div className="a-card">
        <div className="a-card-body"><div className="admin-spinner" /></div>
      </div>
    );
  }

  const ativos = tiers.filter((t) => t.status === "active").length;
  const vendidos = tiers.reduce((s, t) => s + (t.qty_sold ?? 0), 0);

  return (
    <div className="a-card">
      <div className="a-card-head">
        <h2>Lotes &amp; preços</h2>
        <p>Cada lote define um valor de inscrição. Edite e clique em salvar na própria linha.</p>
      </div>

      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Lote</th><th>Tipo</th><th>Valor (R$)</th><th>Disponível</th>
              <th>Vendidos</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {tiers.length === 0 && (
              <tr><td colSpan={7} className="a-empty">Nenhum lote ainda. Clique em “Adicionar lote”.</td></tr>
            )}
            {tiers.map((t) => (
              <tr key={t._key}>
                <td>
                  <input className="a-cell" value={t.name} placeholder="Nome do lote"
                    onChange={(e) => patch(t._key, { name: e.target.value })} />
                </td>
                <td>
                  <select className="a-cell" value={t.kind} onChange={(e) => patch(t._key, { kind: e.target.value })}>
                    {KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
                  </select>
                </td>
                <td>
                  <input className="a-cell a-num" type="number" min={0} step="0.01" value={t.price}
                    onChange={(e) => patch(t._key, { price: Number(e.target.value) })} />
                </td>
                <td>
                  <input className="a-cell a-num" type="number" min={0} placeholder="∞"
                    value={t.qty_available ?? ""}
                    onChange={(e) => patch(t._key, { qty_available: e.target.value === "" ? null : Number(e.target.value) })} />
                </td>
                <td className="a-qty">{t.qty_sold ?? 0}</td>
                <td>
                  <select className="a-cell" value={t.status} onChange={(e) => patch(t._key, { status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </td>
                <td>
                  <div className="a-row-actions">
                    <button className="a-btn a-btn-save a-sm" onClick={() => salvarLinha(t)} disabled={t._saving} type="button">
                      {t._saving ? "…" : t.id ? "Salvar" : "Criar"}
                    </button>
                    <button className="a-icon-btn" title="Excluir" onClick={() => excluir(t)} type="button">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="a-add-row">
        <button className="a-btn a-btn-ghost" onClick={adicionar} type="button">+ Adicionar lote</button>
      </div>

      <div className="a-lotes-foot">
        <span>Lotes ativos: <b>{ativos}</b></span>
        <span>Inscrições vendidas: <b>{vendidos}</b></span>
      </div>
    </div>
  );
}
