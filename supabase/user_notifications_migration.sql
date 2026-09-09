-- In-app notifications (admin broadcasts + system alerts)
-- Run in Supabase SQL Editor

create table if not exists public.user_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  body        text not null,
  url         text,
  type        text not null default 'admin',
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists user_notifications_user_idx
  on public.user_notifications (user_id, created_at desc);

create index if not exists user_notifications_unread_idx
  on public.user_notifications (user_id)
  where read_at is null;

alter table public.user_notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.user_notifications;
create policy "Users can read own notifications"
  on public.user_notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can mark own notifications read" on public.user_notifications;
create policy "Users can mark own notifications read"
  on public.user_notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
