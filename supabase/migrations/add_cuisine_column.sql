-- ====================================================================
-- 🍽️ MENU ITEMS SCHEMA UPDATE - Add Cuisine Column
-- ====================================================================
-- This migration adds a cuisine column to menu_items table
-- to support proper local image loading from public/cuisines/

-- Add cuisine column to menu_items
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS cuisine TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.menu_items.cuisine IS 'Cuisine type (e.g., Italian, Desi, Fast Food) for image path resolution';

-- Optional: Create index for faster cuisine-based queries
CREATE INDEX IF NOT EXISTS idx_menu_items_cuisine ON public.menu_items(cuisine);
