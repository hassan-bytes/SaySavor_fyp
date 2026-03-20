import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
    Users, 
    UserPlus, 
    UserCheck, 
    Trophy, 
    TrendingUp,
    ChevronRight,
    Search,
    Filter
} from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';
import { useRestaurant } from '@/shared/contexts/RestaurantContext';

interface CustomerStat {
    customer_id: string;
    customer_name: string;
    order_count: number;
    total_spent: number;
    last_order: string;
}

interface LoyaltyStats {
    total_unique_customers: number;
    returning_customers: number;
    new_customers_today: number;
    retention_rate: number;
}

export const CustomerInsights: React.FC<{ restaurantId: string }> = ({ restaurantId }) => {
    const { currencySymbol = 'Rs.' } = useRestaurant();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<LoyaltyStats>({
        total_unique_customers: 0,
        returning_customers: 0,
        new_customers_today: 0,
        retention_rate: 0
    });
    const [topCustomers, setTopCustomers] = useState<CustomerStat[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const formatMoney = (amount: number) => 
        `${currencySymbol}\u00A0${amount.toLocaleString('en', { maximumFractionDigits: 0 })}`;

    useEffect(() => {
        const fetchInsights = async () => {
            setLoading(true);
            try {
                // Fetch all orders for this restaurant to calculate loyalty
                const { data: orders, error } = await supabase
                    .from('orders')
                    .select('customer_id, customer_name, total_amount, created_at, status')
                    .eq('restaurant_id', restaurantId)
                    .neq('status', 'cancelled');

                if (error) throw error;

                if (orders && orders.length > 0) {
                    const customerMap = new Map<string, CustomerStat>();
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const uniqueIdsToday = new Set<string>();
                    const allUniqueIds = new Set<string>();

                    orders.forEach(order => {
                        const id = order.customer_id || 'guest_unknown';
                        allUniqueIds.add(id);
                        
                        const orderDate = new Date(order.created_at);
                        if (orderDate >= today) {
                            uniqueIdsToday.add(id);
                        }

                        const existing = customerMap.get(id) || {
                            customer_id: id,
                            customer_name: order.customer_name || 'Anonymous',
                            order_count: 0,
                            total_spent: 0,
                            last_order: order.created_at
                        };

                        existing.order_count += 1;
                        existing.total_spent += (order.total_amount || 0);
                        if (new Date(order.created_at) > new Date(existing.last_order)) {
                            existing.last_order = order.created_at;
                        }

                        customerMap.set(id, existing);
                    });

                    const allCustomers = Array.from(customerMap.values());
                    const returning = allCustomers.filter(c => c.order_count > 1).length;
                    
                    setStats({
                        total_unique_customers: allUniqueIds.size,
                        returning_customers: returning,
                        new_customers_today: uniqueIdsToday.size, // Approximation
                        retention_rate: allUniqueIds.size > 0 ? Math.round((returning / allUniqueIds.size) * 100) : 0
                    });

                    setTopCustomers(allCustomers.sort((a, b) => b.total_spent - a.total_spent).slice(0, 5));
                }
            } catch (err) {
                console.error('Customer insights error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchInsights();
    }, [restaurantId]);

    const filteredTop = useMemo(() => {
        if (!searchQuery) return topCustomers;
        return topCustomers.filter(c => 
            c.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [topCustomers, searchQuery]);

    if (loading) {
        return (
            <div className="w-full h-64 flex items-center justify-center dash-glass-panel rounded-3xl border border-white/5">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                    <p className="text-xs text-white/30 font-black uppercase tracking-widest">Analyzing Loyalty...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Key Loyalty Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Unique Fans', value: stats.total_unique_customers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Repeaters', value: stats.returning_customers, icon: UserCheck, color: 'text-green-400', bg: 'bg-green-500/10' },
                    { label: 'Retention', value: `${stats.retention_rate}%`, icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                    { label: 'New Today', value: stats.new_customers_today, icon: UserPlus, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-4 rounded-3xl dash-glass-panel border border-white/5 flex flex-col gap-2"
                    >
                        <div className={`w-10 h-10 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">{stat.value}</p>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">{stat.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Top Spenders / VIPs ── */}
            <div className="dash-glass-panel rounded-[2rem] p-6 border border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Top Spenders</h3>
                            <p className="text-xs text-white/40">Your most valuable customers this month</p>
                        </div>
                    </div>
                    
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 transition-colors group-focus-within:text-orange-500" />
                        <input 
                            type="text"
                            placeholder="Find a VIP..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black/20 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/20 focus:border-orange-500/40 outline-none w-48 transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    {filteredTop.length > 0 ? (
                        filteredTop.map((customer, i) => (
                            <motion.div
                                key={customer.customer_id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="group p-4 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all flex items-center gap-4"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-lg font-black text-white/20 group-hover:text-orange-500/40 transition-colors">
                                    #{i + 1}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-white group-hover:text-orange-500 transition-colors">{customer.customer_name}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{customer.order_count} Orders</span>
                                        <span className="w-1 h-1 rounded-full bg-white/10" />
                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Last: {new Date(customer.last_order).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-base font-black text-orange-500">{formatMoney(customer.total_spent)}</p>
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">LTV (Life-time Value)</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/40 group-hover:translate-x-1 transition-all" />
                            </motion.div>
                        ))
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-sm text-white/20 font-bold uppercase tracking-widest">No matching customers found</p>
                        </div>
                    )}
                </div>

                <button className="w-full mt-6 py-3 rounded-2xl bg-white/5 border border-white/5 text-xs font-black text-white/40 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">
                    View All Customer Insights
                </button>
            </div>
        </div>
    );
};
