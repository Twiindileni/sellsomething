-- ─────────────────────────────────────────────────────────────────────────────
-- Employees & Reviews Schema
-- Run this in your Supabase project: SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create employees table
create table if not exists public.employees (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles (id) on delete cascade,
  name            text not null,
  profession      text not null,
  description     text not null,
  references_text text,
  image           text,
  images          text[] default '{}',
  rating          numeric(3, 2) default 0,
  review_count    int default 0,
  contact_email   text not null,
  location        text default '',
  created_at      timestamptz default now()
);

alter table public.employees enable row level security;

create policy "Anyone can view employees"
  on public.employees for select
  using (true);

create policy "Anyone can insert employees"
  on public.employees for insert
  with check (true);

create policy "Anyone can update employees"
  on public.employees for update
  using (true);

-- 2. Create reviews table
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid references public.employees (id) on delete cascade,
  reviewer_id   uuid references public.profiles (id) on delete cascade,
  reviewer_name text not null,
  rating        int not null check (rating >= 1 and rating <= 5),
  comment       text not null,
  created_at    timestamptz default now()
);

alter table public.reviews enable row level security;

create policy "Anyone can view reviews"
  on public.reviews for select
  using (true);

create policy "Anyone can insert reviews"
  on public.reviews for insert
  with check (true);

-- 3. Create a trigger function to automatically update the employee's average rating
create or replace function public.update_employee_rating()
returns trigger
language plpgsql
security definer
as $$
declare
  avg_rating numeric(3, 2);
  cnt int;
begin
  -- Calculate new average and count
  select count(*), coalesce(avg(rating), 0)
  into cnt, avg_rating
  from public.reviews
  where employee_id = new.employee_id;
  
  -- Update the employee record
  update public.employees
  set rating = avg_rating, review_count = cnt
  where id = new.employee_id;
  
  return new;
end;
$$;

-- Attach the trigger to the reviews table
drop trigger if exists on_review_inserted on public.reviews;
create trigger on_review_inserted
  after insert or update on public.reviews
  for each row execute function public.update_employee_rating();
