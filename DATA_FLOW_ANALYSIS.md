# 🔄 DATA FLOW ANALYSIS: Current vs Required

## ❌ CURRENT FLOW #1: Real-Time Orders

```
Customer QR Scan Order
    ↓
Supabase insert into orders table
    ↓
Postgres Change Event fired ✅
    ↓
┌─────────────────────────────────┐
│ Partner_Dashboard receives it?   │
│   ❌ NO - Only broadcast listener│
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ UnifiedOrdersManager receives it?│
│   ✅ YES via setupOrderRealtime  │
│   ✅ Calls fetchOrders()         │
│   ✅ Updates KitchenTab display  │
└─────────────────────────────────┘
    ↓
Partner sees order in nested component
BUT: Order count badge on main dashboard stays 0 ❌
BUT: Bill notification doesn't trigger ❌
```

### ✅ SHOULD BE:

```
Customer QR Scan Order
    ↓
Supabase insert into orders table
    ↓
Postgres Change Event fired ✅
    ↓
Partner_Dashboard receives it
    ├─→ Updates order count badge ✅
    ├─→ Plays notification sound ✅
    └─→ Shows toast notification ✅
    ↓
UnifiedOrdersManager receives it
    ├─→ Updates KitchenTab ✅
    ├─→ Updates POSTab ✅
    └─→ Updates bill totals ✅
    ↓
Notification system queues order
    ├─→ Batches with other orders (if any) ✅
    └─→ Triggers after 2-3 seconds (not 5) ✅
    ↓
Partner gets instant, complete update ✅
```

---

## ❌ CURRENT FLOW #2: Menu Updates (Partner → Customer)

```
Partner updates menu item
    ↓
MenuManager.tsx handleApplyOffer()
    ↓
useMenuOffers.handleApplyCategoryOffer()
    ↓
Database updated ✅
    ├─→ menu_items.price changed
    ├─→ menu_items.offer_name set
    └─→ menu_items.discount_percentage set
    ↓
Partner UI updated ✅
    ├─→ MenuManager displays new price
    └─→ User sees "Offer applied"
    ↓
Postgres Change Event fired ✅ (but not listened to)
    ↓
┌─────────────────────────────────┐
│ CustomerMenu listening?          │
│   ❌ NO - Only one-time fetch   │
│   on mount                       │
└─────────────────────────────────┘
    ↓
Customer doesn't see update ❌
    ↓
Customer must close & reopen menu
```

### ✅ SHOULD BE:

```
Partner updates menu item
    ↓
MenuManager.tsx handleApplyOffer()
    ↓
useMenuOffers.handleApplyCategoryOffer()
    ↓
Database updated ✅
    ├─→ menu_items.price changed
    ├─→ menu_items.offer_name set
    └─→ menu_items.discount_percentage set
    ↓
Broadcast event sent ✅
    ├─→ supabase.channel('menu-updates')
    │   .on('broadcast', ...)
    │   .send()
    └─→ event: 'menu-updated', data: { restaurant_id, ... }
    ↓
Partner UI updated ✅
    ├─→ MenuManager displays new price
    └─→ User sees "Offer applied"
    ↓
Postgres Change Event + Broadcast fired ✅
    ↓
CustomerMenu listens to broadcast ✅
    ├─→ postgres_changes on menu_items
    ├─→ postgres_changes on menu_variants
    └─→ postgres_changes on menu_modifier_groups
    ↓
CustomerMenu refetches menu ✅
    ├─→ Fetches new prices
    ├─→ Fetches new offers
    └─→ Fetches new variants
    ↓
Customer sees update INSTANTLY ✅
    ├─→ No page refresh needed
    └─→ Items re-render with new prices
```

---

## ❌ CURRENT FLOW #3: Payment Status

```
Customer creates order in Checkout
    ↓
customerOrderService.createOrder()
    ├─→ Validates cart ✅
    ├─→ Calculates totals ✅
    └─→ Gets payment_method from params
    ↓
Stripe Payment Intent created ✅
    ├─→ stripe_payment_intent_id returned
    └─→ Customer sent to Stripe modal
    ↓
Order inserted into DB
    ├─→ status: 'pending' ✅
    ├─→ payment_status: ???
    │   IF params.payment_method === 'ONLINE' 
    │      AND params.stripe_payment_intent_id exists
    │   THEN: 'paid' ❌ (WRONG - assumes success)
    │   ELSE: 'pending' (for COD)
    └─→ session_status: 'active' ✅
    ↓
Customer enters payment details in Stripe modal
    ↓
┌────────────────────────────────────┐
│ Payment succeeded or failed?        │  
│ ❌ App doesn't check               │
│ ❌ No webhook listener             │
│ ❌ Order status = wrong forever    │
└────────────────────────────────────┘
    ↓
PaymentSuccess page shown
    ├─→ Gets 'redirect_status' from Stripe
    ├─→ Navigates based on status ✅
    └─→ ❌ Does NOT update order.payment_status
    ↓
Partner dashboard
    ├─→ Sees payment_status: 'paid' (OR 'pending')
    └─→ ❌ Can't trust it
    ↓
Partner waits for payment confirmation
    ❌ Never comes
```

