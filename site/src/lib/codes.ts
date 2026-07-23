import { randomInt } from "crypto";
import { EVENT } from "./event";

// Sem caracteres ambíguos (0/O, 1/I/L) para facilitar conferência na portaria
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const PREFIX = EVENT.codePrefix;

function block(len = 4): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** Gera um código de ingresso no formato PREF-XXXX-XXXX */
export function newTicketCode(): string {
  return `${PREFIX}-${block()}-${block()}`;
}

/** Normaliza o que a equipe digitar/escanear: espaços, minúsculas, sem hífens */
export function normalizeCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const p = PREFIX.length;
  if (raw.startsWith(PREFIX) && raw.length === p + 8) {
    return `${PREFIX}-${raw.slice(p, p + 4)}-${raw.slice(p + 4, p + 8)}`;
  }
  return input.trim().toUpperCase();
}
