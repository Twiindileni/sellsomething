-- Re-engagement email tracking (run in Supabase SQL Editor)
-- Requires service role on server for campaign sends + auth user list.

alter table public.profiles
  add column if not exists marketing_emails_enabled boolean not null default true;

alter table public.profiles
  add column if not exists last_reengagement_email_at timestamptz;

create table if not exists public.email_campaign_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles (id) on delete set null,
  email         text not null,
  segment       text not null,
  subject       text not null,
  resend_id     text,
  status        text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  error_message text,
  created_at    timestamptz not null default now()
);

create index if not exists email_campaign_log_created_at_idx
  on public.email_campaign_log (created_at desc);

create index if not exists email_campaign_log_user_id_idx
  on public.email_campaign_log (user_id);

alter table public.email_campaign_log enable row level security;

-- Admins can read logs via authenticated admin session (is_admin on profiles)
create policy "Admins can read email campaign log"
  on public.email_campaign_log for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