### ✅ SHOULD BE:

```
Customer creates order in Checkout
    ↓
customerOrderService.createOrder()
    ├─→ Validates cart ✅
    ├─→ Calculates totals ✅
    └─→ Gets payment_method from params
    ↓
Stripe Payment Intent created ✅
    ├─→ stripe_payment_intent_id returned
    └─→ Customer sent to Stripe modal
    ↓
Order inserted into DB
    ├─→ status: 'pending' ✅
    ├─→ payment_status: 'pending' ✅ (ALWAYS pending initially)
    │   Reason: Payment not confirmed yet
    ├─→ stripe_payment_intent_id saved ✅
    └─→ session_status: 'active' ✅
    ↓
Customer enters payment details in Stripe modal
    ↓
Stripe processes payment
    ├─→ If successful → webhook fired ✅
    ├─→ If failed → webhook fired ✅
    └─→ If requires verification → webhook fired ✅
    ↓
Webhook Handler (Supabase Edge Function)
    ├─→ Receives Stripe webhook ✅
    ├─→ Verifies signature ✅
    ├─→ Checks payment_intent status
    │   ├─→ If 'succeeded' → Update order.payment_status = 'paid' ✅
    │   ├─→ If 'processing' → Update order.payment_status = 'processing' ✅
    │   └─→ If 'requires_action' → Update order.payment_status = 'pending' ✅
    └─→ Sends notification to customer ✅
    ↓
Partner dashboard listens to order changes
    ├─→ Receives real-time update ✅
    ├─→ payment_status changes to 'paid' ✅
    └─→ Shows payment confirmed ✅
    ↓
Partner trusts payment_status ✅
    ├─→ Can start preparing food ✅
    └─→ No need to manually verify
```

---

## 🔧 WEBHOOK HANDLER IMPLEMENTATION SPECIFICATION

### Edge Function Details
- **Function Name**: `stripe-payment-webhook`
- **Location**: `supabase/functions/stripe-payment-webhook/index.ts`
- **Endpoint URL**: `https://{PROJECT_ID}.supabase.co/functions/v1/stripe-payment-webhook`
- **Stripe Configuration**: Register webhook endpoint in Stripe Dashboard under Webhooks

### Handler Implementation Requirements

**1. Signature Verification**
```
- Extract Stripe signing secret from environment variable: STRIPE_WEBHOOK_SECRET
- Verify raw request body using stripe.webhooks.constructEvent(body, sig, secret)
- Reject requests with invalid signatures (respond 401 Unauthorized)
```

**2. Event Processing**
```
- Listen for: payment_intent.succeeded, payment_intent.processing, payment_intent.payment_failed
- Query orders table by stripe_payment_intent_id
- Match payment intent status to order.payment_status: 'paid', 'processing', 'failed'
```

**3. Database Update (Idempotent)**
```
- After fetch, check current payment_status before updating
- Only update if status differs (e.g., skip if already 'paid')
- Use conditional WHERE clause: WHERE payment_status != new_status
- Include transaction wrapper to ensure atomicity
```

**4. Error Handling & Retry**
```
- Catch DB errors and log to stderr
- Return 200 OK to Stripe even if DB fails (acknowledge receipt)
- Optionally: Store failed events in dead_letter_queue table for manual retry
- Add retry/backoff logic for transient database failures
```

**5. Response Pattern**
```
- Success (valid signature, saved to DB): return 200 { "success": true }
- Invalid signature: return 401 { "error": "Invalid signature" }
- Processing error: return 200 (acknowledge to Stripe, log error)
```

### Environment Variables Required
- `STRIPE_WEBHOOK_SECRET`: Signing secret from Stripe Dashboard
- `SUPABASE_ANON_KEY`: For authenticated database access
- Database connection: Provided by Supabase environment

---

## 🔗 DEPENDENCY DIAGRAM

### Current (Broken) Dependencies:

```
Partner_Dashboard
    ├─ Broadcasts only (bill requests) ❌
    └─ Order count needs manual refresh ❌
         
UnifiedOrdersManager (nested)
    ├─ Real-time listener ✅
    ├─ KitchenTab ✅
    ├─ POSTab ✅
    ├─ HistoryTab ⚠️
    └─ NotificationManager (not wired) ❌

CustomerMenu
    ├─ One-time fetch ❌
    ├─ No menu subscription ❌
    └─ No broadcast listener ❌

useMenuOffers
    ├─ Updates DB ✅
    ├─ No broadcast ❌
    └─ No customer notification ❌

customerOrderService
    ├─ Creates order ✅
    ├─ Sets payment_status wrong ❌
    └─ No webhook validation ❌
```

