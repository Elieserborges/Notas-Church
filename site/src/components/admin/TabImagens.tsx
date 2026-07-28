"use client";

import { useRef, useState } from "react";
import { sessionToken } from "./api";
import type { EventData, Notify } from "./AdminShell";

const CAMPOS = [
  { kind: "logo", label: "Logo", hint: "usado em e-mails/marca (opcional)" },
  { kind: "banner", label: "Banner principal", hint: "a arte grande da home e do compartilhamento" },
  { kind: "favicon", label: "Favicon", hint: "ícone da aba do navegador (quadrado)" },
  { kind: "background", label: "Fundo", hint: "imagem de fundo (opcional)" },
];

export function TabImagens({ event, notify }: { event: EventData; notify: Notify }) {
  const initial: Record<string, string> = {};
  for (const c of CAMPOS) {
    const v = (event.branding ?? {})[c.kind];
    if (typeof v === "string") initial[c.kind] = v;
  }
  const [urls, setUrls] = useState<Record<string, string>>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function enviar(kind: string, file: File) {
    setBusy(kind);
    try {
      const token = await sessionToken();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Falha no upload.");
      setUrls((u) => ({ ...u, [kind]: j.url }));
      notify("Imagem enviada — o site atualiza em até 30s");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Erro ao enviar.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function remover(kind: string) {
    setBusy(kind);
    try {
      const token = await sessionToken();
      const res = await fetch(`/api/admin/media?kind=${kind}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Falha ao remover.");
      setUrls((u) => {
        const n = { ...u };
        delete n[kind];
        return n;
      });
      notify("Imagem removida — voltou ao padrão do site");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Erro ao remover.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="a-card">
      <div className="a-card-head">
        <h2>Imagens</h2>
        <p>Envie PNG, JPG, WEBP ou SVG (até 5 MB). Sem imagem, o site usa a arte padrão.</p>
      </div>
      <div className="a-card-body">
        <div className="a-media-grid">
          {CAMPOS.map((c) => (
            <div className="a-media" key={c.kind}>
              <div className="a-media-preview">
                {urls[c.kind] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[c.kind]} alt={c.label} />
                ) : (
                  <span className="a-media-empty">sem imagem</span>
                )}
              </div>
              <div className="a-media-info">
                <span className="a-media-lab">{c.label}</span>
                <span className="a-media-hint">{c.hint}</span>
                <div className="a-media-actions">
                  <input
                    ref={(el) => {
                      inputs.current[c.kind] = el;
                    }}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/gif"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) enviar(c.kind, f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    className="a-btn a-btn-ghost a-sm"
                    type="button"
                    disabled={busy === c.kind}
                    onClick={() => inputs.current[c.kind]?.click()}
                  >
                    {busy === c.kind ? "Enviando…" : urls[c.kind] ? "Trocar" : "Enviar"}
                  </button>
                  {urls[c.kind] && (
                    <button
                      className="a-icon-btn"
                      type="button"
                      title="Remover"
                      disabled={busy === c.kind}
                      onClick={() => remover(c.kind)}
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
