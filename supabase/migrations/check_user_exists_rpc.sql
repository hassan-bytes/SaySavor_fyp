-- ====================================================================
-- 🔍 USER EXISTENCE CHECK FUNCTION (RPC)
-- ====================================================================
-- This function checks if a user exists with the given email
-- Used during login flow to determine if user should signup or login

CREATE OR REPLACE FUNCTION public.check_user_exists(email_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user exists in profiles table
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE email = email_check
  );
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.check_user_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_exists(text) TO anon;
