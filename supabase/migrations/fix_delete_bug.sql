-- ==============================================================================
-- 🚨 SAYSAVOR: FIX SILENT DELETE BUG IN SUPABASE 🚨
-- ==============================================================================
-- INSTRUCTIONS: Copy this entire file and paste it into the "SQL Editor" 
-- in your Supabase Dashboard, then click "Run" (or Play icon).
-- ==============================================================================

-- 1. Allow Restaurant Owners to delete their Orders
CREATE POLICY "Enable Delete for Restaurant Owners" ON public.orders
FOR DELETE USING (
    auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id)
);

-- 2. Allow Restaurant Owners to delete individual items from a Running Bill
CREATE POLICY "Enable Delete for Restaurant Owners (Items)" ON public.order_items
FOR DELETE USING (
    order_id IN (
        SELECT id FROM public.orders 
        WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    )
);

-- 3. Allow Restaurant Owners to Update order items (e.g. changing quantity)
CREATE POLICY "Enable Update for Restaurant Owners (Items)" ON public.order_items
FOR UPDATE USING (
    order_id IN (
        SELECT id FROM public.orders 
        WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    )
);

-- DONE! 🏁
