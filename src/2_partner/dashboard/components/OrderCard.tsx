// ============================================================
// FILE: OrderCard.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Ek order ka card component â€” items, status, customer info dikhata hai.
//          Accept, reject, cooking, ready buttons yahan hain.
// ============================================================
// ============================================
// ORDER CARD COMPONENT
// ============================================

import { Clock, User, Package, CheckCircle, XCircle, ChefHat, Receipt, Trash2, Edit2, CreditCard, Banknote } from 'lucide-react';
import { isPaymentComplete } from '@/shared/types/paymentTypes';

export interface OrderItem {
    id?: string;
    menu_item_id?: string;
    name: string;
    quantity: number;
    price?: number;
    unit_price?: number;
}

export interface Order {
    id: string;
    customer_name: string;
    customer_phone?: string;
    customer_address?: string;
    table_number?: string | null;
    order_type?: string;
    session_status?: string;
    items: OrderItem[];
    total_amount: number;
    discount_amount?: number;
    status: 'pending' | 'accepted' | 'cooking' | 'ready' | 'delivered' | 'cancelled';
    payment_status?: string;
    payment_method?: string;
    created_at: string;
    time_ago?: string;
}

interface OrderCardProps {
    order: Order;
    onAccept?: (orderId: string) => void;
    onReject?: (orderId: string) => void;
    onMarkCooking?: (orderId: string) => void;
    onMarkReady?: (orderId: string) => void;
    onSettleBill?: (order: Order) => void;
    onDeleteOrder?: (orderId: string) => void;
    onEditOrder?: (order: Order) => void;
    onRemoveItem?: (orderId: string, itemId: string) => void;
    isSelected?: boolean;
    onToggleSelect?: (orderId: string) => void;
    isDemoMode?: boolean;
    formatPrice?: (price: number) => string;
}

