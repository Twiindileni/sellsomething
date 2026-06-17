-- ============================================================
-- Sell Something — Escrow & Orders Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Add fee_acknowledged column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS fee_acknowledged BOOLEAN DEFAULT FALSE;

-- 2. Add is_admin flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 3. Create orders table (escrow)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  buyer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  buyer_email TEXT,
  seller_email TEXT,
  product_title TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  ad_fee NUMERIC(12, 2) DEFAULT 25.00,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment',
      'payment_received',
      'in_delivery',
      'delivered',
      'confirmed',
      'disputed',
      'refunded',
      'completed'
    )),
  payment_method TEXT DEFAULT 'easywallet',
  payment_reference TEXT,
  dispute_reason TEXT,
  buyer_confirmed_at TIMESTAMPTZ,
  seller_paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  delivery_eta TIMESTAMPTZ,
  delivery_eta_note TEXT,
  buyer_satisfaction_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS on orders (optional but recommended)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Buyers can view own orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;
DROP POLICY IF EXISTS "Buyers and sellers can update orders" ON orders;

-- Allow buyers and sellers (by ID or email) to read their own orders
CREATE POLICY "Buyers and sellers can view own orders" ON orders
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR seller_email = auth.email());

-- Allow authenticated users to insert orders as buyer
CREATE POLICY "Authenticated users can create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Allow updates by buyer or seller (by ID or email)
CREATE POLICY "Buyers and sellers can update orders" ON orders
  FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR seller_email = auth.email());

-- Admins can view and manage all orders (used by /api/orders/admin)
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Admins can update all orders" ON orders;
CREATE POLICY "Admins can update all orders" ON orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- 5. Admin RPC functions (server calls these when no service-role key is set)
-- Also in supabase/admin_orders.sql for existing databases.
CREATE OR REPLACE FUNCTION public.get_all_orders_for_admin()
RETURNS SETOF public.orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.*
  FROM public.orders o
  WHERE EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = TRUE
  )
  ORDER BY o.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id UUID,
  p_status TEXT
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.orders;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_status NOT IN (
    'pending_payment', 'payment_received', 'in_delivery',
    'delivered', 'confirmed', 'disputed', 'refunded', 'completed'
  ) THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE public.orders
  SET
    status = p_status,
    updated_at = NOW(),
    refunded_at = CASE WHEN p_status = 'refunded' THEN NOW() ELSE refunded_at END,
    seller_paid_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE seller_paid_at END
  WHERE id = p_order_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_orders_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(UUID, TEXT) TO authenticated;

-- 6. Set yourself as admin (replace with your email)
-- UPDATE profiles SET is_admin = TRUE WHERE email = 'your-admin@email.com';
