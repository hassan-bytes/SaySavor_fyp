# Multi-Tenant Security Architecture

## Overview
This document outlines the multi-tenant data isolation strategy for SaySavor POS system. Every restaurant's data is completely isolated from other restaurants.

---

## Architecture Components

### 1. RestaurantContext
**Location:** `src/shared/contexts/RestaurantContext.tsx`

**Purpose:** Provides `restaurantId` to all dashboard components through React Context.

**Key Features:**
- Fetches restaurant by `owner_id` (authenticated user)
- Validates `restaurantId` is non-null before rendering children
- Throws error if `useRestaurant()` called outside provider
- Blocks rendering with error screen if no restaurant found

**Usage:**
```tsx
import { useRestaurant } from '@/shared/contexts/RestaurantContext';

function MyComponent() {
  const { restaurantId, restaurantName } = useRestaurant();
  
  // Perform Supabase queries inside useEffect, not at component render
  useEffect(() => {
    if (!restaurantId) return;
    
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId); // REQUIRED filter
    };
    
    fetchOrders();
  }, [restaurantId]);
}
```

---

## Required Supabase RLS Policies

### Orders Table

#### 1. SELECT Policy (Read Access)
```sql
CREATE POLICY "Partners can view their own restaurant orders"
ON orders
FOR SELECT
USING (
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE owner_id = auth.uid()
  )
);
```

**What it does:**
- Partners can only SELECT orders where `restaurant_id` matches their restaurant
- Uses subquery to get restaurant ID from authenticated user
- Prevents cross-restaurant data access

#### 2. INSERT Policy (Create Orders)
```sql
CREATE POLICY "Partners can create orders for their restaurant"
ON orders
FOR INSERT
WITH CHECK (
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE owner_id = auth.uid()
  )
);
```

**What it does:**
- Partners can only INSERT orders with their own `restaurant_id`
- Prevents creating orders for other restaurants
- Validates `restaurant_id` on insert

#### 3. UPDATE Policy (Modify Orders)
```sql
CREATE POLICY "Partners can update their own restaurant orders"
ON orders
FOR UPDATE
USING (
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE owner_id = auth.uid()
  )
);
```

**What it does:**
- Partners can only UPDATE orders belonging to their restaurant
- Status changes, payment updates, etc. are isolated
- Cannot modify other restaurants' orders

#### 4. DELETE Policy (Cancel Orders)
```sql
CREATE POLICY "Partners can delete their own restaurant orders"
ON orders
FOR DELETE
USING (
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE owner_id = auth.uid()
  )
);
```

**What it does:**
- Partners can only DELETE/cancel orders from their restaurant
- Prevents accidental deletion of other restaurants' data

---

### Order Items Table

#### SELECT Policy
```sql
CREATE POLICY "Partners can view order items for their restaurant"
ON order_items
FOR SELECT
USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE owner_id = auth.uid()
    )
  )
);
```

#### INSERT Policy
```sql
CREATE POLICY "Partners can create order items for their restaurant"
ON order_items
FOR INSERT
WITH CHECK (
  order_id IN (
    SELECT id FROM orders 
    WHERE restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE owner_id = auth.uid()
    )
  )
);
```

#### UPDATE Policy (Intentionally Omitted)
Order items are IMMUTABLE for audit integrity. Partners cannot update individual items after order creation.
If modifications are needed, cancel the order and create a new one.

#### DELETE Policy (Intentionally Omitted)
Order items are IMMUTABLE for audit integrity. Partners cannot delete items after order creation.
Historical records must be preserved for compliance and analytics.

## Application-Level Filtering

### CRITICAL RULE
**Every Supabase query MUST include `.eq('restaurant_id', restaurantId)`**

### ✅ Correct Examples

```tsx
// UnifiedOrdersManager.tsx
const { data } = await supabase
  .from('orders')
  .select('*, order_items(*)')
  .eq('restaurant_id', restaurantId) // ✅ REQUIRED
  .order('created_at', { ascending: false });

// POSTab.tsx
const { data: order } = await supabase
  .from('orders')
  .insert({
    restaurant_id: restaurantId, // ✅ REQUIRED on insert
    table_number: selectedTable,
    total_amount: cartTotal,
    // ... other fields
  });

// Real-time listener
const channel = supabase
  .channel(`restaurant-${restaurantId}-orders`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders',
    filter: `restaurant_id=eq.${restaurantId}` // ✅ REQUIRED
  }, callback);
```

### ❌ Incorrect Examples (SECURITY RISK)

```tsx
// ❌ WRONG: No restaurant_id filter
const { data } = await supabase
  .from('orders')
  .select('*'); // Fetches ALL restaurants' orders!

// ❌ WRONG: OR condition can bypass filter
const { data } = await supabase
  .from('orders')
  .select('*')
  .or(`restaurant_id.eq.${restaurantId},status.eq.pending`);
  // This could return orders from other restaurants!

// ❌ WRONG: Using hardcoded restaurant_id
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('restaurant_id', 'abc-123'); // Never hardcode!
```

---

## Components Verified for Multi-Tenant Security

### ✅ Secure Components (restaurant_id filter present)

1. **UnifiedOrdersManager.tsx**
   - Line 114: `.eq('restaurant_id', restaurantId)` on fetchOrders
   - Line 228: `.eq('restaurant_id', restaurantId)` on closeSession

2. **POSTab.tsx**
   - Line 216: `restaurant_id: restaurantId` on order insert

