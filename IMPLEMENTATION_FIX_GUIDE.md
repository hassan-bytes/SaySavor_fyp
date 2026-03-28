# 🛠️ IMPLEMENTATION FIX GUIDE

## QUICK REFERENCE: What to Fix

### 1️⃣ REAL-TIME ORDERS IN PARTNER DASHBOARD

**Problem:** Orders don't appear instantly in main dashboard  
**Status:** ⏱️ 30-45 minutes  
**Files:** 1 file to edit

#### Step 1.1: Add Real-Time Listener to Partner_Dashboard.tsx

**File:** [src/2_partner/dashboard/pages/Partner_Dashboard.tsx](src/2_partner/dashboard/pages/Partner_Dashboard.tsx#L125-162)

**Current Code (Lines 125-162):**
```tsx
useEffect(() => {
    if (!restaurantId) return;

    const fetchInitialTotals = async () => { /* ... */ };
    fetchInitialTotals();

    const channel = supabase.channel('global-live-orders')
        .on('broadcast', { event: 'bill_request' }, (payload) => {
            const { table_number, restaurant_id } = payload.payload;
            if (restaurant_id === restaurantId) {
                soundManager.playServiceBell();
                toast.error(`🛎️ Table ${table_number} requested the Bill!`, {
                    duration: 5000,
                    style: { background: '#ef4444', color: '#fff', fontSize: '1.2rem', padding: '16px', fontWeight: 'bold' }
                });
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('🚨 Bill Requested!', {
                        body: `Table ${table_number} is ready to pay.`,
                        icon: profile?.logo_url || '/favicon.ico',
                        requireInteraction: true
                    });
                }
            }
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
}, [restaurantId, profile]);
```

**Replace With (Add import at top):**
```tsx
// Add this import at the top with other imports
import { setupOrderRealtimeListener } from '@/2_partner/dashboard/services/orderRealtimeService';
```

**Replace the useEffect with:**
```tsx
useEffect(() => {
    if (!restaurantId) return;

    const fetchInitialTotals = async () => { /* ... existing ... */ };
    fetchInitialTotals();

    // Setup broadcast for bill requests
    const broadcastChannel = supabase.channel('global-live-orders')
        .on('broadcast', { event: 'bill_request' }, (payload) => {
            const { table_number, restaurant_id } = payload.payload;
            if (restaurant_id === restaurantId) {
                soundManager.playServiceBell();
                toast.error(`🛎️ Table ${table_number} requested the Bill!`, {
                    duration: 5000,
                    style: { background: '#ef4444', color: '#fff', fontSize: '1.2rem', padding: '16px', fontWeight: 'bold' }
                });
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('🚨 Bill Requested!', {
                        body: `Table ${table_number} is ready to pay.`,
                        icon: profile?.logo_url || '/favicon.ico',
                        requireInteraction: true
                    });
                }
            }
        })
        .subscribe();

    // NEW: Add real-time listener for order updates
    const unsubscribeOrders = setupOrderRealtimeListener({
        restaurantId,
        onOrderChange: () => {
            console.log('[Partner_Dashboard] 📦 Real-time order update detected');
            // Refetch pending count
            fetchGlobalPending();
        },
        onError: (error) => {
            console.error('[Partner_Dashboard] Real-time sync error:', error);
            toast.error('Real-time sync interrupted - please refresh');
        }
    });

    return () => {
        supabase.removeChannel(broadcastChannel);
        unsubscribeOrders(); // NEW: Clean up real-time listener
    };
}, [restaurantId, profile]);
```

**Then add this function (if not exists):**
```tsx
const fetchGlobalPending = async () => {
    if (!restaurantId) return;
    try {
        const { count } = await supabase.from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .in('status', ['pending', 'accepted', 'cooking', 'ready']);
        if (count !== null) {
            setGlobalPendingCount(count);
        }
    } catch (error) {
        console.error('Fetch pending error:', error);
    }
};
```

---

### 2️⃣ CUSTOMER MENU NOT UPDATING REAL-TIME

**Problem:** Menu prices/offers don't update instantly when partner changes them  
**Status:** ⏱️ 45-60 minutes  
**Files:** 2 files to edit + 1 to create

#### Step 2.1: Add Real-Time Subscription to CustomerMenu.tsx

**File:** [src/2_partner/customer_menu/pages/CustomerMenu.tsx](src/2_partner/customer_menu/pages/CustomerMenu.tsx#L200-300)

**Find the fetchMenuData useEffect (around line 200-300)**

**Current Code Structure:**
```tsx
useEffect(() => {
    const fetchMenuData = async () => {
        // ... fetch logic ...
        setMenuItems(formattedData);
    };

    fetchMenuData();
}, [restaurantId, isValidTable]);
```

**Add Real-Time Subscription After This useEffect:**

```tsx
// Add this NEW useEffect for real-time menu updates
useEffect(() => {
    if (!restaurantId || isValidTable !== true) return;

    console.log('[CustomerMenu] 🔌 Setting up real-time menu subscription');

    let subscriptions: any[] = [];

    try {
        // Subscribe to menu_items changes
        const itemsSub = supabase
            .channel(`menu-items-${restaurantId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'menu_items',
                    filter: `restaurant_id=eq.${restaurantId}`
                },
                (payload) => {
                    console.log('[CustomerMenu] 📝 Menu items updated');
                    setLoading(true);
                    // Refetch all menu data to stay in sync
                    const fetchMenuData = async () => { /* reuse existing fetch */ };
                    // Refetch on any menu_items change
                    setLoading(true);
                    setTimeout(() => {
                        // Trigger the existing fetch function by setLoading
                        // Or simply call the API again
                        window.location.reload(); // Temporary: reload page
                    }, 1000);
                }
            )
            .subscribe();

        subscriptions.push(itemsSub);

        // Subscribe to menu_variants changes
        const variantsSub = supabase
            .channel(`menu-variants-${restaurantId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'menu_variants',
                    filter: `restaurant_id=eq.${restaurantId}`
                },
                (payload) => {
                    console.log('[CustomerMenu] 🔄 Menu variants updated');
                    // Same action - refetch
                    setLoading(true);
                }
            )
            .subscribe();

        subscriptions.push(variantsSub);

    } catch (error) {
        console.error('[CustomerMenu] Real-time setup error:', error);
    }

    return () => {
        subscriptions.forEach(sub => supabase.removeChannel(sub));
    };
}, [restaurantId, isValidTable]);
```

**BETTER APPROACH: Create a custom hook for menu real-time**

Create new file: [src/2_partner/customer_menu/hooks/useMenuRealtime.ts](src/2_partner/customer_menu/hooks/useMenuRealtime.ts)

```tsx
import { useEffect } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';

export function useMenuRealtime(
  restaurantId: string | undefined,
  onMenuUpdate: () => void
) {
  useEffect(() => {
    if (!restaurantId) return;

    console.log('[MenuRealtime] 🔌 Setting up real-time subscription');

    const subscriptions = [
      supabase
        .channel(`menu-items-${restaurantId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'menu_items',
            filter: `restaurant_id=eq.${restaurantId}`
          },
          () => {
            console.log('[MenuRealtime] 📝 Menu items changed');
            onMenuUpdate();
          }
        )
        .subscribe(),

      supabase
        .channel(`menu-variants-${restaurantId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'menu_variants',
          },
          () => {
            console.log('[MenuRealtime] 🔄 Variants changed');
            onMenuUpdate();
          }
        )
        .subscribe(),

      supabase
        .channel(`menu-modifiers-${restaurantId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'menu_modifier_groups',
          },
          () => {
            console.log('[MenuRealtime] ⚙️ Modifiers changed');
            onMenuUpdate();
          }
        )
        .subscribe(),
    ];

    return () => {
      subscriptions.forEach(sub => supabase.removeChannel(sub));
    };
  }, [restaurantId]);
}
```

**Use it in CustomerMenu.tsx:**

```tsx
import { useMenuRealtime } from '@/2_partner/customer_menu/hooks/useMenuRealtime';

