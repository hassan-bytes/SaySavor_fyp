// ============================================================
// FILE: RestaurantDetail.tsx
// SECTION: 3_customer > pages
// PURPOSE: Restaurant detail view (Menu + Cart interaction).
//          Design: Cinematic parallax header + Glassmorphism menu list.
// ROUTE: /foodie/restaurant/:id
// ============================================================
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, Star, Clock,
    Plus, ShoppingCart, Search,
    Share2, Heart,
    Loader2, MapPin
} from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';
import { useCart } from '@/3_customer/context/CartContext';
import { useCustomerLocation } from '@/3_customer/hooks/useCustomerLocation';
import type { MenuItem } from '@/shared/types/menu';
import { COUNTRY_CURRENCIES } from '@/shared/lib/currencyUtils';

// ── Types ─────────────────────────────────────────────────────
interface RestaurantInfo {
    id: string;
    name: string;
    description: string | null;
    logo_url: string | null;
    currency: string | null;
    city: string | null;
    rating: number | null;
    delivery_time_min: number | null;
    min_order: number | null;
    cuisine_types: string[];
    is_open: boolean | null;
}

// ── Menu Item Card ──────────────────────────────────────────
const MenuItemCard: React.FC<{ 
    item: MenuItem; 
    onAdd: (item: MenuItem) => void;
    delay: number;
    formatPrice: (price: number) => string;
}> = ({ item, onAdd, delay, formatPrice }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className="flex items-center gap-4 p-4 rounded-2xl transition-all group hover:scale-[1.01]"
            style={{ 
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)'
            }}
        >
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-bold group-hover:text-orange-400 transition-colors">
                        {item.name}
                    </h4>
                </div>
                {item.description && (
                    <p className="text-xs text-white/50 line-clamp-2 mb-3 leading-relaxed">
                        {item.description}
                    </p>
                )}
                <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-orange-400">{formatPrice(item.price)}</span>
                    <button
                        onClick={() => onAdd(item)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500 text-white shadow-lg shadow-orange-500/20 active:scale-90 transition-transform"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            {/* Food Image */}
            <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10 group-hover:border-orange-500/30 transition-colors">
                {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🍲</div>
                )}
            </div>
        </motion.div>
    );
};

