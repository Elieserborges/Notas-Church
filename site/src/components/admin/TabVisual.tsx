"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_THEME, THEME_FIELDS } from "@/lib/theme";
import { adminFetch } from "./api";
import type { EventData, Notify, RegisterSaver } from "./AdminShell";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function TabVisual({
  event,
  registerSaver,
  notify,
}: {
  event: EventData;
  registerSaver: RegisterSaver;
  notify: Notify;
}) {
  const [theme, setTheme] = useState<Record<string, string>>(() => ({
    ...DEFAULT_THEME,
    ...(event.theme ?? {}),
  }));

  const ref = useRef(theme);
  useEffect(() => {
    ref.current = theme;
  }, [theme]);

  useEffect(() => {
    registerSaver(async () => {
      // Só envia cores válidas (#rrggbb); o resto cai no padrão no site.
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(ref.current)) {
        if (HEX_RE.test(v)) clean[k] = v.toLowerCase();
      }
      const res = await adminFetch("/api/admin/config", {
        method: "PUT",
        body: JSON.stringify({ theme: clean }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify(json.error ?? "Não foi possível salvar.", "error");
        throw new Error(json.error ?? "save failed");
      }
      notify("Cores salvas — o site atualiza em até 30s");
    });
    return () => registerSaver(null);
  }, [registerSaver, notify]);

  function set(key: string, value: string) {
    setTheme((t) => ({ ...t, [key]: value }));
  }

  function restaurar() {
    setTheme({ ...DEFAULT_THEME });
    notify("Cores voltaram ao padrão — clique em Salvar para aplicar");
  }

  const val = (k: string) => theme[k] ?? DEFAULT_THEME[k] ?? "#000000";
  const safe = (k: string) => (HEX_RE.test(val(k)) ? val(k) : "#000000");

  return (
    <div className="a-visual">
      <div className="a-card">
        <div className="a-card-head">
          <h2>Cores do evento</h2>
          <p>Clique no quadradinho para escolher, ou digite o código (#rrggbb). Campo vazio usa o padrão.</p>
        </div>
        <div className="a-card-body">
          <div className="a-colors">
            {THEME_FIELDS.map((f) => (
              <div className="a-color" key={f.key}>
                <input
                  type="color"
                  value={safe(f.key)}
                  onChange={(e) => set(f.key, e.target.value)}
                  aria-label={f.label}
                />
                <div className="a-color-info">
                  <span className="a-color-lab">
                    {f.label}
                    {f.hint && <em> — {f.hint}</em>}
                  </span>
                  <input
                    className="a-color-txt"
                    value={val(f.key)}
                    onChange={(e) => set(f.key, e.target.value)}
                    spellCheck={false}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="a-visual-actions">
            <button className="a-btn a-btn-ghost" type="button" onClick={restaurar}>
              Restaurar padrão
            </button>
          </div>
        </div>
      </div>

      {/* Prévia ao vivo */}
      <div className="a-card">
        <div className="a-card-head">
          <h2>Prévia</h2>
          <p>Como as cores ficam no site (aproximado).</p>
        </div>
        <div className="a-card-body">
          <div className="a-preview" style={{ background: val("bg") }}>
            <h3 style={{ color: val("titles") }}>{event.slug === "face-a-face" ? "Face a Face" : "Seu evento"}</h3>
            <p style={{ color: val("textSoft") }}>
              Um encontro para viver momentos com Deus. Garanta sua vaga.
            </p>
            <div className="a-preview-row">
              <button className="a-preview-btn" style={{ background: val("primary") }}>
                Quero me inscrever
              </button>
              <span className="a-preview-tag" style={{ background: val("highlight"), color: val("titles") }}>
                Vagas abertas
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
