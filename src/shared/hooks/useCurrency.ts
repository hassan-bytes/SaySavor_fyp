// ============================================================
// FILE: useCurrency.ts
// SECTION: shared > hooks
// PURPOSE: React hook for restaurant currency management.
//          Provides currency info and formatPrice function
//          based on the restaurant's stored currency or phone.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { 
    CurrencyInfo, 
    DEFAULT_CURRENCY, 
    resolveCurrency, 
    formatPrice,
    getCurrencyFromPhone
} from '@/shared/lib/currencyUtils';

export interface UseCurrencyResult {
    currency: CurrencyInfo;
    loading: boolean;
    formatPrice: (price: number | string) => string;
    refresh: () => Promise<void>;
}

/**
 * Hook to get the current restaurant's currency
 * Fetches from database and provides formatting utilities
 */
export function useCurrency(): UseCurrencyResult {
    const [currency, setCurrency] = useState<CurrencyInfo>(DEFAULT_CURRENCY);
    const [loading, setLoading] = useState(true);

    const fetchCurrency = useCallback(async () => {
        try {
            setLoading(true);
            
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            // Get restaurant with currency and phone
            const { data: restaurant } = await supabase
                .from('restaurants')
                .select('currency, phone')
                .eq('owner_id', user.id)
                .maybeSingle() as { data: { currency: string | null; phone: string | null } | null };

            if (restaurant) {
                // Try to use stored currency first, fall back to phone-derived
                const resolvedCurrency = restaurant.currency 
                    ? resolveCurrency(restaurant.currency)
                    : getCurrencyFromPhone(restaurant.phone || '');
                    
                setCurrency(resolvedCurrency);
            }
        } catch (error) {
            console.error('Error fetching currency:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCurrency();
    }, [fetchCurrency]);

    // Memoized format function using current currency
    const format = useCallback(
        (price: number | string) => formatPrice(price, currency),
        [currency]
    );

    return {
        currency,
        loading,
        formatPrice: format,
        refresh: fetchCurrency
    };
}

/**
 * Standalone function to format price with a specific currency
 * Use this when you don't need the hook (e.g., in utility functions)
 */
export { formatPrice, resolveCurrency, getCurrencyFromPhone };
export type { CurrencyInfo };
