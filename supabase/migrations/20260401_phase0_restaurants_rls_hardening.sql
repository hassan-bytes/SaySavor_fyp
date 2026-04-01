-- ====================================================================
-- Phase 0: Restaurants RLS Hardening
-- Purpose: Ensure only partner owners can manage their own restaurants.
-- ====================================================================

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Remove insecure or overly-broad legacy policies so this migration becomes
-- the single source of truth for restaurant write permissions.
DROP POLICY IF EXISTS "Partners can manage restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Owners manage own" ON public.restaurants;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'restaurants'
      AND policyname = 'Public view restaurants'
  ) THEN
    CREATE POLICY "Public view restaurants"
      ON public.restaurants
      FOR SELECT
      USING (true);
  END IF;
END $$;

CREATE POLICY "Partners manage own restaurants"
  ON public.restaurants
  FOR ALL
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'partner'
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'partner'
    )
  );
