// ============================================================
// FILE: CustomerAuthContext.tsx
// SECTION: 3_customer > context
// PURPOSE: Customer ka authentication state manage karna.
//          Supabase session check, guest mode, login, logout.
// ============================================================
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import type { Customer } from '@/3_customer/types/customer';
import { GUEST_ID_KEY, GUEST_MODE_KEY } from '@/3_customer/types/customer';

// ── Context Shape ─────────────────────────────────────────────
interface CustomerAuthContextType {
    customer: Customer | null;
    isGuest: boolean;
    isLoading: boolean;
    logout: () => Promise<void>;
    enableGuestMode: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────
export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        initAuth();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                setCustomer(null);
                // Keep guest mode if it was set
                setIsGuest(localStorage.getItem(GUEST_MODE_KEY) === 'true');
            } else if (session?.user) {
                await fetchCustomerProfile(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const initAuth = async () => {
        setIsLoading(true);
        try {
            // Check guest mode first
            const guestMode = localStorage.getItem(GUEST_MODE_KEY) === 'true';
            if (guestMode) {
                setIsGuest(true);
                setIsLoading(false);
                return;
            }

            // Check existing Supabase session
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await fetchCustomerProfile(session.user.id);
            }
        } catch (error) {
            console.error('CustomerAuth init error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCustomerProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('id', userId)
                .single();

            if (!error && data) {
                setCustomer(data as Customer);
                setIsGuest(false);
            } else if (error) {
                console.error('Customer profile fetch failed (406 likely means table missing or RLS issue):', error);
            }
        } catch (error) {
            console.error('Unexpected error in fetchCustomerProfile:', error);
        }
    };

    const enableGuestMode = () => {
        localStorage.setItem(GUEST_ID_KEY, crypto.randomUUID());
        localStorage.setItem(GUEST_MODE_KEY, 'true');
        setIsGuest(true);
        setCustomer(null);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem(GUEST_ID_KEY);
        localStorage.removeItem(GUEST_MODE_KEY);
        setCustomer(null);
        setIsGuest(false);
    };

    return (
        <CustomerAuthContext.Provider value={{ customer, isGuest, isLoading, logout, enableGuestMode }}>
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
