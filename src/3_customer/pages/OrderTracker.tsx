// ============================================================
// FILE: OrderTracker.tsx
// SECTION: 3_customer > pages
// PURPOSE: Live status of an order.
// ROUTE: /foodie/track/:id
// ============================================================
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, Clock, MapPin, Bike, 
    CheckCircle2, Phone, MessageSquare,
    Loader2
} from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';

const OrderTracker: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(true);

    const statuses = [
        { key: 'pending',    label: 'Order Received', desc: 'Aapka order mil gaya hai' },
        { key: 'confirmed',  label: 'Confirmed',      desc: 'Restaurant ne accept kar liya' },
        { key: 'preparing',  label: 'Preparing',      desc: 'Chefs apna jadu dikha rahe hain' },
        { key: 'on_the_way', label: 'On the Way',     desc: 'Rider aa raha hai' },
        { key: 'delivered',  label: 'Delivered',      desc: 'Enjoy your meal! 🎉' },
    ];

    useEffect(() => {
        if (!id) {
            setError('Order ID is missing');
            setLoading(false);
            return;
        }

        const fetchOrder = async () => {
            try {
                const { data, error: fetchError } = await supabase
                    .from('orders')
                    .select('*, restaurants(name, logo_url)')
                    .eq('id', id)
                    .single();
                
                if (fetchError) {
                    setError('Order not found');
                    setOrder(null);
                } else if (data) {
                    setOrder(data);
                    setError(null);
                }
            } catch (err: any) {
                setError('Failed to load order');
                console.error('Order fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();

        // Real-time subscription with error handling
        const channel = supabase
            .channel(`order_updates_${id}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'orders',
                filter: `id=eq.${id}`
            }, (payload) => {
                setOrder((prev: any) => ({ ...prev, ...payload.new }));
                setIsConnected(true);
            })
            .subscribe((status) => {
                setIsConnected(status === 'SUBSCRIBED');
            });

        return () => { 
            supabase.removeChannel(channel);
        };
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-[#0d0500] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-[#0d0500] flex flex-col items-center justify-center p-6 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-white mb-2">{error}</h2>
            <p className="text-white/50 mb-6">Unable to load your order details</p>
            <button
                onClick={() => navigate('/foodie/home')}
                className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
            >
                Back to Home
            </button>
        </div>
    );

    if (!order) return (
        <div className="min-h-screen bg-[#0d0500] flex flex-col items-center justify-center p-6 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-white mb-2">Order not found</h2>
            <p className="text-white/50 mb-6">The order you're looking for doesn't exist</p>
            <button
                onClick={() => navigate('/foodie/home')}
                className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
            >
                Back to Home
            </button>
        </div>
    );

    const currentStatusIndex = statuses.findIndex(s => s.key === order.status);

    return (
        <div className="min-h-screen bg-[#0d0500] text-white">
            {/* Header */}
            <header className="p-4 flex items-center gap-4 border-b border-white/5 bg-[#0d0500]/50 backdrop-blur-xl sticky top-0 z-50">
                <button onClick={() => navigate('/foodie/home')} className="p-2 bg-white/5 rounded-xl">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-sm font-black uppercase tracking-widest">Track Order</h1>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">ID: {order.id.slice(0, 8)}</p>
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-6 space-y-8">
                
                {/* Visual Status Card */}
                <div className="p-8 rounded-[2rem] relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.1) 0%, rgba(255,107,53,0.02) 100%)', border: '1px solid rgba(255,107,53,0.2)' }}>
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center mb-6 shadow-2xl shadow-orange-500/40">
                             {order.status === 'delivered' ? <CheckCircle2 className="w-10 h-10" /> : <Bike className="w-10 h-10 animate-pulse" />}
                        </div>
                        <h2 className="text-3xl font-black mb-2 tracking-tight">
                            {statuses[currentStatusIndex > -1 ? currentStatusIndex : 0].label}
                        </h2>
                        <p className="text-sm text-orange-200/60 font-medium">
                            {statuses[currentStatusIndex > -1 ? currentStatusIndex : 0].desc}
                        </p>
                    </div>
                    {/* Abstract background graphics */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
                </div>

                {/* Timeline */}
                <div className="space-y-6 px-4">
                    {statuses.map((s, i) => {
                        const isDone = i <= currentStatusIndex;
                        const isCurrent = i === currentStatusIndex;

                        return (
                            <div key={s.key} className="flex gap-4 relative">
                                {i < statuses.length - 1 && (
                                    <div className={`absolute left-[13px] top-[26px] bottom-[-22px] w-0.5 ${isDone && i < currentStatusIndex ? 'bg-orange-500' : 'bg-white/5'}`} />
                                )}
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 transition-colors ${isDone ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/20'}`}>
                                    {isDone && i < currentStatusIndex ? <CheckCircle2 className="w-4 h-4" /> : <div className={`w-2 h-2 rounded-full ${isDone ? 'bg-white' : 'bg-white/20'}`} />}
                                </div>
                                <div>
                                    <h4 className={`text-sm font-bold ${isDone ? 'text-white' : 'text-white/20'}`}>{s.label}</h4>
                                    <p className={`text-xs ${isDone ? 'text-white/40' : 'text-white/10'}`}>{s.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Restaurant & Rider Info */}
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-6">
                    <div className="flex items-center gap-4">
                        <img 
                            src={order.restaurants?.logo_url || "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=200&q=80"} 
                            alt="restaurant" 
                            className="w-14 h-14 rounded-2xl object-cover border border-white/10"
                        />
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Ordered From</p>
                            <h3 className="font-black text-lg">{order.restaurants?.name || 'Restaurant'}</h3>
                        </div>
                        <div className="flex gap-2">
                             <button className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"><Phone className="w-5 h-5 text-orange-500" /></button>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default OrderTracker;
