-- ====================================================================
-- Phase 0: Restaurant Settings Contract Stabilization
-- Purpose: Keep partner settings payload and DB schema aligned.
-- ====================================================================

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS operating_days text[] DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun']::text[],
  ADD COLUMN IF NOT EXISTS is_delivery boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_areas text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS dashboard_lang text;

-- Normalize nulls so the frontend always receives predictable shapes.
UPDATE public.restaurants
SET
  operating_days = COALESCE(operating_days, ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun']::text[]),
  is_delivery = COALESCE(is_delivery, true),
  delivery_areas = COALESCE(delivery_areas, ARRAY[]::text[])
WHERE operating_days IS NULL
   OR is_delivery IS NULL
   OR delivery_areas IS NULL;
