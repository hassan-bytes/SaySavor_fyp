-- ====================================================================
-- 🔐 VERIFIED SIGNUP TRIGGER (FIXED)
-- ====================================================================

-- Function remains the same
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  is_partner boolean;
BEGIN
  -- 🛡️ CRITICAL CHECK: Only proceed if email is verified
  IF NEW.email_confirmed_at IS NULL THEN
    RAISE NOTICE 'Skipping profile creation - email not verified yet';
    RETURN NEW;
  END IF;

  -- Check if profile already exists (prevent duplicates)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RAISE NOTICE 'Profile already exists for user %', NEW.id;
    RETURN NEW;
  END IF;

  -- Determine role
  is_partner := (COALESCE(NEW.raw_user_meta_data->>'role', 'customer') = 'partner');

  -- 1. Create Profile
  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'), 
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::user_role,
    NEW.raw_user_meta_data->>'phone'
  );

  -- 2. Create Restaurant (Only for Partners)
  IF is_partner THEN
    -- Check if restaurant already exists for this owner
    IF NOT EXISTS (SELECT 1 FROM public.restaurants WHERE owner_id = NEW.id) THEN
      INSERT INTO public.restaurants (owner_id, name, is_open)
      VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'My New Restaurant'), 
        true
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Signup Trigger Error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ⚠️ FIX: Separate triggers for INSERT and UPDATE
-- Trigger 1: On INSERT (for OAuth users with instant verification)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  WHEN (NEW.email_confirmed_at IS NOT NULL)
  EXECUTE PROCEDURE public.handle_new_user();

-- Trigger 2: On UPDATE (for email/password users after OTP verification)
DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
CREATE TRIGGER on_auth_user_verified
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW 
  WHEN (NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at))
  EXECUTE PROCEDURE public.handle_new_user();
