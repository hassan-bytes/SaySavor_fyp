// ============================================================
// FILE: useNearbyRestaurants.ts  (FINAL — actual DB columns)
//
// YOUR restaurants columns used here:
//   id, name, logo_url, is_open, owner_id, currency,
//   cuisine_type (ARRAY, singular), delivery_fee,
//   min_order_price, delivery_time_min (NEW), rating (NEW),
//   city (NEW), onboarding_completed (NEW, defaults TRUE)
// ============================================================
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import type { RestaurantCard } from '@/3_customer/types/customer';

export interface NearbyRestaurantFilters {
    sortBy?: 'recommended' | 'fastest' | 'lowest_fee' | 'top_rated';
    maxFee?: number | null;
    maxEta?: number | null;
    maxMinOrder?: number | null;
    maxDistanceKm?: number | null;
    freeDeliveryOnly?: boolean;
    openFilter?: 'all' | 'open' | 'closed';
    userLocation?: { lat: number; lng: number } | null;
}

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const earthRadiusKm = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
};

const normalizeCuisine = (value?: string | null) =>
    value ? value.toLowerCase().replace(/_/g, ' ').trim() : '';

export const useNearbyRestaurants = (
    searchQuery: string = '',
    activeChip: string = 'all',
    filters: NearbyRestaurantFilters = {}
) => {
    const [restaurants, setRestaurants] = useState<RestaurantCard[]>([]);
    const [loading, setLoading] = useState(true);
    const filtersRef = useRef<NearbyRestaurantFilters>(filters);
    const refreshTimeoutRef = useRef<number | null>(null);
    const filtersKey = JSON.stringify(filters);
    filtersRef.current = filters;

    const fetchRestaurants = useCallback(async (
        nextFilters: NearbyRestaurantFilters = filtersRef.current,
        options?: { background?: boolean }
    ) => {
        const isBackground = options?.background === true;
        if (!isBackground) {
            setLoading(true);
        }
        try {
            let query = supabase
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
                address,
                latitude,
                longitude
        `);

            if (nextFilters.openFilter === 'open') {
                query = query.eq('is_open', true);
            } else if (nextFilters.openFilter === 'closed') {
                query = query.eq('is_open', false);
            }

            if (nextFilters.freeDeliveryOnly) {
                query = query.eq('delivery_fee', 0);
            }

            if (typeof nextFilters.maxFee === 'number') {
                query = query.lte('delivery_fee', nextFilters.maxFee);
            }

            if (typeof nextFilters.maxEta === 'number') {
                query = query.lte('delivery_time_min', nextFilters.maxEta);
            }

            if (typeof nextFilters.maxMinOrder === 'number') {
                query = query.lte('min_order', nextFilters.maxMinOrder);
            }

            if (nextFilters.sortBy === 'fastest') {
                query = query.order('delivery_time_min', { ascending: true });
            } else if (nextFilters.sortBy === 'lowest_fee') {
                query = query.order('delivery_fee', { ascending: true });
            } else if (nextFilters.sortBy === 'top_rated') {
                query = query.order('rating', { ascending: false });
            } else {
                query = query.order('created_at', { ascending: false });
            }

            query = query.limit(40);

            const { data, error } = await query;

            if (error) throw error;

            const location = nextFilters.userLocation;

            const mapped: RestaurantCard[] = (data || []).map((r: any) => {
                const latitude = typeof r.latitude === 'number' ? r.latitude : null;
                const longitude = typeof r.longitude === 'number' ? r.longitude : null;
                const distanceKm =
                    location && latitude !== null && longitude !== null
                        ? haversineKm(location.lat, location.lng, latitude, longitude)
                        : null;

                return {
                id: r.id,
                name: r.name,
                image_url: r.logo_url,
                logo_url: r.logo_url,
                currency: r.currency || 'PKR',
                // cuisine_type is a single-column ARRAY in your DB, not cuisine_types
                cuisine_type: Array.isArray(r.cuisine_type)
                    ? r.cuisine_type[0]
                    : (r.cuisine_type || null),
                rating: typeof r.rating === 'number' ? r.rating : null,
                delivery_time_min: typeof r.delivery_time_min === 'number' ? r.delivery_time_min : null,
                delivery_fee: typeof r.delivery_fee === 'number' ? r.delivery_fee : null,
                // your DB has both min_order_price and min_order — use whichever is set
                min_order:
                    typeof r.min_order_price === 'number'
                        ? r.min_order_price
                        : (typeof r.min_order === 'number' ? r.min_order : null),
                is_active: r.is_open === true,
                city: r.city ?? null,
                latitude,
                longitude,
                distance_km: distanceKm,
                };
            });

            setRestaurants(mapped);
        } catch (err) {
            console.error('useNearbyRestaurants error:', err);
        } finally {
            if (!isBackground) {
                setLoading(false);
            }
        }
    }, []);

    const scheduleBackgroundRefresh = useCallback((delayMs: number = 250) => {
        if (refreshTimeoutRef.current !== null) {
            window.clearTimeout(refreshTimeoutRef.current);
        }

        refreshTimeoutRef.current = window.setTimeout(() => {
            void fetchRestaurants(filtersRef.current, { background: true });
        }, delayMs);
    }, [fetchRestaurants]);

    useEffect(() => {
        void fetchRestaurants(filtersRef.current);
    }, [filtersKey, fetchRestaurants]);

    useEffect(() => {
        const trackedFields: Array<keyof RestaurantCard | 'name' | 'cuisine_type' | 'city'> = [
            'is_active',
            'delivery_fee',
            'delivery_time_min',
            'rating',
            'min_order',
            'name',
            'cuisine_type',
            'city',
            'latitude',
            'longitude',
        ];

        const channel = supabase
            .channel('restaurants-live-customer-home')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'restaurants',
            }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
                    scheduleBackgroundRefresh();
                    return;
                }

                if (payload.eventType === 'UPDATE') {
                    const nextRow = payload.new as any;
                    const prevRow = payload.old as any;

                    const changed = trackedFields.some((field) => {
                        const nextValue = field === 'is_active' ? nextRow?.is_open : nextRow?.[field];
                        const prevValue = field === 'is_active' ? prevRow?.is_open : prevRow?.[field];
                        return JSON.stringify(nextValue) !== JSON.stringify(prevValue);
                    });

                    if (changed) {
                        scheduleBackgroundRefresh();
                    }
                }
            })
            .subscribe();

        return () => {
            if (refreshTimeoutRef.current !== null) {
                window.clearTimeout(refreshTimeoutRef.current);
            }
            void supabase.removeChannel(channel);
        };
    }, [scheduleBackgroundRefresh]);

    // Local filtering
    const location = filters.userLocation;
    const maxDistanceValue = typeof filters.maxDistanceKm === 'number' ? filters.maxDistanceKm : null;
    const locationAvailable = Boolean(location && Number.isFinite(location.lat) && Number.isFinite(location.lng));
    // True when user wants distance filtering but hasn't granted location permission yet
    const locationRequired = maxDistanceValue !== null && !locationAvailable;

    const normalizedSearchQuery = searchQuery.toLowerCase();

    const filteredRestaurants = useMemo(() => (
        restaurants.filter((r) => {
            const normalizedCuisine = normalizeCuisine(r.cuisine_type);
            const matchesSearch = !searchQuery.trim() ||
                r.name.toLowerCase().includes(normalizedSearchQuery) ||
                (normalizedCuisine && normalizedCuisine.includes(normalizedSearchQuery)) ||
                (r.city && r.city.toLowerCase().includes(normalizedSearchQuery));

            const matchesChip = activeChip === 'all' ||
                (normalizedCuisine && normalizedCuisine === activeChip);

            let matchesDistance = true;
            if (maxDistanceValue !== null) {
                if (!locationAvailable) {
                    // Distance filter is set but no location — hide everything until location is granted
                    matchesDistance = false;
                } else {
                    matchesDistance = typeof r.distance_km === 'number' && r.distance_km <= maxDistanceValue;
                }
            }

            return matchesSearch && matchesChip && matchesDistance;
        })
    ), [
        restaurants,
        searchQuery,
        normalizedSearchQuery,
        activeChip,
        locationAvailable,
        maxDistanceValue,
    ]);

    const cuisineOptions = useMemo(() => (
        Array.from(
            new Set(
                restaurants
                    .map((r) => normalizeCuisine(r.cuisine_type))
                    .filter(Boolean)
            )
        ).sort()
    ), [restaurants]);

    return {
        restaurants: filteredRestaurants,
        allRestaurants: restaurants,
        loading,
        refresh: fetchRestaurants,
        cuisineOptions,
        locationRequired,
    };
};