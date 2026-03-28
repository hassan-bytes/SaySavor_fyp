-- ============================================================
-- Enable Public Read Access for Real-Time Menu Subscriptions
-- Customers need to subscribe to menu changes
-- ============================================================

-- Add public read policies so customers can see menu items in real-time
-- The filter in useMenuRealtime.ts references menu_items which HAS restaurant_id

-- 1. CREATE public read policy for menu_variants (sizes, pricing)
CREATE POLICY "Public read variants" ON menu_variants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM menu_items mi
      WHERE mi.id = menu_variants.item_id
      AND mi.is_available = true
    )
  );

-- 2. CREATE public read policy for menu_modifier_groups (add-on groups)
CREATE POLICY "Public read modifier groups" ON menu_modifier_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM menu_items mi
      WHERE mi.id = menu_modifier_groups.item_id
      AND mi.is_available = true
    )
  );

-- 3. CREATE public read policy for menu_modifiers (specific add-on options)
CREATE POLICY "Public read modifiers" ON menu_modifiers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM menu_modifier_groups mg
      JOIN menu_items mi ON mi.id = mg.item_id
      WHERE mg.id = menu_modifiers.group_id
      AND mi.is_available = true
      AND menu_modifiers.is_available = true
    )
  );

-- 4. Enable realtime broadcast on these tables
-- (restart Supabase replication if not working)
ALTER PUBLICATION supabase_realtime ADD TABLE menu_variants;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_modifier_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_modifiers;

-- 5. Make sure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_menu_variants_item_id ON menu_variants(item_id);
CREATE INDEX IF NOT EXISTS idx_menu_modifier_groups_item_id ON menu_modifier_groups(item_id);
CREATE INDEX IF NOT EXISTS idx_menu_modifiers_group_id ON menu_modifiers(group_id);
