// ============================================================
// FILE: ProtectedRoute.tsx
// SECTION: shared > components
// PURPOSE: Auth guard - only logged-in users can access the dashboard.
//          Redirects to /auth when the user is not logged in.
//          requireSetup=true: setup completion is required.
// ============================================================
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePartnerAuth } from '@/shared/contexts/PartnerAuthContext';
import { supabase } from '@/shared/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireSetup?: boolean; // If true, this route requires setup to be complete
}

/**
 * ProtectedRoute Component - The Guard
 * 
 * Navigation Logic Table:
 * ┌─────────────────┬──────────────────┬─────────────────────────┬──────────────────────────┐
 * │ User State      │ Setup Status     │ Current URL             │ Action                   │
 * ├─────────────────┼──────────────────┼─────────────────────────┼──────────────────────────┤
 * │ Not Logged In   │ N/A              │ Any Protected Route     │ Redirect to /auth        │
 * │ Logged In       │ false (Incomplete)│ /dashboard              │ Redirect to /setup       │
 * │ Logged In       │ false (Incomplete)│ /restaurant-setup       │ Allow ✅                 │
 * │ Logged In       │ true (Complete)  │ /restaurant-setup       │ Redirect to /dashboard   │
 * │ Logged In       │ true (Complete)  │ /dashboard              │ Allow ✅                 │
 * └─────────────────┴──────────────────┴─────────────────────────┴──────────────────────────┘
 */
export function ProtectedRoute({ children, requireSetup = false }: ProtectedRouteProps) {
    const { user, loadingInitial } = usePartnerAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (loadingInitial) return; // Wait for initial session restoration
        checkAccessAndRedirect();
    }, [user, loadingInitial, location.pathname, location.search, requireSetup]);

    const checkAccessAndRedirect = async () => {
        // RULE 1: Not authenticated -> Redirect to /auth
        if (!user) {
            navigate('/auth', { replace: true });
            return;
        }

        // Check if restaurant exists for this user
        // Note: restaurant is linked via owner_id in restaurants table
        // If restaurant exists, consider setup complete
        let isSetupComplete = false;
        if (user?.id) {
            console.log('[ProtectedRoute] Checking restaurant for user:', user.id);
            const { data, error } = await supabase
                .from('restaurants')
                .select('id, name')
                .eq('owner_id', user.id)
                .maybeSingle();
            
            if (error) {
                console.warn('[ProtectedRoute] Restaurant check error:', error.message);
                // Fail open on error - allow access and retry later
                isSetupComplete = true;
            } else if (data) {
                // If restaurant exists, setup is complete
                isSetupComplete = true;
                console.log('[ProtectedRoute] Restaurant found:', data.name);
            } else {
                console.log('[ProtectedRoute] No restaurant found for user');
            }
        }

        if (!mountedRef.current) return;

        // Get current route
        const currentPath = location.pathname;

        // RULE 2: Logged in BUT setup incomplete AND trying to access /dashboard
        // -> Redirect to /restaurant-setup
        if (!isSetupComplete && currentPath.startsWith('/dashboard')) {
            navigate('/restaurant-setup', { replace: true });
            return;
        }

        // RULE 3: Logged in AND setup complete AND trying to access /restaurant-setup
        // → Redirect to /dashboard (Don't let them redo setup)
        // EXCEPTION: Allow if ?step=3 (Quick Setup from dashboard)
        const urlParams = new URLSearchParams(location.search);
        const hasStepParam = urlParams.has('step');

        if (isSetupComplete && currentPath === '/restaurant-setup' && !hasStepParam) {
            navigate('/dashboard', { replace: true });
            return;
        }

        // RULE 4: requireSetup flag check (additional protection)
        // If route requires setup completion but user hasn't completed
        if (requireSetup && !isSetupComplete) {
            navigate('/restaurant-setup', { replace: true });
            return;
        }

        // All checks passed - Allow access
    };

    // Show loading while auth initializes
    if (loadingInitial) {
        return (
            <div className="flex items-center justify-center h-screen bg-obsidian">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-gold animate-spin" />
                    <p className="text-white/60 text-sm font-medium">Verifying access...</p>
                    <p className="text-white/40 text-xs">Checking authentication status</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
