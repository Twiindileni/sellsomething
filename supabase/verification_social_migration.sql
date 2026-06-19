-- Verification social links (run in Supabase SQL Editor after seller_trust_migration.sql)
-- ID photos are emailed to admin only — not stored in the database.

alter table public.profiles
  add column if not exists verification_social_facebook text;

alter table public.profiles
  add column if not exists verification_social_instagram text;

alter table public.profiles
  add column if not exists verification_social_tiktok text;

alter table public.profiles
  add column if not exists verification_social_linkedin text;

alter table public.profiles
  add column if not exists verification_note text;
