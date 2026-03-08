-- Add inventory management fields to menu_items table
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS stock_count INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS is_stock_managed BOOLEAN DEFAULT FALSE;

-- Update RLS (optional, since 'Owners manage menu' policy usually covers all columns, 
-- but good to verify it's enabled)
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
