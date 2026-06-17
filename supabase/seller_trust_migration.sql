-- Seller trust + sold listings (run in Supabase SQL Editor)

-- Verified seller badge (admin approves after phone on profile)
alter table public.profiles
  add column if not exists is_verified_seller boolean not null default false;

alter table public.profiles
  add column if not exists verification_requested_at timestamptz;

alter table public.profiles
  add column if not exists phone_verified_at timestamptz;

-- Sellers mark listings sold (hidden from browse; seller can relist)
alter table public.products
  add column if not exists is_sold boolean not null default false;

alter table public.products
  add column if not exists sold_at timestamptz;

create index if not exists products_is_sold_idx
  on public.products (is_sold)
  where is_sold = false;
