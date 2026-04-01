// ============================================================
// FILE: src/2_partner/pages/PartnerOrders.tsx  (COMPLETE REWRITE)
// PURPOSE: Live Orders dashboard — embedded inside partner layout
//          Features:
//          - Tab 1: LIVE orders (real-time, auto-updates)
//          - Tab 2: Dine-in orders
//          - Tab 3: Online delivery orders
//          - Tab 4: History with date range filter
//          - Stats row at top
//          - Real-time Supabase subscription
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCircle2, Bike, Package,
  XCircle, ChevronDown, RefreshCw,
  Loader2, Phone, MapPin, Utensils,
  Wifi, Calendar, Filter, TrendingUp,
  CreditCard, Wallet, Clock, Search,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';
import { toast } from 'sonner';
import { isPaymentComplete } from '@/shared/types/paymentTypes';

// ── Types ─────────────────────────────────────────────────────
interface OrderItem {
  id: string;
  item_name: string;
  unit_price: number;
  total_price: number;
  quantity: number;
  item_notes: string | null;
}

interface Order {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  order_type: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total_amount: number;
  delivery_fee: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  is_guest: boolean | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

type MainTab = 'live' | 'dine_in' | 'online' | 'history';
type DateRange = 'today' | 'week' | 'month' | 'custom';

// ── Status config ─────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string;
  next?: string; nextLabel?: string; icon: React.FC<any>;
}> = {
  pending:    { label: 'New',       color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', next: 'confirmed',  nextLabel: '✓ Accept',        icon: Bell },
  confirmed:  { label: 'Confirmed', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   next: 'preparing',  nextLabel: '🍳 Prepare',      icon: CheckCircle2 },
  preparing:  { label: 'Preparing', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', next: 'on_the_way', nextLabel: '🏍 Dispatch',     icon: Package },
  on_the_way: { label: 'On Way',    color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', next: 'delivered',  nextLabel: '✅ Delivered',    icon: Bike },
  delivered:  { label: 'Delivered', color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  icon: CheckCircle2 },
  cancelled:  { label: 'Cancelled', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    icon: XCircle },
};

// ── Helpers ───────────────────────────────────────────────────
const fmt = (n: number) => `Rs. ${(n || 0).toLocaleString('en', { maximumFractionDigits: 0 })}`;

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

// ── Order Card ────────────────────────────────────────────────
const OrderCard = React.forwardRef<HTMLDivElement, {
  order: Order;
  onStatusUpdate: (id: string, status: string) => void;
  onMarkPaid?: (id: string) => void;
  updating: string | null;
  defaultExpanded?: boolean;
}>(({ order, onStatusUpdate, onMarkPaid, updating, defaultExpanded = false }, ref) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const isDineIn = order.order_type === 'DINE_IN' || order.order_type === 'dine_in';
  const paymentMethod = (order.payment_method || '').toUpperCase();
  const canMarkPaid = ['ONLINE', 'CARD'].includes(paymentMethod) && !isPaymentComplete(order.payment_status);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`rounded-2xl border overflow-hidden ${cfg.border} ${cfg.bg}`}
    >
      {/* Header row */}
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg} border ${cfg.border}`}>
              <Icon className={`w-4 h-4 ${cfg.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>
                  {cfg.label}
                </span>
                {isDineIn ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 uppercase">
                    Dine-in
                  </span>
                ) : (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase">
                    Delivery
                  </span>
                )}
                {order.is_guest && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/40 uppercase">
                    Guest
                  </span>
                )}
              </div>
              <p className="text-white font-black text-sm">
                #{order.id.slice(-6).toUpperCase()}
                {order.customer_name && (
                  <span className="text-white/40 font-normal text-xs ml-2">{order.customer_name}</span>
                )}
              </p>
            </div>
          </div>

          <div className="text-right flex items-center gap-3">
            <div>
              <p className="text-white font-black">{fmt(order.total_amount)}</p>
              <p className="text-white/30 text-[10px]">{timeAgo(order.created_at)}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-white/30 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Preview */}
        <div className="mt-2 flex items-center justify-between">
          <p className="text-white/50 text-xs truncate flex-1">
            {order.order_items?.map(i => `${i.item_name} ×${i.quantity}`).join(', ')}
          </p>
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              order.payment_method === 'COD' || order.payment_method === 'CASH'
                ? 'bg-yellow-500/10 text-yellow-400'
                : 'bg-green-500/10 text-green-400'
            }`}>
              {order.payment_method === 'COD' || order.payment_method === 'CASH' ? 'Cash' : 'Online'}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">

              {/* Time */}
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Clock className="w-3.5 h-3.5" />
                <span>{fmtDateTime(order.created_at)}</span>
              </div>

              {/* Items */}
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Items Ordered</p>
                <div className="space-y-1.5">
                  {order.order_items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <span className="text-white">{item.quantity}× {item.item_name}</span>
                        {item.item_notes && (
                          <p className="text-[10px] text-orange-400/70 mt-0.5 italic">📝 {item.item_notes}</p>
                        )}
                      </div>
                      <span className="text-white/50 text-xs">{fmt(item.total_price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery / Table info */}
              {(order.customer_address || order.customer_phone) && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                    {isDineIn ? 'Table Info' : 'Delivery Info'}
                  </p>
                  {order.customer_address && (
                    <div className="flex items-start gap-2 text-sm text-white/70">
                      <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                      <span>{order.customer_address}</span>
                    </div>
                  )}
                  {order.customer_phone && (
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                      <a href={`tel:${order.customer_phone}`} className="hover:text-blue-400 transition-colors">
                        {order.customer_phone}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Bill */}
              <div className="p-3 rounded-xl bg-black/20 space-y-1 text-xs text-white/50">
                <div className="flex justify-between">
                  <span>Items</span>
                  <span>{fmt((order.total_amount || 0) - (order.delivery_fee || 0) - (order.tax_amount || 0) + (order.discount_amount || 0))}</span>
                </div>
                {(order.delivery_fee ?? 0) > 0 && (
                  <div className="flex justify-between"><span>Delivery</span><span>{fmt(order.delivery_fee!)}</span></div>
                )}
                {(order.tax_amount ?? 0) > 0 && (
                  <div className="flex justify-between"><span>Tax</span><span>{fmt(order.tax_amount!)}</span></div>
                )}
                {(order.discount_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-green-400"><span>Discount</span><span>-{fmt(order.discount_amount!)}</span></div>
                )}
                <div className="flex justify-between font-black text-white pt-1 border-t border-white/10">
                  <span>Total</span><span>{fmt(order.total_amount)}</span>
                </div>
              </div>

              {/* Actions — only for live orders */}
              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <div className="flex gap-2">
                  {cfg.next && (
                    <button
                      onClick={() => onStatusUpdate(order.id, cfg.next!)}
                      disabled={updating === order.id}
                      className="flex-1 py-3 rounded-xl font-black text-sm text-white bg-orange-500 hover:bg-orange-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {updating === order.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : cfg.nextLabel}
                    </button>
                  )}
                  {canMarkPaid && onMarkPaid && (
                    <button
                      onClick={() => onMarkPaid(order.id)}
                      disabled={updating === order.id}
                      className="px-4 py-3 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                    >
                      Mark Paid
                    </button>
                  )}
                  {(order.status === 'pending' || order.status === 'confirmed') && (
                    <button
                      onClick={() => { if (window.confirm('Cancel this order?')) onStatusUpdate(order.id, 'cancelled'); }}
                      disabled={updating === order.id}
                      className="px-4 py-3 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
OrderCard.displayName = 'OrderCard';

// ── Main Component ─────────────────────────────────────────────
const PartnerOrders: React.FC<{ restaurantId: string }> = ({ restaurantId }) => {
  const [mainTab, setMainTab] = useState<MainTab>('live');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [newAlert, setNewAlert] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 10;

  // ── Fetch orders ─────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return;

    try {
      // Get date range start
      const now = new Date();
      let startDate: Date;

      if (mainTab === 'history') {
        switch (dateRange) {
          case 'today':
            startDate = new Date(now); startDate.setHours(0, 0, 0, 0); break;
          case 'week':
            startDate = new Date(now); startDate.setDate(now.getDate() - 7); break;
          case 'month':
            startDate = new Date(now); startDate.setDate(now.getDate() - 30); break;
          default:
            startDate = new Date(now); startDate.setDate(now.getDate() - 7);
        }
      } else {
        // Live/dine-in/online: today only
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
      }

      let query = supabase
        .from('orders')
        .select(`
          id, customer_id, customer_name, customer_phone,
          customer_address, order_type, status,
          payment_method, payment_status, total_amount,
          delivery_fee, tax_amount, discount_amount,
          is_guest, created_at, updated_at,
          order_items (
            id, item_name, unit_price, total_price,
            quantity, item_notes
          )
        `)
        .eq('restaurant_id', restaurantId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (mainTab === 'history' && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      setAllOrders((data as Order[]) ?? []);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Fetch orders error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [restaurantId, mainTab, dateRange, statusFilter]);

  // ── Initial fetch + refetch on tab/filter change ──────────────
  useEffect(() => {
    setLoading(true);
    setHistoryPage(1);
    fetchOrders();
  }, [fetchOrders]);

  // ── Realtime subscription (live orders only) ──────────────────
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`partner-orders-${restaurantId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('orders')
          .select(`*, order_items(*)`)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          setAllOrders(prev => [data as Order, ...prev]);
          setNewAlert(true);
          toast.success(`🔔 New Order! #${payload.new.id.slice(-6).toUpperCase()}`, {
            description: `Rs. ${payload.new.total_amount} · ${payload.new.payment_method}`,
            duration: 8000,
          });
          setTimeout(() => setNewAlert(false), 5000);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, (payload) => {
        setAllOrders(prev => prev.map(o =>
          o.id === payload.new.id ? { ...o, ...(payload.new as any) } : o
        ));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId]);

  // ── Status update ─────────────────────────────────────────────
  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const { error } = await (supabase
        .from('orders') as any)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Order → ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  const handleMarkPaid = async (orderId: string) => {
    setUpdating(orderId);
    try {
      const { error } = await (supabase
        .from('orders') as any)
        .update({ payment_status: 'PAID', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: 'PAID' } : o));
      toast.success(`Payment marked as PAID for #${orderId.slice(-6).toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark paid');
    } finally {
      setUpdating(null);
    }
  };

  // ── Filter logic ──────────────────────────────────────────────
  const filteredOrders = allOrders.filter(o => {
    const isDineIn = o.order_type === 'DINE_IN' || o.order_type === 'dine_in';
    const isDelivery = !isDineIn;

    // Tab filter
    if (mainTab === 'dine_in' && !isDineIn) return false;
    if (mainTab === 'online' && !isDelivery) return false;

    // Live tab: exclude delivered/cancelled
    if (mainTab === 'live' && (o.status === 'delivered' || o.status === 'cancelled')) return false;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesId = o.id.toLowerCase().includes(q);
      const matchesName = o.customer_name?.toLowerCase().includes(q);
      const matchesPhone = o.customer_phone?.toLowerCase().includes(q);
      const matchesItem = o.order_items?.some(i => i.item_name.toLowerCase().includes(q));
      if (!matchesId && !matchesName && !matchesPhone && !matchesItem) return false;
    }

    return true;
  });

  // Stats for today
  const todayOrders = allOrders.filter(o => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return new Date(o.created_at) >= start && o.status !== 'cancelled';
  });

  const stats = {
    pending: todayOrders.filter(o => o.status === 'pending').length,
    active: todayOrders.filter(o => ['confirmed', 'preparing', 'on_the_way'].includes(o.status)).length,
    done: todayOrders.filter(o => o.status === 'delivered').length,
    revenue: todayOrders.reduce((s, o) => s + (o.total_amount || 0), 0),
    dine_in_count: todayOrders.filter(o => o.order_type === 'DINE_IN' || o.order_type === 'dine_in').length,
    online_count: todayOrders.filter(o => o.order_type !== 'DINE_IN' && o.order_type !== 'dine_in').length,
    cash_revenue: todayOrders.filter(o => o.payment_method === 'COD' || o.payment_method === 'CASH').reduce((s, o) => s + (o.total_amount || 0), 0),
    online_revenue: todayOrders.filter(o => o.payment_method !== 'COD' && o.payment_method !== 'CASH').reduce((s, o) => s + (o.total_amount || 0), 0),
  };

  // History pagination
  const totalPages = Math.ceil(filteredOrders.length / HISTORY_PAGE_SIZE);
  const pagedOrders = mainTab === 'history'
    ? filteredOrders.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE)
    : filteredOrders;

  const MAIN_TABS = [
    { key: 'live',     label: 'Live',     icon: Wifi,      badge: stats.pending },
    { key: 'dine_in',  label: 'Dine-in',  icon: Utensils,  badge: stats.dine_in_count },
    { key: 'online',   label: 'Delivery', icon: Bike,      badge: stats.online_count },
    { key: 'history',  label: 'History',  icon: Calendar,  badge: 0 },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0d0500] text-white">

      {/* New order banner */}
      <AnimatePresence>
        {newAlert && (
          <motion.div
            initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white p-3 flex items-center justify-center gap-3"
          >
            <Bell className="w-5 h-5 animate-bounce" />
            <span className="font-black text-sm uppercase tracking-widest">New Order Received!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 p-4 bg-[#0d0500]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">Live Orders</h1>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Today's Dashboard</p>
          </div>
          <button onClick={fetchOrders} className="p-2.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-transform">
            <RefreshCw className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'New',     value: stats.pending,                    color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Active',  value: stats.active,                     color: 'text-blue-400',   bg: 'bg-blue-500/10' },
            { label: 'Done',    value: stats.done,                       color: 'text-green-400',  bg: 'bg-green-500/10' },
            { label: 'Revenue', value: `Rs.${Math.round(stats.revenue / 1000)}k`, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          ].map(s => (
            <div key={s.label} className={`p-3 rounded-2xl ${s.bg} border border-white/5 text-center`}>
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Payment split */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10 flex items-center gap-3">
            <Wallet className="w-4 h-4 text-yellow-400 shrink-0" />
            <div>
              <p className="text-xs font-black text-yellow-400">{fmt(stats.cash_revenue)}</p>
              <p className="text-[9px] text-white/30 uppercase">Cash (COD)</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10 flex items-center gap-3">
            <CreditCard className="w-4 h-4 text-green-400 shrink-0" />
            <div>
              <p className="text-xs font-black text-green-400">{fmt(stats.online_revenue)}</p>
              <p className="text-[9px] text-white/30 uppercase">Online (Stripe)</p>
            </div>
          </div>
        </div>

        {/* Main tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {MAIN_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setMainTab(tab.key); setSearchQuery(''); setHistoryPage(1); }}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                mainTab === tab.key
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                  mainTab === tab.key ? 'bg-white/20 text-white' : 'bg-orange-500 text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* History filters */}
        {mainTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            {/* Date range */}
            <div className="flex gap-2 flex-wrap">
              {(['today', 'week', 'month'] as DateRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => { setDateRange(r); setHistoryPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                    dateRange === r
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/5 text-white/40 border border-white/10'
                  }`}
                >
                  {r === 'today' ? 'Today' : r === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex gap-2 flex-wrap">
              {['all', 'pending', 'confirmed', 'preparing', 'on_the_way', 'delivered', 'cancelled'].map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setHistoryPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                    statusFilter === s
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/30 border border-white/10'
                  }`}
                >
                  {s === 'on_the_way' ? 'On Way' : s}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search by name, phone, order ID, or item..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setHistoryPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-orange-500/40 outline-none text-sm text-white placeholder:text-white/20"
              />
            </div>

            {/* Summary line */}
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest px-1">
              {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
              {dateRange === 'today' ? ' today' : dateRange === 'week' ? ' in last 7 days' : ' in last 30 days'}
              {statusFilter !== 'all' ? ` · ${statusFilter}` : ''}
            </p>
          </motion.div>
        )}

        {/* Orders list */}
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-white/30 text-xs font-bold uppercase">Loading orders...</p>
          </div>
        ) : pagedOrders.length === 0 ? (
          <div className="py-20 text-center">
            <Package className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 font-bold">
              {mainTab === 'live' ? 'No active orders' :
               mainTab === 'dine_in' ? 'No dine-in orders today' :
               mainTab === 'online' ? 'No delivery orders today' :
               'No orders found'}
            </p>
            <p className="text-white/20 text-xs mt-1">
              {mainTab === 'live' ? 'New orders appear here in real-time' : 'Try changing the date range or filters'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {pagedOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusUpdate={handleStatusUpdate}
                onMarkPaid={handleMarkPaid}
                updating={updating}
                defaultExpanded={order.status === 'pending' && mainTab === 'live'}
              />
            ))}
          </AnimatePresence>
        )}

        {/* History pagination */}
        {mainTab === 'history' && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
              disabled={historyPage === 1}
              className="p-2 rounded-xl bg-white/5 border border-white/10 disabled:opacity-30 active:scale-90 transition-transform"
            >
              <ChevronLeft className="w-4 h-4 text-white/60" />
            </button>
            <span className="text-xs text-white/40 font-bold">
              Page {historyPage} of {totalPages}
            </span>
            <button
              onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
              disabled={historyPage === totalPages}
              className="p-2 rounded-xl bg-white/5 border border-white/10 disabled:opacity-30 active:scale-90 transition-transform"
            >
              <ChevronRight className="w-4 h-4 text-white/60" />
            </button>
          </div>
        )}

      </main>
    </div>
  );
};

export default PartnerOrders;
