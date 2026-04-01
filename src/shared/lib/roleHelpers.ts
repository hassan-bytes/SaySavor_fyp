// ============================================================
// FILE: roleHelpers.ts
// PURPOSE: Helper functions for multi-role management
//          Check user roles and handle cross-panel authentication
// ============================================================

import { supabase } from './supabaseClient';

export interface UserRoleInfo {
  userId: string;
  email: string;
  roles: string[]; // e.g., ['customer', 'partner']
  hasPartnerRole: boolean;
  hasCustomerRole: boolean;
}

/**
 * Check what roles a user has based on their email
 * Returns null if user doesn't exist
 */
export async function getUserRoles(email: string): Promise<UserRoleInfo | null> {
  try {
    console.log('[roleHelpers] 🔍 Checking roles for email:', email);
    
    // First, get user ID + fallback role from profiles
    const { data: profile, error: profileError } = await (supabase as any)
      .from('profiles')
      .select('id, email, role')
      .eq('email', email)
      .maybeSingle();

    console.log('[roleHelpers] 📋 Profile lookup result:', { profile, error: profileError });

    if (profileError || !profile) {
      console.log('[roleHelpers] ❌ No profile found for email:', email);
      return null;
    }

    console.log('[roleHelpers] ✅ Found user ID:', profile.id);

    const profileRole = (profile as any).role as string | null;
    const fallbackRoles =
      typeof profileRole === 'string' && profileRole.trim()
        ? [profileRole.toLowerCase().trim()]
        : [];

    const defaultRoleIdMap: Record<number, string> = {
      1: 'customer',
      2: 'partner',
      3: 'admin',
    };

    // Try reading explicit roles from user_roles (multi-role source)
    const { data: userRoleRows, error: rolesError } = await (supabase as any)
      .from('user_roles')
      .select('role_id')
      .eq('user_id', profile.id);

    console.log('[roleHelpers] 📋 user_roles query result:', { userRoleRows, error: rolesError });

    let roles: string[] = [];

    if (rolesError) {
      console.warn('[roleHelpers] ⚠️ user_roles read failed, using profiles.role fallback:', rolesError);
      roles = fallbackRoles;
    } else {
      const roleIds = (userRoleRows || [])
        .map((row: any) => Number(row.role_id))
        .filter((id: number) => Number.isInteger(id));

      console.log('[roleHelpers] 🔢 Parsed role IDs:', roleIds);

      if (roleIds.length > 0) {
        const { data: roleRecords, error: roleLookupError } = await (supabase as any)
          .from('roles')
          .select('id, name')
          .in('id', roleIds);

        console.log('[roleHelpers] 📋 roles lookup result:', { roleRecords, roleLookupError });

        if (roleLookupError) {
          console.warn('[roleHelpers] ⚠️ roles lookup failed, using profiles.role fallback:', roleLookupError);
          roles = fallbackRoles;
        } else {
          const lookedUpRoles = (roleRecords || [])
            .map((r: any) => r.name)
            .filter(Boolean)
            .map((name: string) => name.toLowerCase().trim());

          if (lookedUpRoles.length > 0) {
            roles = lookedUpRoles;
          } else {
            const mappedRoles = roleIds
              .map((id: number) => defaultRoleIdMap[id])
              .filter(Boolean);

            roles = mappedRoles.length > 0 ? mappedRoles : fallbackRoles;
          }
        }
      } else {
        roles = fallbackRoles;
      }
    }

    roles = Array.from(
      new Set(
        roles
          .map((r) => String(r).toLowerCase().trim())
          .filter(Boolean)
      )
    );

    console.log('[roleHelpers] 🎭 Extracted roles:', roles);

    const result = {
      userId: profile.id,
      email: (profile as any).email || email,
      roles,
      hasPartnerRole: roles.includes('partner'),
      hasCustomerRole: roles.includes('customer'),
    };

    console.log('[roleHelpers] ✅ Final role info:', result);
    return result;
  } catch (error) {
    console.error('[roleHelpers] ❌ Error in getUserRoles:', error);
    return null;
  }
}

/**
 * Add a role to a user
 */
export async function addRoleToUser(userId: string, roleName: 'customer' | 'partner' | 'admin'): Promise<boolean> {
  try {
    // Get role ID
    const { data: role, error: roleError } = await (supabase as any)
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

    if (roleError || !role) {
      console.error('Role not found:', roleName);
      return false;
    }

    // Insert into user_roles (will be ignored if already exists due to primary key)
    const { error: insertError } = await (supabase as any)
      .from('user_roles')
      .insert([{ user_id: userId, role_id: role.id }]);

    if (insertError) {
      // Check if error is due to duplicate (which is fine)
      if (insertError.code === '23505') {
        console.log('User already has this role');
        return true;
      }
      console.error('Error adding role:', insertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in addRoleToUser:', error);
    return false;
  }
}

/**
 * Check if user should be warned about using wrong panel
 * Returns recommendation: 'proceed' | 'warn_partner' | 'warn_customer'
 */
export function checkPanelMismatch(
  userRoles: UserRoleInfo | null,
  currentPanel: 'partner' | 'customer'
): {
  shouldWarn: boolean;
  warningType: 'partner_in_customer' | 'customer_in_partner' | null;
  message: string;
} {
  console.log('[roleHelpers] 🔍 Checking panel mismatch:', { userRoles, currentPanel });

  if (!userRoles) {
    console.log('[roleHelpers] ⚠️ No user roles provided, skipping mismatch check');
    return { shouldWarn: false, warningType: null, message: '' };
  }

  // Partner trying to use customer panel
  if (currentPanel === 'customer' && userRoles.hasPartnerRole && !userRoles.hasCustomerRole) {
    console.log('[roleHelpers] ⚠️ MISMATCH: Partner trying to use customer panel');
    return {
      shouldWarn: true,
      warningType: 'partner_in_customer',
      message: 'This email is registered as a Partner account. You can still order as a customer, but you may want to use the Partner dashboard instead.',
    };
  }

  // Customer trying to use partner panel
  if (currentPanel === 'partner' && userRoles.hasCustomerRole && !userRoles.hasPartnerRole) {
    console.log('[roleHelpers] ⚠️ MISMATCH: Customer trying to use partner panel');
    return {
      shouldWarn: true,
      warningType: 'customer_in_partner',
      message: 'This email is registered as a Customer account. Do you want to become a Partner to manage a restaurant?',
    };
  }

  console.log('[roleHelpers] ✅ No panel mismatch detected');
  return { shouldWarn: false, warningType: null, message: '' };
}
