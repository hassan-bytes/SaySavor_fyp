-- ============================================================
-- FIX: Guest orders not visible to partners
-- Partner should see ALL orders for their restaurant, 
-- regardless of who created them (guest or authenticated)
-- ============================================================

-- Drop the restrictive partner_view_orders policy
DROP POLICY IF EXISTS "partner_view_orders" ON orders;

-- Create new policy that allows partners to see ALL orders for their restaurant
-- This will include both guest orders and authenticated customer orders
CREATE POLICY "partner_view_all_restaurant_orders"
ON orders
FOR SELECT
USING (
  -- Partner can see ALL orders for restaurants they own
  -- (regardless of who created/paid for the order)
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE owner_id = auth.uid()::text
  )
);

-- ============================================================
-- VERIFY
-- ============================================================
-- After running this migration:
-- 1. Partners CAN see guest orders from their restaurant
-- 2. Guest orders are no longer invisible to partners
-- 3. Order workflow: guest creates → partner sees → partner accepts/cooks/delivers
