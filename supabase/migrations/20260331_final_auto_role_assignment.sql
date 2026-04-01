-- ====================================================================
-- FINAL: Auto-assign roles to users on signup (PRODUCTION READY)
-- ====================================================================
-- This migration creates a trigger that automatically assigns roles
-- to users when their profile is created, based on profiles.role column.
-- Also backfills existing users who don't have roles assigned yet.
-- ====================================================================

-- ============================================================
-- STEP 1: Create trigger function
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
  -- Get role from profiles.role column (customer/partner/admin)
  role_name := NEW.role;
  
  -- Default to 'customer' if no role specified
  IF role_name IS NULL OR role_name = '' THEN
    role_name := 'customer';
  END IF;

  -- Get the role ID from roles table
  SELECT id INTO role_id_val 
  FROM public.roles 
  WHERE name = role_name;

  -- If role exists, insert into user_roles
  IF role_id_val IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, role_id_val)
    ON CONFLICT (user_id, role_id) DO NOTHING;
    
    RAISE NOTICE 'Auto-assigned role % to user %', role_name, NEW.id;
  ELSE
    RAISE WARNING 'Role % not found for user %', role_name, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 2: Create trigger on profiles table
-- ============================================================
DROP TRIGGER IF EXISTS on_profile_created_assign_role ON public.profiles;

CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_user_role();

-- ============================================================
-- STEP 3: Backfill existing users
-- ============================================================
DO $$
DECLARE
  profile_record RECORD;
  role_name TEXT;
  role_id_val INTEGER;
  assigned_count INTEGER := 0;
BEGIN
  FOR profile_record IN 
    SELECT p.id, p.role
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE ur.user_id IS NULL
  LOOP
    role_name := profile_record.role;
    
    IF role_name IS NULL OR role_name = '' THEN
      role_name := 'customer';
    END IF;

    SELECT id INTO role_id_val FROM public.roles WHERE name = role_name;

    IF role_id_val IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id)
      VALUES (profile_record.id, role_id_val)
      ON CONFLICT (user_id, role_id) DO NOTHING;
      
      assigned_count := assigned_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete: % users assigned roles', assigned_count;
END $$;

-- ============================================================
-- STEP 4: Verification
-- ============================================================
SELECT 
  'Migration complete!' as status,
  COUNT(*) as total_role_assignments
FROM public.user_roles;
