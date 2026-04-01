-- ====================================================================
-- Only new RLS policies for Multi-Role Management (restaurants)
-- ====================================================================

-- Enable RLS on restaurants (if not already enabled)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Only partners can manage restaurants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'restaurants' AND policyname = 'Partners can manage restaurants'
  ) THEN
    CREATE POLICY "Partners can manage restaurants"
      ON public.restaurants
      FOR ALL
      USING (
        owner_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON ur.role_id = r.id
          WHERE ur.user_id = auth.uid() AND r.name = 'partner'
        )
      )
      WITH CHECK (
        owner_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON ur.role_id = r.id
          WHERE ur.user_id = auth.uid() AND r.name = 'partner'
        )
      );
  END IF;
END $$;
