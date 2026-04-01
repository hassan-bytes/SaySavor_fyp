-- ====================================================================
-- COMPLETE DEBUG AND FIX: Role Assignment System
-- ====================================================================
-- This script does everything needed to fix the role checking system:
-- 1. Verifies tables exist
-- 2. Checks and inserts roles
-- 3. Assigns roles to existing users
-- 4. Fixes RLS policies
-- 5. Creates trigger for future signups
-- 6. Provides diagnostic output
-- ====================================================================

-- ============================================================
-- STEP 1: Verify and show current state
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '=== DIAGNOSTIC: Current State ===';
END $$;

-- Show roles table
SELECT 'Roles in database:' as info, * FROM public.roles;

-- Show user_roles for specific user
SELECT 
  'User roles for 2aea4327-fd5e-44bd-9562-4d87dd8f5c9d:' as info,
  ur.*,
  r.name as role_name
FROM public.user_roles ur
LEFT JOIN public.roles r ON ur.role_id = r.id
WHERE ur.user_id = '2aea4327-fd5e-44bd-9562-4d87dd8f5c9d';

-- ============================================================
-- STEP 2: Ensure roles exist
-- ============================================================
INSERT INTO public.roles (name) 
VALUES ('customer'), ('partner'), ('admin')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- STEP 3: Assign roles to ALL existing users based on profiles.role
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
-- STEP 4: Fix RLS policies to allow public read
-- ============================================================
-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can read their own user_roles" ON public.user_roles;

-- Create new public SELECT policy
CREATE POLICY "Public can read user_roles for role checking"
  ON public.user_roles
  FOR SELECT
  USING (true);

-- ============================================================
-- STEP 5: Create trigger for auto role assignment on signup
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
  role_name := NEW.role;
  
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
-- STEP 6: Verification - Show final state
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICATION: Final State ===';
END $$;

-- Show all user roles
SELECT 
  'All user role assignments:' as info,
  p.email,
  p.role as profile_role,
  array_agg(r.name) as assigned_roles
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.id
GROUP BY p.id, p.email, p.role
ORDER BY p.email;

-- Show specific test user
SELECT 
  'Test user (2aea4327-fd5e-44bd-9562-4d87dd8f5c9d):' as info,
  p.email,
  p.role as profile_role,
  ur.role_id,
  r.name as assigned_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.id
WHERE p.id = '2aea4327-fd5e-44bd-9562-4d87dd8f5c9d';

-- Show RLS policies
SELECT 
  'RLS Policies on user_roles:' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_roles';

-- Final success message
SELECT '✅ Migration Complete!' as status;
