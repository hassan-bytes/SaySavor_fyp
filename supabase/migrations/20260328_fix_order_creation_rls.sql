-- ============================================================
-- COMPREHENSIVE FIX: Clean up all conflicting RLS policies
-- and ensure guest orders work correctly
-- ============================================================

-- First, DISABLE RLS entirely, then we'll re-enable with clean policies
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing order policies (clean slate) 
DROP POLICY IF EXISTS "Partners can view their own restaurant orders" ON orders;
DROP POLICY IF EXISTS "Partners can create orders for their restaurant" ON orders;
DROP POLICY IF EXISTS "Partners can update their own restaurant orders" ON orders;
DROP POLICY IF EXISTS "Partners can delete their own restaurant orders" ON orders;
DROP POLICY IF EXISTS "Customers can create orders via QR menu" ON orders;
DROP POLICY IF EXISTS "Customers can view their own orders" ON orders;
DROP POLICY IF EXISTS "Enable Read for Restaurant Owners" ON orders;
DROP POLICY IF EXISTS "Enable Update for Restaurant Owners" ON orders;
DROP POLICY IF EXISTS "Enable Insert for Public" ON orders;
DROP POLICY IF EXISTS "Enable Read for Public by Order ID" ON orders;
DROP POLICY IF EXISTS "Order Visibility" ON orders;
DROP POLICY IF EXISTS "Enable insert for everyone" ON orders;
DROP POLICY IF EXISTS "Enable select for everyone" ON orders;
DROP POLICY IF EXISTS "Enable update for everyone" ON orders;
DROP POLICY IF EXISTS "Enable Delete for Restaurant Owners" ON orders;

-- Drop ALL existing order_items policies (clean slate)
DROP POLICY IF EXISTS "Partners can view order items for their restaurant" ON order_items;
DROP POLICY IF EXISTS "Partners can create order items for their restaurant" ON order_items;
DROP POLICY IF EXISTS "Partners can update order items for their restaurant" ON order_items;
DROP POLICY IF EXISTS "Partners can delete order items for their restaurant" ON order_items;
DROP POLICY IF EXISTS "Enable insert for order_items everyone" ON order_items;
DROP POLICY IF EXISTS "Enable select for order_items everyone" ON order_items;
DROP POLICY IF EXISTS "Enable update for order_items everyone" ON order_items;

-- NOW RE-ENABLE RLS on both tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ORDERS TABLE - SIMPLE WORKING POLICIES
-- ============================================================

-- Policy 1: Allow INSERT for everyone (guests & customers)
CREATE POLICY "allow_insert_orders"
ON orders
FOR INSERT
WITH CHECK (true);

-- Policy 2: Allow SELECT for partners (their restaurant orders)
CREATE POLICY "partner_view_orders"
ON orders
FOR SELECT
USING (
  -- Partner can see their own restaurant's orders
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE owner_id = auth.uid()::text
  )
);

-- Policy 3: Allow UPDATE for partners
CREATE POLICY "partner_update_orders"
ON orders
FOR UPDATE
USING (
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE owner_id = auth.uid()::text
  )
)
WITH CHECK (
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE owner_id = auth.uid()::text
  )
);

-- Policy 4: Allow DELETE for partners
CREATE POLICY "partner_delete_orders"
ON orders
FOR DELETE
USING (
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE owner_id = auth.uid()::text
  )
);

-- ============================================================
-- ORDER_ITEMS TABLE - SIMPLE WORKING POLICIES
-- ============================================================

-- Policy 1: Allow INSERT for everyone
CREATE POLICY "allow_insert_order_items"
ON order_items
FOR INSERT
WITH CHECK (true);

-- Policy 2: Allow SELECT for partners
CREATE POLICY "partner_view_order_items"
ON order_items
FOR SELECT
USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE owner_id = auth.uid()::text
    )
  )
);

-- Policy 3: Allow UPDATE for partners
CREATE POLICY "partner_update_order_items"
ON order_items
FOR UPDATE
USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE owner_id = auth.uid()::text
    )
  )
)
WITH CHECK (
  order_id IN (
    SELECT id FROM orders 
    WHERE restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE owner_id = auth.uid()::text
    )
  )
);

-- Policy 4: Allow DELETE for partners
CREATE POLICY "partner_delete_order_items"
ON order_items
FOR DELETE
USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE owner_id = auth.uid()::text
    )
  )
);

-- ============================================================
-- VERIFY
-- ============================================================
-- After running this migration:
-- 1. RLS is ON but allows INSERT for everyone
-- 2. Partners can READ/UPDATE/DELETE their orders
-- 3. Guests can create orders via QR menu
