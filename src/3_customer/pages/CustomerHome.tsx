// ============================================================
// FILE: CustomerHome.tsx
// SECTION: 3_customer > pages
// PURPOSE: Foodie ka main home screen.
//          Stitch design: Hero banner + Category chips +
//          Real-time restaurant listing from Supabase +
//          Today's Deals sidebar + 3D cinematic cards.
// ROUTE: /foodie/home (or /foodie after auth)
// ============================================================
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, MapPin, ShoppingCart, Star, Clock,
    ChevronRight, Flame, Gift, Receipt,
    ChevronDown, X, SlidersHorizontal
} from 'lucide-react';
import { useCustomerAuth } from '@/3_customer/context/CustomerAuthContext';
import { useNearbyRestaurants } from '@/3_customer/hooks/useNearbyRestaurants';
import { useCustomerLocation } from '@/3_customer/hooks/useCustomerLocation';
import { usePromotions } from '@/3_customer/hooks/usePromotions';
import type { RestaurantCard } from '@/3_customer/types/customer';
import type { MenuItem } from '@/shared/types/menu';
import { COUNTRY_CURRENCIES } from '@/shared/lib/currencyUtils';
import { useCart } from '@/3_customer/context/CartContext';
import { supabase } from '@/shared/lib/supabaseClient';
import CustomerJarvisButton from '@/3_customer/components/ai_agent/CustomerJarvisButton';

interface HomeFeaturedProduct {
    id: string;
    restaurant_id: string;
    restaurant_name: string;
    currency: string | null;
    name: string;
    price: number;
    original_price: number | null;
    discount_percentage: number | null;
    category: string | null;
    image_url: string | null;
    item_type?: 'single' | 'deal';
}

