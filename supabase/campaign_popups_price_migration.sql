-- Add was_price and new_price to campaign_popups
ALTER TABLE public.campaign_popups
  ADD COLUMN IF NOT EXISTS was_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS new_price NUMERIC(10,2);
