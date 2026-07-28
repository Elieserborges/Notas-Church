"use client";

import { useEffect, useRef, useState } from "react";
import { EVENT } from "@/lib/event";
import { adminFetch } from "./api";
import type { EventData, Notify, RegisterSaver } from "./AdminShell";

type Field = { key: string; label: string; wide?: boolean; hint?: string; prefix?: string };

const IDENT: Field[] = [
  { key: "name", label: "Nome do evento" },
  { key: "church", label: "Igreja" },
  { key: "tagline", label: "Tagline", wide: true },
  { key: "audience", label: "Público" },
  { key: "supportWhatsapp", label: "WhatsApp de suporte", prefix: "+" },
];

const QUANDO: Field[] = [
  { key: "isoStart", label: "Início (ISO)", hint: "usado na contagem — ex.: 2026-08-15T19:00:00-03:00" },
  { key: "isoEnd", label: "Término (ISO)" },
  { key: "dateLabel", label: "Data (texto exibido)" },
  { key: "timeLabel", label: "Horário (texto exibido)" },
  { key: "addressLabel", label: "Local" },
  { key: "mapsUrl", label: "Link do mapa", hint: "vazio esconde o botão" },
  { key: "registrationDeadlineLabel", label: "Prazo final das inscrições" },
];

const ALL_KEYS = [...IDENT, ...QUANDO].map((f) => f.key);

function defaultOf(key: string): string {
  const v = (EVENT as Record<string, unknown>)[key];
  return v == null ? "" : String(v);
}

export function TabGeral({
  event,
  registerSaver,
  notify,
}: {
  event: EventData;
  registerSaver: RegisterSaver;
  notify: Notify;
}) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const info = event.info ?? {};
    const seed: Record<string, string> = {};
    for (const k of ALL_KEYS) {
      const v = info[k];
      seed[k] = typeof v === "string" ? v : "";
    }
    return seed;
  });

  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    registerSaver(async () => {
      const res = await adminFetch("/api/admin/config", {
        method: "PUT",
        body: JSON.stringify({ info: formRef.current }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify(json.error ?? "Não foi possível salvar.", "error");
        throw new Error(json.error ?? "save failed");
      }
      notify("Alterações salvas");
    });
    return () => registerSaver(null);
  }, [registerSaver, notify]);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const renderField = (f: Field) => (
    <div className={`a-field${f.wide ? " a-wide" : ""}`} key={f.key}>
      <label>
        {f.label}
        {f.hint && <span className="a-hint"> — {f.hint}</span>}
      </label>
      {f.prefix ? (
        <div className="a-prefix">
          <span>{f.prefix}</span>
          <input value={form[f.key]} placeholder={defaultOf(f.key)} onChange={(e) => set(f.key, e.target.value)} />
        </div>
      ) : (
        <input value={form[f.key]} placeholder={defaultOf(f.key)} onChange={(e) => set(f.key, e.target.value)} />
      )}
    </div>
  );

  return (
    <>
      <div className="a-card">
        <div className="a-card-head">
          <h2>Identificação</h2>
          <p>Aparece no site, no título da aba e nos e-mails enviados.</p>
        </div>
        <div className="a-card-body">
          <div className="a-grid">{IDENT.map(renderField)}</div>
        </div>
      </div>

      <div className="a-card">
        <div className="a-card-head">
          <h2>Data, horário e local</h2>
          <p>Deixe um campo em branco para usar o texto padrão do site.</p>
        </div>
        <div className="a-card-body">
          <div className="a-grid">{QUANDO.map(renderField)}</div>
        </div>
      </div>

      <p className="a-note">
        Campo em branco = o site usa o valor padrão do código. Nada quebra.
      </p>
    </>
  );
}
