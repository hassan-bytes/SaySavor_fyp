// ============================================================
// FILE: PartnerOrders.tsx  (FINAL — uses your actual DB columns)
//
// Key column name changes from previous version:
//   delivery_address  → customer_address
//   delivery_phone    → customer_phone
//   item_price        → unit_price
//   subtotal          → total_price
//   variants_info     → variant_details
// ============================================================
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Clock, CheckCircle2, Bike, Package,
  XCircle, ChevronDown, RefreshCw,
  Loader2, Phone, MapPin,
} from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';
import { partnerOrderService } from '@/3_customer/services/customerOrderService';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  item_name: string;
  unit_price: number;    // your actual column name
  total_price: number;   // your actual column name
  quantity: number;
  item_notes: string | null;
}

interface Order {
  id: string;
  customer_id: string | null;
  customer_name: string | null;   // your actual column
  customer_phone: string | null;  // your actual column
  customer_address: string | null;// your actual column
  status: string;
  payment_method: string;
  payment_status: string;
  total_amount: number;
  delivery_fee: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  is_guest: boolean | null;
  created_at: string;
  order_items: OrderItem[];
}

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  next?: string;
  nextLabel?: string;
  icon: React.FC<any>;
}> = {
  pending:    { label: 'New Order',  color: 'text-yellow-400', bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  next: 'confirmed',  nextLabel: '✓ Accept Order',       icon: Bell },
  confirmed:  { label: 'Confirmed',  color: 'text-blue-400',   bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    next: 'preparing',  nextLabel: '🍳 Start Preparing',   icon: CheckCircle2 },
  preparing:  { label: 'Preparing',  color: 'text-orange-400', bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  next: 'on_the_way', nextLabel: '🏍️ Out for Delivery', icon: Package },
  on_the_way: { label: 'On the Way', color: 'text-purple-400', bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  next: 'delivered',  nextLabel: '✅ Mark Delivered',    icon: Bike },
  delivered:  { label: 'Delivered',  color: 'text-green-400',  bg: 'bg-green-500/10',   border: 'border-green-500/30',   icon: CheckCircle2 },
  cancelled:  { label: 'Cancelled',  color: 'text-red-400',    bg: 'bg-red-500/10',     border: 'border-red-500/30',     icon: XCircle },
};

const STATUS_TABS = [
  { key: 'all',        label: 'All' },
  { key: 'pending',    label: '🔔 New' },
  { key: 'confirmed',  label: 'Confirmed' },
  { key: 'preparing',  label: 'Preparing' },
  { key: 'on_the_way', label: 'On Way' },
  { key: 'delivered',  label: 'Done' },
];

const formatPKR = (amount: number) =>
  `Rs. ${(amount || 0).toLocaleString('en', { maximumFractionDigits: 0 })}`;

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : new Date(dateStr).toLocaleDateString('en-GB');
};

