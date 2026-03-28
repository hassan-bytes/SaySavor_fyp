-- ============================================================
-- Multi-Tenant Row Level Security (RLS) Policies
-- Created: March 27, 2026
-- Purpose: Enforce data isolation between restaurants
-- ============================================================

-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Enable RLS on order_items table
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ORDERS TABLE POLICIES
-- ============================================================

-- DROP existing policies if they exist (for clean migration)
DROP POLICY IF EXISTS "Partners can view their own restaurant orders" ON orders;
DROP POLICY IF EXISTS "Partners can create orders for their restaurant" ON orders;
DROP POLICY IF EXISTS "Partners can update their own restaurant orders" ON orders;
DROP POLICY IF EXISTS "Partners can delete their own restaurant orders" ON orders;

-- SELECT: Partners can only view orders from their restaurant
CREATE POLICY "Partners can view their own restaurant orders"
ON orders
FOR SELECT
USING (
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE owner_id = auth.uid()
  )
);

-- INSERT: Partners can only create orders for their restaurant
CREATE POLICY "Partners can create orders for their restaurant"
ON orders
FOR INSERT
WITH CHECK (
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE owner_id = auth.uid()
  )
);

-- UPDATE: Partners can only update orders from their restaurant
CREATE POLICY "Partners can update their own restaurant orders"
ON orders
FOR UPDATE
USING (
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  -- Ensure restaurant_id cannot be changed to a restaurant they don't own
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE owner_id = auth.uid()
  )
);

-- DELETE: Partners can only delete orders from their restaurant
CREATE POLICY "Partners can delete their own restaurant orders"
ON orders
FOR DELETE
USING (
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE owner_id = auth.uid()
  )
);

-- ============================================================
-- ORDER_ITEMS TABLE POLICIES
-- ============================================================

-- DROP existing policies if they exist
DROP POLICY IF EXISTS "Partners can view order items for their restaurant" ON order_items;
DROP POLICY IF EXISTS "Partners can create order items for their restaurant" ON order_items;
DROP POLICY IF EXISTS "Partners can update order items for their restaurant" ON order_items;
DROP POLICY IF EXISTS "Partners can delete order items for their restaurant" ON order_items;

-- SELECT: Partners can only view order items from their restaurant's orders
CREATE POLICY "Partners can view order items for their restaurant"
ON order_items
FOR SELECT
USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE owner_id = auth.uid()
    )
  )
);

-- INSERT: Partners can only create order items for their restaurant's orders
CREATE POLICY "Partners can create order items for their restaurant"
ON order_items
FOR INSERT
WITH CHECK (
  order_id IN (
    SELECT id FROM orders 
    WHERE restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE owner_id = auth.uid()
    )
  )
);

-- UPDATE: Partners can only update order items from their restaurant's orders
CREATE POLICY "Partners can update order items for their restaurant"
ON order_items
FOR UPDATE
USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE owner_id = auth.uid()
    )
  )
)
WITH CHECK (
  -- Ensure order_id cannot be changed to an order from another restaurant
  order_id IN (
    SELECT id FROM orders 
    WHERE restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE owner_id = auth.uid()
    )
  )
);

-- DELETE: Partners can only delete order items from their restaurant's orders
CREATE POLICY "Partners can delete order items for their restaurant"
ON order_items
FOR DELETE
USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE owner_id = auth.uid()
    )
  )
);

-- ============================================================
-- CUSTOMER ACCESS POLICIES (for QR menu orders)
-- ============================================================

-- Allow anonymous/authenticated customers to INSERT orders
-- This is needed for QR menu ordering
CREATE POLICY "Customers can create orders via QR menu"
ON orders
FOR INSERT
WITH CHECK (
  -- Allow if restaurant_id exists and is valid
  restaurant_id IN (SELECT id FROM restaurants)
);

-- Allow customers to view their own orders (by customer_id or session)
CREATE POLICY "Customers can view their own orders"
ON orders
FOR SELECT
USING (
  -- Customer can see orders they created
  auth.uid() = customer_id
);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Run these queries to verify RLS is working:

-- 1. Check RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename IN ('orders', 'order_items');
-- Expected: rowsecurity = true for both

-- 2. List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('orders', 'order_items')
-- ORDER BY tablename, policyname;

-- 3. Test as partner (should only see their restaurant's orders)
-- SELECT COUNT(*) FROM orders;
-- Expected: Only orders from authenticated partner's restaurant

-- 4. Test cross-restaurant access (should fail)
-- INSERT INTO orders (restaurant_id, ...) 
-- VALUES ('other-restaurant-id', ...);
-- Expected: Policy violation error

-- ============================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================

-- If you need to rollback these policies:
-- DROP POLICY "Partners can view their own restaurant orders" ON orders;
-- DROP POLICY "Partners can create orders for their restaurant" ON orders;
-- DROP POLICY "Partners can update their own restaurant orders" ON orders;
-- DROP POLICY "Partners can delete their own restaurant orders" ON orders;
-- DROP POLICY "Partners can view order items for their restaurant" ON order_items;
-- DROP POLICY "Partners can create order items for their restaurant" ON order_items;
-- DROP POLICY "Partners can update order items for their restaurant" ON order_items;
-- DROP POLICY "Partners can delete order items for their restaurant" ON order_items;
-- DROP POLICY "Customers can create orders via QR menu" ON orders;
-- DROP POLICY "Customers can view their own orders" ON orders;
-- ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
