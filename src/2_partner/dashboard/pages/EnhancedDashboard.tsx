// ============================================================
// FILE: EnhancedDashboard.tsx
// SECTION: 2_partner > dashboard > pages
// PURPOSE: Dashboard ka overview / home screen.
//          Analytics, quick stats aur recent activity dikhata hai.
//          Supabase se real-time data aata hai.
// ROUTE: /dashboard (index)
// ============================================================
// ==============================================
// ENHANCED DASHBOARD OVERVIEW WITH ANALYTICS
// ==============================================
// This component replaces the existing DashboardOverview
// Import this to use the new dashboard with all management features

import { useEffect, useState, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabaseClient';
import { toast } from 'sonner';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { RevenueChart, OrderVolumeChart, PeakHoursChart } from '@/2_partner/dashboard/components/Charts';
import { TimeRangeFilter, TopItemsGrid, StatusSummaryCard, RatingCard, type TimeRange } from '@/2_partner/dashboard/components/DashboardComponents';
import { QuickActionsBar } from '@/2_partner/dashboard/components/QuickActions';
import { soundManager } from '@/shared/services/soundManager';
import {
    Clock,
    DollarSign,
    TrendingUp,
    Package,
    LayoutDashboard,
    MoreHorizontal,
    Star,
    AlertCircle,
    ChevronDown
} from 'lucide-react';

export const EnhancedDashboardOverview = () => {
    // Time Range State
    const [timeRange, setTimeRange] = useState<TimeRange>('24h');
    const [loading, setLoading] = useState(true);

    // Currency Hook
    const { formatPrice } = useCurrency();

    // User Info
    const [userName, setUserName] = useState('Partner');
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    // Stats State  
    const [stats, setStats] = useState({
        totalRevenue: 0,
        revenueTrend: 0, // percentage change
        totalOrders: 0,
        ordersTrend: 0,
        activeOrders: 0
    });

    // Chart Data
    const [revenueData, setRevenueData] = useState<Array<{ time: string; revenue: number }>>([]);
    const [orderVolumeData, setOrderVolumeData] = useState<Array<{ time: string; pending: number; cooking: number; delivered: number }>>([]);
    const [peakHoursData, setPeakHoursData] = useState<Array<{ hour: number; orders: number }>>([]);

    // Top Items
    const [topItems, setTopItems] = useState<Array<{ id: string; name: string; image: string; orders: number; revenue: number }>>([]);

    // Summary
    const [ordersByStatus, setOrdersByStatus] = useState({ pending: 0, cooking: 0, delivered: 0, cancelled: 0 });
    const [reviews, setReviews] = useState({ count: 0, avgRating: 0 });

    // Demo Mode
    const [isDemoMode, setIsDemoMode] = useState(false);

    // Time & Greeting
    const [currentTime, setCurrentTime] = useState(new Date());
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Track previous pending count for new order detection
    const prevPendingRef = useRef<number | null>(null);

    // Detect new orders and play sound
    useEffect(() => {
        // Skip on initial load
        if (prevPendingRef.current === null) {
            prevPendingRef.current = ordersByStatus.pending;
            return;
        }

        // Check if pending count increased (new order arrived)
        if (ordersByStatus.pending > prevPendingRef.current) {
            const newOrdersCount = ordersByStatus.pending - prevPendingRef.current;
            // The global listener in Partner_Dashboard handles the toast and sound playing
            // We just update the state here.
        }

        // Update previous count
        prevPendingRef.current = ordersByStatus.pending;
    }, [ordersByStatus.pending]);

    useEffect(() => {
        const hour = currentTime.getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, [currentTime]);

    const formattedTime = currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    // Convert time range to hours
    const getHours = (range: TimeRange) => {
        switch (range) {
            case '3h': return 3;
            case '5h': return 5;
            case '24h': return 24;
            case '7d': return 168; // 7 * 24
            case '15d': return 360; // 15 * 24
            case '30d': return 720; // 30 * 24
            default: return 24;
        }
    };

    // Fetch Analytics Data
    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Get User & Restaurant
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            if (user.user_metadata?.full_name) {
                setUserName(user.user_metadata.full_name);
            }

            // Check demo mode FIRST (before DB calls)
            const isAdmin = user.email === 'hassansajid098@gmail.com';
            if (isAdmin) {
                setIsDemoMode(true);
                loadDemoData(timeRange);
                return;
            }

            const { data: restaurant, error: restaurantError } = await supabase
                .from('restaurants')
                .select('id')
                .eq('owner_id', user.id)
                .single();

            if (!restaurant || restaurantError) {
                console.error('No restaurant found, loading demo:', restaurantError);
                setIsDemoMode(true);
                loadDemoData(timeRange);
                return;
            }
            setRestaurantId((restaurant as any).id);

            const hours = getHours(timeRange);

            // Try to fetch real data, fall back to demo on error
            try {
                // Fetch Revenue Trend
                const { data: revenueTrend, error: revenueError } = await (supabase as any)
                    .rpc('get_revenue_trend', {
                        p_restaurant_id: (restaurant as any).id,
                        p_hours: hours
                    });

                if (revenueError) throw revenueError;

                if (revenueTrend && revenueTrend.length > 0) {
                    setRevenueData(revenueTrend.map((d: any) => ({
                        time: d.time_bucket,
                        revenue: parseFloat(d.revenue)
                    })));

                    const total = revenueTrend.reduce((sum: number, d: any) => sum + parseFloat(d.revenue), 0);
                    setStats(prev => ({ ...prev, totalRevenue: total }));
                }

                // Fetch Order Volume
                const { data: orderVolume, error: volumeError } = await (supabase as any)
                    .rpc('get_order_volume', {
                        p_restaurant_id: (restaurant as any).id,
                        p_hours: hours
                    });

                if (volumeError) throw volumeError;

                if (orderVolume && orderVolume.length > 0) {
                    // Transform data for chart
                    const grouped: any = {};
                    orderVolume.forEach((d: any) => {
                        const time = d.time_bucket;
                        if (!grouped[time]) grouped[time] = { time, pending: 0, cooking: 0, delivered: 0 };
                        grouped[time][d.status] = d.order_count;
                    });
                    setOrderVolumeData(Object.values(grouped));
                }

                // Fetch Peak Hours (only for 7d, 15d, 30d)
                if (['7d', '15d', '30d'].includes(timeRange)) {
                    const days = timeRange === '7d' ? 7 : timeRange === '15d' ? 15 : 30;
                    const { data: peakHours } = await (supabase as any)
                        .rpc('get_peak_hours', {
                            p_restaurant_id: (restaurant as any).id,
                            p_days: days
                        });

                    if (peakHours && peakHours.length > 0) {
                        setPeakHoursData(peakHours.map((d: any) => ({
                            hour: d.hour_of_day,
                            orders: parseFloat(d.avg_orders)
                        })));
                    }
                }

                // Fetch Top Items
                const { data: topItemsData } = await (supabase as any)
                    .rpc('get_top_items', {
                        p_restaurant_id: (restaurant as any).id,
                        p_limit: 6,
                        p_hours: hours
                    });

                if (topItemsData && topItemsData.length > 0) {
                    setTopItems(topItemsData.map((d: any) => ({
                        id: d.item_id,
                        name: d.item_name,
                        image: d.image_url || '/cuisines/placeholder.jpg',
                        orders: parseInt(d.order_count),
                        revenue: parseFloat(d.total_revenue)
                    })));
                }

                // Fetch Orders by Status
                const { data: statusData } = await (supabase as any)
                    .rpc('get_orders_by_status', {
                        p_restaurant_id: (restaurant as any).id,
                        p_hours: hours
                    });

                if (statusData && statusData.length > 0) {
                    const statusObj: any = { pending: 0, cooking: 0, delivered: 0, cancelled: 0 };
                    statusData.forEach((d: any) => {
                        statusObj[d.status] = parseInt(d.count);
                    });
                    setOrdersByStatus(statusObj);

                    const total = statusObj.pending + statusObj.cooking + statusObj.delivered + statusObj.cancelled;
                    setStats(prev => ({ ...prev, totalOrders: total, activeOrders: statusObj.pending + statusObj.cooking }));
                } else {
                    // Koi orders nahi hain abhi tak — loading band karo aur empty state dikhao
                    console.log('No order data found — empty state dikhayenge');
                    setOrdersByStatus({ pending: 0, cooking: 0, delivered: 0, cancelled: 0 });
                    setStats(prev => ({ ...prev, totalOrders: 0, activeOrders: 0 }));
                    setLoading(false); // ← yeh zaruri hai warna loading hamesha on rehti hai
                    return;
                }

                setLoading(false);
            } catch (rpcError) {
                // RPC functions failed (400 error)
                console.error('RPC Error:', rpcError);
                setLoading(false);
            }
        } catch (error) {
            console.error('Dashboard fetch error:', error);
            setLoading(false);
        }
    };

    // Demo Data Loader
    const loadDemoData = (range: TimeRange) => {
        const demoData = {
            '3h': {
                revenue: [
                    { time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), revenue: 2500 },
                    { time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), revenue: 3200 },
                    { time: new Date().toISOString(), revenue: 4100 }
                ],
                orders: [
                    { time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), pending: 2, cooking: 3, delivered: 8 },
                    { time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), pending: 1, cooking: 4, delivered: 12 },
                    { time: new Date().toISOString(), pending: 3, cooking: 5, delivered: 15 }
                ],
                stats: { totalRevenue: 9800, totalOrders: 52, activeOrders: 8 },
                status: { pending: 3, cooking: 5, delivered: 42, cancelled: 2 }
            },
            '24h': {
                revenue: Array.from({ length: 24 }, (_, i) => ({
                    time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
                    revenue: Math.floor(Math.random() * 5000) + 1000
                })),
                orders: Array.from({ length: 24 }, (_, i) => ({
                    time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
                    pending: Math.floor(Math.random() * 5),
                    cooking: Math.floor(Math.random() * 8),
                    delivered: Math.floor(Math.random() * 15) + 5
                })),
                stats: { totalRevenue: 45200, totalOrders: 147, activeOrders: 13 },
                status: { pending: 5, cooking: 8, delivered: 127, cancelled: 7 }
            },
            '7d': {
                revenue: Array.from({ length: 7 }, (_, i) => ({
                    time: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
                    revenue: Math.floor(Math.random() * 50000) + 20000
                })),
                orders: Array.from({ length: 7 }, (_, i) => ({
                    time: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
                    pending: Math.floor(Math.random() * 10),
                    cooking: Math.floor(Math.random() * 15),
                    delivered: Math.floor(Math.random() * 50) + 30
                })),
                stats: { totalRevenue: 295000, totalOrders: 724, activeOrders: 22 },
                status: { pending: 12, cooking: 15, delivered: 682, cancelled: 15 }
            }
        };

        const data = demoData[range];
        setRevenueData(data.revenue);
        setOrderVolumeData(data.orders);
        setStats(prev => ({ ...prev, ...data.stats }));
        setOrdersByStatus(data.status);

        // Demo top items
        setTopItems([
            { id: '1', name: 'Bihari Kebab', image: '/cuisines/Desi/BBQ/bihari-kebab.jpg', orders: 87, revenue: 13050 },
            { id: '2', name: 'Chicken Tikka', image: '/cuisines/Desi/BBQ/chicken-tikka.jpg', orders: 65, revenue: 9750 },
            { id: '3', name: 'Coca Cola', image: '/cuisines/Beverages/ColdDrinks/coca-cola-regular.jpg', orders: 142, revenue: 2840 },
            { id: '4', name: 'Zinger Burger', image: '/cuisines/Fast Food/Burgers/zinger-burger.jpg', orders: 54, revenue: 10800 },
            { id: '5', name: 'Garlic Naan', image: '/cuisines/Desi/Breads/garlic-naan.jpg', orders: 98, revenue: 4900 },
            { id: '6', name: 'Pepperoni Pizza', image: '/cuisines/Fast Food/Pizzas/pepperoni-pizza.jpg', orders: 41, revenue: 12300 }
        ]);

        // Demo peak hours
        setPeakHoursData([
            { hour: 0, orders: 2.5 }, { hour: 1, orders: 1.2 }, { hour: 2, orders: 0.5 },
            { hour: 3, orders: 0.3 }, { hour: 4, orders: 0.8 }, { hour: 5, orders: 1.5 },
            { hour: 6, orders: 3.2 }, { hour: 7, orders: 5.4 }, { hour: 8, orders: 8.7 },
            { hour: 9, orders: 6.3 }, { hour: 10, orders: 4.8 }, { hour: 11, orders: 7.2 },
            { hour: 12, orders: 15.8 }, { hour: 13, orders: 18.4 }, { hour: 14, orders: 12.6 },
            { hour: 15, orders: 6.9 }, { hour: 16, orders: 5.1 }, { hour: 17, orders: 8.3 },
            { hour: 18, orders: 14.2 }, { hour: 19, orders: 22.7 }, { hour: 20, orders: 25.3 },
            { hour: 21, orders: 19.8 }, { hour: 22, orders: 12.4 }, { hour: 23, orders: 6.7 }
        ]);

        setReviews({ count: 187, avgRating: 4.7 });
        setLoading(false);
    };

    const outletContext = useOutletContext<any>() || {};
    const realtimeTrigger = outletContext.realtimeTrigger || 0;

    useEffect(() => {
        fetchDashboardData();
    }, [timeRange, realtimeTrigger]);

    const totalStatusOrders = ordersByStatus.pending + ordersByStatus.cooking + ordersByStatus.delivered;
    const statusPercentages = {
        pending: totalStatusOrders > 0 ? Math.round((ordersByStatus.pending / totalStatusOrders) * 100) : 0,
        cooking: totalStatusOrders > 0 ? Math.round((ordersByStatus.cooking / totalStatusOrders) * 100) : 0,
        delivered: totalStatusOrders > 0 ? Math.round((ordersByStatus.delivered / totalStatusOrders) * 100) : 0
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-zinc-400">Loading analytics...</div>
            </div>
        );
    }

    return (
        <div className="text-slate-900 dark:text-slate-100 font-display min-h-screen relative overflow-x-hidden selection:bg-[var(--primary)]/30">
            {/* Ambient Background Glows - Deep Cinematic Theme Blending */}
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] ambient-glow-red pointer-events-none z-0 hidden dark:block"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] ambient-glow-gold pointer-events-none z-0 hidden dark:block"></div>
            <div className="fixed top-[20%] right-[10%] w-[40%] h-[40%] ambient-glow-red opacity-50 pointer-events-none z-0 hidden dark:block"></div>

            <div className="relative z-10 flex flex-col h-full w-full">
                {/* Header - Matching Stitch padding and typography */}
                <header className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end px-8 pt-8 pb-4 gap-4">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-white text-4xl font-bold tracking-tight neon-text-primary">Welcome, {userName === 'Partner' ? 'Chef' : userName}</h2>
                        <p className="text-slate-400 text-sm font-medium tracking-wide flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {formattedTime} <span className="mx-2 text-[var(--border-dark)]">|</span> Live Dashboard
                        </p>
                    </div>
                    {/* Time Filter - Dropdown List */}
                    <div className="relative">
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                            className="dash-glass-panel text-white bg-black/40 backdrop-blur-xl appearance-none rounded-xl pl-4 pr-10 py-2.5 font-medium text-sm border border-[var(--border-dark)] hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 transition-all cursor-pointer shadow-lg z-20"
                        >
                            <option value="3h" className="bg-zinc-900 text-white py-2">Last 3 Hours</option>
                            <option value="5h" className="bg-zinc-900 text-white py-2">Last 5 Hours</option>
                            <option value="24h" className="bg-zinc-900 text-white py-2">Last 24 Hours</option>
                            <option value="7d" className="bg-zinc-900 text-white py-2">Last 7 Days</option>
                            <option value="15d" className="bg-zinc-900 text-white py-2">Last 15 Days</option>
                            <option value="30d" className="bg-zinc-900 text-white py-2">Last 30 Days</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-30" />
                    </div>
                </header>

                {/* Main Content Scrollable Area */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                    {/* KPI Cards - Exact Stitch Markup Replicated */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-4">
                        {/* Revenue Card */}
                        <div className="dash-glass-panel rounded-2xl p-6 relative overflow-hidden group">
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-[var(--primary)]/10 rounded-full blur-2xl group-hover:bg-[var(--primary)]/20 transition-all duration-500"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">Total Revenue</p>
                                <DollarSign className="text-[var(--primary)]/50 w-6 h-6" />
                            </div>
                            <div className="flex items-end justify-between relative z-10">
                                <h3 className="text-white text-3xl font-bold tracking-tight">{formatPrice(stats.totalRevenue)}</h3>
                                <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    <span className="text-xs font-bold neon-text-green">+12%</span>
                                </div>
                            </div>
                        </div>

                        {/* Orders Card */}
                        <div className="dash-glass-panel rounded-2xl p-6 relative overflow-hidden group">
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">Total Orders</p>
                                <Package className="text-blue-500/50 w-6 h-6" />
                            </div>
                            <div className="flex items-end justify-between relative z-10">
                                <h3 className="text-white text-3xl font-bold tracking-tight">{stats.totalOrders}</h3>
                                <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    <span className="text-xs font-bold neon-text-green">+5%</span>
                                </div>
                            </div>
                        </div>

                        {/* Active Orders Card */}
                        <div className="dash-glass-panel rounded-2xl p-6 relative overflow-hidden group border-[var(--primary)]/30 shadow-[0_0_15px_rgba(244,175,37,0.1)]">
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all duration-500"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">Active Orders</p>
                                <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,1)] animate-ping"></span>
                                    <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">Live</span>
                                </div>
                            </div>
                            <div className="flex items-end justify-between relative z-10">
                                <h3 className="text-white text-3xl font-bold tracking-tight">{stats.activeOrders}</h3>
                                <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    <span className="text-xs font-bold neon-text-green">+2%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Grid - Exact Stitch styling and spacing */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue Trend Panel */}
                        <div className="dash-glass-panel rounded-2xl p-6 flex flex-col gap-4 group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="text-white text-lg font-semibold tracking-wide">Revenue Trend</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-2xl font-bold text-white">{formatPrice(stats.totalRevenue)}</span>
                                        <span className="text-emerald-400 text-sm font-medium">+12%</span>
                                    </div>
                                </div>
                                <button className="p-2 rounded-lg bg-[var(--surface-dark-hover)] text-slate-400 hover:text-white transition-colors">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="relative h-48 w-full mt-4 flex items-end transition-transform duration-500 group-hover:scale-[1.01]">
                                <RevenueChart data={revenueData} timeRange={timeRange} />
                            </div>
                        </div>

                        {/* Order Volume Panel */}
                        <div className="dash-glass-panel rounded-2xl p-6 flex flex-col gap-4 group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="text-white text-lg font-semibold tracking-wide">Order Volume</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-2xl font-bold text-white">{stats.totalOrders}</span>
                                        <span className="text-emerald-400 text-sm font-medium">+5%</span>
                                    </div>
                                </div>
                                <button className="p-2 rounded-lg bg-[var(--surface-dark-hover)] text-slate-400 hover:text-white transition-colors">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="relative h-48 w-full mt-4 flex items-end transition-transform duration-500 group-hover:scale-[1.01]">
                                <OrderVolumeChart data={orderVolumeData} timeRange={timeRange} />
                            </div>
                        </div>
                    </div>

                    {/* Peak Hours - MOVED TO TOP */}
                    {['7d', '15d', '30d'].includes(timeRange) && peakHoursData.length > 0 && (
                        <div className="mb-6 dash-glass-panel rounded-2xl p-6 flex flex-col h-[350px]">
                            <div className="flex items-center gap-2 mb-4">
                                <h4 className="text-white text-lg font-semibold tracking-wide flex-shrink-0">Peak Order Times</h4>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">Historical Data</span>
                            </div>
                            <div className="flex-1 w-full min-h-0 mt-2">
                                <PeakHoursChart data={peakHoursData} />
                            </div>
                        </div>
                    )}

                    {/* Top Items & Dashboard Summary Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Top Items Grid - ALWAYS Spans 2 columns now */}
                        <div className="lg:col-span-2 dash-glass-panel rounded-2xl p-6 transition-all duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="text-white text-lg font-semibold tracking-wide flex items-center gap-2">
                                    <Star className="w-5 h-5 text-amber-500" /> Top Performing Items
                                </h4>
                            </div>
                            {topItems.length > 0 && <TopItemsGrid items={topItems} />}
                        </div>

                        {/* Today's Summary & Rating Section */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="dash-glass-panel rounded-2xl p-6 relative overflow-hidden group">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-[var(--primary)]" />
                                    Today's Summary
                                </h2>
                                <div className="grid gap-4">
                                    <StatusSummaryCard status="pending" count={ordersByStatus.pending} percentage={statusPercentages.pending} />
                                    <StatusSummaryCard status="cooking" count={ordersByStatus.cooking} percentage={statusPercentages.cooking} />
                                    <StatusSummaryCard status="delivered" count={ordersByStatus.delivered} percentage={statusPercentages.delivered} />
                                </div>
                            </div>

                            <div className="dash-glass-panel rounded-2xl p-1 group hover:scale-[1.01] transition-all">
                                <RatingCard avgRating={reviews.avgRating} reviewCount={reviews.count} />
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions Bar integration - Floating style matching Stitch intent */}
                    <div className="relative z-20">
                        <QuickActionsBar newOrdersCount={ordersByStatus.pending} />
                    </div>
                </div>
            </div>
        </div>
    );
};
