"use client";

import { useEventConfig } from "@/components/EventConfigProvider";

/**
 * Aviso destacado (vermelho) do prazo para pagar. Usa o prazo de pagamento
 * do painel (paymentDeadlineLabel), que pode ser diferente do prazo de
 * inscrição do topo do site.
 */
export function AvisoPrazoPagamento() {
  const cfg = useEventConfig();
  return (
    <p
      style={{
        background: "#DC2626",
        color: "#ffffff",
        borderRadius: 10,
        padding: "11px 13px",
        margin: "0 0 14px",
        fontWeight: 700,
        fontSize: 14,
        lineHeight: 1.45,
        textAlign: "center",
      }}
    >
      O pagamento pode ser realizado até dia {cfg.paymentDeadlineLabel}.
    </p>
  );
}
