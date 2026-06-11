-- Add contact phone for sellers (run in Supabase SQL Editor)
alter table public.profiles
  add column if not exists phone text;

alter table public.products
  add column if not exists seller_phone text;