export default function CustomerMenu() {
  // ... existing state ...
  
  // Add this inside component
  useMenuRealtime(restaurantId, () => {
    console.log('Menu updated - refetching');
    // Refetch menu data
    setLoading(true);
    // Re-trigger the fetch from useEffect
  });

  // ... rest of component
}
```

#### Step 2.2: Move fetchMenuData to Separate Function

**In CustomerMenu.tsx, extract the fetch logic:**

```tsx
const refetchMenuData = async () => {
    console.log("CustomerMenu: refetchMenuData started");
    if (!restaurantId || isValidTable !== true) return;

    try {
        // ... existing fetch code ...
        setMenuItems(formattedData);
    } catch (error) {
        console.error("Error fetching menu:", error);
        toast.error("Failed to load the menu. Please try again.");
    } finally {
        setLoading(false);
    }
};

// Call it in both useEffects:
useEffect(() => {
    refetchMenuData();
}, [restaurantId, isValidTable]);

useMenuRealtime(restaurantId, () => {
    console.log('Menu updated - refetching');
    refetchMenuData();
});
```

---

### 3️⃣ PAYMENT STATUS SET INCORRECTLY

**Problem:** Payments marked 'paid' before validation  
**Status:** ⏱️ 20-30 minutes  
**Files:** 2 files to edit + 1 to create

#### Step 3.1: Fix Payment Status Logic in customerOrderService.ts

**File:** [src/3_customer/services/customerOrderService.ts](src/3_customer/services/customerOrderService.ts#L50-80)

**Current Code (Lines 50-80):**
```tsx
const { data: orderData, error: orderError } = await (supabase
    .from('orders') as any)
    .insert({
        customer_id: user.id,
        restaurant_id: params.restaurant_id,
        customer_name: params.customer_name || (isGuest ? 'Guest' : null),
        customer_phone: params.delivery_phone,
        customer_address: params.delivery_address,
        order_type: orderType,
        table_number: params.table_number ?? null,
        total_amount: params.total_amount,
        discount_amount: params.discount_amount ?? 0,
        delivery_fee: params.delivery_fee,
        tax_amount: params.tax_amount,
        payment_method: params.payment_method,
        payment_status: params.payment_method === 'ONLINE' && params.stripe_payment_intent_id
            ? 'paid'        // ❌ WRONG
            : 'pending',    // ⚠️ Only for COD
        status: 'pending',
        session_status: 'active',
        is_guest: isGuest,
        stripe_payment_intent_id: params.stripe_payment_intent_id ?? null,
    })
    .select()
    .single();
