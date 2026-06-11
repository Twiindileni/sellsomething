-- ============================================================
-- Sell Something — Admin order access (run in Supabase SQL Editor)
-- Fixes admin dashboard showing zero orders when RLS blocks reads.
-- Uses SECURITY DEFINER so admins see all orders via their login token.
-- ============================================================

-- Admins can read all orders (RLS policy — optional extra layer)
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

-- RPC: fetch all orders (bypasses RLS, still checks is_admin inside)
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

-- RPC: admin status update (bypasses RLS, still checks is_admin inside)
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
