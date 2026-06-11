-- ─────────────────────────────────────────────────────────────────────────────
-- Sell Something — In-App Messaging Table
-- Run in Supabase: SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles (id) on delete cascade,
  receiver_id  uuid not null references public.profiles (id) on delete cascade,
  product_id   uuid references public.products (id) on delete cascade,
  employee_id  uuid references public.employees (id) on delete cascade,
  content      text not null check (char_length(content) > 0),
  created_at   timestamptz not null default now(),
  check (
    (product_id is not null and employee_id is null)
    or (product_id is null and employee_id is not null)
  )
);

-- Enable RLS
alter table public.messages enable row level security;

-- Indexing for fast conversation listing and thread fetching
create index if not exists messages_sender_idx on public.messages (sender_id);
create index if not exists messages_receiver_idx on public.messages (receiver_id);
create index if not exists messages_product_idx on public.messages (product_id);
create index if not exists messages_employee_idx on public.messages (employee_id);
create index if not exists messages_created_at_idx on public.messages (created_at desc);

-- Policies
create policy "Users can view their own messages"
  on public.messages for select
  using (
    auth.uid() = sender_id or auth.uid() = receiver_id
  );

create policy "Users can insert their own sent messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
  );
