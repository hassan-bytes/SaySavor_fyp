// ============================================================
// FILE: ProtectedRoute.tsx
// SECTION: shared > components
// PURPOSE: Auth guard â€” sirf logged in users dashboard access kar sakte hain.
//          Login nahi toh /auth par redirect.
//          requireSetup=true: setup complete karna zaruri hai.
// ============================================================
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserStatus } from '@/shared/lib/authHelpers';
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
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        checkAccessAndRedirect();
    }, [location.pathname]);

    const checkAccessAndRedirect = async () => {
        const status = await getUserStatus();

        // RULE 1: Not authenticated -> Redirect to /auth
        if (!status.isAuthenticated) {
            navigate('/auth', { replace: true });
            return;
        }

        // Get current route
        const currentPath = location.pathname;

        // RULE 2: Logged in BUT setup incomplete AND trying to access /dashboard
        // -> Redirect to /restaurant-setup
        if (!status.setupComplete && currentPath === '/dashboard') {
            navigate('/restaurant-setup', { replace: true });
            return;
        }

        // RULE 3: Logged in AND setup complete AND trying to access /restaurant-setup
        // → Redirect to /dashboard (Don't let them redo setup)
        // EXCEPTION: Allow if ?step=3 (Quick Setup from dashboard)
        const urlParams = new URLSearchParams(location.search);
        const hasStepParam = urlParams.has('step');

        if (status.setupComplete && currentPath === '/restaurant-setup' && !hasStepParam) {
            navigate('/dashboard', { replace: true });
            return;
        }

        // RULE 4: requireSetup flag check (additional protection)
        // If route requires setup completion but user hasn't completed
        if (requireSetup && !status.setupComplete) {
            navigate('/restaurant-setup', { replace: true });
            return;
        }

        // All checks passed - Allow access
        setLoading(false);
    };

    if (loading) {
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
