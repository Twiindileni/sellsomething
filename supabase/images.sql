-- ─────────────────────────────────────────────────────────────────────────────
-- Sell Something — Multiple product images (up to 4 per listing)
-- Run in Supabase SQL Editor if you already have the products table.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.products
  add column if not exists images text[] default '{}';

-- Copy existing single image into the new array
update public.products
set images = array[image]
where image is not null
  and (images is null or images = '{}');
