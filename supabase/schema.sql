-- ─────────────────────────────────────────────────────────────────────────────
-- Sell Something — Full Supabase Schema
-- Run this in your Supabase project: SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- AUTH — Login & register (Supabase Auth + profiles)
-- Credentials live in auth.users (managed by Supabase).
-- App-facing user data lives in public.profiles.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile when a user registers (signUp)
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

-- ═══════════════════════════════════════════════════════════════════════════
-- PRODUCTS — Marketplace listings
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text default '',
  price        numeric(12, 2) not null check (price >= 0),
  category     text not null,
  location     text default '',
  seller       text not null,
  seller_email text not null,
  seller_id    uuid references public.profiles (id) on delete set null,
  image        text,
  images       text[] default '{}',
  created_at   timestamptz default now()
);

create index if not exists products_seller_id_idx on public.products (seller_id);

alter table public.products enable row level security;

-- Public marketplace: anyone can browse
create policy "Anyone can view products"
  on public.products for select
  using (true);

-- Open insert/update/delete for now (Express API uses anon key).
-- Tighten later: require auth.uid() = seller_id for write operations.
create policy "Anyone can insert products"
  on public.products for insert
  with check (true);

create policy "Anyone can update products"
  on public.products for update
  using (true);

create policy "Anyone can delete products"
  on public.products for delete
  using (true);

-- ─── Seed data (optional — remove before production) ────────────────────────
insert into public.products (title, description, price, category, location, seller, seller_email)
values
  ('Samsung Galaxy S22', 'Excellent condition, barely used. Comes with original charger and box.', 8500, 'Electronics', 'Windhoek', 'Tomas N.', 'tomas@example.com'),
  ('Leather Sofa Set (3+2)', 'Brown leather sofa set in great shape. Moving out sale, must go.', 12000, 'Furniture', 'Swakopmund', 'Maria K.', 'maria@example.com'),
  ('Toyota Hilux 2019', 'Single cab, 2.4L diesel. Low mileage. Full service history available.', 285000, 'Vehicles', 'Walvis Bay', 'Johan S.', 'johan@example.com');
