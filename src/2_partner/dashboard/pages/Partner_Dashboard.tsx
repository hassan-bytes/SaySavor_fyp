// ============================================================
// FILE: Partner_Dashboard.tsx
// SECTION: 2_partner > dashboard > pages
// PURPOSE: Pura dashboard ka layout wrapper component.
//          Sidebar, theme aur nested routes yahan handle hote hain.
//          Yeh baaki sab dashboard pages ka parent hai.
// ROUTE: /dashboard (Protected + Setup Complete required)
// ============================================================
import { useEffect, useState, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import {
    LayoutDashboard,
    UtensilsCrossed,
    Bot,
    QrCode,
    Settings,
    LogOut,
    Menu,
    X,
    User,
    Sparkles,
    Clock,
    BellRing
} from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { supabase } from '@/shared/lib/supabaseClient';
import { Tilt } from 'react-tilt';
import { toast } from 'sonner';
import { soundManager } from '@/shared/services/soundManager';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useCurrency } from '@/shared/hooks/useCurrency';

interface Profile {
    restaurant_name: string;
    full_name?: string;
    logo_url?: string;
    themeColor?: string;
}

const Partner_Dashboard = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [greeting, setGreeting] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [realtimeTrigger, setRealtimeTrigger] = useState(0);

    const [themeColor, setThemeColor] = useState('amber');
    const { language, setLanguage, isRTL, t } = useLanguage();
    const { formatPrice } = useCurrency();

    // Theme mapping to avoid Tailwind dynamic compilation issues
    const themeParams = {
        indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', mainBg: 'bg-indigo-500', mainText: 'text-indigo-500', shadow: 'shadow-indigo-500/20', lightBg: 'bg-indigo-500/20', gradient: 'from-indigo-100 to-indigo-50', gradientDeep: 'from-indigo-600 to-indigo-800', activeText: 'text-white', badgeBg: 'bg-white', badgeText: 'text-indigo-600' },
        red: { bg: 'bg-red-500', text: 'text-red-500', mainBg: 'bg-red-500', mainText: 'text-red-500', shadow: 'shadow-red-500/20', lightBg: 'bg-red-500/20', gradient: 'from-red-100 to-red-50', gradientDeep: 'from-red-600 to-red-800', activeText: 'text-white', badgeBg: 'bg-white', badgeText: 'text-red-600' },
        emerald: { bg: 'bg-emerald-500', text: 'text-emerald-500', mainBg: 'bg-emerald-500', mainText: 'text-emerald-500', shadow: 'shadow-emerald-500/20', lightBg: 'bg-emerald-500/20', gradient: 'from-emerald-100 to-emerald-50', gradientDeep: 'from-emerald-600 to-emerald-800', activeText: 'text-white', badgeBg: 'bg-white', badgeText: 'text-emerald-600' },
        amber: { bg: 'bg-amber-500', text: 'text-amber-500', mainBg: 'bg-amber-500', mainText: 'text-amber-500', shadow: 'shadow-amber-500/20', lightBg: 'bg-amber-500/20', gradient: 'from-amber-100 to-amber-50', gradientDeep: 'from-amber-600 to-amber-800', activeText: 'text-slate-900', badgeBg: 'bg-slate-900', badgeText: 'text-amber-500' },
        slate: { bg: 'bg-slate-800', text: 'text-slate-800', mainBg: 'bg-slate-800', mainText: 'text-slate-800', shadow: 'shadow-slate-800/20', lightBg: 'bg-slate-800/20', gradient: 'from-slate-200 to-slate-100', gradientDeep: 'from-slate-700 to-slate-900', activeText: 'text-white', badgeBg: 'bg-white', badgeText: 'text-slate-900' },
    } as any;

    const theme = themeParams[themeColor] || themeParams['amber'];
    const [globalPendingCount, setGlobalPendingCount] = useState(0);
    const activeOrderTotals = useRef<Record<string, number>>({});
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        fetchProfile();

        // Language Initialization from Metadata
        const initLang = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.dashboardLang) {
                setLanguage(user.user_metadata.dashboardLang as Language);
            }
        };
        initLang();

        // Timer for Clock
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [setLanguage]);

    // Greeting Logic
    useEffect(() => {
        const hour = currentTime.getHours();
        if (hour < 12) setGreeting(t('dash.morning'));
        else if (hour < 18) setGreeting(t('dash.afternoon'));
        else setGreeting(t('dash.evening'));
    }, [currentTime, t]);

    const formattedTime = currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    // Check if setup is complete
    useEffect(() => {
        const checkSetup = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Check Restaurant
            const { data: restaurant } = await supabase
                .from('restaurants')
                .select('name')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            // 2. Logic: If restaurant name is "My New Restaurant" (Default)
            if (restaurant && (restaurant as any).name === 'My New Restaurant') {
                console.warn("Restaurant setup looks incomplete (default name detected)");
            }
        };

        checkSetup();

        // Unlock audio context on any user interaction to bypass autoplay restrictions
        const unlockAudioContext = () => {
            soundManager.unlockAudio();
            document.removeEventListener('click', unlockAudioContext);
            document.removeEventListener('touchstart', unlockAudioContext);
            document.removeEventListener('keydown', unlockAudioContext);
        };

        document.addEventListener('click', unlockAudioContext);
        document.addEventListener('touchstart', unlockAudioContext);
        document.addEventListener('keydown', unlockAudioContext);

        return () => {
            document.removeEventListener('click', unlockAudioContext);
            document.removeEventListener('touchstart', unlockAudioContext);
            document.removeEventListener('keydown', unlockAudioContext);
        };
    }, []);

    // Global Realtime Order Listener
    useEffect(() => {
        if (!restaurantId) return;

        // Fetch initial open orders to populate activeOrderTotals ref
        const fetchInitialTotals = async () => {
            const { data } = await supabase
                .from('orders')
                .select('id, total_amount')
                .eq('restaurant_id', restaurantId)
                .in('status', ['pending', 'accepted', 'cooking', 'ready', 'delivered']); // Active statuses

            if (data) {
                const map: Record<string, number> = {};
                data.forEach((o: any) => map[o.id] = o.total_amount || 0);
                activeOrderTotals.current = map;
            }
        };
        fetchInitialTotals();

        const channel = supabase.channel('global-live-orders')
            .on(
                'broadcast',
                { event: 'bill_request' },
                (payload) => {
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
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    activeOrderTotals.current[payload.new.id] = payload.new.total_amount || 0;
                    setRealtimeTrigger(prev => prev + 1);

                    soundManager.playNewOrder();
                    setTimeout(() => soundManager.playNewOrder(), 1500);

                    toast(`NEW ORDER RECEIVED! ${payload.new.table_number ? `- Table ${payload.new.table_number}` : ''} 🔥`, {
                        style: { background: '#f59e0b', color: '#fff', fontSize: '1.2rem', padding: '16px' },
                        duration: 5000
                    });

                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification('🚨 New Order Alert! 🚨', {
                            body: payload.new.table_number ? `Dine-In Table ${payload.new.table_number}` : `New Delivery / Takeaway Order`,
                            icon: profile?.logo_url || '/favicon.ico',
                            requireInteraction: true
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    const previousTotal = activeOrderTotals.current[payload.new.id] || 0;
                    if (payload.new.total_amount > previousTotal) {
                        soundManager.playNewOrder();
                        setTimeout(() => soundManager.playNewOrder(), 1500);

                        toast('ADDITIONAL ITEMS ORDERED! 🍽️', {
                            style: { background: '#f59e0b', color: '#fff', fontSize: '1.2rem', padding: '16px' },
                            duration: 5000
                        });
                    }
                    // Update ref for future changes
                    activeOrderTotals.current[payload.new.id] = payload.new.total_amount || 0;
                    setRealtimeTrigger(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [restaurantId, profile?.logo_url]);

    const fetchProfile = async () => {
        try {
            // Get current user (ProtectedRoute already verified authentication)
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            // Fetch restaurant details
            const { data: restaurantData, error: restaurantError } = await supabase
                .from('restaurants')
                .select('id, name, logo_url')
                .eq('owner_id', user.id)
                .maybeSingle();

            const fullName = user.user_metadata?.full_name || 'Partner';
            const restaurantName = restaurantData ? (restaurantData as any).name : (user.user_metadata?.restaurant_name || 'My Restaurant');

            if (restaurantData) {
                setRestaurantId((restaurantData as any).id);
            }

            if (user.user_metadata?.themeColor) {
                setThemeColor(user.user_metadata.themeColor);
            }

            if (user.user_metadata?.dashboardLang) {
                // Set initial language from metadata if exists
                const metaLang = user.user_metadata.dashboardLang;
                if (metaLang === 'Urdu') setLanguage('ur');
                else if (metaLang === 'Arabic') setLanguage('ar');
                else setLanguage('en');
            }

            setProfile({
                restaurant_name: restaurantName,
                full_name: fullName,
                logo_url: restaurantData ? (restaurantData as any).logo_url : undefined,
                themeColor: user.user_metadata?.themeColor || 'amber'
            });

        } catch (error) {
            console.error('Profile fetch failed:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchGlobalPending = async () => {
            if (!restaurantId) return;
            const { count } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('restaurant_id', restaurantId)
                .eq('status', 'pending');
            if (count !== null) setGlobalPendingCount(count);
        };
        fetchGlobalPending();
    }, [restaurantId, realtimeTrigger]);

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
            navigate('/auth');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const navLinks = [
        {
            name: t('dash.overview'),
            path: '/dashboard',
            icon: LayoutDashboard
        },
        {
            name: t('dash.liveOrders'),
            path: '/dashboard/orders',
            icon: BellRing,
            badge: globalPendingCount > 0 ? globalPendingCount.toString() : undefined
        },
        {
            name: t('dash.menuManager'),
            path: '/dashboard/menu',
            icon: UtensilsCrossed
        },
        {
            name: t('dash.aiAssistant'),
            path: '/dashboard/ai',
            icon: Bot,
            badge: 'AI'
        },
        {
            name: t('dash.qrBuilder'),
            path: '/dashboard/qr',
            icon: QrCode
        },
        {
            name: t('dash.settings'),
            path: '/dashboard/settings',
            icon: Settings
        },
    ];

    const isActiveLink = (path: string) => {
        if (path === '/dashboard') {
            return location.pathname === '/dashboard';
        }
        return location.pathname.startsWith(path);
    };

    const isRtl = isRTL;

    if (loading) {
        return (
            <div className={`min-h-screen ${isDarkMode ? 'dark' : ''} bg-[var(--dash-bg)] flex items-center justify-center`}>
                <div className="text-slate-400 animate-pulse">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen transition-colors duration-500 partner-dashboard ${isDarkMode ? 'dark' : ''} bg-[var(--dash-bg)]`} onClick={() => soundManager.unlockAudio()} dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 glass-panel border-b border-white/10 text-white z-50 px-4 py-3 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-[var(--primary)] neon-text-primary">SaySavor</span>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar - Exact Stitch Match */}
            <aside
                className={`
                    fixed top-0 ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} 
                    h-screen w-64 flex-shrink-0 flex flex-col z-40 glass-panel border-[var(--border-dark)] transition-all duration-300
                    ${isOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0')}
                `}
            >
                <div className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-yellow-600 p-[2px] shadow-[0_0_15px_rgba(244,175,37,0.3)] shrink-0">
                        {profile?.logo_url ? (
                            <img
                                src={profile.logo_url}
                                className="w-full h-full rounded-full object-cover border-2 border-[var(--dash-bg)]"
                                alt="Logo"
                            />
                        ) : (
                            <div className="w-full h-full rounded-full bg-[var(--background-dark)] flex items-center justify-center border-2 border-[var(--dash-bg)]">
                                <User className="text-[var(--primary)]" size={20} />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h1 className="text-white text-lg font-bold leading-tight tracking-wide truncate">
                            {profile?.restaurant_name || 'Luxe Partner'}
                        </h1>
                        <p className="text-[var(--primary)] text-xs font-medium uppercase tracking-widest opacity-80">
                            {t('dash.adminPortal')}
                        </p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const active = isActiveLink(link.path);

                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    flex items-center gap-4 px-4 py-3 rounded-xl transition-all group relative
                                    ${active
                                        ? 'bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_15px_rgba(244,175,37,0.15)]'
                                        : 'text-slate-400 hover:bg-[var(--surface-dark-hover)] hover:text-white'
                                    }
                                `}
                            >
                                <Icon
                                    size={22}
                                    className={`transition-colors duration-300 ${active ? 'text-[var(--primary)]' : 'group-hover:text-[var(--primary)]'}`}
                                />
                                <span className={`text-sm tracking-wide ${active ? 'font-semibold' : 'font-medium'}`}>
                                    {link.name}
                                </span>
                                {link.badge && (
                                    <span className={`
                                        ml-auto flex items-center justify-center
                                        ${link.badge === 'AI'
                                            ? 'px-1.5 py-[2px] rounded-full bg-[var(--primary)]/20 text-[var(--primary)] text-[9px] font-bold border border-[var(--primary)]/30'
                                            : 'w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                                        }
                                    `}>
                                        {link.badge === 'AI' ? 'AI' : ''}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-red-500 font-bold hover:bg-red-500/10 transition-all active:scale-95 group"
                    >
                        <div className="p-2.5 rounded-xl bg-red-500/10 group-hover:bg-red-500 group-hover:text-white transition-all shadow-lg shadow-red-500/10">
                            <LogOut size={20} />
                        </div>
                        <span className="tracking-wide">
                            {t('dash.signOut')}
                        </span>
                    </button>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <main className={`${isRtl ? 'lg:mr-64' : 'lg:ml-64'} min-h-screen pt-16 lg:pt-0 transition-all duration-300`}>
                <div className="p-6 lg:p-8">
                    <Outlet context={{ greeting, formattedTime, profile, realtimeTrigger, theme, dashboardLang: language, refreshProfile: fetchProfile }} />
                </div>
            </main>
        </div>
    );
};

// --- Components for Dashboard Overview ---

const StatsCard = ({ title, value, subtext, icon: Icon, trend, theme }: any) => {
    const defaultTheme = { mainText: 'text-amber-600', gradient: 'from-amber-100 to-amber-50' };
    const safeTheme = theme || defaultTheme;
    const defaultOptions = {
        reverse: false,  // reverse the tilt direction
        max: 25,     // max tilt rotation (degrees)
        perspective: 1000,   // Transform perspective, the lower the more extreme the tilt gets.
        scale: 1.02,   // 2 = 200%, 1.5 = 150%, etc..
        speed: 1000,   // Speed of the enter/exit transition
        transition: true,   // Set a transition on enter/exit.
        axis: null,   // What axis should be disabled. Can be X or Y.
        reset: true,   // If the tilt effect has to be reset on exit.
        easing: "cubic-bezier(.03,.98,.52,.99)",    // Easing on enter/exit.
    }

    return (
        <Tilt options={defaultOptions} className="h-full">
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-300 group h-full relative overflow-hidden">
                {/* Glass Reflection Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-50 pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 bg-gradient-to-br ${safeTheme.gradient || 'from-amber-100 to-amber-50'} rounded-xl shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className={`${safeTheme.mainText || 'text-amber-600'} drop-shadow-sm`} size={24} />
                        </div>
                        {trend !== null && (
                            <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm border border-white/50 ${trend > 0 ? 'bg-green-100/80 text-green-700' : 'bg-red-100/80 text-red-700'
                                }`}>
                                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                            </span>
                        )}
                    </div>
                    <h3 className="text-slate-500 text-sm font-semibold tracking-wide uppercase">{title}</h3>
                    <p className="text-4xl font-extrabold text-slate-900 mt-2 tracking-tight drop-shadow-sm">{value}</p>
                    {subtext && <p className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        {subtext}
                    </p>}
                </div>
            </div>
        </Tilt>
    );
};

const ActivityItem = ({ title, time, type, theme }: { title: string, time: string, type: 'order' | 'system' | 'review', theme?: any }) => {
    const style = {
        order: { icon: UtensilsCrossed, color: theme?.mainText || 'text-amber-600', bg: theme?.lightBg || 'bg-amber-100', border: 'border-white' },
        system: { icon: Settings, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-white' },
        review: { icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-white' }
    }[type];
    const Icon = style.icon;

    return (
        <div className="relative pl-8 pb-6 last:pb-0 group">
            <div className={`absolute left-0 top-1 w-8 h-8 rounded-full border-2 ${style.border} ${style.bg} flex items-center justify-center z-10 shadow-md group-hover:scale-110 transition-transform duration-200`}>
                <Icon className={style.color} size={14} />
            </div>
            <div className="flex flex-col p-3 rounded-lg hover:bg-slate-50/50 transition-colors">
                <p className="text-sm font-bold text-slate-800">{title}</p>
                <p className="text-xs text-slate-500 font-medium">{time}</p>
            </div>
        </div>
    );
};

export const DashboardOverview = () => {
    // Read the global context passed by Partner_Dashboard Outlet wrapper
    const { greeting: ctxGreeting, profile, theme } = useOutletContext<any>() || {};

    const [isOnline, setIsOnline] = useState(true);
    const [stats, setStats] = useState({
        revenue: 0,
        totalOrders: 0,
        activeOrders: 0,
        views: 0,
        avgPrepTime: '0m'
    });
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(false); // New Demo Mode State
    const [isAdmin, setIsAdmin] = useState(false); // Admin State

    // We need to fetch profile/greeting info again here or pass it via context/props if structured differently.
    // For now, let's re-use the context from Outlet if possible, but DashboardOverview is a component used inside Outlet.
    // To keep it simple and self-contained, I will add the time/greeting logic here as well for the specific header part.
    const [currentTime, setCurrentTime] = useState(new Date());
    const [greeting, setGreeting] = useState('');
    const [userName, setUserName] = useState('Partner');

    useEffect(() => {
        // Timer for Clock
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Greeting Logic
    useEffect(() => {
        const hour = currentTime.getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, [currentTime]);

    const formattedTime = currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    // Moved fetchDashboardData to component scope for toggle access
    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            // 1. Get User/Restaurant ID
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (user.user_metadata?.full_name) {
                setUserName(user.user_metadata.full_name);
            }

            // Admin Logic
            if (user.email === 'hassansajid098@gmail.com') setIsAdmin(true);

            const { data: restaurant } = await supabase
                .from('restaurants')
                .select('id, is_open')
                .eq('owner_id', user.id)
                .single();

            if (restaurant) {
                setIsOnline((restaurant as any).is_open || false);

                let fetchedRevenue = 0;
                let fetchedTotalOrders = 0;
                let fetchedActiveOrders = 0;

                // 2. Try RPC first (The "Accountant")
                const { data: rpcData, error: rpcError } = await (supabase as any)
                    .rpc('get_dashboard_stats', { p_restaurant_id: (restaurant as any).id });

                if (rpcError) {
                    console.error("RPC Error Details:", rpcError);
                }

                if (!rpcError && rpcData) {
                    fetchedRevenue = (rpcData as any).revenue;
                    fetchedTotalOrders = (rpcData as any).total_orders;
                    fetchedActiveOrders = (rpcData as any).active_orders;
                } else {
                    // Fallback: Manual Calculation
                    const today = new Date().toISOString().split('T')[0];

                    const { data: todayOrders } = await supabase
                        .from('orders')
                        .select('total_amount, status')
                        .eq('restaurant_id', (restaurant as any).id)
                        .gte('created_at', today);

                    const validOrders = (todayOrders as any[])?.filter(o => o.status !== 'cancelled') || [];
                    fetchedRevenue = validOrders.reduce((sum, order) =>
                        order.status === 'delivered' ? sum + order.total_amount : sum, 0);
                    fetchedTotalOrders = validOrders.length;

                    const { count: activeCount } = await supabase
                        .from('orders')
                        .select('*', { count: 'exact', head: true })
                        .eq('restaurant_id', (restaurant as any).id)
                        .in('status', ['pending', 'cooking']);
                    fetchedActiveOrders = activeCount || 0;
                }

                // --- SMART DEMO MODE LOGIC ---
                // Only activate if explicitly toggled (for admin) or if logic reimplemented
                // We use the state 'isDemoMode' which is toggled by the UI
                if (isDemoMode) {
                    setStats({
                        revenue: 45200, // Demo Revenue
                        totalOrders: 12, // Demo Orders
                        activeOrders: 3, // Demo Active
                        views: 142,
                        avgPrepTime: '18m'
                    });
                    setActivities([
                        { title: "New Order #1024 (2x Zinger)", time: "Just now", type: 'order' },
                        { title: "New Order #1023 (1x Pizza)", time: "15 mins ago", type: 'order' },
                        { title: "Menu Updated: 'Beef Burger'", time: "1 hour ago", type: 'system' },
                        { title: "New 5★ Review received", time: "2 hours ago", type: 'review' },
                        { title: "Order #1022 Delivered", time: "3 hours ago", type: 'system' },
                    ]);
                } else {
                    // Real Data Exists
                    setStats(prev => ({
                        ...prev,
                        revenue: fetchedRevenue,
                        totalOrders: fetchedTotalOrders,
                        activeOrders: fetchedActiveOrders,
                        avgPrepTime: '24m' // Hardcoded for now until we have real prep time logic
                    }));

                    // Fetch Real Recent Activity
                    const { data: recentOrders } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('restaurant_id', (restaurant as any).id)
                        .order('created_at', { ascending: false })
                        .limit(5);

                    if (recentOrders && (recentOrders as any[]).length > 0) {
                        const formattedActivity = (recentOrders as any[]).map(order => ({
                            title: `Order #${order.id.slice(0, 4)} (${order.total_amount})`,
                            time: new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            type: 'order'
                        }));
                        setActivities(formattedActivity);
                    } else {
                        // Reset if no recent data
                        setActivities([]);
                    }
                }
            }
        } catch (error) {
            console.error("Dashboard Error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch Initial Data on Mount and when Demo Mode Changes
    useEffect(() => {
        fetchDashboardData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDemoMode]); // Re-fetch when demo mode is toggled

    useEffect(() => {

        // 4. Realtime Subscription (The "Phone Line")
        const subscription = supabase
            .channel('dashboard-orders')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
                // Play Sound
                const audio = new Audio('/sounds/notification.mp3');
                audio.play().catch(e => console.log("Audio play failed", e));

                // If we were in demo mode, switch to real mode on first order
                setIsDemoMode(false);

                // Update Stats (Simplistic increment for now, ideally re-fetch)
                setStats(prev => ({
                    ...prev,
                    totalOrders: prev.totalOrders + 1,
                    activeOrders: prev.activeOrders + 1
                }));

                // Update Feed
                const newActivity = {
                    title: `New Order #${payload.new.id.slice(0, 4)}`,
                    time: 'Just now',
                    type: 'order'
                };
                setActivities(prev => [newActivity, ...prev.slice(0, 4)]);
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Toggle Status Handler
    const toggleStatus = async () => {
        const newStatus = !isOnline;
        setIsOnline(newStatus); // Optimistic Update

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await (supabase as any)
                .from('restaurants')
                .update({ is_open: newStatus })
                .eq('owner_id', user.id);
        }
    };

    const statCards = [
        { title: "Today's Revenue", value: formatPrice(stats.revenue), subtext: `${stats.totalOrders} Orders today`, icon: LayoutDashboard, trend: isDemoMode ? 12 : null },
        { title: "Active Orders", value: stats.activeOrders.toString(), subtext: "In Kitchen timeline", icon: UtensilsCrossed, trend: null },
        { title: "Total Views", value: stats.views.toString(), subtext: "Menu visits today", icon: User, trend: isDemoMode ? 5 : 0 },
        { title: "Avg. Prep Time", value: stats.avgPrepTime, subtext: "Last 5 orders", icon: Bot, trend: isDemoMode ? -2 : 0 },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700 relative min-h-screen pb-20">
            {/* Ambient Background Orbs */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-200/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-200/20 rounded-full blur-[100px] animate-pulse delay-700"></div>
            </div>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 backdrop-blur-lg p-6 rounded-3xl border border-white/50 shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent pointer-events-none"></div>

                <div className="relative z-10 flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            {greeting}, {userName} <span className="inline-block animate-bounce">👋</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-4 text-slate-500 font-medium text-sm">
                        <span className="flex items-center gap-1.5 bg-white/50 px-3 py-1 rounded-full border border-slate-200/50 shadow-sm">
                            <Clock size={14} className="text-amber-500" />
                            <span className="text-slate-700 font-bold tracking-wide">{formattedTime}</span>
                        </span>
                        <span className="hidden sm:inline">|</span>
                        <span className="hidden sm:inline">Here's what's happening in your restaurant today.</span>
                        {isDemoMode && (
                            <span className="px-2 py-0.5 bg-amber-100/80 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200 animate-pulse ml-2">
                                DEMO MODE
                            </span>
                        )}
                    </div>
                </div>

                {/* Status Toggle & Demo Switch */}
                <div className="flex items-center gap-4">
                    {isAdmin && (
                        <div className="flex items-center gap-2 bg-purple-900/20 px-3 py-1.5 rounded-full border border-purple-500/30 backdrop-blur-md">
                            <span className="text-purple-400 text-xs font-bold uppercase tracking-wider">Demo</span>
                            <div
                                onClick={() => {
                                    const newMode = !isDemoMode;
                                    setIsDemoMode(newMode);
                                    if (newMode) {
                                        fetchDashboardData(); // Reload to apply demo data overrides
                                    } else {
                                        fetchDashboardData(); // Reload to fetch real data
                                    }
                                }}
                                className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors duration-300 ${isDemoMode ? 'bg-purple-500' : 'bg-zinc-600'}`}
                            >
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${isDemoMode ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                        </div>
                    )}

                    <div
                        onClick={toggleStatus}
                        className={`
                        relative z-10 cursor-pointer flex items-center gap-4 px-2 py-2 pr-6 rounded-full transition-all duration-500 border-2
                        ${isOnline
                                ? 'bg-green-50/80 border-green-200 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                                : 'bg-slate-50/80 border-slate-200 shadow-inner'
                            }
                        backdrop-blur-md group
                    `}
                    >
                        <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-500 transform
                        ${isOnline ? 'bg-gradient-to-br from-green-400 to-green-600 translate-x-0 rotate-0' : 'bg-gradient-to-br from-slate-300 to-slate-500 translate-x-0 rotate-180'}
                    `}>
                            <div className={`w-4 h-4 bg-white/90 rounded-full shadow-inner ${isOnline ? 'animate-pulse' : ''}`} />
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-base font-bold tracking-wide transition-colors ${isOnline ? 'text-green-700' : 'text-slate-500'}`}>
                                {isOnline ? 'ON AIR' : 'OFFLINE'}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-500 transition-colors">
                                {isOnline ? 'Accepting Orders' : 'Store Closed'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid with Tilt */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, idx) => (
                    <StatsCard key={idx} {...stat} />
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Activity & Graphs (2/3 width) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Quick Actions */}
                    <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/40 shadow-xl">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <span className="bg-amber-100 p-2 rounded-lg"><Sparkles className="text-amber-500" size={18} /></span>
                                Quick Actions
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                            <Link to="/dashboard/menu" className="p-6 bg-gradient-to-b from-white to-slate-50 hover:to-amber-50 rounded-2xl text-center transition-all duration-300 group border border-slate-200 hover:border-amber-300 shadow-sm hover:shadow-xl transform hover:-translate-y-1">
                                <div className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <UtensilsCrossed className="text-amber-500" size={28} />
                                </div>
                                <span className="text-base font-bold text-slate-800 block mb-1">Add Dish</span>
                                <span className="text-xs text-slate-500 font-medium">Update Menu</span>
                            </Link>
                            <Link to="/dashboard/qr" className="p-6 bg-gradient-to-b from-white to-slate-50 hover:to-amber-50 rounded-2xl text-center transition-all duration-300 group border border-slate-200 hover:border-amber-300 shadow-sm hover:shadow-xl transform hover:-translate-y-1">
                                <div className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <QrCode className="text-amber-500" size={28} />
                                </div>
                                <span className="text-base font-bold text-slate-800 block mb-1">QR Code</span>
                                <span className="text-xs text-slate-500 font-medium">Print & Share</span>
                            </Link>
                            <Link to="/dashboard/settings" className="p-6 bg-gradient-to-b from-white to-slate-50 hover:to-amber-50 rounded-2xl text-center transition-all duration-300 group border border-slate-200 hover:border-amber-300 shadow-sm hover:shadow-xl transform hover:-translate-y-1">
                                <div className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Settings className="text-amber-500" size={28} />
                                </div>
                                <span className="text-base font-bold text-slate-800 block mb-1">Settings</span>
                                <span className="text-xs text-slate-500 font-medium">Manage Shop</span>
                            </Link>
                            <button className="p-6 bg-gradient-to-b from-white to-slate-50 hover:to-amber-50 rounded-2xl text-center transition-all duration-300 group border border-slate-200 hover:border-amber-300 shadow-sm hover:shadow-xl transform hover:-translate-y-1">
                                <div className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Bot className="text-amber-500" size={28} />
                                </div>
                                <span className="text-base font-bold text-slate-800 block mb-1">Ask AI</span>
                                <span className="text-xs text-slate-500 font-medium">Get Insights</span>
                            </button>
                        </div>
                    </div>

                    {/* Revenue Graph Placeholder */}
                    <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/40 shadow-xl min-h-[350px] flex items-center justify-center relative overflow-hidden group">
                        <div className="text-center z-10 relative">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Revenue Analytics</h3>
                            <p className="text-slate-500 text-sm mb-6">Weekly Performance Chart</p>
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 px-4 py-1.5 text-sm">Phase 4 Coming Soon</Badge>
                        </div>
                        <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px]"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-48 opacity-10 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-700">
                            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full text-amber-500 fill-current">
                                <path d="M0 20 L0 10 Q20 5 40 12 T80 8 T100 15 L100 20 Z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Right Column: Live Feed (1/3 width) */}
                <div className="space-y-6">
                    <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/40 shadow-xl h-full flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                </span>
                                Live Feed
                            </h2>
                            <button className="text-xs text-amber-700 font-bold hover:underline bg-amber-50 px-3 py-1 rounded-full">View All</button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {loading ? (
                                <p className="text-sm text-slate-400 text-center py-10 animate-pulse">Listening for orders...</p>
                            ) : activities.length > 0 ? (
                                <div className="space-y-2 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200/50">
                                    {activities.map((act, i) => (
                                        <ActivityItem key={i} {...act} />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 text-center py-10">No recent activity.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Partner_Dashboard;
