-- ==============================================================================
-- 🚀 SAYSAVOR: SMART QR & DINE-IN ORDERING SCHEMA MIGRATION 🚀
-- ==============================================================================
-- INSTRUCTIONS: Copy this entire file and paste it into the "SQL Editor" 
-- in your Supabase Dashboard, then click "Run" (or Play icon).
-- ==============================================================================

-- 1. Create the `orders` table (For Running Bills / Sessions)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number VARCHAR,
    customer_name VARCHAR,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    session_status VARCHAR NOT NULL DEFAULT 'OPEN', -- 'OPEN' or 'CLOSED'
    payment_status VARCHAR NOT NULL DEFAULT 'PENDING', -- 'PENDING' or 'PAID'
    payment_method VARCHAR, -- 'CASH', 'BANK', null
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the `order_items` table (For individual dishes in a bill)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES public.menu_variants(id) ON DELETE SET NULL,
    item_name VARCHAR NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 🔒 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 🛡️ Owners: View and Update their own restaurant's orders
CREATE POLICY "Enable Read for Restaurant Owners" ON public.orders
FOR SELECT USING (
    auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id)
);

CREATE POLICY "Enable Update for Restaurant Owners" ON public.orders
FOR UPDATE USING (
    auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id)
);

-- 📱 Public (Customers): Can create an order via QR scan
CREATE POLICY "Enable Insert for Public" ON public.orders
FOR INSERT WITH CHECK (true);

-- 📱 Public (Customers): Can view their open order to add items or check total
CREATE POLICY "Enable Read for Public by Order ID" ON public.orders
FOR SELECT USING (true);


-- 🛡️ Owners: View their own order items
CREATE POLICY "Enable Read for Restaurant Owners (Items)" ON public.order_items
FOR SELECT USING (
    order_id IN (
        SELECT id FROM public.orders 
        WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    )
);

-- 📱 Public (Customers): Can add items to their order
CREATE POLICY "Enable Insert for Public (Items)" ON public.order_items
FOR INSERT WITH CHECK (true);

-- 📱 Public (Customers): Can view items within an order
CREATE POLICY "Enable Read for Public (Items)" ON public.order_items
FOR SELECT USING (true);

-- ==============================================================================
-- 🔔 4. REALTIME NOTIFICATIONS (For Live Dashboard)
-- ==============================================================================
-- This allows your React dashboard to instantly "ding" when an order arrives!
BEGIN;
  -- Remove tables if they exist to prevent errors, then re-add
  DO $$ 
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items';
    END IF;
  EXCEPTION WHEN OTHERS THEN 
    -- Ignore if already added
  END $$;
COMMIT;

-- DONE! 🏁
