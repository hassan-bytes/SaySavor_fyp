// ============================================================
// FILE: CustomerHome.tsx
// SECTION: 3_customer > pages
// PURPOSE: Foodie ka main home screen.
//          Stitch design: Hero banner + Category chips +
//          Real-time restaurant listing from Supabase +
//          Today's Deals sidebar + 3D cinematic cards.
// ROUTE: /foodie/home (or /foodie after auth)
// ============================================================
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, MapPin, ShoppingCart, Star, Clock,
    ChevronRight, Flame, Gift,
    ChevronDown, X, SlidersHorizontal
} from 'lucide-react';
import { useCustomerAuth } from '@/3_customer/context/CustomerAuthContext';
import { useNearbyRestaurants } from '@/3_customer/hooks/useNearbyRestaurants';
import { useCustomerLocation } from '@/3_customer/hooks/useCustomerLocation';
import { usePromotions } from '@/3_customer/hooks/usePromotions';
import type { RestaurantCard } from '@/3_customer/types/customer';
import { COUNTRY_CURRENCIES } from '@/shared/lib/currencyUtils';
import { useCart } from '@/3_customer/context/CartContext';


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
    const { customer, isGuest } = useCustomerAuth();
    const { totalCount } = useCart();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeChip, setActiveChip] = useState('all');
    const [showSearch, setShowSearch] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState<'recommended' | 'fastest' | 'lowest_fee' | 'top_rated'>('recommended');
    const [maxFee, setMaxFee] = useState('');
    const [maxEta, setMaxEta] = useState('');
    const [maxMinOrder, setMaxMinOrder] = useState('');
    const [maxDistanceKm, setMaxDistanceKm] = useState('10');
    const [freeDeliveryOnly, setFreeDeliveryOnly] = useState(false);
    const [openFilter, setOpenFilter] = useState<'open' | 'all' | 'closed'>('open');

    const {
        location,
        status: locationStatus,
        error: locationError,
        requestLocation,
    } = useCustomerLocation();

    const toNumberOrNull = (value: string): number | null => {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const num = Number(trimmed);
        return Number.isFinite(num) ? num : null;
    };

    const { restaurants: filteredRestaurants, loading, cuisineOptions } = useNearbyRestaurants(
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
        : locationStatus === 'loading'
            ? 'Locating...'
            : 'Enable Location';

    const isLocationReady = Boolean(location && locationStatus === 'ready');
    const locationGateMessage = locationError || 'Allow location access to see restaurants and dishes within 5-10 km.';

    const handleExploreClick = () => {
        if (!isLocationReady) {
            requestLocation();
            return;
        }
        document.getElementById('restaurant-list')?.scrollIntoView({ behavior: 'smooth' });
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
                            placeholder="Hungry? Let's find you some magic..."
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
                        <div className="grid md:grid-cols-2 gap-4">
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
                                        className="p-4 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center gap-4"
                                    >
                                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                                            {restaurant?.logo_url ? (
                                                <img src={restaurant.logo_url} alt={restaurant?.name || 'Deal'} className="w-full h-full object-cover" />
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
                                {filteredRestaurants.length >= 0 && (
                                    <span className="ml-2 text-sm font-normal" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                        ({filteredRestaurants.length})
                                    </span>
                                )}
                            </h2>
                            <button
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
                        ) : filteredRestaurants.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-20"
                            >
                                <p className="text-5xl mb-4">🍽️</p>
                                <p className="text-white font-bold text-lg mb-2">
                                    {searchQuery
                                        ? `No results for "${searchQuery}"`
                                        : hasActiveFilters
                                            ? 'No restaurants match your filters'
                                            : 'No restaurants yet'}
                                </p>
                                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    More restaurants coming soon to your area!
                                </p>
                            </motion.div>
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-5">
                                {filteredRestaurants.map((r, i) => (
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
                    { icon: Gift, label: 'Points', route: '/foodie/profile', active: false },
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
        </div>
    );
};

export default CustomerHome;
