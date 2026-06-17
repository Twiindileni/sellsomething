-- Buyer tracking timestamps & product rating (run in Supabase SQL Editor)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS in_delivery_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_rating SMALLINT CHECK (buyer_rating IS NULL OR (buyer_rating >= 1 AND buyer_rating <= 5));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_review TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;
