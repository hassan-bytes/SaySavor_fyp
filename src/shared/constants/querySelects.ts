/**
 * ============================================================
 * FILE: querySelects.ts
 * SECTION: shared > constants
 * PURPOSE: Single source of truth for Supabase query selects
 *          Ensures consistency across all components
 *          Prevents "cannot read property X of undefined" errors
 * ============================================================
 */

/**
 * ORDER_WITH_ITEMS_SELECT
 * 
 * Complete order query with nested order_items and modifiers.
 * Use this constant in ALL components that fetch orders.
 * 
 * STRUCTURE:
 * - Root: All order table fields needed for display/logic
 * - Nested: order_items with full details
 * - Deep nested: variant_details and modifiers_info (JSONB fields)
 * 
 * USAGE EXAMPLES:
 * 
 * ```tsx
 * // UnifiedOrdersManager.tsx
 * const { data } = await supabase
 *   .from('orders')
 *   .select(ORDER_WITH_ITEMS_SELECT)
 *   .eq('restaurant_id', restaurantId)
 *   .order('created_at', { ascending: false });
 * 
 * // KitchenTab.tsx
 * const { data } = await supabase
 *   .from('orders')
 *   .select(ORDER_WITH_ITEMS_SELECT)
 *   .eq('restaurant_id', restaurantId)
 *   .in('status', ['pending', 'accepted', 'cooking', 'ready']);
 * 
 * // HistoryTab.tsx
 * const { data } = await supabase
 *   .from('orders')
 *   .select(ORDER_WITH_ITEMS_SELECT)
 *   .eq('restaurant_id', restaurantId)
 *   .in('status', ['delivered', 'cancelled']);
 * ```
 * 
 * SAFE ACCESS:
 * ```tsx
 * // ✅ ALWAYS check array length before accessing index 0
 * if(order.order_items && order.order_items.length > 0) {
 *   const firstItem = order.order_items[0];
 *   const itemName = firstItem.item_name; // ✅ Always defined
 *   const variantDetails = firstItem.variant_details; // ✅ JSONB object or null
 * }
 * 
 * // ✅ Use optional chaining with length check:
 * const modifiersInfo = order.order_items?.[0]?.modifiers_info;
 * ```
 * order.order_items[0].modifiers_info // ✅ JSONB array or null
 * order.customer_name // ✅ Always defined
 * order.total_amount // ✅ Always defined
 * ```
 * 
 * FIELDS INCLUDED:
 * - Order ID and timestamps
 * - Customer information (name, phone, address)
 * - Order type and table number
 * - Status and payment info
 * - Amounts (total, delivery fee, tax, discount)
 * - Order items with quantities and prices
 * - Variant details (size, options, etc.)
 * - Modifiers info (addons, extras, etc.)
 * - Special instructions and notes
 * 
 * @constant
 * @type {string}
 */
export const ORDER_WITH_ITEMS_SELECT = `
  id,
  restaurant_id,
  customer_id,
  customer_name,
  customer_phone,
  customer_address,
  table_number,
  order_type,
  status,
  payment_method,
  payment_status,
  total_amount,
  delivery_fee,
  tax_amount,
  discount_amount,
  session_status,
  is_guest,
  created_at,
  updated_at,
  order_items(
    id,
    order_id,
    menu_item_id,
    item_name,
    quantity,
    unit_price,
    total_price,
    item_notes,
    variant_details,
    modifiers_info
  )
` as const;

/**
 * ORDER_SUMMARY_SELECT
 * 
 * Lightweight order query without order_items.
 * Use for dashboards, counts, and lists where item details aren't needed.
 * 
 * USAGE:
 * ```tsx
 * // Dashboard totals
 * const { data } = await supabase
 *   .from('orders')
 *   .select(ORDER_SUMMARY_SELECT)
 *   .eq('restaurant_id', restaurantId)
 *   .in('status', ['pending', 'accepted', 'cooking']);
 * ```
 * 
 * @constant
 * @type {string}
 */
export const ORDER_SUMMARY_SELECT = `
  id,
  restaurant_id,
  customer_name,
  table_number,
  order_type,
  status,
  payment_status,
  total_amount,
  created_at
` as const;

/**
 * ORDER_ITEMS_ONLY_SELECT
 * 
 * Query for fetching order items separately.
 * Use when you already have the order and need to fetch/refresh items.
 * 
 * USAGE:
 * ```tsx
 * const { data } = await supabase
 *   .from('order_items')
 *   .select(ORDER_ITEMS_ONLY_SELECT)
 *   .eq('order_id', orderId);
 * ```
 * 
 * @constant
 * @type {string}
 */
export const ORDER_ITEMS_ONLY_SELECT = `
  id,
  order_id,
  menu_item_id,
  item_name,
  quantity,
  unit_price,
  total_price,
  item_notes,
  variant_details,
  modifiers_info
` as const;

/**
 * COMMON FILTERS
 * 
 * Reusable filter combinations for common queries.
 */
export const ORDER_FILTERS = {
  /** Active orders (not delivered or cancelled) */
  ACTIVE: ['pending', 'accepted', 'cooking', 'ready'],
  
  /** Completed orders */
  COMPLETED: ['delivered', 'cancelled'],
  
  /** Kitchen workflow statuses */
  KITCHEN: ['pending', 'accepted', 'cooking', 'ready'],
  
  /** Pending payment */
  UNPAID: (paymentStatus: string) => paymentStatus !== 'PAID',
} as const;

/**
 * TYPE GUARDS
 * 
 * Helper functions to validate query results.
 */
export const hasOrderItems = (order: any): order is { order_items: any[] } => {
  return Array.isArray(order?.order_items);
};

export const isValidOrder = (order: any): boolean => {
  return (
    order &&
    typeof order.id === 'string' &&
    typeof order.total_amount === 'number' &&
    hasOrderItems(order)
  );
};

/**
 * MIGRATION GUIDE
 * 
 * Replace existing queries with ORDER_WITH_ITEMS_SELECT:
 * 
 * BEFORE:
 * ```tsx
 * .select('*, order_items(*)')
 * .select(`
 *   id,
 *   customer_name,
 *   order_items(*)
 * `)
 * ```
 * 
 * AFTER:
 * ```tsx
 * .select(ORDER_WITH_ITEMS_SELECT)
 * ```
 * 
 * COMPONENTS TO UPDATE:
 * - ✅ UnifiedOrdersManager.tsx (line 113)
 * - ✅ KitchenTab.tsx (if has separate query)
 * - ✅ POSTab.tsx (if has separate query)
 * - ✅ HistoryTab.tsx (if has separate query)
 * - ✅ TableMapTab.tsx (if has separate query)
 * - ✅ Partner_Dashboard.tsx (if fetches orders)
 */
