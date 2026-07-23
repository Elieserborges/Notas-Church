"use client";

import jsQR from "jsqr";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EVENT } from "@/lib/event";

type Result =
  | {
      kind: "ok";
      code: string;
      name: string;
      quantity: number;
      status: "valid" | "used" | "admitted" | "already_used";
      used_at: string | null;
    }
  | { kind: "error"; message: string };

type SearchOrder = {
  name: string;
  email: string;
  quantity: number;
  tickets: { code: string; used_at: string | null }[];
};

const PIN_KEY = "curame_pin";

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** Conteúdo do QR pode ser a URL de validação ou o código puro */
function codeFromScan(text: string): string {
  try {
    const url = new URL(text);
    const c = url.searchParams.get("codigo");
    if (c) return c;
  } catch {
    // não era URL — usa o texto como código
  }
  return text.trim();
}

export function ValidateClient() {
  const params = useSearchParams();
  const [pin, setPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [mode, setMode] = useState<"code" | "name">("code");
  const [code, setCode] = useState(params.get("codigo") ?? "");
  const [nameTerm, setNameTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchOrder[] | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  // --- Scanner ------------------------------------------------------
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const codeRef = useRef<HTMLInputElement>(null);
  const autoChecked = useRef(false);

  useEffect(() => {
    setPin(sessionStorage.getItem(PIN_KEY));
  }, []);

  const call = useCallback(
    async (
      action: "check" | "use" | "search",
      payload: { code?: string; name?: string },
      thePin: string
    ) => {
      setLoading(true);
      if (action !== "search") setResult(null);
      try {
        const res = await fetch("/api/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: thePin, action, ...payload }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          sessionStorage.removeItem(PIN_KEY);
          setPin(null);
          setResult({ kind: "error", message: "PIN incorreto. Entre novamente." });
          return;
        }
        if (!res.ok) {
          setResult({
            kind: "error",
            message: data.error ?? "Não foi possível validar.",
          });
          return;
        }
        if (action === "search") {
          setSearchResults(data.results ?? []);
        } else {
          setResult({ kind: "ok", ...data });
        }
      } catch {
        setResult({ kind: "error", message: "Falha de conexão. Tente de novo." });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const stopScan = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  // Liga a câmera e fica lendo frames até achar um QR
  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        timerRef.current = setInterval(() => {
          if (!video.videoWidth || !ctx) return;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(img.data, img.width, img.height, {
            inversionAttempts: "dontInvert",
          });
          if (qr?.data) {
            const found = codeFromScan(qr.data);
            navigator.vibrate?.(120);
            stopScan();
            setMode("code");
            setCode(found.toUpperCase());
            const p = sessionStorage.getItem(PIN_KEY);
            if (p) call("check", { code: found }, p);
          }
        }, 220);
      } catch {
        setScanError(
          "Não foi possível acessar a câmera. Verifique a permissão do navegador ou digite o código."
        );
        setScanning(false);
      }
    })();

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [scanning, call, stopScan]);

  // Ao abrir via QR (?codigo=...) com PIN salvo, verifica sozinho
  useEffect(() => {
    if (pin && code && !autoChecked.current) {
      autoChecked.current = true;
      call("check", { code }, pin);
    }
  }, [pin, code, call]);

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = pinInput.trim();
    if (!value) return;
    sessionStorage.setItem(PIN_KEY, value);
    setPin(value);
    setPinInput("");
    if (code) call("check", { code }, value);
  }

  function next(reopenScanner = false) {
    setCode("");
    setResult(null);
    setSearchResults(null);
    setNameTerm("");
    setScanError(null);
    if (reopenScanner) {
      setScanning(true);
    } else if (mode === "code") {
      codeRef.current?.focus();
    }
  }

  // ---- Tela de PIN -------------------------------------------------
  if (!pin) {
    return (
      <div className="validate-card">
        <form className="form-card" onSubmit={handlePinSubmit}>
          <p className="form-title">Portaria · {EVENT.name}</p>
          <p className="form-sub">
            Área da equipe. Digite o PIN para validar os ingressos.
          </p>
          {result?.kind === "error" && (
            <p className="form-error">{result.message}</p>
          )}
          <div className="field">
            <label htmlFor="v-pin">PIN da equipe</label>
            <input
              id="v-pin"
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
        <p className="team-links">
          <a href="/planilha">📋 Planilha de inscritos</a>
        </p>
      </div>
    );
  }

  // ---- Tela principal ----------------------------------------------
  const r = result;
  return (
    <div className="validate-card">
      <div className="v-topbar">
        <strong style={{ color: "var(--brown-dark)" }}>
          🎟️ Validação de ingressos
        </strong>
        <button
          className="link-btn"
          type="button"
          onClick={() => {
            stopScan();
            sessionStorage.removeItem(PIN_KEY);
            setPin(null);
            setResult(null);
            setSearchResults(null);
          }}
        >
          Sair
        </button>
      </div>

      <div className="v-tabs">
        <button
          type="button"
          className={mode === "code" ? "active" : ""}
          onClick={() => {
            setMode("code");
            setSearchResults(null);
          }}
        >
          QR / Código
        </button>
        <button
          type="button"
          className={mode === "name" ? "active" : ""}
          onClick={() => {
            stopScan();
            setMode("name");
            setResult(null);
          }}
        >
          Buscar por nome
        </button>
      </div>

      {/* ---------- Modo código + scanner ---------- */}
      {mode === "code" && (
        <div className="form-card">
          {scanning ? (
            <div className="scan-box">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} playsInline muted autoPlay />
              <p className="hint" style={{ textAlign: "center" }}>
                Aponte a câmera para o QR Code do ingresso
              </p>
              <button
                className="btn btn-outline btn-block"
                type="button"
                onClick={stopScan}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <>
              <button
                className="btn btn-block"
                type="button"
                onClick={() => {
                  setScanError(null);
                  setResult(null);
                  setScanning(true);
                }}
              >
                📷 Escanear QR Code
              </button>
              {scanError && (
                <p className="form-error" style={{ marginTop: 14 }}>
                  {scanError}
                </p>
              )}
              <div className="v-divider">
                <span>ou digite o código</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (code.trim()) call("check", { code: code.trim() }, pin);
                }}
              >
                <div className="field">
                  <input
                    id="v-code"
                    ref={codeRef}
                    type="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    placeholder={`${EVENT.codePrefix}-XXXX-XXXX`}
                    aria-label="Código do ingresso"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                </div>
                <button
                  className="btn btn-outline btn-block"
                  type="submit"
                  disabled={loading || !code.trim()}
                >
                  {loading ? "Verificando…" : "Verificar código"}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* ---------- Modo busca por nome ---------- */}
      {mode === "name" && (
        <div className="form-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (nameTerm.trim().length >= 3)
                call("search", { name: nameTerm.trim() }, pin);
            }}
          >
            <div className="field">
              <label htmlFor="v-name">Nome de quem comprou</label>
              <input
                id="v-name"
                type="text"
                autoComplete="off"
                placeholder="Ex.: Maria Souza"
                value={nameTerm}
                onChange={(e) => setNameTerm(e.target.value)}
              />
              <p className="hint">
                Pode ser só parte do nome — sem se preocupar com acentos.
              </p>
            </div>
            <button
              className="btn btn-block"
              type="submit"
              disabled={loading || nameTerm.trim().length < 3}
            >
              {loading ? "Buscando…" : "🔍 Buscar"}
            </button>
          </form>

          {searchResults !== null && searchResults.length === 0 && (
            <p className="form-error" style={{ marginTop: 16 }}>
              Nenhuma compra aprovada encontrada com esse nome.
            </p>
          )}

          {searchResults && searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((o, i) => (
                <div className="sr-order" key={i}>
                  <p className="sr-name">{o.name}</p>
                  <p className="sr-meta">
                    {o.quantity} {o.quantity === 1 ? "ingresso" : "ingressos"} ·{" "}
                    {o.email}
                  </p>
                  {o.tickets.map((t) => (
                    <div className="sr-ticket" key={t.code}>
                      <span
                        className={`sr-dot ${t.used_at ? "dot-used" : "dot-ok"}`}
                      />
                      <span className="sr-code">{t.code}</span>
                      <span className="sr-status">
                        {t.used_at ? `entrou ${fmtTime(t.used_at)}` : "válido"}
                      </span>
                      <button
                        className="btn btn-sm"
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setCode(t.code);
                          call("check", { code: t.code }, pin);
                        }}
                      >
                        Selecionar
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- Resultado ---------- */}
      {r?.kind === "error" && (
        <div className="v-result v-invalid" role="alert">
          <div className="v-emoji">❌</div>
          <h2>Ops!</h2>
          <p>{r.message}</p>
        </div>
      )}

      {r?.kind === "ok" && r.status === "valid" && (
        <div className="v-result v-valid" role="status">
          <div className="v-emoji">✅</div>
          <h2>Ingresso válido</h2>
          <p>
            <strong>{r.name}</strong>
          </p>
          <p className="v-code">{r.code}</p>
          <button
            className="btn"
            type="button"
            disabled={loading}
            onClick={() => call("use", { code: r.code }, pin)}
          >
            ✔ Confirmar entrada
          </button>
        </div>
      )}

      {r?.kind === "ok" && r.status === "admitted" && (
        <div className="v-result v-admitted" role="status">
          <div className="v-emoji">🎉</div>
          <h2>Entrada confirmada!</h2>
          <p>
            <strong>{r.name}</strong>
          </p>
          <p className="v-code">{r.code}</p>
          <div className="v-actions">
            <button className="btn" type="button" onClick={() => next(true)}>
              📷 Escanear próximo
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => next(false)}
            >
              Digitar / buscar
            </button>
          </div>
        </div>
      )}

      {r?.kind === "ok" && (r.status === "used" || r.status === "already_used") && (
        <div className="v-result v-used" role="alert">
          <div className="v-emoji">⚠️</div>
          <h2>Já utilizado</h2>
          <p>
            <strong>{r.name}</strong>
          </p>
          <p className="v-code">{r.code}</p>
          <p>Entrada registrada às {fmtTime(r.used_at)}.</p>
          <div className="v-actions">
            <button className="btn btn-outline" type="button" onClick={() => next(true)}>
              📷 Escanear próximo
            </button>
            <button className="btn btn-outline" type="button" onClick={() => next(false)}>
              Próximo ingresso
            </button>
          </div>
        </div>
      )}

      <p className="team-links">
        <a href="/planilha">📋 Planilha de inscritos</a>
      </p>
    </div>
  );
}
