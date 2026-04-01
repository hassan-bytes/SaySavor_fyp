-- ====================================================================
-- MANUAL ROLE ASSIGNMENT FOR EXISTING USERS
-- ====================================================================
-- This script assigns roles to ALL existing users based on their
-- profile.role field (the old single-role system)
-- Run this ONCE to migrate existing users to the new multi-role system

-- Assign roles based on profiles.role field
INSERT INTO public.user_roles (user_id, role_id)
SELECT 
  p.id as user_id,
  r.id as role_id
FROM public.profiles p
CROSS JOIN public.roles r
WHERE p.role = r.name  -- Match profile.role with roles.name
  AND NOT EXISTS (
    -- Don't insert if user already has this role
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role_id = r.id
  );

-- Verify results
SELECT 
  p.email,
  p.role as old_role,
  array_agg(r.name) as new_roles
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.id
GROUP BY p.id, p.email, p.role
ORDER BY p.email;
