// ============================================================
//  Camada de configuração dinâmica (Passo 1)
//
//  getEventConfig() resolve nesta ordem:
//    Painel/Banco (Supabase)  →  EVENT (padrão hardcoded)
//
//  Regra de ouro: se o banco estiver vazio, offline ou com um
//  campo em branco, cai no valor padrão do EVENT. O site NUNCA
//  quebra por causa de config — no pior caso, roda igual a hoje.
// ============================================================

import { EVENT } from "./event";
import { supabaseAdmin } from "./supabase";

export type EventStatus = "active" | "coming_soon" | "closed";

export type TierConfig = {
  kind: string;
  name: string;
  price: number;
  qtyAvailable: number | null;
  qtySold: number;
  status: string;
  sortOrder: number;
};

export type Branding = {
  logo?: string;
  banner?: string;
  favicon?: string;
  background?: string;
  gallery?: string[];
};

export type Integrations = {
  mpPublicKey?: string;
  mpMode?: "production" | "sandbox";
  syncWebhookUrl?: string;
};

export type EventConfig = {
  id: string | null;
  slug: string;
  status: EventStatus;

  // --- espelham o EVENT (fonte dos padrões) ---
  name: string;
  tagline: string;
  audience: string;
  church: string;
  supportWhatsapp: string;
  dateLabel: string;
  registrationDeadlineLabel: string;
  timeLabel: string;
  isoStart: string;
  isoEnd: string;
  addressLabel: string;
  mapsUrl: string;
  price: number;
  workerPrice: number;
  workerPriceWithShirt: number;
  mpFees: Record<string, number>;
  maxQuantity: number;
  maxInstallments: number;
  codePrefix: string;
  statementDescriptor: string;
  speakers: string[];

  // --- novos, gerenciáveis no painel ---
  theme: Record<string, string>;
  branding: Branding;
  integrations: Integrations;
  tiers: TierConfig[];
};

/** Cores padrão (valores atuais de globals.css). */
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

/** Cada chave de tema mapeia para uma variável CSS já existente. */
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

const STRING_KEYS = [
  "name", "tagline", "audience", "church", "supportWhatsapp", "dateLabel",
  "registrationDeadlineLabel", "timeLabel", "isoStart", "isoEnd",
  "addressLabel", "mapsUrl", "codePrefix", "statementDescriptor",
] as const;

const NUMBER_KEYS = [
  "price", "workerPrice", "workerPriceWithShirt", "maxQuantity", "maxInstallments",
] as const;

/** Config só com os padrões do código — o piso de segurança. */
function baseDefaults(): EventConfig {
  return {
    id: null,
    slug: EVENT.slug,
    status: "active",
    name: EVENT.name,
    tagline: EVENT.tagline,
    audience: EVENT.audience,
    church: EVENT.church,
    supportWhatsapp: EVENT.supportWhatsapp,
    dateLabel: EVENT.dateLabel,
    registrationDeadlineLabel: EVENT.registrationDeadlineLabel,
    timeLabel: EVENT.timeLabel,
    isoStart: EVENT.isoStart,
    isoEnd: EVENT.isoEnd,
    addressLabel: EVENT.addressLabel,
    mapsUrl: EVENT.mapsUrl,
    price: EVENT.price,
    workerPrice: EVENT.workerPrice,
    workerPriceWithShirt: EVENT.workerPriceWithShirt,
    mpFees: { ...EVENT.mpFees },
    maxQuantity: EVENT.maxQuantity,
    maxInstallments: EVENT.maxInstallments,
    codePrefix: EVENT.codePrefix,
    statementDescriptor: EVENT.statementDescriptor,
    speakers: [...EVENT.speakers],
    theme: { ...DEFAULT_THEME },
    branding: {},
    integrations: { mpMode: "production" },
    tiers: [
      { kind: "participante", name: "Participante", price: EVENT.price, qtyAvailable: null, qtySold: 0, status: "active", sortOrder: 0 },
      { kind: "obreiro", name: "Obreiro (sem camiseta)", price: EVENT.workerPrice, qtyAvailable: null, qtySold: 0, status: "active", sortOrder: 1 },
      { kind: "obreiro_camiseta", name: "Obreiro (com camiseta)", price: EVENT.workerPriceWithShirt, qtyAvailable: null, qtySold: 0, status: "active", sortOrder: 2 },
    ],
  };
}

type Overlay = {
  id: string;
  slug?: string;
  status?: string;
  info?: Record<string, unknown>;
  theme?: Record<string, string>;
  branding?: Record<string, unknown>;
  integrations?: Record<string, unknown>;
  tiers?: TierConfig[];
};