const normalizeProductCategory = (value?: string | null) =>
    (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const mapHomeProductToMenuItem = (item: HomeFeaturedProduct): MenuItem => ({
    id: item.id,
    restaurant_id: item.restaurant_id,
    name: item.name,
    description: null,
    price: item.price,
    image_url: item.image_url,
    category_id: null,
    category: item.category || undefined,
    categories: item.category ? { name: item.category } : null,
    cuisine: null,
    item_type: item.item_type,
    is_available: true,
    original_price: item.original_price,
    discount_percentage: item.discount_percentage,
});


// ── Skeleton loader card ───────────────────────────────────────
const SkeletonCard: React.FC = () => (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="h-40 w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="p-4 space-y-3">
            <div className="h-4 w-2/3 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-3 w-1/2 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="flex gap-3">
                <div className="h-3 w-12 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-3 w-16 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
        </div>
    </div>
);

// ── Restaurant Card Component ──────────────────────────────────
const RestaurantCard3D: React.FC<{
    restaurant: RestaurantCard;
    onClick: () => void;
    delay: number;
}> = ({ restaurant, onClick, delay }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    };

    const handleMouseLeave = () => {
        const card = cardRef.current;
        if (card) card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
    };

    const cuisineLabel = restaurant.cuisine_type
        ? restaurant.cuisine_type.charAt(0).toUpperCase() + restaurant.cuisine_type.slice(1)
        : (Array.isArray((restaurant as any).cuisine_types)
            ? (restaurant as any).cuisine_types[0] || 'Restaurant'
            : 'Restaurant');

    const savedCurrency = restaurant.currency || 'PKR';
    const currencyInfo = Object.values(COUNTRY_CURRENCIES).find(
        c => c.code === savedCurrency
    ) ?? Object.values(COUNTRY_CURRENCIES).find(
        c => c.code === 'PKR'
    );
    const currencySymbol = currencyInfo?.symbol ?? 'PKR';
    const formatPrice = (price: number): string => `${currencySymbol}\u00A0${price.toLocaleString('en', { maximumFractionDigits: 0 })}`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
        >
            <div
                ref={cardRef}
                onClick={onClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={e => {
                    handleMouseLeave();
                    (e.currentTarget as HTMLElement).style.boxShadow = '';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                }}
            >
                {/* Image */}
                <div className="relative h-40 overflow-hidden" style={{ background: 'rgba(255,107,53,0.08)' }}>
                    {restaurant.logo_url && typeof restaurant.logo_url === 'string' ? (
                        <img
                            src={restaurant.logo_url}
                            alt={restaurant.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="text-5xl">🍽️</span>
                        </div>
                    )}
                    {/* Free Delivery badge */}
                    {restaurant.delivery_fee === 0 && (
                        <div
                            className="absolute top-3 left-3 px-2 py-1 rounded-lg text-white text-xs font-bold"
                            style={{ background: 'rgba(34,197,94,0.9)', backdropFilter: 'blur(4px)' }}
                        >
                            Free Delivery
                        </div>
                    )}
                    {/* Open/Closed badge */}
                    <div
                        className="absolute top-3 right-3 px-2 py-1 rounded-lg text-white text-xs font-bold"
                        style={{
                            background: restaurant.is_active
                                ? 'rgba(34,197,94,0.85)'
                                : 'rgba(239,68,68,0.85)',
                            backdropFilter: 'blur(4px)',
                        }}
                    >
                        {restaurant.is_active ? '🟢 Open' : '🔴 Closed'}
                    </div>
                </div>

                {/* Info */}
                <div className="p-4">
                    <h3 className="text-white font-bold text-base mb-1 truncate group-hover:text-orange-300 transition-colors">
                        {restaurant.name}
                    </h3>
                    <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {cuisineLabel}
                        {restaurant.city && ` • ${restaurant.city}`}
                    </p>
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {restaurant.rating && (
                            <span className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                                <span className="font-semibold text-white">{restaurant.rating.toFixed(1)}</span>
                            </span>
                        )}
                        {restaurant.delivery_time_min && (
                            <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {restaurant.delivery_time_min} min
                            </span>
                        )}
                        {typeof restaurant.distance_km === 'number' && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {restaurant.distance_km.toFixed(1)} km
                            </span>
                        )}
                        {restaurant.min_order && (
                            <span>Min {formatPrice(restaurant.min_order)}</span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// ── Main Component ─────────────────────────────────────────────
const CustomerHome: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { customer, isGuest } = useCustomerAuth();
    const { totalCount, addToCart } = useCart();

    const urlQuery    = searchParams.get('q') || '';
    const urlMaxPrice = searchParams.get('maxprice') || '';
    const urlSort     = searchParams.get('sort') || '';
    const urlDelivery = searchParams.get('delivery') || '';

    const [searchQuery, setSearchQuery] = useState(urlQuery);
    const [activeChip, setActiveChip] = useState('all');
    const [showSearch, setShowSearch] = useState(!!urlQuery);
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState<'recommended' | 'fastest' | 'lowest_fee' | 'top_rated'>('recommended');
    const [maxFee, setMaxFee] = useState('');
    const [maxEta, setMaxEta] = useState('');
    const [maxMinOrder, setMaxMinOrder] = useState('');
    const [maxDistanceKm, setMaxDistanceKm] = useState('10');
    const [freeDeliveryOnly, setFreeDeliveryOnly] = useState(false);
    const [openFilter, setOpenFilter] = useState<'open' | 'all' | 'closed'>('open');

    // Sync search + filters when Jarvis navigates with URL params
    useEffect(() => {
        setSearchQuery(urlQuery);
        if (urlQuery) setShowSearch(true);
        if (urlMaxPrice) setMaxMinOrder(urlMaxPrice);
        const validSorts = ['recommended', 'fastest', 'lowest_fee', 'top_rated'];
        if (urlSort && validSorts.includes(urlSort))
            setSortBy(urlSort as typeof sortBy);
        setFreeDeliveryOnly(urlDelivery === 'free');
    }, [urlQuery, urlMaxPrice, urlSort, urlDelivery]);

    const {
        location,
        status: locationStatus,
        error: locationError,
        permission: locationPermission,
        requestLocation,
    } = useCustomerLocation();

    const isLocationReady = Boolean(location && locationStatus === 'ready');

    const toNumberOrNull = (value: string): number | null => {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const num = Number(trimmed);
        return Number.isFinite(num) ? num : null;
    };

    const { restaurants: filteredRestaurants, allRestaurants, loading, cuisineOptions, locationRequired } = useNearbyRestaurants(
        searchQuery,
        activeChip,
        {
            sortBy,
            maxFee: toNumberOrNull(maxFee),
            maxEta: toNumberOrNull(maxEta),
            maxMinOrder: toNumberOrNull(maxMinOrder),
            maxDistanceKm: toNumberOrNull(maxDistanceKm),
            freeDeliveryOnly,
            openFilter,
            userLocation: location ? { lat: location.lat, lng: location.lng } : null,
        }
    );

    const { promotions } = usePromotions(6);
    const [homeProducts, setHomeProducts] = useState<HomeFeaturedProduct[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productsError, setProductsError] = useState<string | null>(null);
    const [activeProductCategory, setActiveProductCategory] = useState('all');
    const latestProductsReqRef = useRef(0);

    const areProductsEqual = (next: HomeFeaturedProduct[], prev: HomeFeaturedProduct[]) => {
        if (next.length !== prev.length) return false;
        for (let i = 0; i < next.length; i += 1) {
            const a = next[i];
            const b = prev[i];
            if (
                a.id !== b.id ||
                a.restaurant_id !== b.restaurant_id ||
                a.restaurant_name !== b.restaurant_name ||
                a.currency !== b.currency ||
                a.name !== b.name ||
                a.price !== b.price ||
                a.original_price !== b.original_price ||
                a.discount_percentage !== b.discount_percentage ||
                a.category !== b.category ||
                a.image_url !== b.image_url ||
                a.item_type !== b.item_type
            ) {
                return false;
            }
        }
        return true;
    };

    const bestSellerRestaurants = useMemo(() => {
        return [...filteredRestaurants]
            .sort((a, b) => {
                const ratingA = typeof a.rating === 'number' ? a.rating : 0;
                const ratingB = typeof b.rating === 'number' ? b.rating : 0;
                if (ratingB !== ratingA) return ratingB - ratingA;

                const etaA = typeof a.delivery_time_min === 'number' ? a.delivery_time_min : Number.POSITIVE_INFINITY;
                const etaB = typeof b.delivery_time_min === 'number' ? b.delivery_time_min : Number.POSITIVE_INFINITY;
                if (etaA !== etaB) return etaA - etaB;

                const feeA = typeof a.delivery_fee === 'number' ? a.delivery_fee : Number.POSITIVE_INFINITY;
                const feeB = typeof b.delivery_fee === 'number' ? b.delivery_fee : Number.POSITIVE_INFINITY;
                return feeA - feeB;
            })
            .slice(0, 8);
    }, [filteredRestaurants]);

    const shouldShowBestSellers = useMemo(() => (
        filteredRestaurants.length >= 6 && bestSellerRestaurants.length >= 4
    ), [filteredRestaurants.length, bestSellerRestaurants.length]);

    const topRestaurantList = useMemo(() => {
        if (!shouldShowBestSellers) return filteredRestaurants;

        const bestSellerIds = new Set(bestSellerRestaurants.map((r) => r.id));
        const remainingRestaurants = filteredRestaurants.filter((r) => !bestSellerIds.has(r.id));

        return remainingRestaurants.length > 0 ? remainingRestaurants : filteredRestaurants;
    }, [filteredRestaurants, bestSellerRestaurants, shouldShowBestSellers]);

    const normalizedDishSearch = searchQuery.trim().toLowerCase();

    const nearbyRestaurantMeta = useMemo(
        () => allRestaurants.map((restaurant) => ({
            id: restaurant.id,
            name: restaurant.name,
            currency: restaurant.currency || 'PKR',
        })),
        [allRestaurants]
    );

    const nearbyRestaurantIdsKey = useMemo(
        () => nearbyRestaurantMeta.map((restaurant) => restaurant.id).join(','),
        [nearbyRestaurantMeta]
    );

    const topPromotionDeal = useMemo(() => {
        if (!promotions.length) return null;

        return [...promotions].sort((a, b) => {
            const scoreA = a.discount_type === 'percent' ? a.discount_value : a.discount_value / 10;
            const scoreB = b.discount_type === 'percent' ? b.discount_value : b.discount_value / 10;
            return scoreB - scoreA;
        })[0] ?? null;
    }, [promotions]);

    const searchableHomeProducts = useMemo(() => {
        if (!normalizedDishSearch) return homeProducts;
        return homeProducts.filter((item) => (
            item.name.toLowerCase().includes(normalizedDishSearch) ||
            item.restaurant_name.toLowerCase().includes(normalizedDishSearch) ||
            normalizeProductCategory(item.category).includes(normalizedDishSearch)
        ));
    }, [homeProducts, normalizedDishSearch]);

    const popularProducts = useMemo(
        () => searchableHomeProducts.slice(0, 16),
        [searchableHomeProducts]
    );

    const productCategoryOptions = useMemo(() => (
        Array.from(
            new Set(
                searchableHomeProducts
                    .map((item) => normalizeProductCategory(item.category))
                    .filter(Boolean)
            )
        ).sort()
    ), [searchableHomeProducts]);

    const categoryProducts = useMemo(() => {
        if (activeProductCategory === 'all') return searchableHomeProducts;
        return searchableHomeProducts.filter(
            (item) => normalizeProductCategory(item.category) === activeProductCategory
        );
    }, [searchableHomeProducts, activeProductCategory]);

    const categoryPreviewProducts = useMemo(
        () => categoryProducts.slice(0, 48),
        [categoryProducts]
    );

    useEffect(() => {
        if (nearbyRestaurantMeta.length === 0) {
            setHomeProducts((prev) => (prev.length ? [] : prev));
            setProductsLoading((prev) => (prev ? false : prev));
            setProductsError((prev) => (prev !== null ? null : prev));
            return;
        }

        let active = true;
        const requestId = Date.now();
        latestProductsReqRef.current = requestId;

        const fetchHomeProducts = async () => {
            setProductsLoading((prev) => (prev ? prev : true));
            setProductsError((prev) => (prev !== null ? null : prev));
            try {
                const queryRestaurantIds = nearbyRestaurantMeta.map((restaurant) => restaurant.id);
                const restaurantLookup = new Map<string, { name: string; currency: string | null }>();
                nearbyRestaurantMeta.forEach((restaurant) => {
                    restaurantLookup.set(restaurant.id, {
                        name: restaurant.name,
                        currency: restaurant.currency,
                    });
                });

                const categoryNameById = new Map<string, string>();
                const categoriesQuery = await supabase
                    .from('categories')
                    .select('id, name, restaurant_id')
                    .in('restaurant_id', queryRestaurantIds);

                if (!categoriesQuery.error) {
                    (categoriesQuery.data || []).forEach((category: any) => {
                        if (typeof category?.id === 'string' && typeof category?.name === 'string') {
                            categoryNameById.set(category.id, category.name);
                        }
                    });
                }

                const primaryQuery = await supabase
                    .from('menu_items')
                    .select('*')
                    .in('restaurant_id', queryRestaurantIds)
                    .order('created_at', { ascending: false })
                    .range(0, 499);

                let rows: any[] = [];

                if (primaryQuery.error) {
                    const fallbackQuery = await supabase
                        .from('menu_items')
                        .select('*')
                        .in('restaurant_id', queryRestaurantIds)
                        .range(0, 499);

                    if (fallbackQuery.error) {
                        throw fallbackQuery.error;
                    }

                    rows = fallbackQuery.data || [];
                } else {
                    rows = primaryQuery.data || [];
                }

                if (!active || latestProductsReqRef.current !== requestId) return;

                const availableRows = rows.filter((item: any) => {
                    if (typeof item?.is_available === 'boolean') return item.is_available;
                    if (typeof item?.available === 'boolean') return item.available;
                    return true;
                });

                const mapped = availableRows.map((item: any) => {
                    const restaurantInfo = restaurantLookup.get(item.restaurant_id);
                    const rawCategory = typeof item?.category === 'string' ? item.category.trim() : '';
                    const categoryNameFromId =
                        typeof item?.category_id === 'string'
                            ? (categoryNameById.get(item.category_id) || '')
                            : '';
                    const finalCategory = rawCategory || categoryNameFromId || null;

                    const priceValue = typeof item?.price === 'number' ? item.price : Number(item?.price);
                    const originalPriceValue = typeof item?.original_price === 'number'
                        ? item.original_price
                        : Number(item?.original_price);
                    const discountValue = typeof item?.discount_percentage === 'number'
                        ? item.discount_percentage
                        : Number(item?.discount_percentage);

                    return {
                    id: item.id,
                    restaurant_id: item.restaurant_id,
                    restaurant_name: restaurantInfo?.name || 'Restaurant',
                    currency: restaurantInfo?.currency || 'PKR',
                    name: item.name,
                    price: Number.isFinite(priceValue) ? priceValue : 0,
                    original_price: Number.isFinite(originalPriceValue) ? originalPriceValue : null,
                    discount_percentage: Number.isFinite(discountValue) ? discountValue : null,
                    category: finalCategory,
                    image_url: item.image_url || null,
                    item_type: item.item_type,
                };
                })
                    .filter((item) => Boolean(item.id && item.restaurant_id && item.name)) as HomeFeaturedProduct[];

                setHomeProducts((prev) => (areProductsEqual(mapped, prev) ? prev : mapped));
            } catch (error) {
                if (active) {
                    const err = error as any;
                    console.error('Failed to load home products:', err?.message || err, err);
                    setHomeProducts((prev) => (prev.length ? [] : prev));
                    setProductsError((prev) => (
                        prev === 'Popular products are temporarily unavailable.'
                            ? prev
                            : 'Popular products are temporarily unavailable.'
                    ));
                }
            } finally {
                if (active && latestProductsReqRef.current === requestId) {
                    setProductsLoading((prev) => (prev ? false : prev));
                }
            }
        };

        void fetchHomeProducts();

        return () => {
            active = false;
        };
    }, [nearbyRestaurantIdsKey, nearbyRestaurantMeta]);

    const formatCuisineLabel = (value: string) =>
        value
            .split(' ')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');

    useEffect(() => {
        if (activeChip !== 'all' && !cuisineOptions.includes(activeChip)) {
            setActiveChip('all');
        }
    }, [activeChip, cuisineOptions]);

    useEffect(() => {
        if (activeProductCategory !== 'all' && !productCategoryOptions.includes(activeProductCategory)) {
            setActiveProductCategory('all');
        }
    }, [activeProductCategory, productCategoryOptions]);

    useEffect(() => {
        if (!location && locationStatus === 'idle') {
            requestLocation();
        }
    }, [location, locationStatus, requestLocation]);

    const hasActiveFilters = Boolean(
        searchQuery.trim() ||
        activeChip !== 'all' ||
        freeDeliveryOnly ||
        maxFee.trim() ||
        maxEta.trim() ||
        maxMinOrder.trim() ||
        (maxDistanceKm.trim() && location) ||
        openFilter !== 'open'
    );

    const locationLabel = location
        ? 'Near You'
        : locationPermission === 'denied'
            ? 'Location Blocked'
        : locationStatus === 'loading'
            ? 'Locating...'
            : 'Enable Location';

    const locationGateMessage =
        locationError ||
        (locationPermission === 'denied'
            ? 'Location is blocked in browser settings. Allow it for this site and try again.'
            : 'Allow location access to see restaurants and dishes within 5-10 km.');

    const handleExploreClick = () => {
        if (!isLocationReady) {
            requestLocation();
            return;
        }
        document.getElementById('restaurant-list')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAddHomeItem = (item: HomeFeaturedProduct) => {
        addToCart({
            menuItem: mapHomeProductToMenuItem(item),
            quantity: 1,
        });
    };

    const formatCurrency = (value: number, currencyCode: string | null) => {
        const savedCurrency = currencyCode || 'PKR';
        const currencyInfo = Object.values(COUNTRY_CURRENCIES).find(
            (c) => c.code === savedCurrency
        ) ?? Object.values(COUNTRY_CURRENCIES).find(
            (c) => c.code === 'PKR'
        );
        const symbol = currencyInfo?.symbol ?? 'PKR';
        return `${symbol}\u00A0${value.toLocaleString('en', { maximumFractionDigits: 0 })}`;
    };


    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const userName = customer?.full_name?.split(' ')[0] || (isGuest ? 'Guest' : 'Foodie');

    return (
        <div className="min-h-screen" style={{ background: '#0d0500' }}>

            {/* ── TOP NAV ───────────────────────────────────── */}
            <nav
                className="sticky top-0 z-50 px-4 py-3"
                style={{
                    background: 'rgba(13,5,0,0.92)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(255,107,53,0.1)',
                }}
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                    {/* Logo */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: '#FF6B35' }}
                        >
                            <Flame className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white font-bold text-lg hidden sm:block">SaySavor</span>
                    </div>

                    {/* Search bar */}
                    <div
                        className="flex-1 max-w-xl relative"
                        onClick={() => setShowSearch(true)}
                    >
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search dishes or restaurants..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-all"
                            style={{
                                background: 'rgba(255,255,255,0.07)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                            onFocus={e => {
                                e.target.style.borderColor = 'rgba(255,107,53,0.5)';
                                e.target.style.background = 'rgba(255,255,255,0.09)';
                            }}
                            onBlur={e => {
                                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                e.target.style.background = 'rgba(255,255,255,0.07)';
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Location pill */}
                        <div
                            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all"
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.7)',
                            }}
                            onClick={requestLocation}
                            title={locationError || 'Allow location to see nearby restaurants'}
                        >
                            <MapPin className="w-3.5 h-3.5" style={{ color: '#FF6B35' }} />
                            <span>{locationLabel}</span>
                            <ChevronDown className="w-3 h-3" />
                        </div>

                        {/* Cart */}
                        <button onClick={() => navigate('/foodie/cart')}
                          className="relative p-2.5 rounded-xl transition-all"
                          style={{ background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.2)' }}>
                          <ShoppingCart className="w-4 h-4" style={{ color: '#FF6B35' }} />
                          {totalCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full
                              bg-orange-500 text-white text-[9px] font-black
                              flex items-center justify-center">
                              {totalCount > 9 ? '9+' : totalCount}
                            </span>
                          )}
                        </button>

                        {/* Order History */}
                        <button
                            onClick={() => navigate('/foodie/profile')}
                            className="p-2.5 rounded-xl transition-all"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                            title="Order History"
                        >
                            <Receipt className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.85)' }} />
                        </button>

                        {/* Profile/Logout */}
                        <button
                            onClick={() => navigate('/foodie/profile')}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white transition-all"
                            style={{
                                background: 'linear-gradient(135deg, #FF6B35, #E85A24)',
                                boxShadow: '0 2px 12px rgba(255,107,53,0.3)',
                            }}
                            title={userName}
                        >
                            {userName.charAt(0).toUpperCase()}
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── MAIN CONTENT ──────────────────────────────── */}
            <main className="max-w-7xl mx-auto px-4 py-6">

                {/* ── HERO BANNER ─────────────────────────────── */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative rounded-3xl overflow-hidden mb-8"
                    style={{
                        background: 'linear-gradient(135deg, #1a0800 0%, #2d0f00 60%, #1a0800 100%)',
                        border: '1px solid rgba(255,107,53,0.2)',
                        minHeight: '220px',
                    }}
                >
                    {/* BG glow */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(255,107,53,0.15) 0%, transparent 65%)' }}
                    />
                    {/* Food image right */}
                    <div className="absolute right-0 top-0 w-48 h-full overflow-hidden opacity-30 hidden md:block">
                        <img
                            src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=70"
                            alt="Food"
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #1a0800, transparent)' }} />
                    </div>

                    <div className="relative z-10 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        {/* Left text */}
                        <div>
                            <p className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#FF6B35' }}>
                                <Flame className="w-4 h-4" /> {greeting()}, {userName}!
                            </p>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 leading-tight">
                                Discover the Best<br />
                                <span style={{ color: '#FF6B35' }}>Food Near You 🔥</span>
                            </h1>
                            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                Authentic flavors delivered to your doorstep with lightning-fast delivery.
                            </p>
                            <button
                                onClick={handleExploreClick}
                                className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
                                style={{
                                    background: 'linear-gradient(135deg, #FF6B35, #E85A24)',
                                    boxShadow: '0 4px 20px rgba(255,107,53,0.4)',
                                }}
                            >
                                Explore Now →
                            </button>

                            {topPromotionDeal && (
                                <div
                                    className="mt-4 p-3 rounded-2xl max-w-md"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                    }}
                                >
                                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#FF6B35' }}>
                                        Best Deal Today
                                    </p>
                                    <p className="text-sm font-bold text-white mt-1">
                                        {topPromotionDeal.restaurants?.name || 'Restaurant'} • {topPromotionDeal.code}
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                        {topPromotionDeal.discount_type === 'percent'
                                            ? `${topPromotionDeal.discount_value}% OFF`
                                            : `${formatCurrency(topPromotionDeal.discount_value, topPromotionDeal.restaurants?.currency || 'PKR')} OFF`}
                                        {typeof topPromotionDeal.min_order === 'number'
                                            ? ` • Min ${formatCurrency(topPromotionDeal.min_order, topPromotionDeal.restaurants?.currency || 'PKR')}`
                                            : ''}
                                    </p>
                                    {topPromotionDeal.restaurant_id && (
                                        <button
                                            onClick={() => navigate(`/foodie/restaurant/${topPromotionDeal.restaurant_id}`)}
                                            className="mt-2 text-xs font-black uppercase tracking-widest"
                                            style={{ color: '#FF6B35' }}
                                        >
                                            Grab Deal →
                                        </button>
                                    )}
                                </div>
                            )}

                            {shouldShowBestSellers && (
                                <p className="mt-3 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                    {bestSellerRestaurants.length} top picks selected for your current filters
                                </p>
                            )}
                        </div>

                    </div>
                </motion.section>

                {!isLocationReady ? (
                    <div className="mb-10">
                        <div
                            className="rounded-3xl border border-white/10 bg-white/[0.03]"
                        >
                            <div className="p-8 flex flex-col items-center text-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <MapPin className="w-6 h-6" style={{ color: '#FF6B35' }} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Location required</h2>
                                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    {locationGateMessage}
                                </p>
                                <button
                                    onClick={requestLocation}
                                    disabled={locationStatus === 'loading'}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                                    style={{ background: 'linear-gradient(135deg, #FF6B35, #E85A24)' }}
                                >
                                    {locationStatus === 'loading' ? 'Locating...' : 'Enable Location'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                {/* ── FILTERS + SORT ────────────────────────── */}
                <div className="mb-6 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setShowFilters((prev) => !prev)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            style={{
                                background: showFilters ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.05)',
                                border: showFilters ? '1px solid rgba(255,107,53,0.35)' : '1px solid rgba(255,255,255,0.12)',
                                color: showFilters ? '#FF6B35' : 'rgba(255,255,255,0.7)',
                            }}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Filters
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>

                        <button
                            onClick={() => setFreeDeliveryOnly((prev) => !prev)}
                            className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            style={freeDeliveryOnly ? {
                                background: 'linear-gradient(135deg, #FF6B35, #E85A24)',
                                color: 'white',
                                boxShadow: '0 4px 14px rgba(255,107,53,0.35)',
                            } : {
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                color: 'rgba(255,255,255,0.7)',
                            }}
                        >
                            Free Delivery
                        </button>

                        <div className="flex items-center gap-2">
                            {([
                                { key: 'open', label: 'Open Now' },
                                { key: 'all', label: 'All' },
                                { key: 'closed', label: 'Closed' },
                            ] as const).map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => setOpenFilter(item.key)}
                                    className="px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    style={openFilter === item.key ? {
                                        background: 'rgba(255,107,53,0.18)',
                                        border: '1px solid rgba(255,107,53,0.35)',
                                        color: '#FF6B35',
                                    } : {
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        color: 'rgba(255,255,255,0.65)',
                                    }}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                Sort
                            </span>
                            <select
                                value={sortBy}
                                onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                                className="px-3 py-2 rounded-xl text-[11px] font-bold text-white outline-none"
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.14)',
                                }}
                            >
                                <option value="recommended" className="bg-[#0d0500] text-white">Recommended</option>
                                <option value="fastest" className="bg-[#0d0500] text-white">Fastest Delivery</option>
                                <option value="lowest_fee" className="bg-[#0d0500] text-white">Lowest Delivery Fee</option>
                                <option value="top_rated" className="bg-[#0d0500] text-white">Top Rated</option>
                            </select>
                        </div>
                    </div>

                    {showFilters && (
                        <div
                            className="p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
                            style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                    Max Delivery Fee
                                </p>
                                <input
                                    type="number"
                                    min="0"
                                    value={maxFee}
                                    onChange={(event) => setMaxFee(event.target.value)}
                                    placeholder="Any"
                                    className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder:text-white/30 outline-none"
                                    style={{
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                    }}
                                />
                            </div>

                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                    Max ETA (minutes)
                                </p>
                                <input
                                    type="number"
                                    min="1"
                                    value={maxEta}
                                    onChange={(event) => setMaxEta(event.target.value)}
                                    placeholder="Any"
                                    className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder:text-white/30 outline-none"
                                    style={{
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                    }}
                                />
                            </div>

                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                    Max Minimum Order
                                </p>
                                <input
                                    type="number"
                                    min="0"
                                    value={maxMinOrder}
                                    onChange={(event) => setMaxMinOrder(event.target.value)}
                                    placeholder="Any"
                                    className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder:text-white/30 outline-none"
                                    style={{
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                    }}
                                />
                            </div>

                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                    Max Distance (km)
                                </p>
                                <input
                                    type="number"
                                    min="1"
                                    value={maxDistanceKm}
                                    onChange={(event) => setMaxDistanceKm(event.target.value)}
                                    placeholder="10"
                                    className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder:text-white/30 outline-none"
                                    style={{
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                    }}
                                />
                            </div>

                            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                                <button
                                    onClick={() => {
                                        setMaxFee('');
                                        setMaxEta('');
                                        setMaxMinOrder('');
                                        setMaxDistanceKm('10');
                                        setFreeDeliveryOnly(false);
                                        setOpenFilter('open');
                                    }}
                                    className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        color: 'rgba(255,255,255,0.7)',
                                    }}
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {promotions.length > 0 && (
                    <section className="mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-white text-xl font-bold flex items-center gap-2">
                                <Gift className="w-5 h-5" style={{ color: '#FF6B35' }} />
                                Deals Near You
                            </h2>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
                            {promotions.map((promo) => {
                                const restaurant = promo.restaurants;
                                const currencyCode = restaurant?.currency || 'PKR';
                                const discountLabel = promo.discount_type === 'percent'
                                    ? `${promo.discount_value}% OFF`
                                    : `${formatCurrency(promo.discount_value, currencyCode)} OFF`;
                                const minOrderLabel = typeof promo.min_order === 'number'
                                    ? `Min order ${formatCurrency(promo.min_order, currencyCode)}`
                                    : null;
                                const endsLabel = promo.ends_at
                                    ? `Ends ${new Date(promo.ends_at).toLocaleDateString('en-GB')}`
                                    : null;

                                return (
                                    <div
                                        key={promo.id}
                                        className="p-4 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center gap-4 snap-start shrink-0 w-[320px] sm:w-[360px]"
                                    >
                                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                                            {restaurant?.logo_url ? (
                                                <img src={restaurant.logo_url} alt={restaurant?.name || 'Deal'} className="w-full h-full object-cover" loading="lazy" />
                                            ) : (
                                                <span className="text-2xl">🍽️</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#FF6B35' }}>
                                                {discountLabel}
                                            </p>
                                            <p className="text-sm font-bold text-white mt-1">
                                                {restaurant?.name || 'Restaurant Deal'}
                                            </p>
                                            <p className="text-[10px] text-white/50 mt-1">
                                                Use code <span className="text-white">{promo.code}</span>
                                            </p>
                                            {(minOrderLabel || endsLabel) && (
                                                <p className="text-[10px] text-white/40 mt-1">
                                                    {[minOrderLabel, endsLabel].filter(Boolean).join(' • ')}
                                                </p>
                                            )}
                                        </div>
                                        {restaurant?.id && (
                                            <button
                                                onClick={() => navigate(`/foodie/restaurant/${restaurant.id}`)}
                                                className="px-3 py-2 rounded-xl text-xs font-black text-white"
                                                style={{ background: 'linear-gradient(135deg, #FF6B35, #E85A24)' }}
                                            >
                                                View
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {(productsLoading || homeProducts.length > 0 || productsError !== null || nearbyRestaurantMeta.length > 0) && (
                    <section className="mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-white text-xl font-bold">Popular Products</h2>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                Best picks from nearby restaurants
                            </p>
                        </div>

                        {productsLoading ? (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[...Array(4)].map((_, idx) => (
                                    <div key={`prod-skeleton-${idx}`} className="rounded-2xl p-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <div className="h-28 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                        <div className="h-4 rounded mt-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                        <div className="h-3 rounded mt-2 w-2/3" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                    </div>
                                ))}
                            </div>
                        ) : popularProducts.length > 0 ? (
                            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                                {popularProducts.map((item) => (
                                    <div
                                        key={item.id}
                                        className="text-left p-3 rounded-2xl border border-white/10 bg-white/[0.03] snap-start shrink-0 w-[230px] transition-colors hover:border-orange-400/40"
                                    >
                                        <div className="relative h-28 rounded-xl overflow-hidden bg-white/5 border border-white/10 mb-3">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-3xl">🍲</div>
                                            )}
                                            {item.discount_percentage && item.discount_percentage > 0 && (
                                                <span className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-black text-white" style={{ background: 'rgba(255,107,53,0.95)' }}>
                                                    {item.discount_percentage}% OFF
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-white text-sm font-bold truncate">{item.name}</p>
                                        <p className="text-[11px] mt-1 truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                            {item.restaurant_name}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2 text-xs font-bold">
                                            <span style={{ color: '#FF6B35' }}>{formatCurrency(item.price, item.currency)}</span>
                                            {typeof item.original_price === 'number' && item.original_price > item.price && (
                                                <span style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through' }}>
                                                    {formatCurrency(item.original_price, item.currency)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-3 flex gap-2">
                                            <button
                                                onClick={() => handleAddHomeItem(item)}
                                                className="flex-1 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide text-white"
                                                style={{ background: 'linear-gradient(135deg, #FF6B35, #E85A24)' }}
                                            >
                                                Add to Cart
                                            </button>
                                            <button
                                                onClick={() => navigate(`/foodie/restaurant/${item.restaurant_id}`)}
                                                className="px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide"
                                                style={{
                                                    background: 'rgba(255,255,255,0.06)',
                                                    border: '1px solid rgba(255,255,255,0.12)',
                                                    color: 'rgba(255,255,255,0.8)',
                                                }}
                                            >
                                                View
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div
                                className="rounded-2xl p-5"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                }}
                            >
                                <p className="text-sm font-bold text-white">No popular products yet</p>
                                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    {productsError || 'Products will appear here as menu items become available.'}
                                </p>
                            </div>
                        )}
                    </section>
                )}

                {(productsLoading || homeProducts.length > 0 || productsError !== null) && (
                    <section className="mb-10">
                        <div className="flex items-center justify-between mb-4 gap-3">
                            <h2 className="text-white text-xl font-bold">Browse Dishes by Category</h2>
                            <p className="text-xs whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                {activeProductCategory === 'all'
                                    ? `${searchableHomeProducts.length} dishes nearby`
                                    : `${categoryProducts.length} dishes in ${formatCuisineLabel(activeProductCategory)}`}
                            </p>
                        </div>

                        {productCategoryOptions.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
                                <button
                                    onClick={() => setActiveProductCategory('all')}
                                    className="shrink-0 px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all"
                                    style={activeProductCategory === 'all' ? {
                                        background: 'linear-gradient(135deg, #FF6B35, #E85A24)',
                                        color: 'white',
                                        boxShadow: '0 4px 16px rgba(255,107,53,0.35)',
                                    } : {
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'rgba(255,255,255,0.65)',
                                    }}
                                >
                                    All Dishes
                                </button>
                                {productCategoryOptions.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => setActiveProductCategory(category)}
                                        className="shrink-0 px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all"
                                        style={activeProductCategory === category ? {
                                            background: 'linear-gradient(135deg, #FF6B35, #E85A24)',
                                            color: 'white',
                                            boxShadow: '0 4px 16px rgba(255,107,53,0.35)',
                                        } : {
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: 'rgba(255,255,255,0.65)',
                                        }}
                                    >
                                        {formatCuisineLabel(category)}
                                    </button>
                                ))}
                            </div>
                        )}

                        {productsLoading ? (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[...Array(8)].map((_, idx) => (
                                    <div key={`cat-skeleton-${idx}`} className="rounded-2xl p-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <div className="h-28 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                        <div className="h-4 rounded mt-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                        <div className="h-3 rounded mt-2 w-2/3" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                    </div>
                                ))}
                            </div>
                        ) : categoryPreviewProducts.length > 0 ? (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {categoryPreviewProducts.map((item) => (
                                    <div
                                        key={`cat-${item.id}`}
                                        className="text-left p-3 rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-orange-400/40"
                                    >
                                        <div className="relative h-28 rounded-xl overflow-hidden bg-white/5 border border-white/10 mb-3">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-3xl">🍲</div>
                                            )}
                                        </div>

                                        <p className="text-white text-sm font-bold truncate">{item.name}</p>
                                        <p className="text-[11px] mt-1 truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                            {item.category ? formatCuisineLabel(normalizeProductCategory(item.category)) : 'Chef Picks'} • {item.restaurant_name}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2 text-xs font-bold">
                                            <span style={{ color: '#FF6B35' }}>{formatCurrency(item.price, item.currency)}</span>
                                            {typeof item.original_price === 'number' && item.original_price > item.price && (
                                                <span style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through' }}>
                                                    {formatCurrency(item.original_price, item.currency)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-3 flex gap-2">
                                            <button
                                                onClick={() => handleAddHomeItem(item)}
                                                className="flex-1 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide text-white"
                                                style={{ background: 'linear-gradient(135deg, #FF6B35, #E85A24)' }}
                                            >
                                                Add to Cart
                                            </button>
                                            <button
                                                onClick={() => navigate(`/foodie/restaurant/${item.restaurant_id}`)}
                                                className="px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide"
                                                style={{
                                                    background: 'rgba(255,255,255,0.06)',
                                                    border: '1px solid rgba(255,255,255,0.12)',
                                                    color: 'rgba(255,255,255,0.8)',
                                                }}
                                            >
                                                View
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div
                                className="rounded-2xl p-5"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                }}
                            >
                                <p className="text-sm font-bold text-white">No dishes in this category</p>
                                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    {productsError || (normalizedDishSearch
                                        ? `No dish match found for "${searchQuery}".`
                                        : 'Try another category to explore more dishes.')}
                                </p>
                            </div>
                        )}
                    </section>
                )}

                {shouldShowBestSellers && (
                    <section className="mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-white text-xl font-bold">Best Sellers</h2>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                Top rated + fastest delivery picks
                            </p>
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                            {bestSellerRestaurants.map((restaurant) => {
                                const savedCurrency = restaurant.currency || 'PKR';
                                const currencyInfo = Object.values(COUNTRY_CURRENCIES).find(
                                    c => c.code === savedCurrency
                                ) ?? Object.values(COUNTRY_CURRENCIES).find(
                                    c => c.code === 'PKR'
                                );
                                const symbol = currencyInfo?.symbol ?? 'PKR';

                                return (
                                    <button
                                        key={`best-${restaurant.id}`}
                                        onClick={() => navigate(`/foodie/restaurant/${restaurant.id}`)}
                                        className="text-left p-3 rounded-2xl border border-white/10 bg-white/[0.03] snap-start shrink-0 w-[220px] transition-colors hover:border-orange-400/40"
                                    >
                                        <div className="h-28 rounded-xl overflow-hidden bg-white/5 border border-white/10 mb-3">
                                            {restaurant.logo_url ? (
                                                <img
                                                    src={restaurant.logo_url}
                                                    alt={restaurant.name}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-3xl">🍔</div>
                                            )}
                                        </div>

                                        <p className="text-white text-sm font-bold truncate">{restaurant.name}</p>
                                        <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                            {restaurant.cuisine_type || 'Restaurant'}
                                        </p>

                                        <div className="mt-2 flex items-center gap-3 text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                            {typeof restaurant.rating === 'number' && (
                                                <span className="flex items-center gap-1">
                                                    <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
                                                    {restaurant.rating.toFixed(1)}
                                                </span>
                                            )}
                                            {typeof restaurant.delivery_time_min === 'number' && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {restaurant.delivery_time_min}m
                                                </span>
                                            )}
                                        </div>

                                        {typeof restaurant.min_order === 'number' && (
                                            <p className="text-[11px] mt-2" style={{ color: '#FF6B35' }}>
                                                Min {symbol} {restaurant.min_order.toLocaleString('en', { maximumFractionDigits: 0 })}
                                            </p>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ── CATEGORY CHIPS ───────────────────────────── */}
                <div className="flex gap-2 overflow-x-auto pb-3 mb-8 scrollbar-hide">
                    <motion.button
                        key="all"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveChip('all')}
                        className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all"
                        style={activeChip === 'all' ? {
                            background: 'linear-gradient(135deg, #FF6B35, #E85A24)',
                            color: 'white',
                            boxShadow: '0 4px 16px rgba(255,107,53,0.35)',
                        } : {
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.65)',
                        }}
                    >
                        All
                    </motion.button>
                    {cuisineOptions.map((cuisine) => (
                        <motion.button
                            key={cuisine}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveChip(cuisine)}
                            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all"
                            style={activeChip === cuisine ? {
                                background: 'linear-gradient(135deg, #FF6B35, #E85A24)',
                                color: 'white',
                                boxShadow: '0 4px 16px rgba(255,107,53,0.35)',
                            } : {
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.65)',
                            }}
                        >
                            {formatCuisineLabel(cuisine)}
                        </motion.button>
                    ))}
                </div>

                {/* ── RESTAURANT LIST + DEALS SIDEBAR ──────────── */}
                <div id="restaurant-list" className={`grid gap-8 ${isGuest ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>

                    {/* Left: Restaurant grid (2 cols wide) */}
                    <div className={isGuest ? 'lg:col-span-2' : 'lg:col-span-1'}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-white text-xl font-bold">
                                {activeChip === 'all'
                                    ? 'Top Restaurants'
                                    : `${formatCuisineLabel(activeChip)} Restaurants`}
                                {topRestaurantList.length >= 0 && (
                                    <span className="ml-2 text-sm font-normal" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                        ({topRestaurantList.length})
                                    </span>
                                )}
                            </h2>
                            <button
                                onClick={() => {
                                    document.getElementById('restaurant-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                                className="text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all"
                                style={{ color: '#FF6B35', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)' }}
                            >
                                View All <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>

                        {loading ? (
                            <div className="grid sm:grid-cols-2 gap-5">
                                {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        ) : topRestaurantList.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-20"
                            >
                                <p className="text-5xl mb-4">{locationRequired ? '📍' : '🍽️'}</p>
                                <p className="text-white font-bold text-lg mb-2">
                                    {locationRequired
                                        ? 'Location required'
                                        : searchQuery
                                            ? `No results for "${searchQuery}"`
                                            : hasActiveFilters
                                                ? 'No restaurants match your filters'
                                                : 'No restaurants yet'}
                                </p>
                                <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    {locationRequired
                                        ? `Enable location to see restaurants within ${maxDistanceKm} km`
                                        : 'More restaurants coming soon to your area!'}
                                </p>
                                {locationRequired && (
                                    <button
                                        onClick={requestLocation}
                                        disabled={locationStatus === 'loading'}
                                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                                        style={{ background: 'linear-gradient(135deg, #FF6B35, #E85A24)' }}
                                    >
                                        {locationStatus === 'loading' ? 'Locating...' : 'Enable Location'}
                                    </button>
                                )}
                            </motion.div>
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-5">
                                {topRestaurantList.map((r, i) => (
                                    <RestaurantCard3D
                                        key={r.id}
                                        restaurant={r}
                                        delay={i * 0.07}
                                        onClick={() => navigate(`/foodie/restaurant/${r.id}`)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {isGuest && (
                        <div className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="p-5 rounded-2xl text-center"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                }}
                            >
                                <p className="text-2xl mb-2">🌟</p>
                                <p className="text-white font-bold text-sm mb-1">Create an account</p>
                                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    Sign up to track orders and manage your profile.
                                </p>
                                <button
                                    onClick={() => navigate('/foodie/auth')}
                                    className="w-full py-2.5 rounded-xl text-white font-bold text-sm transition-all hover:scale-105"
                                    style={{ background: 'linear-gradient(135deg, #FF6B35, #E85A24)' }}
                                >
                                    Create Account →
                                </button>
                            </motion.div>
                        </div>
                    )}
                </div>
                    </>
                )}
            </main>

            {/* ── BOTTOM NAV (mobile) ───────────────────────── */}
            <nav
                className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-center justify-around py-3 px-4"
                style={{
                    background: 'rgba(13,5,0,0.95)',
                    backdropFilter: 'blur(20px)',
                    borderTop: '1px solid rgba(255,107,53,0.12)',
                }}
            >
                {[
                    { icon: Flame, label: 'Home', route: '/foodie/home', active: true },
                    { icon: Search, label: 'Search', route: '/foodie/home', active: false },
                    { icon: ShoppingCart, label: 'Cart', route: '/foodie/cart', active: false },
                    { icon: Receipt, label: 'History', route: '/foodie/profile', active: false },
                ].map(({ icon: Icon, label, route, active }) => (
                    <button
                        key={label}
                        onClick={() => navigate(route)}
                        className="flex flex-col items-center gap-1 transition-all"
                        style={{ color: active ? '#FF6B35' : 'rgba(255,255,255,0.35)' }}
                    >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{label}</span>
                    </button>
                ))}
            </nav>

            {/* bottom padding for mobile nav */}
            <div className="h-20 md:hidden" />

            {/* Jarvis voice assistant — floating button */}
            <CustomerJarvisButton />
        </div>
    );
};

export default CustomerHome;
