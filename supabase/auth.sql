-- ─────────────────────────────────────────────────────────────────────────────
-- Sell Something — Auth schema (login & register)
-- Run in Supabase: SQL Editor → New Query → Run
--
-- Login/register use Supabase Auth (auth.users). This file adds:
--   • public.profiles — app user data linked to auth.users
--   • trigger — auto-create a profile when someone signs up
--   • products.seller_id — optional link from listings to the seller
--
-- If you already ran schema.sql before auth existed, run THIS file only.
-- For a fresh database, use schema.sql (it includes everything below).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Profiles (one row per registered user) ─────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Marketplace shows seller names on listings
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ─── Auto-create profile on sign up (register) ───────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Link listings to registered sellers (optional) ─────────────────────────
alter table public.products
  add column if not exists seller_id uuid references public.profiles (id) on delete set null;

create index if not exists products_seller_id_idx on public.products (seller_id);

-- ─── Keep updated_at in sync ─────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