const OrderCard: React.FC<{
  order: Order;
  onStatusUpdate: (id: string, status: string) => void;
  updating: string | null;
}> = ({ order, onStatusUpdate, updating }) => {
  const [expanded, setExpanded] = useState(order.status === 'pending');
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  const subtotal = (order.total_amount || 0)
    - (order.delivery_fee || 0)
    - (order.tax_amount || 0)
    + (order.discount_amount || 0);

  return (
    <motion.div layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-2xl border overflow-hidden ${config.border} ${config.bg}`}>

      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${config.bg} border ${config.border}`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
            </div>
            <div>
              <span className={`text-xs font-black uppercase tracking-widest ${config.color}`}>
                {config.label}
              </span>
              <p className="text-white font-black text-sm">
                #{order.id.slice(-6).toUpperCase()}
                {order.customer_name && (
                  <span className="text-white/40 font-normal text-xs ml-2">
                    {order.customer_name}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white font-black">{formatPKR(order.total_amount)}</p>
            <p className="text-white/30 text-[10px]">{timeAgo(order.created_at)}</p>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-white/50 text-xs truncate flex-1">
            {order.order_items?.map(i => `${i.item_name} ×${i.quantity}`).join(', ')}
          </p>
          <div className="flex items-center gap-2 ml-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              order.payment_method === 'COD'
                ? 'bg-yellow-500/10 text-yellow-400'
                : 'bg-green-500/10 text-green-400'
            }`}>{order.payment_method}</span>
            {order.is_guest && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/40 uppercase">
                Guest
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">

              {/* Items */}
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Items Ordered</p>
                <div className="space-y-1.5">
                  {order.order_items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <span className="text-white">{item.quantity}× {item.item_name}</span>
                        {item.item_notes && (
                          <p className="text-[10px] text-orange-400/70 mt-0.5 italic">
                            📝 {item.item_notes}
                          </p>
                        )}
                      </div>
                      <span className="text-white/50 text-xs">{formatPKR(item.total_price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery info — uses your actual column names */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Delivery</p>
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

              {/* Bill */}
              <div className="p-3 rounded-xl bg-black/20 space-y-1 text-xs text-white/50">
                <div className="flex justify-between"><span>Items</span><span>{formatPKR(subtotal)}</span></div>
                {(order.delivery_fee ?? 0) > 0 && (
                  <div className="flex justify-between"><span>Delivery</span><span>{formatPKR(order.delivery_fee!)}</span></div>
                )}
                {(order.tax_amount ?? 0) > 0 && (
                  <div className="flex justify-between"><span>Tax</span><span>{formatPKR(order.tax_amount!)}</span></div>
                )}
                {(order.discount_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Discount</span><span>-{formatPKR(order.discount_amount!)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-white pt-1 border-t border-white/10">
                  <span>Total</span><span>{formatPKR(order.total_amount)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {config.next && (
                  <button onClick={() => onStatusUpdate(order.id, config.next!)}
                    disabled={updating === order.id}
                    className="flex-1 py-3 rounded-xl font-black text-sm text-white bg-orange-500 hover:bg-orange-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {updating === order.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : config.nextLabel}
                  </button>
                )}
                {(order.status === 'pending' || order.status === 'confirmed') && (
                  <button onClick={() => {
                    if (window.confirm('Cancel this order?')) onStatusUpdate(order.id, 'cancelled');
                  }} disabled={updating === order.id}
                    className="px-4 py-3 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const PartnerOrders: React.FC<{ restaurantId: string }> = ({ restaurantId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [newAlert, setNewAlert] = useState(false);

  const fetchOrders = async () => {
    try {
      const data = await partnerOrderService.getRestaurantOrders(restaurantId, {
        status: activeFilter === 'all' ? undefined : activeFilter,
        date: 'today',
        limit: 50,
      });
      setOrders(data as Order[]);
      const s = await partnerOrderService.getOrderStats(restaurantId);
      setStats(s);
    } catch (err) {
      toast.error('Could not load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel(`partner-orders-${restaurantId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, (payload) => {
        const newOrder = payload.new as any;
        supabase.from('orders').select(`*, order_items(*)`)
          .eq('id', newOrder.id).single()
          .then(({ data }) => {
            if (data) {
              setOrders(prev => [data as Order, ...prev]);
              setNewAlert(true);
              toast.success(`🔔 New Order! #${newOrder.id.slice(-6).toUpperCase()}`, {
                description: `Rs. ${newOrder.total_amount} • ${newOrder.payment_method}`,
                duration: 8000,
              });
              setTimeout(() => setNewAlert(false), 5000);
            }
          });
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, (payload) => {
        const updated = payload.new as any;
        setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, activeFilter]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      await partnerOrderService.updateOrderStatus(orderId, newStatus as any);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Order updated to: ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  const filteredOrders = activeFilter === 'all'
    ? orders
    : orders.filter(o => o.status === activeFilter);

  return (
    <div className="min-h-screen bg-[#0d0500] text-white">
      <AnimatePresence>
        {newAlert && (
          <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white p-3 flex items-center justify-center gap-3">
            <Bell className="w-5 h-5 animate-bounce" />
            <span className="font-black text-sm uppercase tracking-widest">🔔 New Order Received!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-50 p-4 bg-[#0d0500]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">Live Orders</h1>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Today's Dashboard</p>
          </div>
          <button onClick={fetchOrders} className="p-2.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-transform">
            <RefreshCw className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {stats && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'New',     value: stats.pending,                                        color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
              { label: 'Active',  value: stats.confirmed + stats.preparing + stats.on_the_way, color: 'text-blue-400',   bg: 'bg-blue-500/10' },
              { label: 'Done',    value: stats.delivered,                                       color: 'text-green-400',  bg: 'bg-green-500/10' },
              { label: 'Revenue', value: `Rs.${Math.round(stats.revenue_today / 1000)}k`,      color: 'text-orange-400', bg: 'bg-orange-500/10' },
            ].map(s => (
              <div key={s.label} className={`p-3 rounded-2xl ${s.bg} border border-white/5 text-center`}>
                <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveFilter(tab.key)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeFilter === tab.key
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/5 text-white/40 border border-white/10'
              }`}>
              {tab.label}
              {tab.key !== 'all' && stats?.[tab.key] > 0 && (
                <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-[9px]">
                  {stats[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-white/30 text-xs font-bold uppercase">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center">
            <Package className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 font-bold">No {activeFilter === 'all' ? '' : activeFilter} orders today</p>
            <p className="text-white/20 text-xs mt-1">New orders appear here in real-time</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredOrders.map(order => (
              <OrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate} updating={updating} />
            ))}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
};

export default PartnerOrders;
