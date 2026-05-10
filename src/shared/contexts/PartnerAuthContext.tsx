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
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);
  const lastSessionIdRef = useRef<string | null>(null);
  const fetchingProfileRef = useRef(false);

  /**
   * Initialize authentication on mount
   * 
   * CRITICAL: This runs BEFORE rendering dashboard
   * - Restores session from Supabase storage
   * - Prevents flash of unauthenticated state
   * - Sets loadingInitial to false when complete
   */
  useEffect(() => {
    mountedRef.current = true;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const initAuth = async () => {
      try {
        console.log('[PartnerAuth] 🔄 Restoring session...');

        // Fallback timeout — only fires if getSession hangs completely (rare)
        timeoutId = setTimeout(() => {
          if (mountedRef.current) {
            console.warn('[PartnerAuth] ⚠️ Session restoration timeout - proceeding anyway');
            setLoadingInitial(false);
          }
        }, 10000);

        // getSession() reads localStorage + may trigger a token refresh network call.
        // Do NOT add a short race timeout — token refresh can take 3-8s on slow networks.
        const { data: { session: existingSession } = {}, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[PartnerAuth] Session restoration error:', error);
        }

        if (!mountedRef.current) return;

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
        if (timeoutId) clearTimeout(timeoutId);
        if (mountedRef.current) {
          setLoadingInitial(false);
          console.log('[PartnerAuth] ✅ Initial load complete');
        }
      }
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

        if (!mountedRef.current) return;

        // Handle SIGNED_IN event - deduplicate by access token to avoid Supabase
        // firing multiple SIGNED_IN events during token refresh cycles
        if (event === 'SIGNED_IN' && newSession?.user) {
          const tokenId = newSession.access_token;
          if (lastSessionIdRef.current === tokenId) return; // duplicate event, skip
          lastSessionIdRef.current = tokenId;

          console.log('[PartnerAuth] ✅ User signed in:', newSession.user.email);
          setSession(newSession);
          setUser(newSession.user);
          setLoadingInitial(false);

          fetchPartnerProfile(newSession.user.id).catch(err => {
            console.error('[PartnerAuth] Profile fetch failed after sign in:', err);
          });
          return;
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          profileRef.current = null;
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

    if (!initializedRef.current) {
      initializedRef.current = true;
      void initAuth();
    }

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      initializedRef.current = false;
      lastSessionIdRef.current = null;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Fetch partner profile from database
   * 
   * @param userId - Supabase Auth user ID
   */
  const fetchPartnerProfile = async (userId: string) => {
    if (fetchingProfileRef.current) return;
    fetchingProfileRef.current = true;
    try {
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
        const nextProfile = data as PartnerProfile;
        console.log('[PartnerAuth] ✅ Profile loaded:', nextProfile.email);
        profileRef.current = nextProfile;
        setProfile(nextProfile);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        console.warn('[PartnerAuth] Profile fetch aborted');
      } else {
        console.error('[PartnerAuth] Profile fetch exception:', error);
      }
    } finally {
      fetchingProfileRef.current = false;
    }
  };

  const refreshProfile = async () => {
    fetchingProfileRef.current = false; // allow forced refresh
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