### Should Be (Fixed) Dependencies:

```
Partner_Dashboard
    ├─ Real-time listener for orders ✅
    ├─ Notification manager integration ✅
    ├─ Order count updates ✅
    └─ Bill request broadcast ✅
         
UnifiedOrdersManager
    ├─ Real-time listener ✅
    ├─ KitchenTab ✅
    ├─ POSTab ✅
    ├─ HistoryTab ✅
    └─ NotificationManager properly wired ✅

CustomerMenu
    ├─ Initial fetch ✅
    ├─ postgres_changes subscription ✅
    ├─ Broadcast listener for menu_updates ✅
    └─ Auto-refresh on changes ✅

useMenuOffers
    ├─ Updates DB ✅
    ├─ Sends broadcast event ✅
    └─ Triggers customer refresh ✅

customerOrderService
    ├─ Creates order ✅
    ├─ Sets payment_status = 'pending' ✅
    └─ Webhook handler validates and updates ✅
```

---

## 📡 EVENT FLOW DIAGRAM

### Missing Events:

```
Partner's Action              Should Trigger Event           Currently Triggers
─────────────────────────────────────────────────────────────────────────────
1. Add order via QR           → Order INSERT event ✅        → Nothing in Dashboard ❌
                              → Broadcast to Partner         → (Only in nested component)
                              → Broadcast to Customer ✅

2. Update menu price          → menu_items UPDATE ✅         → Nothing to Customer ❌
                              → Broadcast to Customers       → (No broadcast)
                              → Trigger menu refresh         → (No trigger)

3. Apply offer               → menu_items UPDATE ✅         → Nothing to Customer ❌
                              → Broadcast to Customers       → (No broadcast)
                              → Show offer pop-up            → (No notification)

4. Complete payment          → payment_intent.succeeded ✅   → Nothing ❌
   (Stripe webhook)          → Update order.payment_status   → (No webhook handler)
                              → Broadcast confirmation       → (No broadcast)
```

---

## 🎯 COMMUNICATION CHANNELS NOT BEING USED

| Channel | Used For | Current Status | Should Use |
|---------|----------|-----------------|------------|
| Postgres Changes (orders) | Order CRUD | ✅ UnifiedOrdersManager only | ❌ Partner_Dashboard too |
| Postgres Changes (menu_items) | Menu updates | ❌ No listener | ✅ CustomerMenu |
| Postgres Changes (menu_variants) | Variant changes | ❌ No listener | ✅ CustomerMenu |
| Broadcast (bill_request) | Bill requests | ✅ Partner_Dashboard | ✅ Keep using |
| Broadcast (menu_updates) | Menu changes | ❌ Not created | ✅ Create & use |
| Webhook (Stripe) | Payment status | ❌ No handler | ✅ Create handler |
| Notification system | Order alerts | ❌ Created but unused | ✅ Wire into flow |

---

## 💾 DATABASE EVENT READINESS

```
Database                Real-Time Ready?    Customer Listening?  Partner Listening?
─────────────────────────────────────────────────────────────────────────────
orders                  ✅ YES              N/A                  ⚠️ UnifiedOrders only
menu_items              ✅ YES              ❌ NO                ✅ MenuManager
menu_variants           ✅ YES              ❌ NO                ✅ MenuManager
menu_modifier_groups    ✅ YES              ❌ NO                ✅ MenuManager
categories              ✅ YES              ❌ NO                ✅ MenuManager
restaurants             ✅ YES              ⚠️ Limited           ✅ Yes
order_items             ✅ YES              ⚠️ Not used           ✅ UnifiedOrders
```

---

## 🔔 NOTIFICATION FLOW (Current vs Required)

### Current Flow (Broken):

```
Order arrives in DB
    ↓
Real-time event fires
    ↓
UnifiedOrdersManager.fetchOrders()
    ↓
Orders display in Kitchen tab ✅
    ↓
❌ But: No sound notification
❌ But: Partner badge doesn't update
❌ But: Main dashboard didn't know
```

### Required Flow:

```
Order arrives in DB
    ↓
Real-time event fires
    ↓
notificationManager.addOrderToQueue(order)
    ↓
Order batches with others (up to 3 seconds)
    ↓
processBatch() fires
    ├─→ Sound plays ✅
    ├─→ Toast notification shows ✅
    ├─→ DND mode checked ✅
    └─→ onOrdersReady callback fires
        ├─→ UnifiedOrdersManager.fetchOrders()
        ├─→ Updates Kitchen tab ✅
        ├─→ Updates order count badge ✅
        └─→ Shows visual alert ✅
```

