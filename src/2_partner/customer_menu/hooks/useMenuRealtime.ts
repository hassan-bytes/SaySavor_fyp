/**
 * useMenuRealtime Hook
 * 
 * Real-time menu synchronization for customers viewing dynamic menu items,
 * prices, availability, and modifiers from restaurant partners.
 * 
 * Features:
 * - Subscribes to menu_items table changes (INSERT, UPDATE, DELETE)
 * - Subscribes to menu_variants changes (price/option updates)
 * - Subscribes to menu_modifier_groups changes (modifier availability)
 * - Multi-tenant isolation via restaurant_id filter
 * - Automatic cleanup on unmount
 * 
 * @see https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';

interface MenuRealtimeConfig {
    restaurantId: string;
    enabled?: boolean; // Allow disabling for demo/debugging
    onMenuUpdate?: (change: { event: string; table: string; data: any }) => void;
    onError?: (error: Error) => void;
}

/**
 * Hook to subscribe to real-time menu updates
 * 
 * Usage:
 * ```tsx
 * useMenuRealtime({
 *   restaurantId: myRestaurantId,
 *   onMenuUpdate: (change) => {
 *     console.log('Menu changed:', change);
 *     // Trigger re-render or refetch
 *   }
 * });
 * ```
 */
export function useMenuRealtime(config: MenuRealtimeConfig) {
    const { restaurantId, enabled = true, onMenuUpdate, onError } = config;
    const onMenuUpdateRef = useRef(onMenuUpdate);
    const onErrorRef = useRef(onError);

    // Update refs when callbacks change (without triggering effect)
    useEffect(() => {
        onMenuUpdateRef.current = onMenuUpdate;
        onErrorRef.current = onError;
    }, [onMenuUpdate, onError]);

    useEffect(() => {
        if (!restaurantId || !enabled) {
            console.log('useMenuRealtime: Disabled or no restaurantId');
            return;
        }

        const channel = supabase
            .channel(`menu-updates-${restaurantId}`)
            
            // Listen for menu_items changes (product availability, details, pricing)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'menu_items',
                filter: `restaurant_id=eq.${restaurantId}`
            }, (payload) => {
                console.log(`📋 Menu item ${payload.eventType}:`, payload.new || payload.old);
                if (onMenuUpdateRef.current) {
                    onMenuUpdateRef.current({
                        event: payload.eventType,
                        table: 'menu_items',
                        data: payload.new || payload.old
                    });
                }
            })
            
            // Listen for menu_variants changes (size/type options and their prices)
            // No restaurant_id filter needed - RLS policies handle access control
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'menu_variants'
            }, (payload) => {
                console.log(`🔄 Menu variant ${payload.eventType}:`, payload.new || payload.old);
                if (onMenuUpdateRef.current) {
                    onMenuUpdateRef.current({
                        event: payload.eventType,
                        table: 'menu_variants',
                        data: payload.new || payload.old
                    });
                }
            })
            
            // Listen for menu_modifier_groups changes (extras/customizations)
            // No restaurant_id filter needed - RLS policies handle access control
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'menu_modifier_groups'
            }, (payload) => {
                console.log(`📝 Modifier group ${payload.eventType}:`, payload.new || payload.old);
                if (onMenuUpdateRef.current) {
                    onMenuUpdateRef.current({
                        event: payload.eventType,
                        table: 'menu_modifier_groups',
                        data: payload.new || payload.old
                    });
                }
            })
            
            .subscribe((status) => {
                console.log(`Menu real-time subscription: ${status}`);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Menu real-time subscription active for restaurant:', restaurantId);
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    const error = new Error(`Menu subscription ${status}`);
                    if (onErrorRef.current) onErrorRef.current(error);
                }
            });

        // Cleanup: unsubscribe and remove channel
        return () => {
            console.log('Cleaning up useMenuRealtime subscription');
            supabase.removeChannel(channel);
        };
    }, [restaurantId, enabled]);
}

export default useMenuRealtime;
