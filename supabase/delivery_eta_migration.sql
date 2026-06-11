-- ============================================================
-- Sell Something — Delivery ETA & buyer protection
-- Run in Supabase SQL Editor after escrow_migration.sql
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_eta TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_eta_note TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_satisfaction_note TEXT;
