import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Receipt, Calendar, Filter, Download, Search, 
  ChevronDown, ChevronUp, Clock, CheckCircle2, 
  ShoppingBag, User, CreditCard, ArrowLeft
} from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';
import { toast } from 'sonner';
import { Order } from '@/shared/types/orderTypes';
import { getPaymentStatusLabel, getPaymentStatusColor, isPaymentComplete, PaymentStatus } from '@/shared/types/paymentTypes';

interface HistoryTabProps {
  orders: Order[];
  fmt: (n: number) => string;
  onOrdersUpdated?: () => void;
}

const HistoryTab: React.FC<HistoryTabProps> = ({ orders, fmt, onOrdersUpdated }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Filter completed/delivered orders
  const completedOrders = useMemo(() => {
    return orders.filter(o => o.status === 'delivered' || o.status === 'cancelled');
  }, [orders]);

  // Apply date filter
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return completedOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      
      // Date filter
      let matchesDate = true;
      switch (dateFilter) {
        case 'today':
          matchesDate = orderDate >= today;
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          matchesDate = orderDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          matchesDate = orderDate >= monthAgo;
          break;
        case 'all':
        default:
          matchesDate = true;
      }
      
      // Search filter
      const matchesSearch = searchQuery === '' || 
        order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(order.table_number ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.order_items.some(item => 
          item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      
      return matchesDate && matchesSearch;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [completedOrders, dateFilter, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    // Exclude cancelled orders from revenue calculations
    const revenueOrders = filteredOrders.filter(o => o.status !== 'cancelled');
    const total = revenueOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const cashTotal = revenueOrders
      .filter(o => o.payment_method === 'CASH')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const onlineTotal = revenueOrders
      .filter(o => o.payment_method === 'ONLINE')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const orderCount = revenueOrders.length;
    const avgOrderValue = orderCount > 0 ? total / orderCount : 0;
    
    return { total, cashTotal, onlineTotal, orderCount, avgOrderValue };
  }, [filteredOrders]);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const isSessionOpen = (status?: string | null) => {
    const normalized = (status || '').toLowerCase();
    return normalized === 'active' || normalized === 'open';
  };

  const updateOrder = async (orderId: string, payload: Record<string, any>, successMessage: string) => {
    setUpdatingOrderId(orderId);
    try {
      const { error } = await (supabase as any)
        .from('orders')
        .update(payload)
        .eq('id', orderId);

      if (error) throw error;
      toast.success(successMessage);
      onOrdersUpdated?.();
    } catch (err: any) {
      console.error('[HistoryTab] Update error:', err?.message || err);
      toast.error(err?.message || 'Failed to update order');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black/40 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/5">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Revenue</p>
          <p className="text-3xl font-black text-white">{fmt(stats.total)}</p>
        </div>
        <div className="bg-black/40 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/5">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Orders Count</p>
          <p className="text-3xl font-black text-white">{stats.orderCount}</p>
        </div>
        <div className="bg-black/40 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/5">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Cash Payments</p>
          <p className="text-3xl font-black text-orange-400">{fmt(stats.cashTotal)}</p>
        </div>
        <div className="bg-black/40 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/5">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Online Payments</p>
          <p className="text-3xl font-black text-blue-400">{fmt(stats.onlineTotal)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-black/40 backdrop-blur-3xl p-4 rounded-[2rem] border border-white/5">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search orders, customers, items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/5 rounded-2xl text-white placeholder:text-slate-600 focus:border-orange-500/50 outline-none transition-all"
          />
        </div>
        
        <div className="flex gap-2">
          {(['today', 'week', 'month', 'all'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                dateFilter === filter
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/5 text-slate-500 hover:text-white'
              }`}
            >
              {filter === 'all' ? 'All Time' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 p-20 text-center">
            <Receipt size={48} className="mx-auto mb-4 text-slate-700" />
            <h3 className="text-2xl font-black text-white mb-2">No Orders Found</h3>
            <p className="text-slate-500">No completed orders match your filters.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const paymentMethod = order.payment_method?.toUpperCase();
            const canMarkPaid = (paymentMethod === 'CASH' || paymentMethod === 'COD') && !isPaymentComplete(order.payment_status);
            const canCloseSession = order.order_type === 'DINE_IN' && isSessionOpen(order.session_status);
            const canMarkPaidAndClose = canMarkPaid && canCloseSession;

            return (
            <motion.div
              key={order.id}
              layout
              className="bg-black/40 backdrop-blur-3xl rounded-[2rem] border border-white/5 overflow-hidden"
            >
              {/* Order Header */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => toggleOrderExpand(order.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleOrderExpand(order.id);
                  }
                }}
                aria-expanded={expandedOrder === order.id}
                className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 rounded"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="text-emerald-500" size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xl font-black text-white">#{order.id.slice(-6).toUpperCase()}</span>
                      <span className="text-slate-500 text-sm">{formatDate(order.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <User size={14} /> {order.customer_name || 'Guest'}
                      </span>
                      {order.table_number && (
                        <span className="flex items-center gap-1">
                          <ShoppingBag size={14} /> Table {order.table_number}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <CreditCard size={14} /> {order.payment_method}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-2xl font-black text-white">{fmt(order.total_amount ?? 0)}</p>
                    <p className="text-xs text-slate-500">{order.order_items.length} items</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    {expandedOrder === order.id ? (
                      <ChevronUp className="text-slate-400" size={20} />
                    ) : (
                      <ChevronDown className="text-slate-400" size={20} />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedOrder === order.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5"
                  >
                    <div className="p-6 space-y-4">
                      {order.order_items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-orange-500 font-bold text-sm">
                              {item.quantity}
                            </div>
                            <div>
                              <p className="text-white font-bold">{item.item_name}</p>
                              {item.item_notes && (
                                <p className="text-slate-500 text-xs">{item.item_notes}</p>
                              )}
                            </div>
                          </div>
                          <p className="text-slate-400 font-medium">{fmt(item.total_price)}</p>
                        </div>
                      ))}
                      
                      <div className="border-t border-white/5 pt-4 mt-4">
                        <div className="flex justify-between items-center">
                          <div className="text-slate-500 text-sm">
                            <p>Order Type: <span className="text-white">{order.order_type}</span></p>
                            <p>Payment Status: <span className={getPaymentStatusColor(order.payment_status).color}>{getPaymentStatusLabel(order.payment_status)}</span></p>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-500 text-sm">Subtotal</p>
                            <p className="text-2xl font-black text-white">{fmt(order.total_amount)}</p>
                          </div>
                        </div>

                        {(canMarkPaid || canCloseSession) && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {canMarkPaidAndClose && (
                              <button
                                onClick={() => updateOrder(order.id, { session_status: 'closed', payment_status: PaymentStatus.PAID }, 'Payment marked PAID and session closed')}
                                disabled={updatingOrderId === order.id}
                                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all disabled:opacity-60"
                              >
                                Mark Paid & Close Session
                              </button>
                            )}
                            {canMarkPaid && !canMarkPaidAndClose && (
                              <button
                                onClick={() => updateOrder(order.id, { payment_status: PaymentStatus.PAID }, 'Payment marked as PAID')}
                                disabled={updatingOrderId === order.id}
                                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all disabled:opacity-60"
                              >
                                Mark Cash as Paid
                              </button>
                            )}
                            {canCloseSession && !canMarkPaidAndClose && (
                              <button
                                onClick={() => updateOrder(order.id, { session_status: 'closed' }, 'Session closed for this table')}
                                disabled={updatingOrderId === order.id}
                                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-white/10 text-slate-300 border border-white/10 hover:bg-white/15 transition-all disabled:opacity-60"
                              >
                                Close Session
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );})
        )}
      </div>
    </div>
  );
};

export default HistoryTab;
