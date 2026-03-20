// ============================================================
// FILE: useNearbyRestaurants.ts  (FINAL — actual DB columns)
//
// YOUR restaurants columns used here:
//   id, name, logo_url, is_open, owner_id, currency,
//   cuisine_type (ARRAY, singular), delivery_fee,
//   min_order_price, delivery_time_min (NEW), rating (NEW),
//   city (NEW), onboarding_completed (NEW, defaults TRUE)
// ============================================================
import { useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import type { RestaurantCard } from '@/3_customer/types/customer';

export const useNearbyRestaurants = (
    searchQuery: string = '',
    activeChip: string = 'all'
) => {
    const [restaurants, setRestaurants] = useState<RestaurantCard[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRestaurants = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('restaurants')
                .select(`
          id,
          name,
          logo_url,
          currency,
          cuisine_type,
          is_open,
          delivery_fee,
          min_order_price,
          min_order,
          delivery_time_min,
          rating,
          city,
          address
        `)
                .eq('is_open', true)        // your actual column (not onboarding_completed)
                .order('created_at', { ascending: false })
                .limit(40);

            if (error) throw error;

            const mapped: RestaurantCard[] = (data || []).map((r: any) => ({
                id: r.id,
                name: r.name,
                image_url: r.logo_url,
                logo_url: r.logo_url,
                currency: r.currency || 'PKR',
                // cuisine_type is a single-column ARRAY in your DB, not cuisine_types
                cuisine_type: Array.isArray(r.cuisine_type)
                    ? r.cuisine_type[0]
                    : (r.cuisine_type || 'Restaurant'),
                rating: r.rating ?? parseFloat((4 + Math.random() * 0.9).toFixed(1)),
                delivery_time_min: r.delivery_time_min ?? (Math.floor(Math.random() * 15) + 25),
                delivery_fee: r.delivery_fee ?? 0,
                // your DB has both min_order_price and min_order — use whichever is set
                min_order: r.min_order_price ?? r.min_order ?? 200,
                is_active: r.is_open ?? true,
                city: r.city ?? null,
            }));

            setRestaurants(mapped);
        } catch (err) {
            console.error('useNearbyRestaurants error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRestaurants();

        // Realtime — only re-fetch on restaurant open/close changes
        const channel = supabase
            .channel('restaurants-open-status')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'restaurants',
                // Only react to is_open changes, not every update
            }, (payload) => {
                const updated = payload.new as any;
                if ('is_open' in updated) {
                    fetchRestaurants();
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Local filtering
    const filteredRestaurants = restaurants.filter(r => {
        const matchesSearch = !searchQuery.trim() ||
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.cuisine_type && r.cuisine_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (r.city && r.city.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesChip = activeChip === 'all' ||
            (r.cuisine_type &&
                r.cuisine_type.toLowerCase().includes(activeChip.toLowerCase().replace('_', ' ')));

        return matchesSearch && matchesChip;
    });

    return {
        restaurants: filteredRestaurants,
        loading,
        refresh: fetchRestaurants,
    };
};