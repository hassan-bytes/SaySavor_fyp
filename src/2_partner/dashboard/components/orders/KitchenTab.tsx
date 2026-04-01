import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronRight, User, ShoppingBag, MapPin, Phone, Mail, Utensils, Package, AlertCircle, CheckCircle2, Edit2, XCircle, Trash2 } from 'lucide-react';
import { 
  Order, 
  ORDER_STATUS
} from '@/shared/types/orderTypes';
import { isPaymentComplete, getPaymentStatusLabel } from '@/shared/types/paymentTypes';

interface KitchenTabProps {
  orders: Order[];
  onUpdate: (id: string, status: string) => void;
  onDeleteOrder?: (id: string) => void;
  onMarkPaid?: (id: string) => void;
  onEditOrder?: (order: Order) => void;
  updating: string | null;
  fmt: (n: number) => string;
}

type KitchenChannel = 'all' | 'dine_in' | 'online_delivery';

const isDineInOrder = (order: Order): boolean => {
  const rawType = String(order.order_type || '').toUpperCase();
  return rawType === 'DINE_IN' || rawType === 'DINE-IN' || (!!order.table_number && rawType !== 'DELIVERY');
};

const getKitchenChannel = (order: Order): Exclude<KitchenChannel, 'all'> => {
  return isDineInOrder(order) ? 'dine_in' : 'online_delivery';
};

const KITCHEN_CHANNEL_TABS: {
  id: KitchenChannel;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
}[] = [
  { id: 'all', label: 'All Orders', icon: Package, color: 'border-white/20 text-white bg-white/5' },
  { id: 'dine_in', label: 'Dine-In', icon: Utensils, color: 'border-amber-500/20 text-amber-500 bg-amber-500/5' },
  { id: 'online_delivery', label: 'Online Delivery', icon: ShoppingBag, color: 'border-blue-500/20 text-blue-500 bg-blue-500/5' },
];

