"use client";

import { EVENT } from "@/lib/event";

/**
 * Aviso destacado do prazo para pagar. Usa a mesma data do aviso do topo
 * do site (event.ts), para os dois nunca ficarem diferentes.
 */
export function AvisoPrazoPagamento() {
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
      O pagamento pode ser realizado até dia {EVENT.registrationDeadlineLabel}.
    </p>
  );
}
