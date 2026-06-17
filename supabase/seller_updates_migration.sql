-- Seller progress updates visible to buyer on live tracker
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_latest_update TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_latest_update_at TIMESTAMPTZ;