/** Remove null/undefined/"" para não sobrescrever padrão com vazio. */
function prune<T extends Record<string, unknown>>(o: T | undefined): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o ?? {})) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

function normalizeStatus(s?: string): EventStatus | null {
  return s === "active" || s === "coming_soon" || s === "closed" ? s : null;
}

/** Aplica o bloco `info` do banco por cima dos padrões, com checagem de tipo. */
function applyInfo(base: EventConfig, info?: Record<string, unknown>): void {
  const src = info ?? {};
  for (const k of STRING_KEYS) {
    const v = src[k];
    if (typeof v === "string" && v.trim() !== "") (base as Record<string, unknown>)[k] = v;
  }
  for (const k of NUMBER_KEYS) {
    const v = src[k];
    if (typeof v === "number" && Number.isFinite(v)) (base as Record<string, unknown>)[k] = v;
  }
  if (Array.isArray(src.speakers)) {
    base.speakers = (src.speakers as unknown[]).filter((x): x is string => typeof x === "string");
  }
  if (src.mpFees && typeof src.mpFees === "object") {
    base.mpFees = { ...base.mpFees, ...(src.mpFees as Record<string, number>) };
  }
}

function mergeConfig(base: EventConfig, ov: Overlay): EventConfig {
  applyInfo(base, ov.info);
  base.id = ov.id;
  if (ov.slug && ov.slug.trim()) base.slug = ov.slug;
  base.status = normalizeStatus(ov.status) ?? base.status;
  base.theme = { ...base.theme, ...prune(ov.theme) } as Record<string, string>;
  base.branding = { ...base.branding, ...prune(ov.branding) } as Branding;
  base.integrations = { ...base.integrations, ...prune(ov.integrations) } as Integrations;
  if (ov.tiers && ov.tiers.length) base.tiers = ov.tiers;
  return base;
}

async function fetchCurrentEvent(): Promise<Overlay | null> {
  const db = supabaseAdmin();
  const { data: ev, error } = await db
    .from("events")
    .select("id, slug, status, info, theme, branding, integrations")
    .eq("is_current", true)
    .maybeSingle();
  if (error || !ev) return null;

  const { data: tiers } = await db
    .from("ticket_tiers")
    .select("kind, name, price, qty_available, qty_sold, status, sort_order")
    .eq("event_id", ev.id as string)
    .order("sort_order", { ascending: true });

  return {
    id: ev.id as string,
    slug: (ev.slug as string) ?? undefined,
    status: (ev.status as string) ?? undefined,
    info: (ev.info as Record<string, unknown>) ?? {},
    theme: (ev.theme as Record<string, string>) ?? {},
    branding: (ev.branding as Record<string, unknown>) ?? {},
    integrations: (ev.integrations as Record<string, unknown>) ?? {},
    tiers: (tiers ?? []).map((t) => ({
      kind: t.kind as string,
      name: t.name as string,
      price: Number(t.price) || 0,
      qtyAvailable: (t.qty_available as number | null) ?? null,
      qtySold: (t.qty_sold as number) ?? 0,
      status: (t.status as string) ?? "active",
      sortOrder: (t.sort_order as number) ?? 0,
    })),
  };
}

// Cache curto para não bater no banco a cada request.
let cache: { at: number; cfg: EventConfig } | null = null;
const TTL_MS = 30_000;

/** Configuração resolvida do evento atual. Nunca lança — cai no padrão. */
export async function getEventConfig(): Promise<EventConfig> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.cfg;
  const defaults = baseDefaults();
  try {
    const ov = await fetchCurrentEvent();
    const cfg = ov ? mergeConfig(defaults, ov) : defaults;
    cache = { at: Date.now(), cfg };
    return cfg;
  } catch (e) {
    // Banco offline, tabela ainda não criada, etc. → padrão do código.
    console.error("[config] usando padrão (fallback):", e instanceof Error ? e.message : e);
    return defaults;
  }
}

/** Limpa o cache — chamar depois de salvar algo no painel. */
export function clearConfigCache(): void {
  cache = null;
}

/** Gera o CSS de override do tema, para injetar no <head> (Passo 3). */
export function themeCss(theme: Record<string, string>): string {
  const rules = Object.entries(THEME_TO_CSSVAR)
    .filter(([k]) => theme[k])
    .map(([k, cssVar]) => `${cssVar}:${theme[k]}`)
    .join(";");
  return rules ? `:root{${rules}}` : "";
}
