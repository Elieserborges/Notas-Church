"use client";

import { useEffect } from "react";

/**
 * Ao recarregar (F5), o navegador tenta devolver a pessoa para onde ela
 * estava — o que, com conteúdo que carrega depois, deixa a página no meio.
 * Aqui desligamos essa restauração e começamos do topo.
 *
 * Exceções: quando a URL tem uma âncora de verdade (#ingressos) ou os
 * parâmetros de volta do login com Google, respeitamos o destino.
 */
export function TopoAoCarregar() {
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    const hash = window.location.hash;
    const voltandoDoLogin =
      hash.includes("access_token") || window.location.search.includes("code=");
    if (!hash || voltandoDoLogin) {
      window.scrollTo(0, 0);
    }
  }, []);

  return null;
}
