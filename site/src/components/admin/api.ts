"use client";

import { supabaseBrowser } from "@/lib/supabaseBrowser";

/** Token da sessão logada (ou null). */
export async function sessionToken(): Promise<string | null> {
  try {
    const { data } = await supabaseBrowser().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** fetch já com o Bearer + JSON, para as rotas do painel. */
export async function adminFetch(
  path: string,
  opts: RequestInit = {}
): Promise<Response> {
  const token = await sessionToken();
  return fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
