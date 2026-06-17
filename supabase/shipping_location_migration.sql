-- Add buyer shipping / delivery location to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_location TEXT;
