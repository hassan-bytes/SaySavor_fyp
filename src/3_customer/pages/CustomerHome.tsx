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
    ChevronRight, Flame, Zap, Gift, Bell, LogOut,
    Filter, ChevronDown, X
} from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';
import { useCustomerAuth } from '@/3_customer/context/CustomerAuthContext';
import type { RestaurantCard } from '@/3_customer/types/customer';

// ── Cuisine category chips ─────────────────────────────────────
const CUISINE_CHIPS = [
    { id: 'all',      emoji: '🔥', label: 'All' },
    { id: 'biryani',  emoji: '🍚', label: 'Biryani' },
    { id: 'fast_food',emoji: '🍔', label: 'Fast Food' },
    { id: 'bakery',   emoji: '🥐', label: 'Bakery' },
    { id: 'desi',     emoji: '🍛', label: 'Desi' },
    { id: 'beverages',emoji: '🧃', label: 'Beverages' },
    { id: 'sea_food', emoji: '🦞', label: 'Sea Food' },
    { id: 'pizza',    emoji: '🍕', label: 'Pizza' },
    { id: 'bbq',      emoji: '🔥', label: 'BBQ' },
];

// ── Static Today's Deals (will be real later) ──────────────────
const TODAYS_DEALS = [
    {
        id: 'd1',
        badge: '50% OFF',
        badgeColor: '#FF6B35',
        title: 'Buy 1 Get 1 Free on Large Pizzas',
        restaurant: 'Authentic, The Italian Kitchen',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&q=70',
    },
    {
        id: 'd2',
        badge: '20% OFF',
        badgeColor: '#22c55e',
        title: 'Flat 20% OFF on Weekend Family Buckets',
        restaurant: 'Authentic, Dish Kitchen',
        imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=300&q=70',
    },
];

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
                onMouseLeave={handleMouseLeave}
                className="rounded-2xl overflow-hidden cursor-pointer group"
                style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(10px)',
                    transition: 'transform 0.15s ease, box-shadow 0.3s ease',
                    willChange: 'transform',
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 50px rgba(255,107,53,0.18)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,107,53,0.3)';
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                }}
            >
                {/* Image */}
                <div className="relative h-40 overflow-hidden" style={{ background: 'rgba(255,107,53,0.08)' }}>
                    {restaurant.logo_url ? (
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
                    {(restaurant.delivery_fee === 0 || restaurant.delivery_fee === null) && (
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
                        {restaurant.min_order && (
                            <span>Min Rs.{restaurant.min_order}</span>
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
    const { customer, isGuest, logout } = useCustomerAuth();

    const [restaurants, setRestaurants] = useState<RestaurantCard[]>([]);
    const [filteredRestaurants, setFilteredRestaurants] = useState<RestaurantCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeChip, setActiveChip] = useState('all');
    const [showSearch, setShowSearch] = useState(false);

    // Fetch restaurants from Supabase
    const fetchRestaurants = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('restaurants')
                .select('id, name, logo_url, city, cuisine_types, description, is_open, onboarding_completed')
                .eq('onboarding_completed', true)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            const mapped: RestaurantCard[] = (data || []).map((r: any) => ({
                id: r.id,
                name: r.name,
                image_url: r.logo_url,
                logo_url: r.logo_url,
                cuisine_type: Array.isArray(r.cuisine_types) ? r.cuisine_types[0] : r.cuisine_types,
                rating: r.rating ?? (4 + Math.random()).toFixed(1) as unknown as number,
                delivery_time_min: r.delivery_time_min ?? Math.floor(Math.random() * 20) + 20,
                delivery_fee: r.delivery_fee ?? 0,
                min_order: r.min_order ?? 200,
                is_active: r.is_open ?? true,
                city: r.city,
            }));

            setRestaurants(mapped);
            setFilteredRestaurants(mapped);
        } catch (err) {
            console.error('Error fetching restaurants:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRestaurants();

        // Real-time subscription — when partner updates is_open
        const sub = supabase
            .channel('restaurants-home')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'restaurants',
            }, () => {
                fetchRestaurants();
            })
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, []);

    // Filter logic
    useEffect(() => {
        let result = restaurants;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.name.toLowerCase().includes(query) ||
                (r.cuisine_type && r.cuisine_type.toLowerCase().includes(query)) ||
                (r.city && r.city.toLowerCase().includes(query))
            );
        }

        if (activeChip !== 'all') {
            result = result.filter(r =>
                r.cuisine_type && r.cuisine_type.toLowerCase().includes(activeChip.replace('_', ' '))
            );
        }

        setFilteredRestaurants(result);
    }, [searchQuery, activeChip, restaurants]);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const userName = customer?.name?.split(' ')[0] || (isGuest ? 'Guest' : 'Foodie');

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
                            placeholder="Search restaurants, dishes..."
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
                        >
                            <MapPin className="w-3.5 h-3.5" style={{ color: '#FF6B35' }} />
                            <span>{customer?.phone ? 'Near You' : 'Pakistan'}</span>
                            <ChevronDown className="w-3 h-3" />
                        </div>

                        {/* Cart */}
                        <button
                            onClick={() => navigate('/foodie/cart')}
                            className="relative p-2.5 rounded-xl transition-all"
                            style={{
                                background: 'rgba(255,107,53,0.12)',
                                border: '1px solid rgba(255,107,53,0.2)',
                            }}
                        >
                            <ShoppingCart className="w-4 h-4" style={{ color: '#FF6B35' }} />
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
                                onClick={() => document.getElementById('restaurant-list')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
                                style={{
                                    background: 'linear-gradient(135deg, #FF6B35, #E85A24)',
                                    boxShadow: '0 4px 20px rgba(255,107,53,0.4)',
                                }}
                            >
                                Explore Now →
                            </button>
                        </div>

                        {/* Right badge */}
                        <div
                            className="shrink-0 px-8 py-6 rounded-2xl text-center"
                            style={{
                                background: 'rgba(255,107,53,0.12)',
                                border: '1px solid rgba(255,107,53,0.3)',
                            }}
                        >
                            <p className="text-5xl font-black" style={{ color: '#FF6B35' }}>50%</p>
                            <p className="text-white font-bold text-sm mt-1">OFF</p>
                            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>on your first order</p>
                            <p className="text-xs mt-1 font-mono" style={{ color: '#FF6B35' }}>Code: SAVOR50</p>
                        </div>
                    </div>
                </motion.section>

                {/* ── CATEGORY CHIPS ───────────────────────────── */}
                <div className="flex gap-2 overflow-x-auto pb-3 mb-8 scrollbar-hide">
                    {CUISINE_CHIPS.map(chip => (
                        <motion.button
                            key={chip.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveChip(chip.id)}
                            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all"
                            style={activeChip === chip.id ? {
                                background: 'linear-gradient(135deg, #FF6B35, #E85A24)',
                                color: 'white',
                                boxShadow: '0 4px 16px rgba(255,107,53,0.35)',
                            } : {
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.65)',
                            }}
                        >
                            <span>{chip.emoji}</span>
                            {chip.label}
                        </motion.button>
                    ))}
                </div>

                {/* ── RESTAURANT LIST + DEALS SIDEBAR ──────────── */}
                <div id="restaurant-list" className="grid lg:grid-cols-3 gap-8">

                    {/* Left: Restaurant grid (2 cols wide) */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-white text-xl font-bold">
                                {activeChip === 'all' ? 'Top Restaurants' : `${CUISINE_CHIPS.find(c => c.id === activeChip)?.label} Restaurants`}
                                {restaurants.length > 0 && (
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
                                    {searchQuery ? `No results for "${searchQuery}"` : 'No restaurants yet'}
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

                    {/* Right: Today's Deals + Points Banner */}
                    <div className="space-y-6">

                        {/* Today's Deals */}
                        <div>
                            <h2 className="text-white text-xl font-bold mb-5 flex items-center gap-2">
                                <Zap className="w-5 h-5" style={{ color: '#FF6B35' }} />
                                Today's Deals
                            </h2>
                            <div className="space-y-4">
                                {TODAYS_DEALS.map((deal, i) => (
                                    <motion.div
                                        key={deal.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + i * 0.1 }}
                                        className="rounded-2xl overflow-hidden cursor-pointer group transition-all hover:-translate-y-1"
                                        style={{
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                        }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,107,53,0.3)'}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'}
                                    >
                                        <div className="relative h-28 overflow-hidden">
                                            <img
                                                src={deal.imageUrl}
                                                alt={deal.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(13,5,0,0.8), transparent)' }} />
                                            <span
                                                className="absolute top-2 left-2 px-2 py-1 rounded-lg text-white text-xs font-black"
                                                style={{ background: deal.badgeColor }}
                                            >
                                                {deal.badge}
                                            </span>
                                        </div>
                                        <div className="p-3">
                                            <p className="text-white font-bold text-sm mb-1">{deal.title}</p>
                                            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{deal.restaurant}</p>
                                            <button
                                                className="w-full py-2 rounded-lg text-white font-bold text-xs transition-all hover:opacity-90"
                                                style={{ background: 'linear-gradient(135deg, #FF6B35, #E85A24)' }}
                                            >
                                                Claim Now →
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Savor Points Banner */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="p-5 rounded-2xl relative overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,107,53,0.15) 0%, rgba(255,140,0,0.08) 100%)',
                                border: '1px solid rgba(255,107,53,0.25)',
                            }}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: 'rgba(255,107,53,0.2)' }}
                                >
                                    <Gift className="w-5 h-5" style={{ color: '#FF6B35' }} />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">Refer a friend</p>
                                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                        Get Rs. 500 SavorPoints when your friend places their first order!
                                    </p>
                                    <button
                                        className="mt-3 text-xs font-bold px-4 py-2 rounded-lg text-white transition-all hover:scale-105"
                                        style={{ background: 'rgba(255,107,53,0.3)', border: '1px solid rgba(255,107,53,0.4)' }}
                                        onClick={() => navigate('/foodie/profile')}
                                    >
                                        Get Referral Link →
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Guest upsell */}
                        {isGuest && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.6 }}
                                className="p-5 rounded-2xl text-center"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                }}
                            >
                                <p className="text-2xl mb-2">🌟</p>
                                <p className="text-white font-bold text-sm mb-1">Sign up to earn points!</p>
                                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    Create a free account to track orders and earn Savor Points.
                                </p>
                                <button
                                    onClick={() => navigate('/foodie/auth')}
                                    className="w-full py-2.5 rounded-xl text-white font-bold text-sm transition-all hover:scale-105"
                                    style={{ background: 'linear-gradient(135deg, #FF6B35, #E85A24)' }}
                                >
                                    Create Account →
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>
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
