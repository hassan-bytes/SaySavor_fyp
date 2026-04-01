-- ====================================================================
-- RLS Policies for Multi-Role Management (user_roles, restaurants)
-- ====================================================================

-- Enable RLS on user_roles
aLTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read only their own user_roles
CREATE POLICY "Users can read their own user_roles"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert only for their own user_id
CREATE POLICY "Users can insert their own user_roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete only their own user_roles
CREATE POLICY "Users can delete their own user_roles"
  ON public.user_roles
  FOR DELETE
  USING (user_id = auth.uid());

-- Enable RLS on restaurants
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Only partners can manage restaurants
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
