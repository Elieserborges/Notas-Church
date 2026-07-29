"use client";

import { useState } from "react";
import { adminFetch } from "./api";
import type { Notify } from "./AdminShell";

const OPTS = [
  { v: "active", label: "Ativo", desc: "Site normal, inscrições abertas.", emoji: "🟢" },
  { v: "coming_soon", label: "Em breve", desc: "Mostra a landing de captura de leads. Compra bloqueada.", emoji: "🟡" },
  { v: "closed", label: "Encerrado", desc: "Avisa que as inscrições encerraram. Compra bloqueada.", emoji: "🔴" },
];

export function TabStatus({
  current,
  notify,
  onChanged,
}: {
  current: string;
  notify: Notify;
  onChanged: (s: string) => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);

  async function escolher(v: string) {
    if (v === current || saving) return;
    setSaving(v);
    try {
      const res = await adminFetch("/api/admin/config", {
        method: "PUT",
        body: JSON.stringify({ status: v }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Falha ao salvar.");
      onChanged(v);
      notify("Status atualizado — o site reflete em até 30s");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Erro ao salvar.", "error");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="a-card">
      <div className="a-card-head">
        <h2>Status do evento</h2>
        <p>Controla o que o público vê no site. Muda na hora (até 30s de cache).</p>
      </div>
      <div className="a-card-body">
        <div className="a-status-opts">
          {OPTS.map((o) => (
            <button
              key={o.v}
              type="button"
              className={`a-status-opt${current === o.v ? " active" : ""}`}
              onClick={() => escolher(o.v)}
              disabled={!!saving}
            >
              <span className="a-status-emoji">{o.emoji}</span>
              <span className="a-status-txt">
                <b>{o.label}</b>
                <em>{o.desc}</em>
              </span>
              {saving === o.v ? (
                <span className="a-status-badge">Salvando…</span>
              ) : current === o.v ? (
                <span className="a-status-badge">Atual</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