export const OrderCard = ({
    order,
    onAccept,
    onReject,
    onMarkCooking,
    onMarkReady,
    onSettleBill,
    onDeleteOrder,
    onEditOrder,
    onRemoveItem,
    isSelected,
    onToggleSelect,
    isDemoMode = false,
    formatPrice = (p: number) => p.toLocaleString('en', { maximumFractionDigits: 0 })
}: OrderCardProps) => {
    const statusConfig: Record<string, { label: string, icon: any, glowClass: string }> = {
        pending: {
            label: 'Pending',
            icon: Clock,
            glowClass: 'status-glow-pending text-amber-500',
        },
        accepted: {
            label: 'Accepted',
            icon: CheckCircle,
            glowClass: 'status-glow-pending text-blue-500 border-blue-500/50',
        },
        cooking: {
            label: 'Cooking',
            icon: ChefHat,
            glowClass: 'status-glow-cooking text-blue-400',
        },
        ready: {
            label: 'Ready',
            icon: Package,
            glowClass: 'status-glow-ready text-emerald-500',
        },
        delivered: {
            label: 'Delivered',
            icon: CheckCircle,
            glowClass: 'status-glow-delivered text-green-500 border-green-500/50',
        },
        cancelled: {
            label: 'Cancelled',
            icon: XCircle,
            glowClass: 'shadow-[0_0_15px_rgba(239,68,68,0.3)] border border-red-500/50 text-red-500',
        }
    };

    const currentStatus = order.status || 'pending';
    const config = statusConfig[currentStatus] || statusConfig['pending'];
    const StatusIcon = config.icon || Clock;

    const isActiveOrder = order.status !== 'delivered' && order.status !== 'cancelled';

    return (
        <div className={`order-glass-card rounded-2xl p-6 relative overflow-hidden group ${isSelected ? 'ring-2 ring-[var(--primary)] shadow-[0_0_25px_rgba(212,17,50,0.3)]' : ''}`}>
            {/* 3D Depth Effect Glow on Hover */}
            <div className="absolute -top-10 -right-10 w-32 h-32 ambient-glow-red opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

            {/* Select Checkbox for Bulk Actions */}
            {onToggleSelect && (
                <div
                    onClick={(e) => { e.stopPropagation(); onToggleSelect(order.id); }}
                    className="absolute z-40 top-4 right-4 cursor-pointer"
                >
                    <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="w-5 h-5 rounded border border-[var(--primary)]/30 bg-white/5 text-[var(--primary)] focus:ring-[var(--primary)]/50 cursor-pointer pointer-events-none"
                    />
                </div>
            )}

            {/* Header */}
            <div className={`flex justify-between items-start mb-4 relative z-10`}>
                <div>
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        Order #{order.id.slice(0, 4).toUpperCase()}
                        {order.order_type === 'DINE_IN' ? (
                            <span className="text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-md">Table {order.table_number || 'NA'}</span>
                        ) : (
                            <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">Delivery</span>
                        )}
                    </h3>
                    <p className="text-slate-400 text-sm mt-1 mb-1">{order.customer_name || 'Guest'} {order.customer_phone ? `• ${order.customer_phone}` : ''}</p>
                    {order.customer_address && (
                        <div className="flex items-start gap-1 text-xs text-slate-500 mt-1">
                            <span className="mt-0.5">📍</span>
                            <span>{order.customer_address}</span>
                        </div>
                    )}

                    {/* Payment Method & Status Badges */}
                    <div className="flex items-center gap-2 mt-2">
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${order.payment_method === 'ONLINE' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-500'
                            }`}>
                            {order.payment_method === 'ONLINE' ? (
                                <><CreditCard className="w-3 h-3" /> Online</>
                            ) : (
                                <><Banknote className="w-3 h-3" /> Cash</>
                            )}
                        </div>
                        {isPaymentComplete(order.payment_status) && (
                            <div className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Paid
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1 pr-8">
                    <div className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-solid inline-block mb-1 bg-[#18080a]/50 ${config.glowClass}`}>
                        {config.label}
                    </div>
                    <p className="text-slate-500 text-xs flex items-center gap-1 justify-end">
                        <Clock className="w-3.5 h-3.5" /> {order.time_ago || formatTimeAgo(order.created_at)}
                    </p>
                </div>
            </div>

            {/* Editing/Delete Top Icons (Next to Checkbox) */}
            <div className="absolute top-12 right-4 flex flex-col items-center gap-1 z-30">
                {onEditOrder && isActiveOrder && (
                    <button onClick={(e) => { e.stopPropagation(); onEditOrder(order); }} className="p-1.5 text-slate-500 hover:text-[var(--primary)] rounded-lg transition-colors" title="Edit Order">
                        <Edit2 className="w-4 h-4" />
                    </button>
                )}
                {onDeleteOrder && (
                    <button onClick={(e) => { e.stopPropagation(); onDeleteOrder(order.id); }} className="p-1.5 text-slate-500 hover:text-red-500 rounded-lg transition-colors" title="Delete Order">
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Items List */}
            <div className="space-y-3 mb-6 relative z-10 text-slate-300 border-t border-white/5 pt-4">
                {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm group/item">
                        <span className="flex gap-3">
                            <span className="font-bold text-white bg-white/5 w-6 h-6 flex items-center justify-center rounded text-xs">{item.quantity}x</span>
                            <span>{item.name}</span>
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-400">{formatPrice((item.price || item.unit_price || 0) * item.quantity)}</span>
                            {onRemoveItem && isActiveOrder && item.id && (
                                <button onClick={(e) => { e.stopPropagation(); onRemoveItem(order.id, item.id!); }} className="p-1 text-red-500 opacity-0 group-hover/item:opacity-100 transition-all hover:bg-red-500/10 rounded">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {/* Subtotals & Discounts */}
                {order.discount_amount ? (
                    <div className="space-y-1 mt-3 pt-3 border-t border-white/5">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500 font-medium">Subtotal</span>
                            <span className="text-slate-400 font-medium">{formatPrice(order.total_amount)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-[var(--primary)]">
                            <span className="font-semibold flex items-center gap-1">Discount</span>
                            <span className="font-bold">- {formatPrice(order.discount_amount)}</span>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Footer: Time, Total, Actions */}
            <div className="flex items-center justify-between border-t border-white/5 pt-4 relative z-10 flex-wrap gap-4">
                <div>
                    <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-1">Total Bill</p>
                    <p className="text-white text-xl font-black">
                        {formatPrice(order.discount_amount ? (order.total_amount - order.discount_amount) : order.total_amount)}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {order.status === 'pending' && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); onReject?.(order.id); }}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold btn-premium-reject"
                            >
                                Reject
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onAccept?.(order.id); }}
                                className="px-7 py-2.5 rounded-xl text-sm font-bold btn-premium-accept"
                            >
                                Accept
                            </button>
                        </>
                    )}

                    {order.status === 'accepted' && (
                        <button onClick={(e) => { e.stopPropagation(); onMarkCooking?.(order.id); }} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all flex items-center gap-2">
                            <ChefHat className="w-4 h-4" /> Start Cooking
                        </button>
                    )}

                    {order.status === 'cooking' && (
                        <button onClick={(e) => { e.stopPropagation(); onMarkReady?.(order.id); }} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2">
                            <Package className="w-4 h-4" /> Mark Ready
                        </button>
                    )}

                    {(order.status === 'ready' || order.status === 'delivered' || order.status === 'cancelled') && (
                        <div className="text-xs font-medium text-slate-500 flex items-center h-full pt-1">
                            {order.status === 'ready' && '✅ Ready'}
                            {order.status === 'delivered' && '🎉 Delivered'}
                            {order.status === 'cancelled' && '❌ Cancelled'}
                        </div>
                    )}
                </div>
            </div>

            {/* Settle Bill Check */}
            {order.order_type === 'DINE_IN' && order.session_status === 'OPEN' && order.status !== 'cancelled' && (
                <div className="mt-4 pt-4 border-t border-white/5 relative z-10">
                    <button onClick={(e) => { e.stopPropagation(); onSettleBill?.(order); }} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl">
                        <Receipt className="w-5 h-5" /> Settle Bill / Checkout
                    </button>
                </div>
            )}

            {isDemoMode && (
                <div className="mt-4 text-[10px] text-purple-400 bg-purple-500/10 rounded px-2 py-1 text-center border border-purple-500/20 relative z-10">
                    🎭 Demo Order - Actions Won't Save
                </div>
            )}
        </div>
    );
};

// Helper function to format timestamp
function formatTimeAgo(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// Helper function for full timestamp
function formatFullTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    return date.toLocaleString('en-US', options);
}
