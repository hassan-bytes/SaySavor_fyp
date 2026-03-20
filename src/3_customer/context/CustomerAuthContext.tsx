// ============================================================
// FILE: CustomerAuthContext.tsx  (UPDATED)
// SECTION: 3_customer > context
// PURPOSE: Customer authentication + PERSISTENT anonymous sessions
//          using Supabase signInAnonymously() — guest ID never changes,
//          survives page refresh, can be upgraded to real account later.
// ============================================================
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import type { Customer } from '@/3_customer/types/customer';

// ── Context Shape ─────────────────────────────────────────────
interface CustomerAuthContextType {
    customer: Customer | null;
    isGuest: boolean;
    isAnonymous: boolean;      // true = Supabase anonymous user
    isLoading: boolean;
    userId: string | null;     // ALWAYS available (auth uid or anon uid)
    logout: () => Promise<void>;
    enableGuestMode: () => Promise<void>;
    upgradeGuestToFullAccount: (email: string, password: string, name: string) => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────
export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        initAuth();

        // Listen to all auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!session) {
                    setCustomer(null);
                    setUserId(null);
                    setIsAnonymous(false);
                    setIsGuest(false);
                    return;
                }

                const user = session.user;
                const isAnon = user.is_anonymous === true;
                setUserId(user.id);
                setIsAnonymous(isAnon);
                setIsGuest(isAnon);

                if (!isAnon) {
                    await fetchCustomerProfile(user.id);
                } else {
                    // Anonymous user — create minimal customer object from session
                    setCustomer({
                        id: user.id,
                        phone: null,
                        email: null,
                        full_name: 'Guest',
                        role: 'customer',
                        avatar_url: null,
                        created_at: user.created_at,
                    });
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // ── Initialize auth on app start ─────────────────────────
    const initAuth = async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                const user = session.user;
                const isAnon = user.is_anonymous === true;
                setUserId(user.id);
                setIsAnonymous(isAnon);
                setIsGuest(isAnon);

                if (!isAnon) {
                    await fetchCustomerProfile(user.id);
                } else {
                    setCustomer({
                        id: user.id,
                        phone: null,
                        email: null,
                        full_name: 'Guest',
                        role: 'customer',
                        avatar_url: null,
                        created_at: user.created_at,
                    });
                }
            }
            // No session at all — user needs to either log in or use guest mode
        } catch (error) {
            console.error('CustomerAuth init error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ── Fetch full profile for permanent users ────────────────
    const fetchCustomerProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (!error && data) {
                setCustomer(data as Customer);
                setIsGuest(false);
                setIsAnonymous(false);
            }
        } catch (error) {
            console.error('Profile fetch error:', error);
        }
    };

    // ── Guest Mode: uses Supabase signInAnonymously ───────────
    // This creates a PERSISTENT anonymous session stored in localStorage
    // Same guest ID every time until they log out or upgrade
    const enableGuestMode = async () => {
        try {
            // Check if already have an anonymous session
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.is_anonymous) {
                // Already anonymous — don't create a new one
                return;
            }

            // Create new anonymous session
            const { data, error } = await supabase.auth.signInAnonymously({
                options: {
                    data: {
                        role: 'customer',
                        is_anonymous: true,
                    }
                }
            });

            if (error) throw error;
            // onAuthStateChange will handle the rest
        } catch (error) {
            console.error('Anonymous sign-in error:', error);
            throw error;
        }
    };

    // ── Upgrade anonymous → real account (links identity) ────
    // Called when a guest decides to create a proper account
    // All their orders are preserved under same user ID
    const upgradeGuestToFullAccount = async (
        email: string,
        password: string,
        name: string
    ) => {
        try {
            const { data, error } = await supabase.auth.updateUser({
                email,
                password,
                data: {
                    full_name: name,
                    role: 'customer',
                    is_anonymous: false,
                }
            });

            if (error) throw error;

            // Update profile in DB
            if (data.user) {
                await (supabase.from('profiles') as any).upsert({
                    id: data.user.id,
                    role: 'customer',
                    full_name: name,
                    email: email,
                    is_anonymous: false,
                });

                await fetchCustomerProfile(data.user.id);
            }
        } catch (error) {
            console.error('Account upgrade error:', error);
            throw error;
        }
    };

    // ── Logout ────────────────────────────────────────────────
    const logout = async () => {
        await supabase.auth.signOut();
        setCustomer(null);
        setUserId(null);
        setIsGuest(false);
        setIsAnonymous(false);
    };

    return (
        <CustomerAuthContext.Provider value={{
            customer,
            isGuest,
            isAnonymous,
            isLoading,
            userId,
            logout,
            enableGuestMode,
            upgradeGuestToFullAccount,
        }}>
            {children}
        </CustomerAuthContext.Provider>
    );
};

// ── Hook ──────────────────────────────────────────────────────
export const useCustomerAuth = () => {
    const ctx = useContext(CustomerAuthContext);
    if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
    return ctx;
};
