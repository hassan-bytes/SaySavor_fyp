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
  let isDisposed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryAttempt = 0;

  const MAX_RETRY_ATTEMPTS = 5;
  const BASE_RETRY_MS = 1500;

  const clearRetryTimer = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const removeActiveChannel = () => {
    if (!channel) return;
    supabase.removeChannel(channel);
    channel = null;
  };

  const subscribe = () => {
    if (isDisposed) return;

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
          if (isDisposed) return;

          const scheduleRetry = (reason: string) => {
            if (retryTimer) return;
            removeActiveChannel();

            if (retryAttempt >= MAX_RETRY_ATTEMPTS) {
              onError?.(new Error(`Real-time subscription failed after ${MAX_RETRY_ATTEMPTS} retries (${reason})`));
              return;
            }

            retryAttempt += 1;
            const retryDelay = Math.min(BASE_RETRY_MS * 2 ** (retryAttempt - 1), 15000);

            console.warn(
              `[OrderRealtime] ${reason}. Retrying in ${retryDelay}ms (attempt ${retryAttempt}/${MAX_RETRY_ATTEMPTS})`
            );

            retryTimer = setTimeout(() => {
              retryTimer = null;
              subscribe();
            }, retryDelay);
          };

          if (status === 'SUBSCRIBED') {
            clearRetryTimer();
            retryAttempt = 0;
            console.log(`[OrderRealtime] ✅ Subscribed to ${channelName}`);
            return;
          }

          if (status === 'CHANNEL_ERROR') {
            console.error(`[OrderRealtime] ❌ Channel error:`, err);
            scheduleRetry(`Channel error: ${err?.message || 'Unknown'}`);
            return;
          }

          if (status === 'TIMED_OUT') {
            console.warn('[OrderRealtime] ⏱️ Subscription timed out');
            scheduleRetry('Subscription timed out');
            return;
          }

          if (status === 'CLOSED') {
            scheduleRetry('Channel closed unexpectedly');
            return;
          }

          console.log(`[OrderRealtime] Status: ${status}`);
        });

    } catch (error) {
      console.error('[OrderRealtime] Failed to setup listener:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  subscribe();

  /**
   * CLEANUP FUNCTION
   * 
   * MUST be called on component unmount to:
   * - Prevent memory leaks
   * - Free WebSocket connections
   * - Stop receiving events
   */
  return () => {
    isDisposed = true;
    clearRetryTimer();
    if (channel) {
      console.log(`[OrderRealtime] 🔌 Unsubscribing from ${channelName}`);
    }
    removeActiveChannel();
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
