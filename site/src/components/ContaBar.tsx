"use client";

type ContaBarProps = {
  userEmail?: string;
  onSignOut?: () => void;
};

/** Faixa discreta mostrando quem está logado, com o link de sair. */
export function ContaBar({ userEmail, onSignOut }: ContaBarProps) {
  if (!userEmail) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        background: "var(--cream)",
        border: "1px solid #eadbc8",
        borderRadius: 12,
        padding: "9px 12px",
        margin: "0 0 18px",
        fontSize: 13,
      }}
    >
      <span
        style={{ color: "var(--brown)", overflowWrap: "anywhere", minWidth: 0 }}
      >
        Conectado como{" "}
        <strong style={{ color: "var(--brown-dark)" }}>{userEmail}</strong>
      </span>
      {onSignOut && (
        <button
          type="button"
          onClick={onSignOut}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            font: "inherit",
            fontWeight: 600,
            color: "var(--pink)",
            textDecoration: "underline",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Sair
        </button>
      )}
    </div>
  );
}
