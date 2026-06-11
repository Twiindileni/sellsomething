-- ─────────────────────────────────────────────────────────────────────────────
-- Sell Something — Product image storage
-- Run in Supabase: SQL Editor → New Query → Run
-- Also create the bucket in Dashboard → Storage if this insert fails.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Anyone can view listing images
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Logged-in users can upload images
create policy "Authenticated users upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
  );

-- Users can replace or remove their own uploads
create policy "Users update own product images"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and auth.uid()::text = (storage.foldername (name))[1]
  );

create policy "Users delete own product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and auth.uid()::text = (storage.foldername (name))[1]
  );
