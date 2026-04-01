-- ====================================================================
-- Auto-assign roles to users on signup
-- ====================================================================
-- This trigger automatically inserts a role into user_roles table
-- when a new profile is created, based on the 'role' field in user metadata

-- Function to auto-assign role based on profiles.role column
CREATE OR REPLACE FUNCTION auto_assign_user_role()
RETURNS TRIGGER AS $$
DECLARE
  role_name TEXT;
  role_record RECORD;
BEGIN
  -- Get role from profiles.role column (NEW is the profile row being inserted)
  role_name := NEW.role;
  
  -- Default to 'customer' if no role specified
  IF role_name IS NULL OR role_name = '' THEN
    role_name := 'customer';
  END IF;

  -- Get the role ID from roles table
  SELECT id INTO role_record FROM public.roles WHERE name = role_name;

  -- If role exists, insert into user_roles
  IF FOUND THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, role_record.id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
    
    RAISE NOTICE 'Auto-assigned role % to user %', role_name, NEW.id;
  ELSE
    RAISE WARNING 'Role % not found in roles table for user %', role_name, NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_profile_created_assign_role ON public.profiles;

-- Create trigger that fires after profile insert
CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_user_role();

-- Backfill existing users who don't have roles assigned
DO $$
DECLARE
  profile_record RECORD;
  role_name TEXT;
  role_id_val INTEGER;
BEGIN
  FOR profile_record IN 
    SELECT p.id, p.role
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE ur.user_id IS NULL
  LOOP
    -- Get role from profiles.role column
    role_name := profile_record.role;
    
    -- Default to customer if no role
    IF role_name IS NULL OR role_name = '' THEN
      role_name := 'customer';
    END IF;

    -- Get role ID
    SELECT id INTO role_id_val FROM public.roles WHERE name = role_name;

    -- Insert if role found
    IF FOUND THEN
      INSERT INTO public.user_roles (user_id, role_id)
      VALUES (profile_record.id, role_id_val)
      ON CONFLICT (user_id, role_id) DO NOTHING;
      
      RAISE NOTICE 'Backfilled role % for user %', role_name, profile_record.id;
    END IF;
  END LOOP;
END $$;
