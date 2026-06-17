-- Verification decline / reapply (run in Supabase SQL Editor after seller_trust_migration.sql)

alter table public.profiles
  add column if not exists verification_rejected_at timestamptz;

alter table public.profiles
  add column if not exists verification_rejection_code text;

alter table public.profiles
  add column if not exists verification_rejection_reason text;
