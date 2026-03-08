# Menu Manager Enhancement Plan

## Critical Issues to Fix

### 1. ❌ Images Not Showing
**Problem:** Items added but images NULL in database
**Cause:** SQL migration (`add_cuisine_column.sql`) not run yet
**Fix:** 
- User must run SQL in Supabase first
- Then delete old items and re-add via Restaurant Setup

### 2. 💵 Currency Hardcoded to Dollar
**Problem:** Showing `$` instead of country-based currency
**Current:** No currency logic implemented
**Fix Needed:**
- Store currency in restaurant table based on partner's country
- Use currency symbol dynamically in MenuManager
- Extract country from phone number during signup

### 3. 🔄 Wrong Redirect After Setup
**Problem:** Setup completion redirects to Dashboard, should go to Menu Manager
**Current:** `navigate('/dashboard')` in RestaurantSetup.tsx
**Fix:** Change to `navigate('/dashboard/menu')`

### 4. 📥 Missing Menu Download Button
**Problem:** Download feature exists in RestaurantSetup Step 3 but not in Menu Manager
**Fix:** Copy download functionality to MenuManager

### 5. 🎨 Add Dish Dialog Too Complex
**Problem:** 
- No image upload button (only URL input)
- Too many fields
- Not user-friendly
**Fix:**
- Add file upload input with preview
- Simplify UI
- Auto-fill category dropdown

## Implementation Priority

1. **HIGH:** Fix Add Dish Dialog (simplify + add image upload)
2. **HIGH:** Add Menu Download button
3. **MEDIUM:** Fix redirect to Menu Manager
4. **MEDIUM:** Currency system implementation
5. **LOW:** Images (depends on SQL migration by user)

## Next Steps

1. Simplify Add Dish dialog with image upload
2. Add Menu Download functionality
3. Fix redirect path
4. Build currency system based on country code
