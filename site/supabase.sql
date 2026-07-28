-- ============================================================
--  FACE A FACE · Inscrições — esquema do banco
--  Cole e execute este arquivo no Supabase: SQL Editor → Run
--  Pode rodar quantas vezes quiser: só cria o que estiver faltando.
-- ============================================================

create extension if not exists pgcrypto;

-- Inscrições (uma por pessoa)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text not null,
  quantity integer not null default 1 check (quantity >= 1 and quantity <= 10),
  unit_price numeric(10, 2) not null,
  total numeric(10, 2) not null,
  status text not null default 'pending', -- pending | approved | rejected
  mp_preference_id text,
  mp_payment_id text,
  email_sent_at timestamptz,
  email_error text
);

-- --- Ficha de inscrição (campos do acampamento) ---------------
-- "add column if not exists" deixa rodar de novo sem erro em bancos
-- que já existem.
alter table public.orders
  add column if not exists tipo text not null default 'participante',
  add column if not exists birth_date date,
  add column if not exists cpf text,
  add column if not exists shirt_size text,
  add column if not exists family_name text,
  add column if not exists family_relationship text,
  add column if not exists family_phone text,
  add column if not exists payment_method text,
  add column if not exists uses_medication boolean,
  add column if not exists medication_details text,
  add column if not exists climbs_stairs boolean,
  add column if not exists sleeps_top_bunk boolean,
  add column if not exists gc_leader text,
  add column if not exists close_person_name text,
  add column if not exists close_person_phone text,
  add column if not exists goes_by_car boolean;

-- Ingressos (um por pessoa, com código único)
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  order_id uuid not null references public.orders (id) on delete cascade,
  code text not null unique,
  used_at timestamptz
);

create index if not exists tickets_order_id_idx on public.tickets (order_id);
create index if not exists orders_status_idx on public.orders (status);

-- Segurança: nenhum acesso público. Somente o backend do site
-- (service role key) lê e escreve nessas tabelas.
alter table public.orders enable row level security;
alter table public.tickets enable row level security;

-- ============================================================
--  PAINEL ADMIN · configuração dinâmica do evento (Passo 1)
--  Tudo aqui é ADITIVO: as tabelas acima não mudam. Enquanto
--  estas tabelas estiverem vazias, o site usa os valores padrão
--  do código (src/lib/event.ts) — funciona igual a hoje.
-- ============================================================

-- Vault: guarda segredos (token do Mercado Pago, senha SMTP)
-- criptografados em repouso. Já vem no Supabase.
create extension if not exists supabase_vault;

-- Evento (permite reaproveitar a estrutura em eventos futuros).
-- Um único evento fica com is_current = true = o que aparece no site.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  status text not null default 'active',      -- active | coming_soon | closed
  is_current boolean not null default false,
  info jsonb not null default '{}',           -- nome, datas, local, textos…
  theme jsonb not null default '{}',          -- cores → variáveis CSS
  branding jsonb not null default '{}',       -- urls de logo, banner, favicon, bg
  integrations jsonb not null default '{}',   -- SÓ público (public key, webhook url)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- No máximo um evento "atual"
create unique index if not exists events_one_current
  on public.events (is_current) where is_current;

-- Lotes/preços (participante, obreiro, obreiro+camiseta, lote 1/2…)
create table if not exists public.ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  kind text not null,                         -- participante | obreiro | obreiro_camiseta | custom
  name text not null,
  price numeric(10, 2) not null,
  qty_available integer,                      -- null = ilimitado
  qty_sold integer not null default 0,
  status text not null default 'active',      -- active | sold_out | hidden
  sort_order integer not null default 0
);
create index if not exists ticket_tiers_event_idx on public.ticket_tiers (event_id);

-- Imagens (arquivos vão para o Supabase Storage; aqui fica a URL)
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  kind text not null,                         -- logo | banner | favicon | background | gallery
  url text not null,
  alt text,
  sort_order integer not null default 0
);
create index if not exists media_assets_event_idx on public.media_assets (event_id);

-- Segredos: só a REFERÊNCIA ao Vault + os 4 últimos dígitos (para o
-- painel exibir "•••• 4821"). O valor real nunca fica em texto puro.
create table if not exists public.event_secrets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  key text not null,                          -- mp_access_token | mp_webhook_secret | smtp_pass
  vault_secret_id uuid not null,
  last4 text,
  updated_at timestamptz not null default now(),
  unique (event_id, key)
);

-- Login do painel: lista de e-mails autorizados (usa o login Google
-- que o site já tem). Também dá para autorizar via env ADMIN_EMAILS.
create table if not exists public.admin_users (
  email text primary key,
  role text not null default 'admin',         -- owner | admin
  added_at timestamptz not null default now()
);

alter table public.events        enable row level security;
alter table public.ticket_tiers  enable row level security;
alter table public.media_assets  enable row level security;
alter table public.event_secrets enable row level security;
alter table public.admin_users   enable row level security;
-- Sem policies = só o service role (backend) acessa, igual orders/tickets.

-- Ler um segredo já descriptografado (só o backend chama, via RPC).
create or replace function public.get_event_secret(p_event_id uuid, p_key text)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select ds.decrypted_secret
  from public.event_secrets es
  join vault.decrypted_secrets ds on ds.id = es.vault_secret_id
  where es.event_id = p_event_id and es.key = p_key
  limit 1;
$$;

-- Gravar/atualizar um segredo (cria no Vault e guarda a referência + last4).
create or replace function public.set_event_secret(p_event_id uuid, p_key text, p_value text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_id uuid;
  v_name text;
begin
  v_name := 'evt_' || p_event_id::text || '_' || p_key;
  select vault_secret_id into v_id
    from public.event_secrets where event_id = p_event_id and key = p_key;
  if v_id is null then
    v_id := vault.create_secret(p_value, v_name, 'event secret');
    insert into public.event_secrets (event_id, key, vault_secret_id, last4)
      values (p_event_id, p_key, v_id, right(p_value, 4));
  else
    perform vault.update_secret(v_id, p_value);
    update public.event_secrets
      set last4 = right(p_value, 4), updated_at = now()
      where event_id = p_event_id and key = p_key;
  end if;
end;
$$;

-- Estas funções são só para o backend (service role). Ninguém mais chama.
revoke all on function public.get_event_secret(uuid, text) from public, anon, authenticated;
revoke all on function public.set_event_secret(uuid, text, text) from public, anon, authenticated;

-- Seed: cria o evento atual (vazio) se ainda não existir nenhum "atual".
-- Fica com JSONB vazio de propósito: assim tudo cai no padrão do código.
insert into public.events (slug, status, is_current, info)
select 'face-a-face', 'active', true, '{}'::jsonb
where not exists (select 1 from public.events where is_current);