---

## 📊 STATE MANAGEMENT ISSUES

### Order State Flow:

```
CURRENT (Broken):
  Partner_Dashboard state                UnifiedOrdersManager state
         ↓ (separate)                           ↓
    restaurantId                            restaurantId (passed via context)
    pendingCount                            allOrders
    realtimeTrigger                         tableSessions
         ↓                                      ↓
    Updates independently              Updates independently
    Get out of sync                   Get out of sync
         ✗ Partner sees 0 pending      ✓ Kitchen sees 5 orders


SHOULD BE:
  Unified State Management
         ↓
    restaurantId (in context)
    allOrders (shared state)
    pendingCount (derived from allOrders)
    tableSessions (shared state)
         ↓
    Both components update same state
    Both reflect same reality
    ✓ No sync issues
```

---

## 🚨 CRITICAL FAILURE SCENARIOS

### Scenario 1: Network Glitch
```
Real-time WebSocket drops for 5 seconds
    ↓
CURRENT: App doesn't know, freezes showing old data ❌
SHOULD: Auto-fall back to polling every 10 seconds ✅
```

### Scenario 2: Payment Webhook Lost
```
Stripe sends webhook, it fails to reach server
    ↓
CURRENT: Order stuck with payment_status='pending' forever ❌
         Partner doesn't know payment succeeded
         Customer thinks payment failed
SHOULD: Webhook retry mechanism + manual verification endpoint ✅
```

### Scenario 3: Partner in Different Tab
```
Partner has dashboard open in Tab A
Partner opens dashboard again in Tab B
    ↓
CURRENT: Two separate subscriptions fighting over state ❌
         Orders might show in Tab A but not Tab B
SHOULD: Single subscription, broadcast to all tabs ✅
```

**Multi-Tab Synchronization Strategy:**

**Recommended Approach:** BroadcastChannel API with localStorage fallback
- **Browser Support:** BroadcastChannel is supported in modern browsers (Chrome, Firefox, Safari 15.4+)
- **Fallback:** localStorage storage events for older browsers or cross-origin isolation
- **Implementation:** Create a persistent RealtimeChannel reference that persists across tab lifecycle

**How It Works:**
```
Tab A (Supabase realtime subscriber):
  ├─ subscribes to postgres_changes for orders
  ├─ broadcasts order updates via BroadcastChannel('orders')
  ├─ both Tab A and Tab B receive updates
  └─ state syncs across tabs

Tab B (No server subscription):
  ├─ joins existing BroadcastChannel('orders') listener
  ├─ receives order updates from Tab A
  ├─ updates local state
  └─ UI reflects same orders as Tab A
```

**Implementation Location:** 
- **Client Subscription Manager Component**: PartnerAuthContext or dedicated realtime provider component
- **Broadcast Emitter**: orderRealtimeService.setupOrderRealtimeListener() 
- **Broadcast Receiver**: Partner_Dashboard, UnifiedOrdersManager (register on mount)

**Tradeoffs:**
| Approach | Browser Support | Complexity | Supabase Handled? | Cost |
|----------|-----------------|-----------|------------------|------|
| BroadcastChannel | Modern only | Low | No | Free |
| localStorage Events | All | Medium | No | Free |
| Supabase Presence | All | Low | ✅ Yes | Minimal |
| Message Queue | All | High | No | Paid |

---

## ⚙️ TECHNICAL DEBT - PRIORITIZED BY FAILURE SCENARIO SEVERITY

### 🔴 Immediate (Blocks Orders from Working):
1. **Add real-time listener to Partner_Dashboard** (Scenario 1) - Orders visible in nested component only
2. **Fix payment_status initial value** - Set to 'pending', let webhook update to 'paid' (Scenario 2)
3. **Add menu real-time subscriptions to CustomerMenu** - Customers see stale prices/offers
4. **Create Stripe webhook handler** - Payment confirmations not reaching app (Scenario 2)

### 🟠 Short-term (Must Fix Within 1 Sprint):
1. **Add polling fallback for network resilience** (Scenario 1) - WebSocket drop leaves app frozen
2. **Implement multi-tab synchronization** (Scenario 3) - Use BroadcastChannel API with localStorage fallback for browser compatibility
3. **Integrate notification system** - Wire NotificationManager.addOrderToQueue into order handlers
4. **Add broadcast for menu updates** - Trigger customer menu refresh when partner updates items/offers
5. **Webhook retry mechanism** - Persist events, retry on failure, add dead-lettering queue

### 🟡 Long-term (Quality & Scale):
1. Add conflict resolution for concurrent updates
2. Add audit logging for all updates  
3. Add connection status indicators
4. Implement exponential backoff for retry logic
5. Add observability/metrics for realtime performance