```

**Replace With:**
```tsx
const { data: orderData, error: orderError } = await (supabase
    .from('orders') as any)
    .insert({
        customer_id: user.id,
        restaurant_id: params.restaurant_id,
        customer_name: params.customer_name || (isGuest ? 'Guest' : null),
        customer_phone: params.delivery_phone,
        customer_address: params.delivery_address,
        order_type: orderType,
        table_number: params.table_number ?? null,
        total_amount: params.total_amount,
        discount_amount: params.discount_amount ?? 0,
        delivery_fee: params.delivery_fee,
        tax_amount: params.tax_amount,
        payment_method: params.payment_method,
        payment_status: 'pending', // ✅ ALWAYS pending initially
        status: 'pending',
        session_status: 'active',
        is_guest: isGuest,
        stripe_payment_intent_id: params.stripe_payment_intent_id ?? null,
    })
    .select()
    .single();
```

**Explanation:**
- ✅ ALL orders start with `payment_status: 'pending'`
- ✅ For CASH/COD: Partner collects payment manually, then updates manually
- ✅ For ONLINE: Webhook updates this when Stripe confirms
- ✅ No assumptions about payment success

---

#### Step 3.2: Create Stripe Webhook Handler

**Create new file:** [supabase/functions/stripe-payment-webhook/index.ts](supabase/functions/stripe-payment-webhook/index.ts)

```tsx
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = require("https://cdn.jsdelivr.net/npm/stripe@latest");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    // Verify Stripe signature
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeWebhookSecret) {
      throw new Error("Missing STRIPE_WEBHOOK_SECRET");
    }

    const stripeLib = stripe(stripeSecretKey);
    let event;

    try {
      event = stripeLib.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err: any) {
      console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log(`🔔 Received webhook event: ${event.type}`);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase config");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle payment intent events
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const stripePaymentIntentId = paymentIntent.id;
      const amount = paymentIntent.amount; // in cents

      console.log(`✅ Payment succeeded: ${stripePaymentIntentId}`);

      // Find order by stripe_payment_intent_id and update payment_status
      const { data: order, error: findError } = await supabase
        .from("orders")
        .select("id, payment_status")
        .eq("stripe_payment_intent_id", stripePaymentIntentId)
        .single();

      if (findError) {
        console.error(`❌ Order not found: ${findError.message}`);
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: corsHeaders }
        );
      }

      // Update order payment_status to 'paid'
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order!.id);

      if (updateError) {
        console.error(`❌ Update failed: ${updateError.message}`);
        return new Response(
          JSON.stringify({ error: "Failed to update order" }),
          { status: 500, headers: corsHeaders }
        );
      }

      console.log(`✅ Order ${order!.id} marked as paid`);

    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      const stripePaymentIntentId = paymentIntent.id;

      console.log(`❌ Payment failed: ${stripePaymentIntentId}`);

      // Find order and update payment_status
      const { data: order, error: findError } = await supabase
        .from("orders")
        .select("id")
        .eq("stripe_payment_intent_id", stripePaymentIntentId)
        .single();

      if (!findError && order) {
        await supabase
          .from("orders")
          .update({
            payment_status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        console.log(`✅ Order ${order.id} marked as failed`);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

**Deploy this function:**
```bash
supabase functions deploy stripe-payment-webhook
```

**Then register webhook in Stripe dashboard:**
- Go to Stripe Dashboard → Webhooks
- Add endpoint: `https://your-supabase-url/functions/v1/stripe-payment-webhook`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
- Copy signing secret → Set as env var `STRIPE_WEBHOOK_SECRET`

---

#### Step 3.3: Update PaymentSuccess.tsx

**File:** [src/3_customer/pages/PaymentSuccess.tsx](src/3_customer/pages/PaymentSuccess.tsx)

**Add order update logic:**

```tsx
const PaymentSuccess: React.FC = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const paymentIntentStatus = searchParams.get('redirect_status');
    const paymentIntentId = searchParams.get('payment_intent');
    const orderId = searchParams.get('order_id'); // Pass this from checkout

    useEffect(() => {
        if (!paymentIntentId || !orderId) {
            setTimeout(() => navigate('/foodie/checkout'), 2000);
            return;
        }

        if (paymentIntentStatus === 'succeeded') {
            // Optional: Update order status locally while webhook processes
            // (Webhook will update it definitively)
            toast.success('Payment successful! Your order is confirmed.');
            setTimeout(() => navigate(`/foodie/track/${orderId}`), 3000);
        } else {
            toast.error('Payment failed. Please try again.');
            setTimeout(() => navigate('/foodie/checkout'), 3000);
        }
    }, [paymentIntentStatus]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            {paymentIntentStatus === 'succeeded' ? (
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-green-500">Payment Successful! 🎉</h2>
                    <p className="text-gray-500">Redirecting to order tracker...</p>
                </div>
            ) : (
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-500">Payment Failed</h2>
                    <p className="text-gray-500">Redirecting to checkout...</p>
                </div>
            )}
        </div>
    );
};
```

---

### 4️⃣ NOTIFICATION SYSTEM INTEGRATION

**Problem:** Notifications created but never called  
**Status:** ⏱️ 20-30 minutes  
**Files:** 1 file to edit

#### Step 4.1: Wire Notifications in UnifiedOrdersManager

**File:** [src/2_partner/dashboard/pages/UnifiedOrdersManager.tsx](src/2_partner/dashboard/pages/UnifiedOrdersManager.tsx#L55-210)

**Current Code (Lines 55-80):**
```tsx
const notificationManager = useNotificationManager({
    onOrdersReady: (orders) => {
      console.log(`📦 ${orders.length} order(s) ready for display`);
      if (isMountedRef.current) {
        fetchOrders();
      }
    }
  });
```

**Change to:**
```tsx
const notificationManager = useNotificationManager({
    onOrdersReady: (orders) => {
      console.log(`📦 ${orders.length} order(s) ready for display`);
      if (isMountedRef.current) {
        // Sound + notification already played by notificationManager
        // Just refetch orders
        fetchOrders();
      }
    }
  });
```

**In the real-time subscription (around line 187-210), change:**

```tsx
// Current:
const unsubscribe = setupOrderRealtimeListener({
  restaurantId,
  onOrderChange: () => {
    console.log('[UnifiedOrdersManager] 📦 Order change detected');
    fetchOrders();
    fetchTableSessions();
  },
  onError: (error) => {
    console.error('[UnifiedOrdersManager] Real-time sync error:', error);
    toast.error('Real-time sync interrupted - please refresh');
  }
});

// Replace with:
const unsubscribe = setupOrderRealtimeListener({
  restaurantId,
  onOrderChange: async () => {
    console.log('[UnifiedOrdersManager] 📦 Order change detected');
    
    // Fetch latest order to get full details
    const { data: newOrders } = await supabase
      .from('orders')
      .select(ORDER_WITH_ITEMS_SELECT)
      .eq('restaurant_id', restaurantId)
      .in('status', ['pending', 'accepted', 'cooking', 'ready'])
      .order('created_at', { ascending: false })
      .limit(5); // Get recent orders

    // Add new orders to notification queue
    if (newOrders && newOrders.length > 0) {
      const recentOrders = newOrders.filter(o => 
        !allOrders.some(existing => existing.id === o.id)
      );
      recentOrders.forEach(order => {
        notificationManager.addOrderToQueue(order);
      });
    }
    
    fetchOrders();
    fetchTableSessions();
  },
  onError: (error) => {
    console.error('[UnifiedOrdersManager] Real-time sync error:', error);
    toast.error('Real-time sync interrupted - please refresh');
  }
});
```

---

### 5️⃣ REDUCE NOTIFICATION BATCH TIMEOUT

**Problem:** 5-second delay is too long  
**Status:** ⏱️ 5 minutes  
**Files:** 1 file to edit

#### Step 5.1: Edit NotificationManager.tsx

**File:** [src/2_partner/dashboard/components/NotificationManager.tsx](src/2_partner/dashboard/components/NotificationManager.tsx#L95-100)

**Current Code:**
```tsx
// Set new timer (5 seconds) - wait for more orders to arrive
batchTimer.current = setTimeout(() => {
    console.log(`⏰ Batch timeout reached - processing ${notificationQueue.current.length} orders`);
    processBatch();
}, 5000);  // ⏰ 5000ms
```

**Change to:**
```tsx
// Set new timer (2-3 seconds) - wait for more orders to arrive
batchTimer.current = setTimeout(() => {
    console.log(`⏰ Batch timeout reached - processing ${notificationQueue.current.length} orders`);
    processBatch();
}, 2500);  // ⏰ 2500ms (2.5 seconds)
```

---

### 6️⃣ ADD BROADCAST FOR MENU UPDATES

**Problem:** Menu updates not pushed to customers  
**Status:** ⏱️ 15-20 minutes  
**Files:** 1 file to edit

#### Step 6.1: Add Broadcast to useMenuOffers.ts

**File:** [src/2_partner/dashboard/menu/hooks/useMenuOffers.ts](src/2_partner/dashboard/menu/hooks/useMenuOffers.ts#L40-60)

**In handleApplyCategoryOffer function, after successful update:**

```tsx
// Current (Line 40-56):
const handleApplyCategoryOffer = async (category: string, cuisine: string, discount: number, offerName: string) => {
    try {
      setLoading(true);
      const itemsToUpdate = items.filter(i => i.category === category && i.cuisine === cuisine && i.item_type !== 'deal');
      for (const item of itemsToUpdate) {
        const originalPrice = item.original_price || item.price;
        const newPrice = Math.round(originalPrice * (1 - discount / 100));
        const { error } = await (supabase.from('menu_items') as any)
          .update({
            price: newPrice,
            original_price: originalPrice,
            discount_percentage: discount,
            offer_name: offerName || null
          })
          .eq('id', item.id);
        if (error) throw error;
      }
      setItems(prev => prev.map(i => {
        if (i.category === category && i.cuisine === cuisine && i.item_type !== 'deal') {
          const originalPrice = i.original_price || i.price;
          return { ...i, price: Math.round(originalPrice * (1 - discount / 100)), original_price: originalPrice, discount_percentage: discount, offer_name: offerName || null };
        }
        return i;
      }));
      toast.success(`Applied ${discount}% offer to all ${category} items!`);
    } catch (error) {
      toast.error('Failed to apply category offer');
    } finally {
      setLoading(false);
    }
  };

// Add after setItems and before catch:
      toast.success(`Applied ${discount}% offer to all ${category} items!`);
      
      // ✅ NEW: Broadcast to customers
      try {
        const restaurantId = items[0]?.restaurant_id; // Get from first item
        if (restaurantId) {
          await supabase
            .channel(`menu-updates-${restaurantId}`)
            .send('broadcast', {
              event: 'menu-updated',
              payload: {
                restaurant_id: restaurantId,
                updated_items: items
                  .filter(i => i.category === category && i.cuisine === cuisine)
                  .map(i => i.id),
                offer_applied: true,
                timestamp: new Date().toISOString()
              }
            });
          console.log('📡 Broadcast sent to customers');
        }
      } catch (broadcastError) {
        console.error('Failed to broadcast update:', broadcastError);
      }
```

**Do the same for:**
- `handleApplyCuisineOffer` (add broadcast)
- `handleApplyBulkOffer` (add broadcast)
- `handleRemoveCategoryOffer` (add broadcast)
- `handleRemoveCuisineOffer` (add broadcast)
- `handleRemoveBulkOffer` (add broadcast)

---

## ✅ TESTING CHECKLIST

After implementing fixes:

### Test #1: Real-Time Orders
- [ ] Partner opens dashboard
- [ ] Customer scans QR and places order
- [ ] Order appears in Partner_Dashboard <= 1 second
- [ ] Order count badge updates
- [ ] Kitchen tab auto-updates
- [ ] Sound plays (if not in DND)

### Test #2: Menu Updates  
- [ ] Customer has menu open
- [ ] Partner updates price/offer
- [ ] Customer sees new price within 2-3 seconds
- [ ] No page refresh needed
- [ ] Works for multiple menu items

### Test #3: Payment Status
- [ ] Partner creates order with ONLINE payment
- [ ] Order created with payment_status = 'pending'
- [ ] Customer completes Stripe payment
- [ ] Webhook fires (verify in Stripe logs)
- [ ] Order.payment_status changes to 'paid'
- [ ] Partner sees 'paid' status

### Test #4: Notifications
- [ ] Multiple orders arrive in 2 seconds
- [ ] Single sound plays (not 3 sounds)
- [ ] Toast shows "3 new orders received"
- [ ] DND mode works (visual-only notifications)
- [ ] Sound cooldown works (no spam)

### Test #5: Menu Broadcast
- [ ] Partner applies offer
- [ ] Toast shows "Offer applied"
- [ ] Broadcast sent (check console)
- [ ] Customers see update without refresh

---

## 🚨 DEPLOYMENT NOTES

### Before Going Live:

1. **Stripe Webhook Setup**
   ```bash
   # Set environment variables in Supabase
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. **Deploy Webhook Function**
   ```bash
   supabase functions deploy stripe-payment-webhook
   ```

3. **Register Webhook in Stripe Dashboard**
   - Endpoint: `https://your-project.supabase.co/functions/v1/stripe-payment-webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

4. **Test in Sandbox**
   ```bash
   # Use test card: 4242 4242 4242 4242
   # Test webhook with: curl -X POST -d "test" your-webhook-endpoint
   ```

5. **Monitor Logs**
   - Supabase Edge Function Logs
   - Browser Console (Chrome DevTools)
   - Stripe Webhook Event Logs

---

## ⏱️ TOTAL IMPLEMENTATION TIME

| Feature | Time | Priority |
|---------|------|----------|
| Real-time Orders Partner Dashboard | 30-45 min | 🔴 CRITICAL |
| Menu Real-Time (Customer) | 45-60 min | 🔴 CRITICAL |
| Payment Status Fix | 20-30 min | 🔴 CRITICAL |
| Webhook Handler | 30-40 min | 🔴 CRITICAL |
| Notification Integration | 20-30 min | 🟡 HIGH |
| Menu Broadcast | 15-20 min | 🟡 HIGH |
| Reduce Batch Timeout | 5 min | 🟡 MEDIUM |

**Total: ~165-225 minutes (3-4 hours for all critical fixes)**

---

