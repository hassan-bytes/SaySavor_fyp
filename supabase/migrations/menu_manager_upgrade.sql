-- =========================================
-- MENU MANAGER DATABASE UPGRADE (v2.0)
-- Sales Engine: Deals, Inventory, Advanced Modifiers, AI
-- =========================================

-- 1. Upgrade menu_items table for new features
ALTER TABLE menu_items 
  ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'single', -- 'single' or 'deal'
  ADD COLUMN IF NOT EXISTS deal_items JSONB, -- For deals: [{item_id: uuid, quantity: number}]
  ADD COLUMN IF NOT EXISTS original_price NUMERIC, -- For deals: shows "was Rs. 800"
  ADD COLUMN IF NOT EXISTS tags TEXT[], -- ['spicy', 'veg', 'bestseller', 'new', 'halal']
  ADD COLUMN IF NOT EXISTS ai_description TEXT, -- AI-generated description
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true, -- Quick toggle
  ADD COLUMN IF NOT EXISTS stock_count INTEGER, -- NULL = unlimited, 0 = sold out
  ADD COLUMN IF NOT EXISTS available_start_time TIME, -- Breakfast only etc.
  ADD COLUMN IF NOT EXISTS available_end_time TIME;

-- 2. Create menu_variants table (for sizes: Small/Medium/Large)
CREATE TABLE IF NOT EXISTS menu_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Small", "Medium", "Large"
  price NUMERIC NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create menu_modifier_groups table (NEW! For structured add-ons)
-- Example: "Choose Your Sauce" (Select 1), "Extra Toppings" (Select up to 3)
CREATE TABLE IF NOT EXISTS menu_modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Choose Sauce"
  min_selection INTEGER DEFAULT 0, -- 0 = Optional, 1 = Required
  max_selection INTEGER DEFAULT 1, -- 1 = Single select, >1 = Multi select
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Create menu_modifiers table (The actual options inside groups)
CREATE TABLE IF NOT EXISTS menu_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES menu_modifier_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Garlic Mayo", "Extra Cheese"
  price NUMERIC DEFAULT 0, -- Additional cost
  is_available BOOLEAN DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_menu_items_type ON menu_items(item_type);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_variants_item ON menu_variants(item_id);
CREATE INDEX IF NOT EXISTS idx_menu_modifier_groups_item ON menu_modifier_groups(item_id);
CREATE INDEX IF NOT EXISTS idx_menu_modifiers_group ON menu_modifiers(group_id);

-- 6. Add RLS policies for new tables
ALTER TABLE menu_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_modifiers ENABLE ROW LEVEL SECURITY;

-- Helper policy function for succinct RLS
CREATE OR REPLACE FUNCTION auth_is_owner(item_uuid uuid) RETURNS boolean AS $$
SELECT EXISTS (
  SELECT 1 FROM menu_items mi
  JOIN restaurants r ON r.id = mi.restaurant_id
  WHERE mi.id = item_uuid
  AND r.owner_id = auth.uid()
);
$$ LANGUAGE sql SECURITY DEFINER;

-- Variants Policies
CREATE POLICY "Partners manage variants" ON menu_variants
  USING (auth_is_owner(item_id))
  WITH CHECK (auth_is_owner(item_id));

-- Modifier Groups Policies
CREATE POLICY "Partners manage modifier groups" ON menu_modifier_groups
  USING (auth_is_owner(item_id))
  WITH CHECK (auth_is_owner(item_id));

-- Modifiers Policies (Linked via group_id)
CREATE POLICY "Partners manage modifiers" ON menu_modifiers
  USING (EXISTS (
    SELECT 1 FROM menu_modifier_groups mg
    WHERE mg.id = group_id AND auth_is_owner(mg.item_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM menu_modifier_groups mg
    WHERE mg.id = group_id AND auth_is_owner(mg.item_id)
  ));

-- 7. Grant permissions
GRANT ALL ON menu_variants TO authenticated;
GRANT ALL ON menu_modifier_groups TO authenticated;
GRANT ALL ON menu_modifiers TO authenticated;

-- 8. Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Add triggers for updated_at
CREATE TRIGGER update_menu_variants_timestamp BEFORE UPDATE ON menu_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modifier_groups_timestamp BEFORE UPDATE ON menu_modifier_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modifiers_timestamp BEFORE UPDATE ON menu_modifiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Create temp-uploads bucket for AI scanner (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('temp-uploads', 'temp-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- 10. Add RLS policy for temp-uploads
CREATE POLICY "Partners can upload to temp-uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'temp-uploads'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Partners can read their temp uploads" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'temp-uploads'
    AND auth.role() = 'authenticated'
  );

