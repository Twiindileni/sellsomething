-- Seller payout preference on orders (run in Supabase SQL Editor)
-- Seller submits when starting delivery so admin knows how to pay after buyer confirms.

alter table public.orders
  add column if not exists seller_payout_method text;

alter table public.orders
  add column if not exists seller_payout_details text;

alter table public.orders
  add column if not exists seller_payout_submitted_at timestamptz;
