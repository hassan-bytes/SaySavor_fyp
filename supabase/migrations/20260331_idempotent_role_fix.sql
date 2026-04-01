-- ====================================================================
-- IDEMPOTENT ROLE ASSIGNMENT FIX
-- ====================================================================
-- Safe migration that checks existing state before making changes
-- Can be run multiple times without errors
-- ====================================================================

-- ============================================================
-- STEP 1: Ensure roles exist
-- ============================================================
INSERT INTO public.roles (name) 
VALUES ('customer'), ('partner'), ('admin')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- STEP 2: Assign roles to existing users (idempotent)
-- ============================================================
INSERT INTO public.user_roles (user_id, role_id)
SELECT 
  p.id as user_id,
  r.id as role_id
FROM public.profiles p
CROSS JOIN public.roles r
WHERE p.role::text = r.name
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role_id = r.id
  );

-- ============================================================
-- STEP 3: Fix RLS policies (idempotent)
-- ============================================================
-- Drop ALL existing policies on user_roles
DO $$ 
BEGIN
  -- Drop all policies if they exist
  DROP POLICY IF EXISTS "Users can read their own user_roles" ON public.user_roles;
  DROP POLICY IF EXISTS "Public can read user_roles for role checking" ON public.user_roles;
  DROP POLICY IF EXISTS "Users can insert their own user_roles" ON public.user_roles;
  DROP POLICY IF EXISTS "Users can delete their own user_roles" ON public.user_roles;
END $$;

-- Create fresh policies
CREATE POLICY "Public can read user_roles for role checking"
  ON public.user_roles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own user_roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own user_roles"
  ON public.user_roles
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- STEP 4: Create trigger (idempotent)
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_assign_user_role()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  role_name TEXT;
  role_id_val INTEGER;
BEGIN
  role_name := NEW.role::text;
  
  IF role_name IS NULL OR role_name = '' THEN
    role_name := 'customer';
  END IF;

  SELECT id INTO role_id_val FROM public.roles WHERE name = role_name;

  IF role_id_val IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, role_id_val)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_assign_role ON public.profiles;

CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_user_role();

-- ============================================================
-- VERIFICATION: Show results
-- ============================================================
SELECT 
  p.email,
  p.role::text as profile_role,
  array_agg(r.name) as assigned_roles
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.id
WHERE p.email IS NOT NULL
GROUP BY p.id, p.email, p.role
ORDER BY p.email
LIMIT 20;
