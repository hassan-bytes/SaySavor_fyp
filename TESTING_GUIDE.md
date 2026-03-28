# 🧪 COMPLETE REAL-TIME SYSTEM TESTING GUIDE

## Overview

This guide walks through testing the entire real-time order system end-to-end, including payment processing, menu synchronization, and notifications.

---

## 🛠️ SETUP: Test Environment Configuration

### Step 1: Enable Stripe Test Mode

1. **Create a Stripe Test Account** (or use existing)
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Toggle **"Test mode"** (bottom-left corner)
   - Copy your **Test Secret Key** (starts with `sk_test_`)

2. **Update Environment Variables**
   ```bash
   # In Supabase Project Settings → Functions → Environment Variables
   STRIPE_SECRET_KEY=sk_test_XXXXX  # Your test key
   STRIPE_WEBHOOK_SECRET=whsec_test_XXXXX  # You'll get after webhook setup
   ```

3. **Get Test Credit Card Details**
   ```
   Card Number:  4242 4242 4242 4242
   Expiry:       12/29
   CVC:          123
   Name:         Test User
   ```
   [More test cards](https://stripe.com/docs/testing)

### Step 2: Test Webhook Registration

1. **Install Stripe CLI** (if not done)
   ```bash
   # On Windows:
   choco install stripe-cli
   
   # On macOS:
   brew install stripe/stripe-cli/stripe
   
   # On Linux:
   curl https://files.stripe.com/stripe-cli/install.sh -O
   bash install.sh
   ```

2. **Login to Stripe CLI**
   ```bash
   stripe login
   # Follow browser prompt to authenticate
   ```

3. **Start Local Webhook Listener**
   ```bash
   # For Supabase Edge Function (Recommended):
   stripe listen --forward-to https://[PROJECT_ID].supabase.co/functions/v1/stripe-payment-webhook
   
   # For local backend API (if you have one):
   # stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
   
   # NOTE: Vite dev server runs on port 5173 (frontend only - doesn't handle webhooks)
   # Only forward to http://localhost:5173 if your setup handles webhooks on Vite
   
   # You'll see:
   # > Ready! Your webhook signing secret is: whsec_test_XXXXX
   # SAVE THIS VALUE → Update STRIPE_WEBHOOK_SECRET in Supabase Environment Variables
   ```

### Step 3: Setup Local Development Server

```bash
# Terminal 1: Start dev server
npm run dev
# Runs on: http://localhost:5173 (Vite)

# Terminal 2: Watch Supabase functions (optional)
supabase functions deploy stripe-payment-webhook --watch

# Terminal 3: Monitor Supabase logs
supabase functions logs stripe-payment-webhook --follow
```

---

## 🧪 TEST SCENARIO 1: Basic Payment Processing

### Objective
Verify payment status updates from 'pending' → 'paid' when webhook fires.

### Steps

**1. Create Test Order (Online Payment)**
```
┌─────────────────────────────────────┐
│ Customer Places Order               │
├─────────────────────────────────────┤
│ 1. Open QR menu                     │
│ 2. Add items to cart                │
│ 3. Checkout → Select "Online"       │
│ 4. Enter test card: 4242 4242...    │
│ 5. Click "Pay"                      │
└─────────────────────────────────────┘
```

**2. Check Initial State**
```bash
# In Supabase Studio → SQL Editor, run:
SELECT id, customer_name, status, payment_status, 
       payment_method, stripe_payment_intent_id, created_at
FROM orders
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;

# Expected: payment_status = 'pending'
```

**3. Trigger Webhook (Stripe CLI)**
```bash
# In Terminal 3 (webhook listener):
stripe trigger payment_intent.succeeded

# You should see in logs:
# ✓ Webhook received [evt_...]
# Processing payment_intent.succeeded
# Order [id] payment_status updated to 'paid'
```

**4. Verify Payment Status Changed**
```bash
# Re-run SQL query from Step 2
# Expected: payment_status = 'paid'

# OR check Partner Dashboard:
# - Order appears in "Kitchen" tab
# - Payment badge shows ✓ PAID
```

### ✅ Success Criteria
- [ ] Initial payment_status is 'pending' (NOT 'paid')
- [ ] Webhook fires without errors
- [ ] Payment_status updates to 'paid' within 2 seconds
- [ ] Order appears in partner dashboard

### ❌ If Fails
```
Issue: Payment stays 'pending'
Check:
1. Webhook logs: supabase functions logs stripe-payment-webhook
2. Is STRIPE_WEBHOOK_SECRET set in Supabase?
3. Is webhook URL correct in Stripe CLI?
```

---

## 🔔 TEST SCENARIO 2: Real-Time Order Notifications

### Objective
Verify orders appear in Partner Dashboard within 1 second of creation.

### Setup
```bash
# Terminal 1: Customer browser
http://localhost:5173/menu/[restaurant_id]

# Terminal 2: Partner browser  
http://localhost:5173/dashboard/orders

# Terminal 3: Browser console (F12)
# Monitor for: "📦 NEW ORDER RECEIVED"
```

### Steps

**1. Partner Dashboard Ready**
- [ ] Logged in as partner
- [ ] Orders page open
- [ ] Sound enabled (🔊 icon)
- [ ] Browser DevTools open (F12 → Console tab)

**2. Customer Places Order (COD)**
```
1. Customer: Add items → Cart → Checkout
2. Select "COD" (Cash on Delivery) 
3. Enter name/phone
4. Click "Place Order"
```

**3. Observe Real-Time Update**

**Expected behavior:**
```
Timeline:
┌──────────────────────────────────────┐
│ 0.0s: Customer clicks "Place Order"  │
├──────────────────────────────────────┤
│ 0.2s: Order inserted in database     │
├──────────────────────────────────────┤
│ 0.3s: postgres_changes event fires   │
├──────────────────────────────────────┤
│ 0.4s: Browser receives update        │
├──────────────────────────────────────┤
│ 0.5s: Order appears in Orders tab    │ ← SUCCESS
├──────────────────────────────────────┤
│ 0.8s: Notification sound plays       │
├──────────────────────────────────────┤
│ 1.0s: Toast shows new order          │
└──────────────────────────────────────┘

No page refresh needed! ✨
```

**What you'll see in browser console:**
```
✅ Real-time subscription active
📦 NEW ORDER RECEIVED {id: "...", customer_name: "Ali"}
🔔 New order from Ali!
Order queued: Ali (Queue size: 1)
⏰ Batch timeout reached - processing 1 orders
```

### ✅ Success Criteria
- [ ] Order appears in dashboard < 1 second
- [ ] No page refresh required
- [ ] Notification sound plays
- [ ] Toast shows "X new order(s)"
- [ ] Browser console shows subscription logs

### ❌ Troubleshooting

**Order appears with 5+ second delay:**
```
Issue: Real-time subscription lag
Check:
1. Browser network tab (WebSocket)
2. Supabase realtime status: https://status.supabase.com
3. Browser console errors
```

**Order doesn't appear at all:**
```
Issue: postgres_changes not working
Check:
1. RestaurantId filter in subscription
2. Order is being inserted (check database directly)
3. Supabase realtime enabled in settings
```

**Sound not playing:**
```
Issue: Audio context or browser mute
Check:
1. Browser audio not muted (check speaker icon)
2. Sound enabled toggle in dashboard (check 🔊)
3. Browser console for soundManager errors
```

---

## 🍕 TEST SCENARIO 3: Menu Real-Time Synchronization

### Objective
Verify menu price changes appear to customers within 2-3 seconds.

### Setup
```bash
# Terminal 1: Customer viewing menu
http://localhost:5173/menu/[restaurant_id]

# Terminal 2: Partner menu manager
http://localhost:5173/dashboard/menu

# Terminal 3: Monitor real-time logs
Supabase Studio → Logs → Real-time
```

### Steps

**1. Customer Viewing Menu**
- [ ] Customer opens menu in browser
- [ ] Scrolls to see burger prices
- [ ] Takes note of current prices (e.g., Burger = 500 PKR)

**2. Partner Applies Offer**
```
Partner Dashboard:
1. Go to Menu Manager
2. Select "Burgers" category
3. Click "Apply Offer"
4. Set: 20% discount, Name: "Burger Special"
5. Click "Apply"
```

**3. Observe Customer Menu**
```
Expected within 2-3 seconds:
┌─────────────────────────────────┐
│ BEFORE:                         │
│ 🍔 Burger: 500 PKR              │
│                                 │
│ Toast: "Applying offer..."      │
│                                 │
│ AFTER (2-3 seconds):            │
│ 🍔 Burger: 400 PKR ✨          │
│ (with "20% OFF" badge)          │
│                                 │
│ Toast: "Menu updated - prices   │
│        may have changed"        │
└─────────────────────────────────┘
```

**What you'll see in console:**
```
📋 Menu item UPDATE: {id: "...", price: 400, discount_percentage: 20}
Menu items refreshed from real-time update
Menu updated in real-time
```

### ✅ Success Criteria
- [ ] Customer sees new price within 3 seconds
- [ ] Toast notifies customer of menu update
- [ ] No page refresh required
- [ ] Discount badge visible

### ❌ Troubleshooting

**Customer doesn't see new price:**
```
Issue: useMenuRealtime not firing
Check:
1. Is restaurantId passed to hook?
2. Are menu_items table changes being broadcast?
3. Browser console for subscription errors
```

**Delay is 10+ seconds:**
```
Issue: Supabase realtime overloaded
Check:
1. Check Supabase status page
2. Check browser network for WebSocket
3. Try hard refresh (Ctrl+Shift+R)
```

---

## 📊 TEST SCENARIO 4: Multiple Orders (Batch Notifications)

### Objective
Verify notifications batch correctly and play sound only once.

### Setup

**Preparation:**
- Partner dashboard open with sound enabled
- Have 5 customer devices/browsers ready (or use multiple windows)

### Steps

**1. Create 5 Orders Rapidly**
```
Customer 1: Places order → Wait 0.5s
Customer 2: Places order → Wait 0.5s
Customer 3: Places order → Wait 0.5s
Customer 4: Places order → Wait 0.5s
Customer 5: Places order

Total: 5 orders within 2 seconds
```

**2. Observe Batching**

**Expected behavior:**
```
Timeline (in partner dashboard):
┌─────────────────────────────────┐
│ 0s:   Order 1 arrives           │
│       Toast: "1 new order"      │
│       Sound plays               │
│                                 │
│ 0.3s: Orders 2,3 arrive         │
│       (queued, no sound yet)    │
│                                 │
│ 0.8s: Orders 4,5 arrive         │
│       (queued, no sound yet)    │
│                                 │
│ 2.5s: BATCH TIMEOUT REACHED     │
│       Toast: "5 new orders"     │
│       Sound plays ONCE          │
│       (not 5 times!)            │
└─────────────────────────────────┘

✨ Result: 1 sound for 5 orders (not 5 sounds!)
```

**Console logs:**
```
📦 Order queued: Customer1 (Queue size: 1)
📦 Order queued: Customer2 (Queue size: 2)
📦 Order queued: Customer3 (Queue size: 3)
📦 Order queued: Customer4 (Queue size: 4)
📦 Order queued: Customer5 (Queue size: 5)
⏰ Batch timeout reached - processing 5 orders
🔔 5 new orders received!
```

### ✅ Success Criteria
- [ ] Orders appear grouped in one notification
- [ ] Toast says "5 new orders" (not individual notifications)
- [ ] Sound plays ONCE (not 5 times)
- [ ] First order triggers immediate notification
- [ ] Subsequent orders wait up to 2.5 seconds

### ❌ Troubleshooting

**Sound plays multiple times:**
```
Issue: Batch timeout not working
Check:
1. NotificationManager.tsx timeout = 2500ms
2. Browser console for queue logs
3. Check cooldown timer (playBatchedSound)
```

**Notifications show individually:**
```
Issue: Batch not accumulating
Check:
1. Queue is being maintained
2. Timer being cleared/reset properly
3. Multiple subscription channels?
```

---

## 💳 TEST SCENARIO 5: Payment Failure Handling

### Objective
Verify failed payments are handled correctly and marked as 'failed'.

### Steps

**1. Create Order with Declined Card**
```
1. Customer: Add items → Checkout
2. Select "Online Payment"
3. Enter card: 4000 0000 0000 0002 (Visa - always declines)
4. Click "Pay"
5. Should see error: "Card declined"
```

**2. Check Order Status**
```bash
# SQL query:
SELECT payment_status, stripe_payment_intent_id 
FROM orders 
WHERE customer_name = '[customer]'
ORDER BY created_at DESC 
LIMIT 1;

# Expected: payment_status = 'pending'
# (Webhook for payment_failed would update to 'failed')
```

**3. Trigger Failed Payment Webhook**
```bash
stripe trigger payment_intent.payment_failed

# Logs should show:
# Processing payment_intent.payment_failed
# Order payment_status updated to 'failed'
```

**4. Verify Status Update**
```bash
# Re-run SQL query
# Expected: payment_status = 'failed'
```

### ✅ Success Criteria
- [ ] Failed payment doesn't create successful order
- [ ] Customer sees error message
- [ ] Order payment_status marked as 'failed' (not 'pending')
- [ ] Partner can see failed payment indicator

---

## 📈 TEST SCENARIO 6: Load Testing (Optional)

### Objective
Verify system handles 10+ simultaneous orders.

### Setup
```bash
# Use artillery or ab for load testing
npm install -g artillery

# Create load-test.yml:
config:
  target: 'http://localhost:5173'
  phases:
    - duration: 10
      arrivalRate: 5  # 5 users per second

scenarios:
  - name: "Create Orders"
    flow:
      - post:
          url: /api/orders
          json:
            restaurant_id: "test-id"
            items: [{"id": "item1", "quantity": 2}]
            payment_method: "COD"
```

### Run Test
```bash
artillery run load-test.yml

# Monitor in Partner Dashboard:
# - Orders appear in batches
# - No orders missing
# - Performance stays responsive
```

---

## 🔍 MONITORING DURING TESTING

### Real-Time Logs

**Supabase Function Logs:**
```bash
supabase functions logs stripe-payment-webhook --follow

# Look for:
✅ Event: payment_intent.succeeded
✅ Webhook signature: verified
✅ Order [id] payment_status updated to 'paid'
❌ Webhook signature verification failed (ERROR)
❌ Order [id] not found (ERROR)
```

**Browser Console Logs:**
```javascript
// Search for these patterns:
"✅ Real-time subscription active"
"📦 NEW ORDER RECEIVED"
"🔔 New order from"
"📋 Menu item UPDATE"
"Menu updated in real-time"

// Watch for errors:
"❌ Real-time sync interrupted"
"Error parsing payload"
"Failed to load orders"
```

**Stripe Dashboard Webhook Events:**
```
1. Go to Developers → Webhooks
2. Click "Recent Deliveries" tab
3. Look for:
   ✅ 200 status = webhook succeeded
   ⚠️  > 10s response time = slow handler
   ❌ 4xx/5xx status = webhook failed
```

### Database Activity

```sql
-- Check recent orders
SELECT id, status, payment_status, created_at, updated_at
FROM orders
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;

-- Check payment updates (should see recent changes)
SELECT id, payment_status, updated_at
FROM orders
WHERE payment_method = 'ONLINE'
ORDER BY updated_at DESC
LIMIT 10;
```

---

## 📱 MULTI-DEVICE TESTING

### Simulate Real Restaurant

**Setup 3 Computers/Devices:**

**Device 1: Customer (Phone/Tablet)**
- QR menu: `http://[your-ip]:5173/menu/[restaurant_id]?table=5`
- Test ordering from table

**Device 2: Partner (Desktop)**
- Dashboard: `http://localhost:5173/dashboard/orders`
- Monitor orders in real-time

**Device 3: Monitor (Another Browser)**
- Supabase Studio
- Check logs and database in real-time

**Test Flow:**
```
1. Customer places order (Device 1)
2. Partner sees it appear (Device 2) - should be instant
3. Verify in database (Device 3)
4. Partner accepts order
5. Customer sees order status change
```

---

## ✅ FINAL VERIFICATION CHECKLIST

Before considering testing complete:

### Payment Processing
- [ ] Test order (COD) - payment_status = 'pending' ✓
- [ ] Online order - payment_status = 'pending' initially ✓
- [ ] Webhook fires successfully ✓
- [ ] Payment_status updates to 'paid' ✓
- [ ] Failed payment marked as 'failed' ✓

### Real-Time Orders
- [ ] New order appears in dashboard < 1 second ✓
- [ ] No page refresh required ✓
- [ ] Notification bell sounds ✓
- [ ] Toast shows new order count ✓
- [ ] Order count badge updates ✓

### Menu Real-Time
- [ ] Partner changes menu item price ✓
- [ ] Customer sees change within 3 seconds ✓
- [ ] Toast notifies customer ✓
- [ ] Offer discount shows correctly ✓
- [ ] No page refresh needed ✓

### Notifications
- [ ] Single order triggers notification ✓
- [ ] Multiple orders batch together ✓
- [ ] Sound plays only once per batch ✓
- [ ] Batch timeout is ~2.5 seconds ✓
- [ ] DND mode silences sound (visual only) ✓

### Multi-Device
- [ ] Works on phone browser ✓
- [ ] Works on desktop browser ✓
- [ ] Multiple customers simultaneously ✓
- [ ] Multiple partners/dashboards ✓

### Error Handling
- [ ] Network failure handled gracefully ✓
- [ ] Webhook signature mismatch rejected ✓
- [ ] Missing order ID handled ✓
- [ ] Database error logged ✓

### Performance
- [ ] Dashboard responsive with 20+ orders ✓
- [ ] Menu updates < 500ms CPU usage ✓
- [ ] No memory leaks (monitor DevTools) ✓
- [ ] WebSocket stays connected ✓

---

## 🎯 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Orders take 5+ seconds to appear | Realtime subscription lag | Check network, refresh browser |
| Sound doesn't play | Browser muted or permission denied | Unmute browser, click page to unlock audio |
| Menu prices don't update | useMenuRealtime hook not running | Check restaurantId param, console errors |
| Webhook shows 403/401 error | STRIPE_WEBHOOK_SECRET wrong or missing | Verify env var, re-register webhook |
| Orders stuck in 'pending' | Webhook not deployed or not registered | Deploy function, register in Stripe |
| Notifications spam | Batch timeout too short or duplicates | Check addOrderToQueue deduplication |

---

## 📊 What Success Looks Like

✅ **Full System Working:**
```
Customer places order
    ↓ (0.1s)
Database updated
    ↓ (0.2s)
Partner dashboard refreshes
    ↓ (instant)
Notification plays
    ↓ (0.3s)
Staff sees order with audio alert

Total latency: ~0.5 seconds
Zero page refreshes needed
Multiple orders batch efficiently
All payment statuses verified
```

---

## 🚨 Before Going Live

Run full checklist above, then:
1. Test with real Stripe account (live mode)
2. Test with production database backup
3. Monitor for 24 hours
4. Check webhook logs daily
5. Verify payment accuracy
6. Monitor customers feedback for delays

**You're now ready to test the complete system!** 🎉
