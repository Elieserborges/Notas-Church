"use client";

import { useEventConfig } from "@/components/EventConfigProvider";

/**
 * Aviso destacado do prazo para pagar. Usa a mesma data do aviso do topo
 * do site, para os dois nunca ficarem diferentes.
 */
export function AvisoPrazoPagamento() {
  const cfg = useEventConfig();
  return (
    <p
      style={{
        background: "#FACC15",
        color: "#1f2937",
        borderRadius: 10,
        padding: "11px 13px",
        margin: "0 0 14px",
        fontWeight: 700,
        fontSize: 14,
        lineHeight: 1.45,
        textAlign: "center",
      }}
    >
      O pagamento pode ser realizado até dia {cfg.registrationDeadlineLabel}.
    </p>
  );
}
