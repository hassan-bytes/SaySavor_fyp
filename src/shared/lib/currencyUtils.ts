// ============================================================
// FILE: currencyUtils.ts
// SECTION: shared > lib
// PURPOSE: Currency utilities for multi-country support.
//          Maps phone dial codes to currency symbols/codes.
//          Provides formatPrice function for consistent display.
// ============================================================

export interface CurrencyInfo {
    code: string;      // ISO 4217 currency code (e.g., "PKR", "USD")
    symbol: string;    // Currency symbol (e.g., "Rs.", "$")
    name: string;      // Full name
    position: 'before' | 'after';  // Symbol position relative to amount
    locale: string;    // Locale for number formatting
    decimals: number;  // Number of decimal places
}

// Map of country codes to currency info
export const COUNTRY_CURRENCIES: Record<string, CurrencyInfo> = {
    PK: { code: 'PKR', symbol: 'Rs.', name: 'Pakistani Rupee', position: 'before', locale: 'en-PK', decimals: 0 },
    US: { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before', locale: 'en-US', decimals: 2 },
    GB: { code: 'GBP', symbol: '£', name: 'British Pound', position: 'before', locale: 'en-GB', decimals: 2 },
    CA: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', position: 'before', locale: 'en-CA', decimals: 2 },
    AE: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', position: 'before', locale: 'ar-AE', decimals: 2 },
    SA: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', position: 'before', locale: 'ar-SA', decimals: 2 },
    CN: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', position: 'before', locale: 'zh-CN', decimals: 2 },
    TR: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', position: 'before', locale: 'tr-TR', decimals: 2 },
    DE: { code: 'EUR', symbol: '€', name: 'Euro', position: 'after', locale: 'de-DE', decimals: 2 },
    AU: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', position: 'before', locale: 'en-AU', decimals: 2 },
    IN: { code: 'INR', symbol: '₹', name: 'Indian Rupee', position: 'before', locale: 'en-IN', decimals: 2 },
};

// Map dial codes to country codes
export const DIAL_CODE_TO_COUNTRY: Record<string, string> = {
    '+92': 'PK',
    '+1': 'US',   // Defaults to US (also used by Canada)
    '+44': 'GB',
    '+971': 'AE',
    '+966': 'SA',
    '+86': 'CN',
    '+90': 'TR',
    '+49': 'DE',
    '+61': 'AU',
    '+91': 'IN',
};

// Default currency when none can be determined
export const DEFAULT_CURRENCY: CurrencyInfo = COUNTRY_CURRENCIES.PK;

/**
 * Extract country code from a phone number with dial code
 * @param phone - Phone number with dial code (e.g., "+923001234567")
 * @returns Country code (e.g., "PK") or null if not found
 */
export function getCountryFromPhone(phone: string | null | undefined): string | null {
    if (!phone) return null;

    // Clean the phone number
    const cleanPhone = phone.replace(/\s+/g, '').trim();

    // Try to match dial codes (longest first to handle overlaps)
    const dialCodes = Object.keys(DIAL_CODE_TO_COUNTRY).sort((a, b) => b.length - a.length);

    for (const dialCode of dialCodes) {
        if (cleanPhone.startsWith(dialCode)) {
            return DIAL_CODE_TO_COUNTRY[dialCode];
        }
    }

    return null;
}

/**
 * Get currency info for a country code
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., "PK")
 * @returns CurrencyInfo object
 */
export function getCurrencyForCountry(countryCode: string | null | undefined): CurrencyInfo {
    if (!countryCode) return DEFAULT_CURRENCY;
    return COUNTRY_CURRENCIES[countryCode.toUpperCase()] || DEFAULT_CURRENCY;
}

/**
 * Get currency info from a phone number
 * @param phone - Phone number with dial code
 * @returns CurrencyInfo object
 */
export function getCurrencyFromPhone(phone: string | null | undefined): CurrencyInfo {
    const countryCode = getCountryFromPhone(phone);
    return getCurrencyForCountry(countryCode);
}

/**
 * Get only the currency symbol
 */
export function getCurrencySymbol(): string {
    return DEFAULT_CURRENCY.symbol;
}

/**
 * Format a price with the appropriate currency symbol
 * @param price - Numeric price value
 * @param currency - CurrencyInfo object or currency code string
 * @returns Formatted price string (e.g., "Rs. 1,500" or "€15.00")
 */
export function formatPrice(
    price: number | string,
    currency: CurrencyInfo | string = DEFAULT_CURRENCY
): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;

    if (isNaN(numPrice)) return `${DEFAULT_CURRENCY.symbol} 0`;

    // Get currency info if string code was passed
    const currencyInfo: CurrencyInfo = typeof currency === 'string'
        ? (Object.values(COUNTRY_CURRENCIES).find(c => c.code === currency) || DEFAULT_CURRENCY)
        : currency;

    // Format the number based on locale
    const formattedNumber = new Intl.NumberFormat(currencyInfo.locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: currencyInfo.decimals,
    }).format(numPrice);

    // Position symbol correctly
    if (currencyInfo.position === 'after') {
        return `${formattedNumber} ${currencyInfo.symbol}`;
    }
    return `${currencyInfo.symbol} ${formattedNumber}`;
}

/**
 * Get currency code from a stored currency string or phone number
 * Useful for database values that might store just the code
 * @param currencyOrPhone - Currency code (PKR) or phone number (+923001234567)
 * @returns CurrencyInfo object
 */
export function resolveCurrency(currencyOrPhone: string | null | undefined): CurrencyInfo {
    if (!currencyOrPhone) return DEFAULT_CURRENCY;

    // Check if it's a currency code
    const currency = Object.values(COUNTRY_CURRENCIES).find(
        c => c.code === currencyOrPhone.toUpperCase()
    );
    if (currency) return currency;

    // Check if it's a phone number
    if (currencyOrPhone.startsWith('+')) {
        return getCurrencyFromPhone(currencyOrPhone);
    }

    // Check if it's a country code
    return getCurrencyForCountry(currencyOrPhone);
}
