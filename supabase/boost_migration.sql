-- Sponsored / boosted ads — run in Supabase SQL Editor
-- Products and services pin to top with "Sponsored" badge after admin approves.

CREATE TABLE IF NOT EXISTS boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('product', 'employee')),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  duration_days INT NOT NULL DEFAULT 7,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'active', 'expired', 'rejected', 'cancelled')),
  payment_method TEXT,
  payment_reference TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT boost_target_check CHECK (
    (target_type = 'product' AND product_id IS NOT NULL AND employee_id IS NULL)
    OR (target_type = 'employee' AND employee_id IS NOT NULL AND product_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_boosts_status ON boosts(status);
CREATE INDEX IF NOT EXISTS idx_boosts_user ON boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_boosts_product ON boosts(product_id);
CREATE INDEX IF NOT EXISTS idx_boosts_employee ON boosts(employee_id);

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS boost_ends_at TIMESTAMPTZ;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS boost_ends_at TIMESTAMPTZ;
