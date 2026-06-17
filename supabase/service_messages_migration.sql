-- Service provider in-app messaging (run in Supabase SQL Editor)
-- Allows messages tied to an employee profile instead of a product listing.

alter table public.messages alter column product_id drop not null;

alter table public.messages
  add column if not exists employee_id uuid references public.employees (id) on delete cascade;

create index if not exists messages_employee_idx on public.messages (employee_id);

alter table public.messages drop constraint if exists messages_context_check;

alter table public.messages
  add constraint messages_context_check
  check (
    (product_id is not null and employee_id is null)
    or (product_id is null and employee_id is not null)
  );

-- Link older service profiles to the account that posted them
update public.employees e
set user_id = p.id
from public.profiles p
where e.user_id is null
  and e.contact_email is not null
  and lower(e.contact_email) = lower(p.email);
