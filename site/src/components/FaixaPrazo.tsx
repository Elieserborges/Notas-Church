import { getEventConfig } from "@/lib/config";

/** Faixa amarela do topo com o prazo das inscrições. */
export async function FaixaPrazo() {
  const cfg = await getEventConfig();
  return (
    <div
      role="note"
      style={{
        background: "#FACC15",
        color: "#1f2937",
        textAlign: "center",
        padding: "10px 16px",
        fontWeight: 700,
        fontSize: "0.9rem",
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      Inscrições até dia {cfg.registrationDeadlineLabel}
    </div>
  );
}