const KITCHEN_STATUS_TABS = [
  { id: ORDER_STATUS.PENDING, label: 'New Orders', icon: AlertCircle, color: 'border-amber-500/20 text-amber-500 bg-amber-500/5' },
  { id: ORDER_STATUS.ACCEPTED, label: 'In Queue', icon: Utensils, color: 'border-blue-500/20 text-blue-500 bg-blue-500/5' },
  { id: ORDER_STATUS.COOKING, label: 'Cooking', icon: Package, color: 'border-orange-500/20 text-orange-500 bg-orange-500/5' },
  { id: ORDER_STATUS.READY, label: 'Ready', icon: CheckCircle2, color: 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5' },
  { id: ORDER_STATUS.CANCELLED, label: 'Cancelled', icon: XCircle, color: 'border-red-500/20 text-red-500 bg-red-500/5' },
];

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  border: string;
  glow: string;
  next?: string;
  nextLabel?: string;
  icon: React.ComponentType<any>;
}> = {
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

const KitchenOrderRow: React.FC<{
  order: Order;
  onUpdate: KitchenTabProps['onUpdate'];
  onDeleteOrder?: KitchenTabProps['onDeleteOrder'];
  onMarkPaid?: KitchenTabProps['onMarkPaid'];
  onEditOrder?: KitchenTabProps['onEditOrder'];
  updating: boolean;
  fmt: KitchenTabProps['fmt'];
}> = ({ order, onUpdate, onDeleteOrder, onMarkPaid, onEditOrder, updating, fmt }) => {
  const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG[ORDER_STATUS.PENDING];
  const timeStr = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const paymentMethod = order.payment_method?.toUpperCase();
  const canMarkPaid = !!paymentMethod
    && ['CASH', 'COD', 'ONLINE', 'CARD'].includes(paymentMethod)
    && !isPaymentComplete(order.payment_status);
  const markPaidLabel = (paymentMethod === 'CASH' || paymentMethod === 'COD')
    ? 'Mark Cash as Paid'
    : 'Mark Paid';
  const isDineIn = isDineInOrder(order);
  const typeLabel = isDineIn
    ? `Table ${order.table_number || 'NA'}`
    : 'Online Delivery';
  const customerEmail = (order as any).customer_email as string | null | undefined;
  const totalAmount = order.discount_amount ? (order.total_amount - order.discount_amount) : order.total_amount;
  const canCancelOrder = order.status === ORDER_STATUS.PENDING;
  const canDeleteOrder = order.status === ORDER_STATUS.PENDING || order.status === ORDER_STATUS.CANCELLED;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-3xl p-5"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-black text-white">#{order.id.slice(-4).toUpperCase()}</span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 ${config.color}`}>
              {typeLabel}
            </span>
            <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
              <Clock size={12} className="text-slate-600" /> {timeStr}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-black/40 border border-white/10 ${config.color}`}>
              {config.label}
            </span>
            {onEditOrder && order.status !== ORDER_STATUS.DELIVERED && order.status !== ORDER_STATUS.CANCELLED && (
              <button
                onClick={() => onEditOrder(order)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
                title="Edit order"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Customer</p>
            <p className="text-white text-sm font-bold flex items-center gap-2">
              <User size={12} className="text-slate-600" />
              {order.customer_name || 'Guest User'}
            </p>
            {order.customer_phone && (
              <p className="text-slate-400 text-xs flex items-center gap-2">
                <Phone size={12} className="text-slate-600" />
                {order.customer_phone}
              </p>
            )}
            {customerEmail && (
              <p className="text-slate-400 text-xs flex items-center gap-2">
                <Mail size={12} className="text-slate-600" />
                {customerEmail}
              </p>
            )}
            {order.customer_address && (
              <p className="text-slate-400 text-xs flex items-start gap-2">
                <MapPin size={12} className="text-slate-600 mt-0.5" />
                <span>{order.customer_address}</span>
              </p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Items</p>
            <div className="space-y-2">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between items-start gap-3">
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-orange-500 font-black text-xs">
                      {item.quantity}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{item.item_name}</p>
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
          </div>

          <div className="space-y-3">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Payment</p>
            <p className={`text-sm font-bold flex items-center gap-2 ${isPaymentComplete(order.payment_status) ? 'text-emerald-400' : 'text-slate-400'}`}>
              <ShoppingBag size={12} className="text-slate-600" />
              {order.payment_method} · {getPaymentStatusLabel(order.payment_status)}
            </p>
            <div className="text-slate-400 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{fmt(order.total_amount)}</span>
              </div>
              {order.discount_amount ? (
                <div className="flex items-center justify-between text-orange-400">
                  <span>Discount</span>
                  <span>- {fmt(order.discount_amount)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between text-white font-bold">
                <span>Total</span>
                <span>{fmt(totalAmount)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {canMarkPaid && onMarkPaid && (
                <button
                  onClick={() => onMarkPaid(order.id)}
                  className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/30"
                >
                  {markPaidLabel}
                </button>
              )}
              {canCancelOrder && (
                <button
                  disabled={updating}
                  onClick={() => onUpdate(order.id, ORDER_STATUS.CANCELLED)}
                  className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 disabled:opacity-50 text-red-300 text-[10px] font-black uppercase tracking-[0.2em] border border-red-500/30"
                >
                  Cancel Order
                </button>
              )}
              {canDeleteOrder && onDeleteOrder && (
                <button
                  disabled={updating}
                  onClick={() => onDeleteOrder(order.id)}
                  className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-300 text-[10px] font-black uppercase tracking-[0.2em] border border-red-500/20 flex items-center gap-2"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              )}
              {config.next && (
                <button
                  disabled={updating}
                  onClick={() => {
                    console.log('[KitchenTab] Button clicked for order:', order.id, 'new status:', config.next);
                    onUpdate(order.id, config.next!);
                  }}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2"
                >
                  {updating ? <Clock className="animate-spin" size={12} /> : (
                    <>
                      <ChevronRight size={12} />
                      {config.nextLabel}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const KitchenTab: React.FC<KitchenTabProps> = ({ orders, onUpdate, onDeleteOrder, onMarkPaid, onEditOrder, updating, fmt }) => {
  const [activeChannel, setActiveChannel] = useState<KitchenChannel>('all');
  const [activeStatus, setActiveStatus] = useState(ORDER_STATUS.PENDING);

  const channelCounts = useMemo(() => {
    return {
      all: orders.length,
      dine_in: orders.filter((order) => getKitchenChannel(order) === 'dine_in').length,
      online_delivery: orders.filter((order) => getKitchenChannel(order) === 'online_delivery').length,
    };
  }, [orders]);

  const channelFilteredOrders = useMemo(() => {
    if (activeChannel === 'all') return orders;
    return orders.filter((order) => getKitchenChannel(order) === activeChannel);
  }, [orders, activeChannel]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    KITCHEN_STATUS_TABS.forEach((tab) => { counts[tab.id] = 0; });
    channelFilteredOrders.forEach((order) => {
      if (counts[order.status] !== undefined) counts[order.status] += 1;
    });
    return counts;
  }, [channelFilteredOrders]);

  const visibleOrders = useMemo(() => {
    return channelFilteredOrders.filter((order) => order.status === activeStatus);
  }, [channelFilteredOrders, activeStatus]);

  useEffect(() => {
    if ((statusCounts[activeStatus] || 0) > 0) return;

    const fallbackStatus = KITCHEN_STATUS_TABS.find((tab) => (statusCounts[tab.id] || 0) > 0)?.id || ORDER_STATUS.PENDING;
    if (fallbackStatus !== activeStatus) {
      setActiveStatus(fallbackStatus);
    }
  }, [activeStatus, statusCounts]);

  return (
    <div className="space-y-6 pb-20">
      <section className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 px-1">Order Channels</p>
        <div className="flex flex-wrap gap-3">
        {KITCHEN_CHANNEL_TABS.map((tab) => (
          (() => {
            const count = channelCounts[tab.id] || 0;
            const hasOrders = count > 0;
            return (
          <button
            key={tab.id}
            onClick={() => setActiveChannel(tab.id)}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${
              activeChannel === tab.id
                ? `${tab.color} shadow-[0_0_20px_rgba(244,175,37,0.12)]`
                : 'bg-black/40 border-white/5 text-slate-500 hover:border-white/10'
            }`}
          >
            <div className="p-2 rounded-xl bg-black/40 border border-white/5">
              <tab.icon size={16} className={activeChannel === tab.id ? tab.color.split(' ')[1] : 'text-slate-600'} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-white/90">{tab.label}</span>
            <span className={`font-black text-xs px-3 py-1 rounded-full border transition-all ${
              hasOrders
                ? 'text-orange-200 bg-orange-500/25 border-orange-500/40 shadow-[0_0_14px_rgba(249,115,22,0.35)]'
                : 'text-slate-600 bg-white/5 border-white/5 shadow-inner'
            }`}>
              {count}
            </span>
          </button>
            );
          })()
        ))}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 px-1">Kitchen Stages</p>
        <div className="flex flex-wrap gap-3">
        {KITCHEN_STATUS_TABS.map((tab) => (
          (() => {
            const count = statusCounts[tab.id] || 0;
            const hasOrders = count > 0;
            return (
          <button
            key={tab.id}
            onClick={() => setActiveStatus(tab.id)}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${
              activeStatus === tab.id
                ? `${tab.color} shadow-[0_0_20px_rgba(244,175,37,0.12)]`
                : 'bg-black/40 border-white/5 text-slate-500 hover:border-white/10'
            }`}
          >
            <div className="p-2 rounded-xl bg-black/40 border border-white/5">
              <tab.icon size={16} className={activeStatus === tab.id ? tab.color.split(' ')[1] : 'text-slate-600'} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-white/90">{tab.label}</span>
            <span className={`font-black text-xs px-3 py-1 rounded-full border transition-all ${
              hasOrders
                ? 'text-orange-200 bg-orange-500/25 border-orange-500/40 shadow-[0_0_14px_rgba(249,115,22,0.35)]'
                : 'text-slate-600 bg-white/5 border-white/5 shadow-inner'
            }`}>
              {count}
            </span>
          </button>
            );
          })()
        ))}
        </div>
      </section>

      <div className="space-y-4">
        <AnimatePresence>
          {visibleOrders.length === 0 ? (
            <div className="text-slate-600 text-xs px-4">No orders in this stage.</div>
          ) : (
            visibleOrders.map((order) => (
              <KitchenOrderRow
                key={order.id}
                order={order}
                onUpdate={onUpdate}
                onDeleteOrder={onDeleteOrder}
                onMarkPaid={onMarkPaid}
                onEditOrder={onEditOrder}
                updating={updating === order.id}
                fmt={fmt}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default KitchenTab;
