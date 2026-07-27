"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { MinhaInscricao } from "@/components/MinhaInscricao";
import { ObreiroCard } from "@/components/ObreiroCard";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Mode = "entrar" | "criar";

/** Traduz os erros do Supabase (em inglês) para mensagens claras. */
function mensagemErro(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Esse e-mail já tem conta. Clique em “Entrar”.";
  if (m.includes("password should be at least"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail pelo link que enviamos e tente de novo.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider"))
    return "O login com Google ainda não está ativado. Use e-mail e senha por enquanto.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Espere um minutinho e tente de novo.";
  return raw;
}

/**
 * Portão de acesso da inscrição: o site é público, mas para se inscrever
 * a pessoa precisa entrar (Google ou e-mail + senha).
 */
type AuthGateProps = {
  /** "obreiro" mostra a inscrição de obreiro em vez da ficha completa. */
  modo?: "participante" | "obreiro";
};

export function AuthGate({ modo = "participante" }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Guarda, já na montagem, se a pessoa está voltando do login do Google
  // (o Supabase limpa esses parâmetros da URL logo em seguida).
  const [voltouDoGoogle] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.location.hash.includes("access_token") ||
        window.location.search.includes("code="))
  );

  // Ao voltar do Google já logado, rola até a seção certa de cada página.
  useEffect(() => {
    if (user && voltouDoGoogle) {
      const alvo = modo === "obreiro" ? "obreiro" : "ingressos";
      document.getElementById(alvo)?.scrollIntoView({ behavior: "smooth" });
    }
  }, [user, voltouDoGoogle, modo]);

  useEffect(() => {
    let sb: ReturnType<typeof supabaseBrowser>;
    try {
      sb = supabaseBrowser();
    } catch (e) {
      setError(mensagemErro(e));
      setChecking(false);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setChecking(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  function trocarModo(novo: Mode) {
    setMode(novo);
    setError(null);
    setInfo(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      if (mode === "criar") {
        const { data, error: err } = await sb.auth.signUp({ email, password });
        if (err) throw err;
        if (!data.session) {
          setInfo(
            "Conta criada! Enviamos um link de confirmação para o seu e-mail. Confirme e depois entre aqui."
          );
          setMode("entrar");
        }
      } else {
        const { error: err } = await sb.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
      }
      setPassword("");
    } catch (err) {
      setError(mensagemErro(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setInfo(null);
    try {
      const sb = supabaseBrowser();
      // Volta para a MESMA página em que a pessoa está (preserva o
      // caminho, ex.: /souobreiro) — senão o obreiro cairia na inscrição
      // de participante depois do login. Sem "#" no fim: o Supabase usa o
      // próprio "#" para devolver a sessão, e dois "#" quebram o login.
      const { error: err } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + window.location.pathname,
        },
      });
      if (err) throw err;
    } catch (err) {
      setError(mensagemErro(err));
    }
  }

  async function handleSignOut() {
    try {
      await supabaseBrowser().auth.signOut();
    } catch {
      /* silencioso */
    }
    setUser(null);
  }

  // ---- Verificando sessão ------------------------------------------
  if (checking) {
    return (
      <div className="form-card">
        <div className="spinner" />
      </div>
    );
  }

  // ---- Já está logado → mostra a inscrição (ou o formulário) --------
  if (user) {
    const props = { userEmail: user.email ?? "", onSignOut: handleSignOut };
    return modo === "obreiro" ? (
      <ObreiroCard {...props} />
    ) : (
      <MinhaInscricao {...props} />
    );
  }

  // ---- Portão: entrar ou criar conta --------------------------------
  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <p className="form-title">
        {mode === "criar"
          ? "Criar sua conta"
          : modo === "obreiro"
            ? "Entrar para se inscrever como obreiro"
            : "Entrar para se inscrever"}
      </p>
      <p className="form-sub">
        {mode === "entrar"
          ? "Identifique-se para garantir sua vaga — é rapidinho."
          : "Crie sua conta para continuar com a inscrição."}
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {info && (
        <p className="hint" role="status">
          {info}
        </p>
      )}

      <button
        type="button"
        className="btn btn-outline btn-block"
        onClick={handleGoogle}
        disabled={busy}
      >
        Entrar com Google
      </button>

      <p className="hint" style={{ textAlign: "center", margin: "14px 0 6px" }}>
        ou com e-mail e senha
      </p>

      <div className="field">
        <label htmlFor="auth-email">E-mail</label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={160}
        />
      </div>

      <div className="field">
        <label htmlFor="auth-pass">Senha</label>
        <input
          id="auth-pass"
          type="password"
          autoComplete={mode === "criar" ? "new-password" : "current-password"}
          placeholder="mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>

      <button className="btn btn-block" type="submit" disabled={busy}>
        {busy
          ? "Aguarde…"
          : mode === "entrar"
            ? "Entrar"
            : "Criar conta e continuar"}
      </button>

      <p className="form-note" style={{ textAlign: "center" }}>
        {mode === "entrar" ? (
          <>
            Ainda não tem conta?{" "}
            <button
              type="button"
              className="link-btn"
              onClick={() => trocarModo("criar")}
            >
              Criar conta
            </button>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <button
              type="button"
              className="link-btn"
              onClick={() => trocarModo("entrar")}
            >
              Entrar
            </button>
          </>
        )}
      </p>
    </form>
  );
}
