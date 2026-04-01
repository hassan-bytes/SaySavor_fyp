-- ====================================================================
-- FIX: Allow public read access to user_roles for role checking
-- ====================================================================
-- Problem: RLS blocks unauthenticated users from reading user_roles
-- Solution: Add public SELECT policy for role checking during login
-- Security: Only SELECT is public, INSERT/DELETE still require auth
-- ====================================================================

-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can read their own user_roles" ON public.user_roles;

-- Create new public SELECT policy for role checking
CREATE POLICY "Public can read user_roles for role checking"
  ON public.user_roles
  FOR SELECT
  USING (true);  -- Allow all users to read user_roles

-- Note: INSERT and DELETE policies remain auth-protected
-- Users can only modify their own roles (existing policies still active)

COMMENT ON POLICY "Public can read user_roles for role checking" ON public.user_roles IS 
'Allows unauthenticated users to check roles during login/signup for cross-panel detection';
