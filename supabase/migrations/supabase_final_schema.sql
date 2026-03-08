-- ====================================================================
-- 🚀 SAYSAVOR ULTIMATE PRODUCTION SCHEMA (v3.0 - The "Real" Deal)
-- ====================================================================

-- 0. EXTENSIONS (For Automation)
CREATE EXTENSION IF NOT EXISTS "moddatetime"; -- Auto-update 'updated_at'

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('partner', 'customer', 'admin');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'cooking', 'ready', 'delivered', 'cancelled');

-- 2. PROFILES
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text,
  full_name text,
  role user_role DEFAULT 'customer',
  phone text,
  avatar_url text,
  setup_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now() -- ⚡ Auto-updating
);

-- Automation Trigger for Profiles
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- 3. RESTAURANTS
CREATE TABLE public.restaurants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  slug text, -- We can make this UNIQUE via index if needed, but safe to keep standard
  description text,
  address text,
  phone text,
  opens_at text,
  closes_at text,
  logo_url text,
  banner_url text,
  is_open boolean DEFAULT true,
  min_order_price numeric DEFAULT 0 CHECK (min_order_price >= 0), -- 🛡️ Reality Check
  delivery_fee numeric DEFAULT 0 CHECK (delivery_fee >= 0),       -- 🛡️ Reality Check
  cuisine_type text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- 4. CATEGORIES (Relational)
CREATE TABLE public.categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
  -- Categories usually don't need updated_at, but good for sync
);

-- 5. MENU ITEMS
CREATE TABLE public.menu_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0), -- 🛡️ Money Protection
  image_url text,
  is_available boolean DEFAULT true,
  options jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- 6. ORDERS
CREATE TABLE public.orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status order_status DEFAULT 'pending',
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  delivery_address text,
  customer_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- 7. ORDER ITEMS
CREATE TABLE public.order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES public.menu_items(id),
  item_name text NOT NULL,
  quantity int DEFAULT 1 CHECK (quantity > 0),
  price_at_order numeric NOT NULL,
  options_selected jsonb
);

-- ====================================================================
-- 🔒 SECURITY (RLS) - "Crash Proof" Policies
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles view" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Restaurants
CREATE POLICY "Public view restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Owners manage own" ON public.restaurants FOR ALL USING (auth.uid() = owner_id);

-- Categories
CREATE POLICY "Public view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Owners manage categories" ON public.categories FOR ALL USING (
  restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
);

-- Menu Items
CREATE POLICY "Public view menu" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Owners manage menu" ON public.menu_items FOR ALL USING (
  restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
);

-- Orders (Strict Visibility)
CREATE POLICY "Order Visibility" ON public.orders FOR ALL USING (
  auth.uid() = customer_id OR 
  restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
);

CREATE POLICY "Order Items Visibility" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND (
    customer_id = auth.uid() OR 
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  ))
);

-- ====================================================================
-- ⚙️ TRIGGERS & FUNCTIONS (The Brain)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  is_partner boolean;
BEGIN
  -- Determine role
  is_partner := (COALESCE(NEW.raw_user_meta_data->>'role', 'customer') = 'partner');

  -- 1. Create Profile
  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'), 
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::user_role,
    NEW.raw_user_meta_data->>'phone'
  );

  -- 2. Create Restaurant Placeholder (Only for Partners)
  IF is_partner THEN
    INSERT INTO public.restaurants (owner_id, name, is_open)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'My New Restaurant'), 
      true
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't crash signup if possible (or raise if critical)
  RAISE WARNING 'Signup Trigger Error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropping existing to ensure clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ====================================================================
-- ⚡ REALTIME & STORAGE
-- ====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('restaurant-logos', 'restaurant-logos', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public View Images" ON storage.objects FOR SELECT USING (bucket_id IN ('menu-images', 'restaurant-logos'));
CREATE POLICY "Auth Upload Images" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
