-- ============================================================
-- Migration: Add currency column to restaurants table
-- Purpose: Store the restaurant's preferred currency code (e.g., PKR, USD)
--          for proper price formatting across the application.
-- ============================================================

-- Add currency column with default PKR (Pakistani Rupee)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'PKR';

-- Add comment for documentation
COMMENT ON COLUMN restaurants.currency IS 'ISO 4217 currency code (e.g., PKR, USD, GBP). Derived from phone country during signup.';

-- Update existing restaurants to derive currency from phone dial code
-- This is a one-time migration to populate existing data
UPDATE restaurants
SET currency = CASE 
    WHEN phone LIKE '+92%' THEN 'PKR'
    WHEN phone LIKE '+1%' THEN 'USD'
    WHEN phone LIKE '+44%' THEN 'GBP'
    WHEN phone LIKE '+971%' THEN 'AED'
    WHEN phone LIKE '+966%' THEN 'SAR'
    WHEN phone LIKE '+86%' THEN 'CNY'
    WHEN phone LIKE '+90%' THEN 'TRY'
    WHEN phone LIKE '+49%' THEN 'EUR'
    WHEN phone LIKE '+61%' THEN 'AUD'
    WHEN phone LIKE '+91%' THEN 'INR'
    ELSE 'PKR'  -- Default fallback
END
WHERE currency IS NULL OR currency = 'PKR';

-- Create index for potential currency-based queries
CREATE INDEX IF NOT EXISTS idx_restaurants_currency ON restaurants(currency);
