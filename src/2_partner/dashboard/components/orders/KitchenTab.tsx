import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronRight, User, ShoppingBag, MapPin, Phone, Utensils, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import { 
  Order, 
  OrderItem, 
  ORDER_STATUS, 
  StatusConfig, 
  getStatusConfig,
  formatOrderPrice,
  timeAgo 
} from '@/shared/types/orderTypes';
import { isPaymentComplete, getPaymentStatusLabel } from '@/shared/types/paymentTypes';

interface KitchenTabProps {
  orders: Order[];
  onUpdate: (id: string, status: string) => void;
  onMarkPaid?: (id: string) => void;
  updating: string | null;
  fmt: (n: number) => string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  [ORDER_STATUS.PENDING]: { 
    label: 'New Order', 
    color: 'text-amber-400', 
    border: 'border-amber-500/30', 
    glow: 'bg-amber-500/5',
    next: ORDER_STATUS.ACCEPTED, 
    nextLabel: 'Accept & Cook', 
    icon: AlertCircle 
  },
  [ORDER_STATUS.ACCEPTED]: { 
    label: 'In Queue', 
    color: 'text-blue-400', 
    border: 'border-blue-500/30', 
    glow: 'bg-blue-500/5',
    next: ORDER_STATUS.COOKING, 
    nextLabel: 'Start Cooking', 
    icon: Utensils 
  },
  [ORDER_STATUS.COOKING]: { 
    label: 'Cooking', 
    color: 'text-orange-400', 
    border: 'border-orange-500/30', 
    glow: 'bg-orange-500/5',
    next: ORDER_STATUS.READY, 
    nextLabel: 'Mark Ready', 
    icon: Package 
  },
  [ORDER_STATUS.READY]: { 
    label: 'Ready', 
    color: 'text-emerald-400', 
    border: 'border-emerald-500/30', 
    glow: 'bg-emerald-500/5',
    next: ORDER_STATUS.DELIVERED, 
    nextLabel: 'Complete Order', 
    icon: CheckCircle2 
  },
  [ORDER_STATUS.DELIVERED]: { 
    label: 'Delivered', 
    color: 'text-emerald-500', 
    border: 'border-emerald-500/30', 
    glow: 'bg-emerald-500/5',
    icon: CheckCircle2 
  },
  [ORDER_STATUS.CANCELLED]: { 
    label: 'Cancelled', 
    color: 'text-red-400', 
    border: 'border-red-500/30', 
    glow: 'bg-red-500/5',
    icon: AlertCircle 
  }
};