// ── Main Component ─────────────────────────────────────────────
const RestaurantDetail: React.FC = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const tableNo = searchParams.get('table');
    const navigate = useNavigate();
    const { addToCart, cartItems, totalAmount, totalCount, setTableNumber } = useCart();
    const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
    const [menuCategories, setMenuCategories] = useState<{name: string, items: MenuItem[]}[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const refreshTimeoutRef = useRef<number | null>(null);

    const allMenuItems = useMemo(
        () => menuCategories.flatMap((cat) => cat.items),
        [menuCategories]
    );

    const quickPicks = useMemo(() => {
        return [...allMenuItems]
            .sort((a, b) => {
                if (a.price !== b.price) return a.price - b.price;
                return a.name.localeCompare(b.name);
            })
            .slice(0, 8);
    }, [allMenuItems]);

    const {
        location,
        status: locationStatus,
        error: locationError,
        requestLocation,
    } = useCustomerLocation();
    const isLocationReady = Boolean(location && locationStatus === 'ready');

    const scrollRef = useRef<HTMLDivElement>(null);
    const { scrollY } = useScroll();
    const headerBlur = useTransform(scrollY, [0, 200], [0, 20]);
    const headerOpacity = useTransform(scrollY, [0, 200], [1, 0.5]);
    const headerScale = useTransform(scrollY, [0, 200], [1, 1.1]);

    useEffect(() => {
        if (tableNo) {
            setTableNumber(tableNo);
        } else {
            setTableNumber(null);
        }
    }, [tableNo, setTableNumber]);

    useEffect(() => {
        if (!id) return;
        if (!isLocationReady) return;
        void fetchRestaurantData();
    }, [id, isLocationReady]);

    useEffect(() => {
        if (!location && locationStatus === 'idle') {
            requestLocation();
        }
    }, [location, locationStatus, requestLocation]);

    const fetchRestaurantData = useCallback(async (background: boolean = false) => {
        if (!background) {
            setLoading(true);
        }
        setError(null);
        try {
            // 1. Restaurant Info
            const { data: resData, error: resError } = await supabase
                .from('restaurants')
                .select('*')
                .eq('id', id)
                .single();

            if (resError) throw resError;
            if (!resData) throw new Error('Restaurant not found');
            
            const r = resData as any;
            const cuisines = Array.isArray(r.cuisine_type)
                ? r.cuisine_type
                : (Array.isArray(r.cuisine_types) ? r.cuisine_types : []);

            setRestaurant({
                id: r.id,
                name: r.name,
                description: r.description,
                logo_url: r.logo_url,
                currency: r.currency || 'PKR',
                city: r.city,
                rating: typeof r.rating === 'number' ? r.rating : null,
                delivery_time_min: typeof r.delivery_time_min === 'number' ? r.delivery_time_min : null,
                min_order: typeof r.min_order === 'number' ? r.min_order : null,
                cuisine_types: cuisines,
                is_open: typeof r.is_open === 'boolean' ? r.is_open : null,
            });

            // 2. Fetch Menu Categories & Items
            const { data: catData, error: catError } = await supabase
                .from('categories')
                .select('id, name, sort_order')
                .eq('restaurant_id', id)
                .order('sort_order', { ascending: true });

            if (catError) throw catError;

            const { data: itemData, error: itemError } = await supabase
                .from('menu_items')
                .select('*')
                .eq('restaurant_id', id)
                .eq('is_available', true)
                .order('created_at', { ascending: false });

            if (itemError) throw itemError;

            const typedItems = (itemData || []) as MenuItem[];
            const typedCats = (catData || []) as {id: string, name: string}[];

            const grouped = typedCats.map(cat => ({
                name: cat.name,
                items: typedItems.filter(item => item.category_id === cat.id)
            })).filter(g => g.items.length > 0);

            // Add uncategorized if any
            const uncategorized = typedItems.filter(item => !item.category_id);
            if (uncategorized.length > 0) {
                grouped.push({ name: 'Others', items: uncategorized });
            }

            setMenuCategories(grouped);
            if (grouped.length > 0) setActiveTab(grouped[0].name);
            setError(null);

        } catch (err: any) {
            console.error('Error fetching restaurant detail:', err);
            setError(err.message || 'Failed to load restaurant details');
        } finally {
            if (!background) {
                setLoading(false);
            }
        }
    }, [id]);

    const scheduleBackgroundRefresh = useCallback((delayMs: number = 250) => {
        if (refreshTimeoutRef.current !== null) {
            window.clearTimeout(refreshTimeoutRef.current);
        }

        refreshTimeoutRef.current = window.setTimeout(() => {
            void fetchRestaurantData(true);
        }, delayMs);
    }, [fetchRestaurantData]);

    useEffect(() => {
        if (!id) return;

        const channel = supabase
            .channel(`restaurant-detail-live-${id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'restaurants',
                filter: `id=eq.${id}`,
            }, () => {
                scheduleBackgroundRefresh();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'categories',
                filter: `restaurant_id=eq.${id}`,
            }, () => {
                scheduleBackgroundRefresh();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'menu_items',
                filter: `restaurant_id=eq.${id}`,
            }, () => {
                scheduleBackgroundRefresh();
            })
            .subscribe();

        return () => {
            if (refreshTimeoutRef.current !== null) {
                window.clearTimeout(refreshTimeoutRef.current);
            }
            void supabase.removeChannel(channel);
        };
    }, [id, scheduleBackgroundRefresh]);

    if (!isLocationReady) {
        return (
            <div className="min-h-screen bg-[#0d0500] flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                        <MapPin className="w-6 h-6" style={{ color: '#FF6B35' }} />
                    </div>
                    <h2 className="text-xl font-bold text-white mt-4">Enable location to view menu</h2>
                    <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Allow location access to see dishes near you within 5-10 km.
                    </p>
                    <button
                        onClick={requestLocation}
                        disabled={locationStatus === 'loading'}
                        className="mt-5 w-full px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #FF6B35, #E85A24)' }}
                    >
                        {locationStatus === 'loading' ? 'Locating...' : 'Enable Location'}
                    </button>
                    {locationError && (
                        <p className="text-[10px] mt-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{locationError}</p>
                    )}
                    <button
                        onClick={() => navigate('/foodie/home')}
                        className="mt-4 text-xs font-semibold"
                        style={{ color: '#FF6B35' }}
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d0500] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                    <p className="text-white/40 font-bold tracking-widest text-xs uppercase">Loading Savor Menu...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0d0500] flex flex-col items-center justify-center p-6 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-white mb-2">{error}</h2>
                <p className="text-white/50 mb-6">Unable to load restaurant details</p>
                <button
                    onClick={() => navigate('/foodie/home')}
                    className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    if (!restaurant) {
        return (
            <div className="min-h-screen bg-[#0d0500] flex flex-col items-center justify-center p-6 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-2xl font-bold text-white mb-2">Restaurant not found</h2>
                <p className="text-white/50 mb-6">The restaurant you're looking for doesn't exist</p>
                <button
                    onClick={() => navigate('/foodie/home')}
                    className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    const savedCurrency = restaurant.currency || 'PKR';
    const currencyInfo = Object.values(COUNTRY_CURRENCIES).find(
        c => c.code === savedCurrency
    ) ?? Object.values(COUNTRY_CURRENCIES).find(
        c => c.code === 'PKR'
    );
    const currencySymbol = currencyInfo?.symbol ?? 'PKR';

    const formatPrice = (price: number): string => {
        return `${currencySymbol}\u00A0${price.toLocaleString('en', {
            maximumFractionDigits: 0
        })}`;
    };

    const cuisineLabel = restaurant.cuisine_types?.[0] || 'Restaurant';

    return (
        <div className="min-h-screen bg-[#0d0500] text-white">
            
            {/* ── STICKY HEADER ACTIONS ── */}
            <div className="fixed top-0 left-0 right-0 z-50 p-4 flex items-center justify-between pointer-events-none">
                <button 
                    onClick={() => navigate(-1)}
                    className="p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white pointer-events-auto active:scale-95 transition-transform"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-2 pointer-events-auto">
                    <button className="p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white active:scale-95 transition-transform">
                        <Search className="w-5 h-5" />
                    </button>
                    <button className="p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white active:scale-95 transition-transform">
                        <Share2 className="w-5 h-5" />
                    </button>
                    <button className="p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white active:scale-95 transition-transform">
                        <Heart className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* ── HERO PARALLAX SECTION ── */}
            <div className="relative h-[45vh] overflow-hidden">
                <motion.div 
                    style={{ scale: headerScale, opacity: headerOpacity }}
                    className="absolute inset-0"
                >
                    {restaurant.logo_url ? (
                        <img 
                            src={restaurant.logo_url} 
                            alt={restaurant.name} 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/20 via-[#0d0500] to-[#0d0500]">
                            <span className="text-6xl">🍽️</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0500] via-[#0d0500]/40 to-transparent" />
                </motion.div>

                <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="max-w-4xl mx-auto">
                            <div className="flex items-center gap-2 mb-2">
                                {restaurant.is_open !== null && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${restaurant.is_open ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                     {restaurant.is_open ? 'OPEN' : 'CLOSED'}
                                  </span>
                                )}
                                <span className="text-white/40 text-xs font-bold uppercase tracking-wider">{cuisineLabel}{restaurant.city ? ` • ${restaurant.city}` : ''}</span>
                            </div>
                        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">{restaurant.name}</h1>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
                            {restaurant.rating !== null && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
                                    <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
                                    <span>{restaurant.rating}</span>
                                </div>
                            )}
                            {restaurant.delivery_time_min !== null && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
                                    <Clock className="w-4 h-4 text-orange-400" />
                                    <span>{restaurant.delivery_time_min} mins</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── MENU CONTENT ── */}
            <div className="max-w-4xl mx-auto px-6 py-8">
                
                {/* Search Menu */}
                <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input 
                        type="text" 
                        placeholder="Search for dishes..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-orange-500/50 outline-none transition-all placeholder:text-white/20"
                    />
                </div>

                {quickPicks.length > 0 && (
                    <section className="mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white/70">Quick Picks</h3>
                            <p className="text-[10px] text-white/40">Fast add for top value items</p>
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                            {quickPicks.map((item) => (
                                <div
                                    key={`quick-${item.id}`}
                                    className="snap-start shrink-0 w-[220px] rounded-2xl border border-white/10 bg-white/5 p-3"
                                >
                                    <div className="h-24 rounded-xl overflow-hidden bg-white/5 border border-white/10 mb-3">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-2xl">🍲</div>
                                        )}
                                    </div>

                                    <p className="text-white text-sm font-bold truncate">{item.name}</p>
                                    <p className="text-orange-400 text-xs font-black mt-1">{formatPrice(item.price)}</p>

                                    <button
                                        onClick={() => addToCart({ menuItem: item, quantity: 1 })}
                                        className="mt-3 w-full h-9 rounded-xl bg-orange-500 text-white text-xs font-black uppercase tracking-wider"
                                    >
                                        Quick Add
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Categories Tab Bar (Sticky) */}
                <div className="sticky top-20 z-40 flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
                    {menuCategories.map(cat => (
                        <button
                            key={cat.name}
                            onClick={() => {
                                setActiveTab(cat.name);
                                document.getElementById(cat.name)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className={`shrink-0 px-6 py-3 rounded-2xl text-sm font-bold transition-all ${
                                activeTab === cat.name 
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                                : 'bg-white/5 border border-white/10 text-white/60 hover:border-white/20'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Menu Listings */}
                <div className="space-y-12 pb-32">
                    {menuCategories.map(cat => {
                        const filteredItems = cat.items.filter(item => 
                            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
                        );

                        if (filteredItems.length === 0 && searchQuery) return null;

                        return (
                            <div key={cat.name} id={cat.name} className="scroll-mt-40">
                                <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                                    {cat.name}
                                    <div className="h-px flex-1 bg-white/10" />
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {filteredItems.map((item, i) => (
                                        <MenuItemCard 
                                            key={item.id} 
                                            item={item} 
                                            delay={i * 0.05}
                                            formatPrice={formatPrice}
                                            onAdd={(it) => addToCart({
                                                menuItem: it,
                                                quantity: 1
                                            })} 
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── FLOATING VIEW CART BAR ── */}
            <AnimatePresence>
                {totalCount > 0 && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-50"
                    >
                        <button 
                            onClick={() => navigate('/foodie/cart')}
                            className="w-full p-4 rounded-3xl bg-orange-500 text-white flex items-center justify-between shadow-2xl shadow-orange-500/40 active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase opacity-70 tracking-wider">You're ordering from</p>
                                    <p className="text-sm font-black">{restaurant.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-xs font-black">View Cart</p>
                                    <p className="text-[10px] opacity-70">{totalCount} Item{totalCount > 1 ? 's' : ''} • {formatPrice(totalAmount)}</p>
                                </div>
                                <ArrowLeft className="w-5 h-5 rotate-180" />
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default RestaurantDetail;
