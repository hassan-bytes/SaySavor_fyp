# 🔍 QR ORDER NOT SHOWING IN DASHBOARD - ROOT CAUSE ANALYSIS

**Issue:** User scans QR, places order, but order doesn't appear in Live Orders dashboard
**Status:** INVESTIGATING
**Severity:** CRITICAL

---

## 🔴 IDENTIFIED ROOT CAUSES

### Issue #1: Order Status Not Set on Creation
**Location:** `CustomerMenu.tsx` lines 589-613
**Problem:** When order is created via QR, NO `status` field is set

```typescript
const { data: newOrderData, error: orderInsertError } = await (supabase as any)
    .from('orders')
    .insert({
        restaurant_id: restaurantId,
        table_number: tableNo || null,
        customer_name: trimmedName,
        customer_phone: customerPhone.trim() || null,
        order_type: orderType,
        total_amount: grandTotal,
        session_status: 'OPEN',
        payment_status: paymentMethod === 'ONLINE' ? 'PAID' : 'PENDING',
        payment_method: paymentMethod
        // ❌ MISSING: status field!
    })
```

**Impact:**
- Order created with `status = NULL` or `status = undefined`
- Dashboard filters by status: `pending`, `accepted`, `cooking`, `ready`, `delivered`, `cancelled`
- Order with NULL status doesn't match any filter
- Order doesn't appear in dashboard

---

### Issue #2: Real-time Subscription Filter Mismatch
**Location:** `Orders.tsx` lines 314-326
**Problem:** Real-time subscription listens for INSERT but order may not match filter

```typescript
.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
    async (payload) => {
        console.log('🔔 NEW ORDER RECEIVED', payload);
        await fetchOrders(restaurantId);
    }
)
```

**Issue:**
- Filter only checks `restaurant_id`
- Doesn't verify order has valid `status` field
- If order created with NULL status, it won't be fetched properly

---

### Issue #3: FetchOrders Doesn't Handle NULL Status
**Location:** `Orders.tsx` lines 259-293
**Problem:** Query fetches ALL orders but doesn't filter by status

```typescript
const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('restaurant_id', restId)
    .order('created_at', { ascending: false });
    // ❌ No filter for status - fetches orders with NULL status too
```

**Issue:**
- Fetches orders with NULL status
- Frontend filters by activeTab (DINE_IN/DELIVERY)
- But orders with NULL status might not have order_type set either
- Orders become invisible

---

## 🎯 SOLUTION

### Fix #1: Set Default Status on Order Creation
**File:** `CustomerMenu.tsx` lines 589-613
**Change:** Add `status: 'pending'` when creating order

```typescript
const { data: newOrderData, error: orderInsertError } = await (supabase as any)
    .from('orders')
    .insert({
        restaurant_id: restaurantId,
        table_number: tableNo || null,
        customer_name: trimmedName,
        customer_phone: customerPhone.trim() || null,
        order_type: orderType,
        total_amount: grandTotal,
        session_status: 'OPEN',
        payment_status: paymentMethod === 'ONLINE' ? 'PAID' : 'PENDING',
        payment_method: paymentMethod,
        status: 'pending'  // ✅ ADD THIS
    })
```

### Fix #2: Add Status Filter to FetchOrders
**File:** `Orders.tsx` lines 259-265
**Change:** Filter by active statuses

```typescript
const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('restaurant_id', restId)
    .in('status', ['pending', 'accepted', 'cooking', 'ready', 'delivered', 'cancelled'])
    .order('created_at', { ascending: false });
```

### Fix #3: Ensure Order Type is Set
**File:** `CustomerMenu.tsx` line 556
**Verify:** Order type is correctly determined

```typescript
const orderType = tableNo ? 'DINE_IN' : 'DELIVERY';
// ✅ This looks correct - if tableNo exists, it's DINE_IN
```

---

## 📊 VERIFICATION CHECKLIST

- [ ] Order inserted with `status = 'pending'`
- [ ] Order inserted with `order_type = 'DINE_IN'` or `'DELIVERY'`
- [ ] Order inserted with `restaurant_id` matching dashboard
- [ ] Real-time subscription triggers fetchOrders
- [ ] FetchOrders returns the new order
- [ ] Order appears in dashboard with correct status
- [ ] Order_items are properly inserted

---

## 🔧 IMPLEMENTATION PLAN

1. Add `status: 'pending'` to order creation in CustomerMenu.tsx
2. Add status filter to fetchOrders in Orders.tsx
3. Verify order_type is always set correctly
4. Test QR order creation and dashboard appearance
5. Verify real-time updates work

---

**Next Step:** Implement fixes
