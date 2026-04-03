// ============================================================
// FILE: authHelpers.ts
// SECTION: shared > lib
// PURPOSE: Authentication ke helper functions.
//          User profile check karna, setup status verify karna.
// ============================================================
import { supabase } from './supabaseClient';
import { Database } from './database.types';

export interface UserStatus {
    isAuthenticated: boolean;
    setupComplete: boolean;
    redirectTo: '/dashboard' | '/restaurant-setup' | '/auth';
}

type ProfileSetupData = Pick<Database['public']['Tables']['profiles']['Row'], 'setup_complete'>;

/**
 * Check user authentication status and setup completion
 * Returns appropriate redirect path based on user state
 */
export async function getUserStatus(): Promise<UserStatus> {
    try {
        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return {
                isAuthenticated: false,
                setupComplete: false,
                redirectTo: '/auth'
            };
        }

        // Setup completion is determined by restaurant ownership (same rule as ProtectedRoute)
        const { data: restaurant, error: restaurantError } = await supabase
            .from('restaurants')
            .select('id')
            .eq('owner_id', session.user.id)
            .maybeSingle();

        if (restaurantError) {
            console.warn('Restaurant setup check warning:', restaurantError.message);
        }

        // Fallback to legacy profile flag for compatibility
        const { data: profile } = await supabase
            .from('profiles')
            .select('setup_complete')
            .eq('id', session.user.id)
            .maybeSingle<ProfileSetupData>();

        const setupComplete = Boolean(restaurant) || (profile?.setup_complete ?? false);

        return {
            isAuthenticated: true,
            setupComplete,
            redirectTo: setupComplete ? '/dashboard' : '/restaurant-setup'
        };
    } catch (error: any) {
        if (error?.name === 'AbortError' || error?.message?.includes('AbortError')) {
            return {
                isAuthenticated: false,
                setupComplete: false,
                redirectTo: '/auth'
            };
        }
        console.error('Error checking user status:', error);
        return {
            isAuthenticated: false,
            setupComplete: false,
            redirectTo: '/auth'
        };
    }
}

/**
 * Check if user is authenticated
 */
export async function isUserAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
}

/**
 * Check if user has completed restaurant setup
 */
export async function hasCompletedSetup(userId: string): Promise<boolean> {
    try {
        const { data: restaurant, error: restaurantError } = await supabase
            .from('restaurants')
            .select('id')
            .eq('owner_id', userId)
            .maybeSingle();

        if (restaurantError) {
            console.warn('Restaurant setup check warning:', restaurantError.message);
        }

        if (restaurant) {
            return true;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('setup_complete')
            .eq('id', userId)
            .maybeSingle<ProfileSetupData>();

        return profile?.setup_complete ?? false;
    } catch (error: any) {
        if (error?.name === 'AbortError' || error?.message?.includes('AbortError')) return false;
        console.error('Error checking setup status:', error);
        return false;
    }
}
