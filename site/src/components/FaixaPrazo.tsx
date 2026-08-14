import { getEventConfig } from "@/lib/config";

/** Faixa do topo com o prazo de pagamento (texto em vermelho). */
export async function FaixaPrazo() {
  const cfg = await getEventConfig();
  return (
    <div
      role="note"
      style={{
        background: "#FEE2E2",
        color: "#DC2626",
        textAlign: "center",
        padding: "10px 16px",
        fontWeight: 800,
        fontSize: "0.9rem",
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      Pagamento até dia {cfg.paymentDeadlineLabel}
    </div>
  );
}
