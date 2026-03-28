/**
 * ============================================================
 * FILE: PartnerAuthContext.tsx
 * SECTION: shared > contexts
 * PURPOSE: Partner authentication with persistent session management
 *          Implements session restoration on page refresh
 *          Following React 19 + Supabase Auth best practices (March 2026)
 * ============================================================
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

// ── TypeScript Interfaces ─────────────────────────────────────
/**
 * Partner profile data from database
 * Note: restaurant_id is NOT in profiles table
 * Restaurant is linked via owner_id in restaurants table
 */
export interface PartnerProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'partner' | 'admin';
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
}

/**
 * Auth context shape - available to all components
 */
interface PartnerAuthContextType {
  /** Current authenticated user (Supabase Auth) */
  user: User | null;
  
  /** Partner profile from database */
  profile: PartnerProfile | null;
  
  /** Current session object */
  session: Session | null;
  
  /** Loading state for async operations (login/logout) */
  loading: boolean;
  
  /** Initial session restoration in progress - BLOCKS rendering */
  loadingInitial: boolean;
  
  /** Sign out and clear session */
  logout: () => Promise<void>;
  
  /** Refresh profile data from database */
  refreshProfile: () => Promise<void>;
}

// ── Context Creation ──────────────────────────────────────────
const PartnerAuthContext = createContext<PartnerAuthContextType | undefined>(undefined);

// ── Provider Component ────────────────────────────────────────
/**
 * PartnerAuthProvider
 * 
 * Wraps the entire app to provide authentication state.
 * 
 * KEY FEATURES:
 * - Session restoration on mount (prevents logout flash)
 * - Listens to auth changes across tabs
 * - Fetches partner profile from database
 * - Proper cleanup on unmount
 * 
 * USAGE:
 * ```tsx
 * <PartnerAuthProvider>
 *   <App />
 * </PartnerAuthProvider>
 * ```
 */
export const PartnerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const profileRef = useRef<PartnerProfile | null>(null);
  let mounted = true;

  /**
   * Initialize authentication on mount
   * 
   * CRITICAL: This runs BEFORE rendering dashboard
   * - Restores session from Supabase storage
   * - Prevents flash of unauthenticated state
   * - Sets loadingInitial to false when complete
   */
  useEffect(() => {
    // Prevent duplicate initialization in React Strict Mode
    if (!mounted) {
      console.log('[PartnerAuth] Component unmounted, skipping initialization');
      return;
    }
    
    let timeoutId: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        console.log('[PartnerAuth] 🔄 Restoring session...');
        
        // Shorter timeout - 3 seconds max
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('[PartnerAuth] ⚠️ Session restoration timeout - proceeding anyway');
            setLoadingInitial(false);
          }
        }, 3000);
        
        // Get existing session from Supabase storage with timeout
        const sessionPromise = supabase.auth.getSession();
        const result = await Promise.race([
          sessionPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session fetch timeout')), 2500)
          )
        ]) as any;
        
        const { data: { session: existingSession } = {}, error } = result || {};
        
        if (error) {
          console.error('[PartnerAuth] Session restoration error:', error);
        }

        if (!mounted) return;

        if (existingSession?.user) {
          console.log('[PartnerAuth] ✅ Session restored for user:', existingSession.user.email);
          setSession(existingSession);
          setUser(existingSession.user);
          
          // Fetch partner profile (non-blocking)
          fetchPartnerProfile(existingSession.user.id).catch(err => {
            console.error('[PartnerAuth] Profile fetch failed:', err);
          });
        } else {
          console.log('[PartnerAuth] ℹ️ No existing session found');
        }
      } catch (error: any) {
        console.error('[PartnerAuth] Init error:', error?.message || error);
      } finally {
        clearTimeout(timeoutId);
        if (mounted) {
          setLoadingInitial(false);
          console.log('[PartnerAuth] ✅ Initial load complete');
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };

    /**
     * Listen to auth state changes
     * 
     * Handles:
     * - Login events
     * - Logout events
     * - Token refresh
     * - Cross-tab synchronization
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[PartnerAuth] Auth event:', event);

        if (!mounted) return;

        // Handle SIGNED_IN event - this means user just logged in
        if (event === 'SIGNED_IN' && newSession?.user) {
          console.log('[PartnerAuth] ✅ User signed in:', newSession.user.email);
          setSession(newSession);
          setUser(newSession.user);
          setLoadingInitial(false); // Stop loading immediately on sign in
          
          // Fetch profile in background
          fetchPartnerProfile(newSession.user.id).catch(err => {
            console.error('[PartnerAuth] Profile fetch failed after sign in:', err);
          });
          return;
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setSession(null);
          return;
        }

        // Handle other events (TOKEN_REFRESHED, etc.)
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          
          // Only fetch profile if we don't have it yet (using ref to avoid stale closure)
          if (!profileRef.current) {
            fetchPartnerProfile(newSession.user.id).catch(err => {
              console.error('[PartnerAuth] Profile fetch failed:', err);
            });
          }
        } else {
          setUser(null);
          setProfile(null);
          profileRef.current = null;
          setSession(null);
        }
      }
    );

    // Cleanup on unmount
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Fetch partner profile from database
   * 
   * @param userId - Supabase Auth user ID
   */
  const fetchPartnerProfile = async (userId: string) => {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .single();

      clearTimeout(timeoutId);

      if (error) {
        // Ignore abort errors
        if (error.message?.includes('aborted')) {
          console.warn('[PartnerAuth] Profile fetch timed out');
          return;
        }
        console.error('[PartnerAuth] Profile fetch error:', error);
        return;
      }

      if (data) {
        console.log('[PartnerAuth] ✅ Profile loaded:', data.email);
        setProfile(data as PartnerProfile);
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        console.warn('[PartnerAuth] Profile fetch aborted');
        return;
      }
      console.error('[PartnerAuth] Profile fetch exception:', error);
    }
  };

  /**
   * Refresh profile data
   * Useful after profile updates
   */
  const refreshProfile = async () => {
    if (!user?.id) return;
    await fetchPartnerProfile(user.id);
  };

  /**
   * Sign out user
   * 
   * - Clears Supabase session
   * - Resets all state
   * - Redirects handled by route guards
   */
  const logout = async () => {
    setLoading(true);
    try {
      console.log('[PartnerAuth] 🚪 Logging out...');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      console.log('[PartnerAuth] ✅ Logged out successfully');
    } catch (error) {
      console.error('[PartnerAuth] Logout error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: PartnerAuthContextType = {
    user,
    profile,
    session,
    loading,
    loadingInitial,
    logout,
    refreshProfile,
  };

  return (
    <PartnerAuthContext.Provider value={value}>
      {children}
    </PartnerAuthContext.Provider>
  );
};

// ── Custom Hook ───────────────────────────────────────────────
/**
 * usePartnerAuth Hook
 * 
 * Access authentication state from any component.
 * 
 * THROWS ERROR if used outside PartnerAuthProvider.
 * This is intentional for better DX.
 * 
 * @example
 * ```tsx
 * const { user, profile, logout } = usePartnerAuth();
 * 
 * if (!user) return <Navigate to="/login" />;
 * 
 * return <div>Welcome {profile?.full_name}</div>;
 * ```
 */
export const usePartnerAuth = (): PartnerAuthContextType => {
  const context = useContext(PartnerAuthContext);
  
  if (context === undefined) {
    throw new Error(
      'usePartnerAuth must be used within PartnerAuthProvider. ' +
      'Wrap your app with <PartnerAuthProvider> in main.tsx or App.tsx'
    );
  }
  
  return context;
};
