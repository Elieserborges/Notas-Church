// Tema do evento — módulo PURO (sem imports de servidor), pode ser
// usado tanto no site quanto no painel (cliente).

/** Cores padrão = valores atuais de globals.css. */
export const DEFAULT_THEME: Record<string, string> = {
  primary: "#2429d6",
  primaryStrong: "#181ca8",
  primarySoft: "#aeb6ff",
  primaryFaint: "#e3e6ff",
  highlight: "#dce2ff",
  bg: "#f6f7ff",
  textSoft: "#5a6096",
  titles: "#14184f",
  ink: "#12142e",
};

/** Cada chave de tema sobrescreve uma variável CSS já existente. */
export const THEME_TO_CSSVAR: Record<string, string> = {
  primary: "--pink",
  primaryStrong: "--pink-strong",
  primarySoft: "--pink-soft",
  primaryFaint: "--pink-faint",
  highlight: "--yellow",
  bg: "--cream",
  textSoft: "--brown",
  titles: "--brown-dark",
  ink: "--ink",
};

/** Campos exibidos no painel (rótulos amigáveis). */
export const THEME_FIELDS: { key: string; label: string; hint?: string }[] = [
  { key: "primary", label: "Cor primária", hint: "botões e links" },
  { key: "primaryStrong", label: "Primária escura", hint: "hover dos botões" },
  { key: "titles", label: "Títulos" },
  { key: "ink", label: "Texto principal" },
  { key: "textSoft", label: "Texto secundário" },
  { key: "bg", label: "Fundo da página" },
  { key: "highlight", label: "Destaque", hint: "faixas de aviso" },
  { key: "primarySoft", label: "Primária clara" },
  { key: "primaryFaint", label: "Primária bem clara" },
];

/** CSS de override do tema, para injetar no site. Vazio = usa o padrão. */
export function themeCss(theme: Record<string, string>): string {
  const rules = Object.entries(THEME_TO_CSSVAR)
    .filter(([k]) => theme[k])
    .map(([k, cssVar]) => `${cssVar}:${theme[k]}`)
    .join(";");
  return rules ? `:root{${rules}}` : "";
}
