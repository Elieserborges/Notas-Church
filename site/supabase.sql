-- ============================================================
--  CURA-ME · Ingressos — esquema do banco
--  Cole e execute este arquivo no Supabase: SQL Editor → Run
-- ============================================================

create extension if not exists pgcrypto;

-- Pedidos (um por compra; pode ter vários ingressos)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text not null,
  quantity integer not null check (quantity >= 1 and quantity <= 10),
  unit_price numeric(10, 2) not null,
  total numeric(10, 2) not null,
  status text not null default 'pending', -- pending | approved | rejected
  mp_preference_id text,
  mp_payment_id text,
  email_sent_at timestamptz,
  email_error text
);

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
