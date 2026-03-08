-- SQL Migration: Add Discount Fields to menu_items
-- Run this in your Supabase SQL Editor

ALTER TABLE menu_items 
  ADD COLUMN IF NOT EXISTS original_price NUMERIC,
  ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC,
  ADD COLUMN IF NOT EXISTS offer_name TEXT;

-- Update existing items to have original_price if they don't (optional)
-- UPDATE menu_items SET original_price = price WHERE original_price IS NULL;
