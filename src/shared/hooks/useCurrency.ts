// ============================================================
// FILE: useCurrency.ts
// SECTION: shared > hooks
// PURPOSE: React hook for restaurant currency management.
//          Provides currency info and formatPrice function
//          based on the restaurant's stored currency or phone.
// ============================================================
import { useCallback } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { 
    CurrencyInfo, 
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
    const { currency, preferencesLoading, refreshPreferences } = useLanguage();

    // Memoized format function using current currency
    const format = useCallback(
        (price: number | string) => formatPrice(price, currency),
        [currency]
    );

    const fetchCurrency = useCallback(async () => {
        await refreshPreferences();
    }, [refreshPreferences]);

    return {
        currency,
        loading: preferencesLoading,
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
