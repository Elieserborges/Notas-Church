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
