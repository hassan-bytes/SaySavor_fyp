// ============================================================
// FILE: orderTypes.ts
// PURPOSE: Shared order types to enforce consistency across ALL components
//          - Standardizes status values
//          - Provides type safety
//          - Single source of truth for order structure
// ============================================================

// ── Standardized Status Values ──────────────────────────────
// CRITICAL: These must match across ALL components:
// - CustomerMenu.tsx (order creation)
// - UnifiedOrdersManager.tsx (dashboard)
// - KitchenTab.tsx (kanban view)
// - POSTab.tsx (manual order entry)
// - PartnerOrders.tsx (legacy - deprecate)
// - Database schema

export const ORDER_STATUS = {
  PENDING: 'pending',       // New order, needs acceptance
  ACCEPTED: 'accepted',     // Accepted, waiting for cooking
  COOKING: 'cooking',       // Currently being prepared
  READY: 'ready',           // Ready for delivery/pickup
  DELIVERED: 'delivered',   // Completed
  CANCELLED: 'cancelled',   // Cancelled
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

// ── Status Flow Configuration ───────────────────────────────
export const STATUS_CONFIG: Record<OrderStatus, {
  label: string;
  color: string;
  bg: string;
  border: string;
  glow?: string;
  next?: OrderStatus;
  nextLabel?: string;
  icon: string; // Icon name reference
}> = {
  [ORDER_STATUS.PENDING]: {
    label: 'New Order',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    glow: 'bg-amber-500/5',
    next: ORDER_STATUS.ACCEPTED,
    nextLabel: 'Accept & Cook',
    icon: 'AlertCircle'
  },
  [ORDER_STATUS.ACCEPTED]: {
    label: 'In Queue',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    glow: 'bg-blue-500/5',
    next: ORDER_STATUS.COOKING,
    nextLabel: 'Start Cooking',
    icon: 'Utensils'
  },
  [ORDER_STATUS.COOKING]: {
    label: 'Cooking',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    glow: 'bg-orange-500/5',
    next: ORDER_STATUS.READY,
    nextLabel: 'Mark Ready',
    icon: 'Package'
  },
  [ORDER_STATUS.READY]: {
    label: 'Ready',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    glow: 'bg-emerald-500/5',
    next: ORDER_STATUS.DELIVERED,
    nextLabel: 'Complete Order',
    icon: 'CheckCircle2'
  },
  [ORDER_STATUS.DELIVERED]: {
    label: 'Delivered',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: 'CheckCircle2'
  },
  [ORDER_STATUS.CANCELLED]: {
    label: 'Cancelled',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'XCircle'
  }
};

// ── Order Type Configuration ───────────────────────────────
export const ORDER_TYPE = {
  DINE_IN: 'DINE_IN',
  DELIVERY: 'DELIVERY',
  TAKEAWAY: 'TAKEAWAY'
} as const;

export type OrderType = typeof ORDER_TYPE[keyof typeof ORDER_TYPE];

// ── Core Order Interfaces ──────────────────────────────────
export interface OrderItem {
  id: string;
  item_name: string;
  unit_price: number;
  total_price: number;
  quantity: number;
  item_notes: string | null;
  variant_details?: any;
  menu_item_id?: string;
}

export interface Order {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  order_type: OrderType | string;
  status: OrderStatus;
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
  table_number?: string | null;
  session_status?: 'active' | 'closed' | null;
  restaurant_id?: string;
}

// ── Helper Functions ────────────────────────────────────────
export const getStatusConfig = (status: OrderStatus | string) => {
  return STATUS_CONFIG[status as OrderStatus] || STATUS_CONFIG[ORDER_STATUS.PENDING];
};

export const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
  return STATUS_CONFIG[currentStatus]?.next || null;
};

export const isActiveOrder = (status: OrderStatus | string): boolean => {
  return ![ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].includes(status as OrderStatus);
};

export const formatOrderPrice = (amount: number, currencySymbol: string = 'Rs.') => {
  return `${currencySymbol} ${(amount || 0).toLocaleString('en', { maximumFractionDigits: 0 })}`;
};

export const timeAgo = (dateString: string): string => {
  const diff = Date.now() - new Date(dateString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export const fmtDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// ── Validation Functions ───────────────────────────────────
export const isValidStatus = (status: string): status is OrderStatus => {
  return Object.values(ORDER_STATUS).includes(status as OrderStatus);
};

export const normalizeStatus = (status: string): OrderStatus => {
  // Map legacy/variant status values to standard
  const statusMap: Record<string, OrderStatus> = {
    'confirmed': ORDER_STATUS.ACCEPTED,
    'preparing': ORDER_STATUS.COOKING,
    'on_the_way': ORDER_STATUS.READY,
    'completed': ORDER_STATUS.DELIVERED,
    'pending': ORDER_STATUS.PENDING,
    'accepted': ORDER_STATUS.ACCEPTED,
    'cooking': ORDER_STATUS.COOKING,
    'ready': ORDER_STATUS.READY,
    'delivered': ORDER_STATUS.DELIVERED,
    'cancelled': ORDER_STATUS.CANCELLED
  };
  return statusMap[status.toLowerCase()] || ORDER_STATUS.PENDING;
};
