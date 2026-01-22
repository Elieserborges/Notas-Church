-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS for Profiles
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- DOCUMENTS (Notes)
create table documents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text default 'Sem título',
  content jsonb, -- TipTap JSON content
  is_archived boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS for Documents
alter table documents enable row level security;
create policy "Users can CRUD their own documents." on documents for all using (auth.uid() = user_id);

-- DEVOTIONALS (Daily generated content)
create table devotionals (
  id uuid default uuid_generate_v4() primary key,
  date date unique not null,
  verse_reference text not null,
  verse_text text not null,
  theological_explanation text not null,
  action_points jsonb, -- Array of strings
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS for Devotionals
alter table devotionals enable row level security;
create policy "Devotionals are viewable by everyone." on devotionals for select using (true);

-- Function to handle new user profile creation automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
