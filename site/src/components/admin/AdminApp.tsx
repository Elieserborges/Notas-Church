"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { adminFetch } from "./api";
import { AdminShell, type EventData } from "./AdminShell";

type Phase = "loading" | "anon" | "denied" | "ready" | "error";

export function AdminApp() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [email, setEmail] = useState("");
  const [event, setEvent] = useState<EventData | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const bootstrapped = useRef(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginErr, setLoginErr] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const meRes = await adminFetch("/api/admin/me");
      const me = await meRes.json().catch(() => ({}));
      if (!me.authenticated) {
        setPhase("anon");
        return;
      }
      setEmail(me.email ?? "");
      if (!me.isAdmin) {
        setPhase("denied");
        return;
      }
      const cfgRes = await adminFetch("/api/admin/config");
      const cfg = await cfgRes.json().catch(() => ({}));
      if (!cfgRes.ok) throw new Error(cfg.error ?? "Falha ao carregar.");
      setEvent(cfg.event as EventData);
      setPhase("ready");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Erro ao carregar o painel.");
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    let sb: ReturnType<typeof supabaseBrowser>;
    try {
      sb = supabaseBrowser();
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Login indisponível.");
      setPhase("error");
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      if (data.session) carregar();
      else setPhase("anon");
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      if (session && !bootstrapped.current) {
        bootstrapped.current = true;
        carregar();
      }
      if (!session) {
        bootstrapped.current = false;
        setPhase("anon");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [carregar]);

  async function entrarGoogle() {
    setLoginErr(null);
    try {
      await supabaseBrowser().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/admin" },
      });
    } catch (e) {
      setLoginErr(e instanceof Error ? e.message : "Falha no login.");
    }
  }

  async function entrarSenha(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLoginErr(null);
    try {
      const { error } = await supabaseBrowser().auth.signInWithPassword({
        email: loginEmail,
        password: loginPass,
      });
      if (error) throw error;
      setLoginPass("");
      // onAuthStateChange dispara o carregar()
    } catch (e) {
      setLoginErr(e instanceof Error ? e.message : "E-mail ou senha incorretos.");
    } finally {
      setBusy(false);
    }
  }

  async function sair() {
    try {
      await supabaseBrowser().auth.signOut();
    } catch {
      /* silencioso */
    }
    setPhase("anon");
  }

  if (phase === "loading") {
    return (
      <div className="admin-scope">
        <div className="admin-center">
          <div className="admin-spinner" />
        </div>
      </div>
    );
  }

  if (phase === "ready" && event) {
    return (
      <AdminShell email={email} event={event} onSignOut={sair} />
    );
  }

  // anon / denied / error → cartão central
  return (
    <div className="admin-scope">
      <div className="admin-center">
        <div className="admin-login">
          <div className="admin-login-mark">F</div>
          <h1>Painel · Face a Face</h1>

          {phase === "denied" && (
            <>
              <p className="admin-login-sub">
                Você está logado como <b>{email}</b>, mas esse e-mail não tem
                acesso ao painel. Peça para um administrador liberar seu e-mail.
              </p>
              <button className="a-btn a-btn-ghost a-block" onClick={sair}>
                Sair e entrar com outra conta
              </button>
            </>
          )}

          {phase === "error" && (
            <p className="admin-login-sub admin-err">{errMsg}</p>
          )}

          {(phase === "anon" || phase === "error") && (
            <>
              <p className="admin-login-sub">Entre com a conta autorizada da equipe.</p>
              {loginErr && <p className="admin-err">{loginErr}</p>}
              <button className="a-btn a-btn-ghost a-block" onClick={entrarGoogle}>
                Entrar com Google
              </button>
              <div className="admin-or">ou com e-mail e senha</div>
              <form onSubmit={entrarSenha} className="admin-login-form">
                <input
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="senha"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  required
                />
                <button className="a-btn a-btn-save a-block" type="submit" disabled={busy}>
                  {busy ? "Entrando…" : "Entrar"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
