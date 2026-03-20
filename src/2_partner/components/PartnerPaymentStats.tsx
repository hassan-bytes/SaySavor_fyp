// ================================================================
// FILE: src/2_partner/components/PartnerPaymentStats.tsx
// PURPOSE: Partner dashboard payment overview.
//          Shows online (Stripe) vs COD breakdown,
//          today's revenue, pending payments.
// ================================================================
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, Wallet, TrendingUp,
  Clock, CheckCircle2, RefreshCw
} from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';

interface PaymentStats {
  total_revenue: number;
  online_revenue: number;
  cod_revenue: number;
  online_count: number;
  cod_count: number;
  pending_cod: number;     // COD orders not yet collected
  pending_online: number;  // online orders where payment_status != 'paid'
}

const PartnerPaymentStats: React.FC<{ restaurantId: string; currencySymbol?: string }> = ({
  restaurantId,
  currencySymbol = 'Rs.',
}) => {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);

  const formatPrice = (n: number) =>
    `${currencySymbol} ${n.toLocaleString('en', { maximumFractionDigits: 0 })}`;

  const fetchStats = async () => {
    setLoading(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, payment_method, payment_status, status')
        .eq('restaurant_id', restaurantId)
        .neq('status', 'cancelled')
        .gte('created_at', todayStart.toISOString());

      if (error) throw error;

      const orders = data || [];

      const online = orders.filter(o => o.payment_method === 'ONLINE');
      const cod = orders.filter(o => o.payment_method === 'COD');

      setStats({
        total_revenue: orders.reduce((s, o) => s + (o.total_amount || 0), 0),
        online_revenue: online.reduce((s, o) => s + (o.total_amount || 0), 0),
        cod_revenue: cod.reduce((s, o) => s + (o.total_amount || 0), 0),
        online_count: online.length,
        cod_count: cod.length,
        pending_cod: cod.filter(o => o.status !== 'delivered').length,
        pending_online: online.filter(o =>
          o.payment_status !== 'paid' && o.payment_status !== 'PAID'
        ).length,
      });
    } catch (err) {
      console.error('Payment stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 text-white/20 animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      label: "Today's Revenue",
      value: formatPrice(stats.total_revenue),
      sub: `${stats.online_count + stats.cod_count} orders`,
      icon: TrendingUp,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    },
    {
      label: 'Online (Card)',
      value: formatPrice(stats.online_revenue),
      sub: `${stats.online_count} order${stats.online_count !== 1 ? 's' : ''} · Stripe`,
      icon: CreditCard,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      alert: stats.pending_online > 0
        ? `${stats.pending_online} pending`
        : undefined,
    },
    {
      label: 'Cash (COD)',
      value: formatPrice(stats.cod_revenue),
      sub: `${stats.cod_count} order${stats.cod_count !== 1 ? 's' : ''}`,
      icon: Wallet,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      alert: stats.pending_cod > 0
        ? `${stats.pending_cod} to collect`
        : undefined,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Today's Payments</p>
        <button
          onClick={fetchStats}
          className="p-1.5 rounded-lg bg-white/5 active:scale-90 transition-transform"
        >
          <RefreshCw className="w-3 h-3 text-white/30" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`p-4 rounded-2xl border ${card.bg} ${card.border}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-8 h-8 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              {card.alert && (
                <span className="text-[9px] font-black text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full uppercase">
                  {card.alert}
                </span>
              )}
            </div>
            <p className={`text-lg font-black ${card.color}`}>{card.value}</p>
            <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">{card.label}</p>
            <p className="text-[10px] text-white/20 mt-0.5">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Stripe note */}
      <div className="flex items-center gap-2 px-1">
        <CheckCircle2 className="w-3 h-3 text-green-500" />
        <p className="text-[10px] text-white/25">
          Online payments processed via Stripe — funds arrive in 2 business days
        </p>
      </div>
    </div>
  );
};

export default PartnerPaymentStats;
