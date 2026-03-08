-- ⚠️ CRITICAL: Run this first before anything else!
-- This adds the cuisine column to menu_items table

-- Step 1: Add cuisine column
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS cuisine TEXT;

-- Step 2: Add comment
COMMENT ON COLUMN public.menu_items.cuisine IS 'Cuisine type (e.g., Italian, Desi, Fast Food) for image path resolution';

-- Step 3: Create index
CREATE INDEX IF NOT EXISTS idx_menu_items_cuisine ON public.menu_items(cuisine);

-- ✅ After running this:
-- 1. Go to Table Editor
-- 2. Select menu_items table
-- 3. DELETE all existing rows (they have NULL cuisine)
-- 4. Go back to your app and run Restaurant Setup again
