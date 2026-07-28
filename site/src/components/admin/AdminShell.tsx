"use client";

import { useCallback, useRef, useState } from "react";
import { TabGeral } from "./TabGeral";
import { TabLotes } from "./TabLotes";

export type EventData = {
  id: string;
  slug: string;
  status: string;
  info: Record<string, unknown>;
  theme: Record<string, string>;
  branding: Record<string, unknown>;
  integrations: Record<string, unknown>;
};

export type Notify = (msg: string, kind?: "ok" | "error") => void;
export type RegisterSaver = (fn: null | (() => Promise<void>)) => void;

type TabId = "geral" | "lotes" | "visual" | "imagens" | "integra" | "status";

const TABS: { id: TabId; label: string; crumb: string; title: string; ready?: boolean }[] = [
  { id: "geral", label: "Geral", crumb: "Configurações · Geral", title: "Informações gerais", ready: true },
  { id: "lotes", label: "Lotes & Preços", crumb: "Configurações · Lotes & Preços", title: "Lotes & preços", ready: true },
  { id: "visual", label: "Identidade Visual", crumb: "Configurações · Identidade Visual", title: "Identidade visual" },
  { id: "imagens", label: "Imagens", crumb: "Configurações · Imagens", title: "Imagens" },
  { id: "integra", label: "Integrações", crumb: "Configurações · Integrações", title: "Integrações" },
  { id: "status", label: "Status & Preview", crumb: "Configurações · Status", title: "Status & preview" },
];

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  coming_soon: "Em breve",
  closed: "Encerrado",
};

function Icon({ id }: { id: TabId }) {
  const common = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 } as const;
  switch (id) {
    case "geral": return <svg {...common}><path d="M4 5h16M4 12h16M4 19h10" /></svg>;
    case "lotes": return <svg {...common}><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 12l9 4 9-4M3 17l9 4 9-4" /></svg>;
    case "visual": return <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="8.5" cy="10" r="1.3" fill="currentColor" stroke="none" /><circle cx="15.5" cy="10" r="1.3" fill="currentColor" stroke="none" /></svg>;
    case "imagens": return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 15l5-4 4 3 3-2 6 5" /></svg>;
    case "integra": return <svg {...common}><path d="M9 7V5a3 3 0 0 1 6 0v2" /><rect x="4" y="7" width="16" height="13" rx="2" /></svg>;
    case "status": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>;
  }
}

export function AdminShell({
  email,
  event,
  onSignOut,
}: {
  email: string;
  event: EventData;
  onSignOut: () => void;
}) {
  const [tab, setTab] = useState<TabId>("geral");
  const [saving, setSaving] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "error" } | null>(null);
  const saverRef = useRef<null | (() => Promise<void>)>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify: Notify = useCallback((msg, kind = "ok") => {
    setToast({ msg, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const registerSaver: RegisterSaver = useCallback((fn) => {
    saverRef.current = fn;
    setCanSave(!!fn);
  }, []);

  async function salvar() {
    if (!saverRef.current) return;
    setSaving(true);
    try {
      await saverRef.current();
    } finally {
      setSaving(false);
    }
  }

  const meta = TABS.find((t) => t.id === tab)!;
  const initial = (email.trim()[0] || "?").toUpperCase();

  return (
    <div className="admin-scope">
      <div className="a-app">
        <aside className="a-side">
          <div className="a-brand">
            <div className="a-mark">F</div>
            <div className="a-who"><b>Face a Face</b><span>Painel do evento</span></div>
          </div>
          <div className="a-nav-label">Configurações</div>
          <nav className="a-nav">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={t.id === tab ? "active" : ""}
                onClick={() => setTab(t.id)}
                type="button"
              >
                <Icon id={t.id} />
                {t.label}
                {t.ready && <span className="a-dot" />}
              </button>
            ))}
          </nav>
          <div className="a-side-foot">
            <div className="a-env">Evento atual: <b>{event.slug}</b></div>
            <button className="a-link" type="button" onClick={onSignOut}>Sair</button>
          </div>
        </aside>

        <div className="a-main">
          <header className="a-topbar">
            <div className="a-h">
              <span className="a-crumbs">{meta.crumb}</span>
              <h1>{meta.title}</h1>
            </div>
            <span className={`a-pill a-pill-${event.status}`}>
              <span className="a-led" /> {STATUS_LABEL[event.status] ?? event.status}
            </span>
            <div className="a-spacer" />
            <div className="a-admin-chip"><span className="a-av">{initial}</span> {email}</div>
            {canSave && (
              <button className="a-btn a-btn-save" onClick={salvar} disabled={saving} type="button">
                {saving ? "Salvando…" : "Salvar alterações"}
              </button>
            )}
          </header>

          <div className="a-content">
            {tab === "geral" && (
              <TabGeral event={event} registerSaver={registerSaver} notify={notify} />
            )}
            {tab === "lotes" && <TabLotes notify={notify} />}

            {tab === "visual" && <Placeholder title="Identidade Visual" desc="Cores do evento com preview ao vivo." body="Color pickers para as cores primária, títulos, fundo e destaque — com prévia instantânea." />}
            {tab === "imagens" && <Placeholder title="Imagens" desc="Logo, banner, favicon e galeria." body="Upload direto para o armazenamento do Supabase, com recorte e reordenação." />}
            {tab === "integra" && <Placeholder title="Integrações" desc="Mercado Pago e sincronização." body="Access Token (guardado criptografado, exibido como •••• 4821), Public Key e URL de webhook." />}
            {tab === "status" && <Placeholder title="Status & Preview" desc="Ativo · Em Breve · Encerrado." body="Um toggle que troca o site para a página “Em Breve” com captura de leads, sem liberar a compra." />}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`a-toast ${toast.kind === "error" ? "a-toast-err" : ""}`}>
          <span className="a-check">{toast.kind === "error" ? "!" : "✓"}</span> {toast.msg}
        </div>
      )}
    </div>
  );
}

function Placeholder({ title, desc, body }: { title: string; desc: string; body: string }) {
  return (
    <div className="a-card a-soon">
      <div className="a-card-head"><h2>{title}</h2><p>{desc}</p></div>
      <div className="a-card-body"><span className="a-badge">Próxima etapa</span> {body}</div>
    </div>
  );
}
