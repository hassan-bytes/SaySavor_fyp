-- ====================================================================
-- SECURE RLS: Restrict SELECT on public.user_roles
-- ====================================================================
-- Problem:
--   Existing policy uses USING (true), exposing all role rows to all users.
--
-- Goal:
--   1) Authenticated users can only read their own user_roles rows.
--   2) service_role retains full read access for backend/edge-function usage.
--   3) INSERT/UPDATE/DELETE policies remain unchanged.
-- ====================================================================

-- Remove overly broad and/or legacy SELECT policies
DROP POLICY IF EXISTS "Public can read user_roles for role checking" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read their own user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can read all user_roles" ON public.user_roles;

-- Authenticated users: read only their own role rows
CREATE POLICY "Users can read their own user_roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role: full read access (server-side trusted operations)
CREATE POLICY "Service role can read all user_roles"
  ON public.user_roles
  FOR SELECT
  TO service_role
  USING (true);

COMMENT ON POLICY "Users can read their own user_roles" ON public.user_roles IS
'Authenticated users can only select rows where user_id = auth.uid()';

COMMENT ON POLICY "Service role can read all user_roles" ON public.user_roles IS
'Service role full SELECT access for backend/edge-function operations';

-- --------------------------------------------------------------------
-- POLICY LOGIC TEST GUIDE (manual verification)
-- --------------------------------------------------------------------
-- Expected: customer cannot read partner rows.
--
-- As authenticated customer session:
--   SELECT * FROM public.user_roles WHERE user_id = auth.uid();
--   -- returns only customer-owned rows
--
--   SELECT * FROM public.user_roles WHERE user_id <> auth.uid();
--   -- returns 0 rows (cannot read partner/admin rows)
--
-- As service_role (server key context):
--   SELECT count(*) FROM public.user_roles;
--   -- succeeds with full table visibility
