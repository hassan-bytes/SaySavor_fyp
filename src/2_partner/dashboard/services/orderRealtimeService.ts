import { supabase } from '@/shared/lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Order Real-Time Synchronization Service
 * 
 * Implements Supabase Postgres Changes listeners for instant order updates.
 * Follows official Supabase documentation patterns (March 2026).
 * 
 * Security: ALWAYS filters by restaurant_id for multi-tenant isolation.
 * Performance: Refetches complete order data on each change for consistency.
 * 
 * @see https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
 */

export interface OrderRealtimeConfig {
  /** Restaurant ID for filtering - REQUIRED for security */
  restaurantId: string;
  
  /** Callback fired when any order change occurs (INSERT/UPDATE/DELETE) */
  onOrderChange: () => void;
  
  /** Optional: Callback for errors */
  onError?: (error: Error) => void;
}

/**
 * Sets up a Supabase Postgres Changes listener for orders table.
 * 
 * CRITICAL FEATURES:
 * - Filters by restaurant_id (multi-tenant security)
 * - Listens to INSERT, UPDATE, DELETE events
 * - Auto-cleanup on unsubscribe
 * - Comprehensive error handling
 * 
 * @param config - Configuration object with restaurantId and callbacks
 * @returns Cleanup function to unsubscribe and free resources
 * 
 * @example
 * ```tsx
 * useEffect(() => {
 *   if (!restaurantId) return;
 *   
 *   const unsubscribe = setupOrderRealtimeListener({
 *     restaurantId,
 *     onOrderChange: () => fetchOrders(),
 *     onError: (err) => console.error('Realtime error:', err)
 *   });
 *   
 *   return unsubscribe;
 * }, [restaurantId]);
 * ```
 */
export function setupOrderRealtimeListener(config: OrderRealtimeConfig): () => void {
  const { restaurantId, onOrderChange, onError } = config;

  // Validate required parameters
  if (!restaurantId) {
    console.warn('[OrderRealtime] No restaurantId provided - skipping subscription');
    return () => {}; // Return no-op cleanup
  }

  // Channel name: lowercase with hyphens only (Supabase convention)
  const channelName = `restaurant-${restaurantId}-orders`;
  
  console.log(`[OrderRealtime] 🔌 Setting up listener for channel: ${channelName}`);

  let channel: RealtimeChannel | null = null;

  try {
    /**
     * POSTGRES CHANGES LISTENER (NOT Broadcast)
     * 
     * Filter syntax: restaurant_id=eq.{restaurantId}
     * - Ensures only this restaurant's orders are received
     * - Critical for multi-tenant security
     * - Prevents cross-restaurant data leaks
     */
    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`, // 🔒 SECURITY: Multi-tenant isolation
        },
        (payload) => {
          const eventType = payload.eventType;
          const orderId = payload.new?.id || payload.old?.id;
          
          console.log(
            `[OrderRealtime] 📦 ${eventType} event for order ${orderId?.slice(-4) || 'unknown'}`
          );

          /**
           * CONSISTENCY STRATEGY:
           * Don't rely on payload.new - always refetch complete data
           * - Ensures order_items are included
           * - Prevents stale data issues
           * - Maintains single source of truth
           */
          onOrderChange();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[OrderRealtime] ✅ Subscribed to ${channelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[OrderRealtime] ❌ Channel error:`, err);
          onError?.(new Error(`Channel error: ${err?.message || 'Unknown'}`));
        } else if (status === 'TIMED_OUT') {
          console.error(`[OrderRealtime] ⏱️ Subscription timed out`);
          onError?.(new Error('Subscription timed out'));
        } else {
          console.log(`[OrderRealtime] Status: ${status}`);
        }
      });

  } catch (error) {
    console.error('[OrderRealtime] Failed to setup listener:', error);
    onError?.(error instanceof Error ? error : new Error('Unknown error'));
  }

  /**
   * CLEANUP FUNCTION
   * 
   * MUST be called on component unmount to:
   * - Prevent memory leaks
   * - Free WebSocket connections
   * - Stop receiving events
   */
  return () => {
    if (channel) {
      console.log(`[OrderRealtime] 🔌 Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
      channel = null;
    }
  };
}

/**
 * USAGE NOTES:
 * 
 * 1. ALWAYS provide restaurantId - never fetch all orders
 * 2. Call the returned cleanup function on unmount
 * 3. Refetch complete order list in onOrderChange callback
 * 4. Don't parse payload.new - it may be incomplete
 * 5. Test with multiple restaurants to verify isolation
 * 
 * TESTING CHECKLIST:
 * ✅ QR order appears in POSTab < 1 second
 * ✅ Kitchen tab updates without refresh
 * ✅ Restaurant A can't see Restaurant B's orders
 * ✅ No console errors on mount/unmount
 * ✅ Network tab shows restaurant_id filter in requests
 */
