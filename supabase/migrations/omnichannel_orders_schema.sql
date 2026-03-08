-- Omnichannel Hybrid POS Order System Schema
-- This script creates the `orders` and `order_items` tables to support Dine-in (Running Bills) and Online Deliveries.

-- 1. Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    table_number TEXT,                      -- e.g., '7', 'T-7', or NULL if delivery
    customer_name TEXT,                     -- Name from POS or Online Checkout
    customer_phone TEXT,                    -- Phone for notifications/delivery
    customer_address TEXT,                  -- Address for deliveries
    order_type TEXT NOT NULL DEFAULT 'DINE_IN', -- 'DINE_IN', 'TAKEAWAY', 'DELIVERY'
    total_amount NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    session_status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLOSED', 'PREPARING', 'DISPATCHED'
    payment_status TEXT NOT NULL DEFAULT 'PENDING',  -- 'PENDING', 'PAID'
    payment_method TEXT,                    -- 'CASH', 'BANK', 'ONLINE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Ensure basic integrity. e.g. Valid status strings.
-- In production, you might use ENUMs, but TEXT with CHECK is easier to migrate later.

-- Enable Row Level Security (RLS) on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 2. Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL, -- Nullable for custom POS items
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    total_price NUMERIC NOT NULL DEFAULT 0, -- quantity * unit_price + variants
    variant_details JSONB,                  -- Stores selected variants and addons (snapshot)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 3. Setup Default Policies
-- For simplicity in this demo environment, we allow public insert (Customer Menu) and select (Dashboard).
-- In a strict production system, you'd scope SELECT to `auth.uid() = restaurant.owner_id`.
CREATE POLICY "Enable insert for everyone" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for everyone" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Enable update for everyone" ON public.orders FOR UPDATE USING (true);

CREATE POLICY "Enable insert for everyone" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for everyone" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Enable update for everyone" ON public.order_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete for everyone" ON public.order_items FOR DELETE USING (true);