3. **Partner_Dashboard.tsx**
   - Line 129: `.eq('restaurant_id', restaurantId)` on totals fetch
   - Line 199: `.eq('restaurant_id', restaurantId)` on pending count
   - Line 430: `.eq('restaurant_id', restaurantId)` on recent orders

4. **NewOrderModal.tsx**
   - Line 227: `.eq('restaurant_id', restaurantId)` on existing order check
   - Line 249: `restaurant_id: restaurantId` on order insert

5. **CustomerInsights.tsx**
   - Line 54: `.eq('restaurant_id', restaurantId)` on orders fetch

6. **orderRealtimeService.ts**
   - Line 68: `filter: 'restaurant_id=eq.${restaurantId}'` on real-time subscription

---

## Testing Multi-Tenant Isolation

### Test 1: Data Isolation Between Restaurants
```bash
1. Create two partner accounts (Partner A, Partner B)
2. Partner A creates restaurant "Restaurant A"
3. Partner B creates restaurant "Restaurant B"
4. Partner A creates 5 orders
5. Partner B creates 3 orders
6. Login as Partner A → Should see ONLY 5 orders
7. Login as Partner B → Should see ONLY 3 orders
8. ✅ PASS: No cross-restaurant data visible
```

### Test 2: Real-Time Isolation
```bash
1. Partner A logged in → Kitchen Flow tab
2. Partner B logged in → Kitchen Flow tab (different browser)
3. Create order for Restaurant A via QR
4. ✅ Partner A sees new order instantly
5. ✅ Partner B sees NOTHING (isolated)
6. Create order for Restaurant B via QR
7. ✅ Partner B sees new order instantly
8. ✅ Partner A sees NOTHING (isolated)
```

### Test 3: RLS Policy Enforcement
```bash
1. Login as Partner A
2. Open browser DevTools → Console
3. Try to bypass app and query directly:
   
   const { data } = await supabase
     .from('orders')
     .select('*'); // No restaurant_id filter
   
4. ✅ PASS: RLS blocks query, returns only Partner A's orders
5. Try to insert order for different restaurant:
   
   const { data } = await supabase
     .from('orders')
     .insert({ restaurant_id: 'other-restaurant-id', ... });
   
6. ✅ PASS: RLS blocks insert, returns error
```

### Test 4: Context Validation
```bash
1. Manually set restaurantId to null in RestaurantContext
2. ✅ PASS: Error screen appears
3. Message: "Restaurant Not Found"
4. Button redirects to /restaurant-setup
5. Dashboard does NOT render with null restaurantId
```

---

## Security Checklist

Before deploying any new feature that touches orders:

- [ ] Component uses `useRestaurant()` hook
- [ ] All SELECT queries include `.eq('restaurant_id', restaurantId)`
- [ ] All INSERT queries include `restaurant_id: restaurantId`
- [ ] All UPDATE queries include `.eq('restaurant_id', restaurantId)`
- [ ] Real-time subscriptions filter by `restaurant_id=eq.${restaurantId}`
- [ ] No hardcoded restaurant IDs in code
- [ ] No OR conditions that could bypass restaurant_id filter
- [ ] RLS policies enabled on database table
- [ ] Tested with multiple restaurants to verify isolation

---

## Common Pitfalls to Avoid

### 1. Forgetting restaurant_id Filter
```tsx
// ❌ WRONG
const { data } = await supabase.from('orders').select('*');

// ✅ CORRECT
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('restaurant_id', restaurantId);
```

### 2. Using Optional Chaining on restaurantId
```tsx
// ❌ WRONG - restaurantId could be undefined
.eq('restaurant_id', restaurantId || '')

// ✅ CORRECT - useRestaurant() guarantees non-null
const { restaurantId } = useRestaurant(); // Throws if null
.eq('restaurant_id', restaurantId)
```

### 3. Bypassing Context
```tsx
// ❌ WRONG - Don't fetch restaurant_id directly
const { data: { user } } = await supabase.auth.getUser();
const restaurantId = user?.user_metadata?.restaurant_id;

// ✅ CORRECT - Use context
const { restaurantId } = useRestaurant();
```

### 4. Real-Time Without Filtering
```tsx
// ❌ WRONG - Receives ALL restaurants' orders
.channel('orders')
.on('postgres_changes', { table: 'orders' }, callback)

// ✅ CORRECT - Filtered by restaurant
.channel(`restaurant-${restaurantId}-orders`)
.on('postgres_changes', { 
  table: 'orders',
  filter: `restaurant_id=eq.${restaurantId}`
}, callback)
```

---

## Incident Response

If data leakage is suspected:

1. **Immediate Actions:**
   - Disable affected feature
   - Review all queries in component
   - Check RLS policies are enabled
   - Verify restaurantId filtering

2. **Investigation:**
   - Check Supabase logs for unauthorized queries
   - Review recent code changes
   - Test with multiple restaurant accounts
   - Verify real-time subscriptions

3. **Remediation:**
   - Add missing `.eq('restaurant_id', restaurantId)` filters
   - Update RLS policies if needed
   - Add automated tests for isolation
   - Document in this file

---

## Maintenance

This document should be updated when:
- New tables are added that store restaurant-specific data
- New components fetch order data
- RLS policies are modified
- Security vulnerabilities are discovered
- New multi-tenant features are added

**Last Updated:** March 27, 2026
**Reviewed By:** Authentication Specialist
**Next Review:** Before production deployment