const KitchenOrderCard = React.forwardRef<HTMLDivElement, { order: Order; onUpdate: KitchenTabProps['onUpdate']; onMarkPaid?: KitchenTabProps['onMarkPaid']; updating: boolean; fmt: KitchenTabProps['fmt'] }>(({ order, onUpdate, onMarkPaid, updating, fmt }, ref) => {
  const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG[ORDER_STATUS.PENDING];
  const timeStr = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const paymentMethod = order.payment_method?.toUpperCase();
  const canMarkPaid = (paymentMethod === 'CASH' || paymentMethod === 'COD') && !isPaymentComplete(order.payment_status);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative rounded-[2rem] border ${config.border} p-6 mb-6 overflow-hidden group shadow-2xl bg-black/40 backdrop-blur-3xl`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 ${config.glow} rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-500 group-hover:scale-150`}></div>
      
      {/* Header */}
      <div className="relative z-10 flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <span className="text-2xl font-black text-white tracking-tighter">#{order.id.slice(-4).toUpperCase()}</span>
             <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 ${config.color}`}>
               {order.order_type === 'DINE_IN' ? `Table ${order.table_number}` : order.order_type}
             </span>
          </div>
          <p className="text-slate-500 text-xs font-medium flex items-center gap-1.5 mt-2">
            <Clock size={12} className="text-slate-600" />
            Placed at {timeStr}
          </p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/40 border border-white/5 shadow-inner`}>
            <config.icon size={14} className={config.color} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>{config.label}</span>
        </div>
      </div>

      {/* Items List */}
      <div className="relative z-10 space-y-4 mb-8 bg-black/20 rounded-2xl p-4 border border-white/5">
        {order.order_items.map((item) => (
          <div key={item.id} className="flex justify-between items-start group/item">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-orange-500 font-black text-sm">
                {item.quantity}
              </div>
              <div>
                <p className="text-white text-sm font-bold tracking-tight">{item.item_name}</p>
                {item.item_notes && (
                  <p className="text-orange-400/80 text-[10px] italic mt-1 flex items-center gap-1">
                    <AlertCircle size={10} /> {item.item_notes}
                  </p>
                )}
              </div>
            </div>
            <p className="text-slate-400 text-xs font-medium">{fmt(item.total_price)}</p>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="relative z-10 flex border-t border-white/5 pt-6 mb-6 gap-6 overflow-hidden">
        <div className="flex-1 min-w-0">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Customer</p>
            <p className="text-white text-sm font-bold truncate flex items-center gap-2">
                <User size={12} className="text-slate-600" />
                {order.customer_name || 'Guest User'}
            </p>
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Payment</p>
            <p className={`text-sm font-bold flex items-center gap-2 ${isPaymentComplete(order.payment_status) ? 'text-emerald-400' : 'text-slate-400'}`}>
                <ShoppingBag size={12} className="text-slate-600" />
                {order.payment_method} · {getPaymentStatusLabel(order.payment_status)}
            </p>
        </div>
      </div>

      {canMarkPaid && onMarkPaid && (
        <button
          onClick={() => onMarkPaid(order.id)}
          className="relative z-10 w-full mb-6 py-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-black text-xs uppercase tracking-[0.2em] transition-all border border-emerald-500/30"
        >
          Mark Cash as Paid
        </button>
      )}

      {/* Action Button */}
      {config.next && (
        <button
          disabled={updating}
          onClick={() => {
            console.log('[KitchenTab] Button clicked for order:', order.id, 'new status:', config.next);
            onUpdate(order.id, config.next!);
          }}
          className="relative z-10 w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black text-sm uppercase tracking-[0.2em] transition-all shadow-[0_10px_20px_-10px_rgba(244,175,37,0.5)] flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          {updating ? <Clock className="animate-spin" size={18} /> : (
            <>
                <ChevronRight size={18} />
                {config.nextLabel}
            </>
          )}
        </button>
      )}
    </motion.div>
  );
});

const KitchenTab: React.FC<KitchenTabProps> = ({ orders, onUpdate, onMarkPaid, updating, fmt }) => {
  // Use standardized status values from orderTypes
  const columns = [
    { id: ORDER_STATUS.PENDING,  label: 'New Orders', icon: AlertCircle, color: 'border-amber-500/20 text-amber-500 bg-amber-500/5' },
    { id: ORDER_STATUS.ACCEPTED, label: 'In Queue',   icon: Utensils,    color: 'border-blue-500/20 text-blue-500 bg-blue-500/5' },
    { id: ORDER_STATUS.COOKING,  label: 'Cooking',    icon: Package,     color: 'border-orange-500/20 text-orange-500 bg-orange-500/5' },
    { id: ORDER_STATUS.READY,    label: 'Ready',      icon: CheckCircle2, color: 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-20">
      {columns.map((col) => (
        <div key={col.id} className="flex flex-col h-full min-h-[600px]">
          {/* Column Header */}
          <div className={`p-6 rounded-[2.5rem] border ${col.color.split(' ')[0]} ${col.color.split(' ')[2]} mb-6 flex items-center justify-between shadow-2xl backdrop-blur-3xl`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-black/40 border border-white/5`}>
                <col.icon size={20} className={col.color.split(' ')[1]} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white">{col.label}</h3>
            </div>
            <span className="text-slate-600 font-black text-xs bg-white/5 px-3 py-1 rounded-full border border-white/5 shadow-inner">
              {orders.filter(o => o.status === col.id).length}
            </span>
          </div>

          {/* Orders List */}
          <div className="flex-1 custom-scrollbar">
            <AnimatePresence>
              {orders
                .filter(o => o.status === col.id)
                .map(order => (
                  <KitchenOrderCard 
                    key={order.id} 
                    order={order} 
                    onUpdate={onUpdate} 
                    onMarkPaid={onMarkPaid}
                    updating={updating === order.id} 
                    fmt={fmt}
                  />
                ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
};

export default KitchenTab;
