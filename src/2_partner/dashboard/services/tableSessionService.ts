/**
 * ============================================================
 * FILE: tableSessionService.ts
 * SECTION: 2_partner > dashboard > services
 * PURPOSE: Table session aggregation service
 *          Groups orders by table_number for accurate bill totals
 * ============================================================
 */

import { supabase } from '@/shared/lib/supabaseClient';
import type { Order } from '@/shared/types/orderTypes';

/**
 * TableSession Interface
 * 
 * Represents an aggregated view of all active orders for a single table.
 * Multiple orders at the same table are combined into one session.
 * 
 * BUSINESS LOGIC:
 * - A session = all non-delivered, non-cancelled orders for one table
 * - total_amount = SUM of all order amounts for that table
 * - order_count = COUNT of orders for that table
 * - created_at = earliest order time (when table was first occupied)
 */
export interface TableSession {
  /** Table number (e.g., "5", "12", "VIP-1") */
  table_number: string;
  
  /** Total bill amount for this table (sum of all orders) */
  total_amount: number;
  
  /** Number of orders at this table */
  order_count: number;
  
  /** When the table was first occupied (earliest order) */
  created_at: string;
  
  /** All individual orders for this table (for detailed view) */
  orders: Order[];
}

/**
 * Get Table Sessions
 * 
 * Fetches all active DINE_IN orders and groups them by table_number.
 * Each table becomes a "session" with aggregated totals.
 * 
 * AGGREGATION LOGIC:
 * 1. Fetch all DINE_IN orders where status != 'delivered' AND != 'cancelled'
 * 2. Group by table_number
 * 3. Calculate totals per table:
 *    - total_amount: SUM of order.total_amount
 *    - order_count: COUNT of orders
 *    - created_at: MIN created_at
 * 
 * EXAMPLE:
 * Table 5 has 3 orders:
 * - Order 1: Rs. 500
 * - Order 2: Rs. 300
 * - Order 3: Rs. 200
 * Result: TableSession { table_number: "5", total_amount: 1000, order_count: 3 }
 * 
 * @param restaurantId - Restaurant ID to filter orders
 * @returns Promise<TableSession[]> - Array of table sessions
 * 
 * @example
 * ```tsx
 * const sessions = await getTableSessions(restaurantId);
 * 
 * sessions.forEach(session => {
 *   console.log(`Table ${session.table_number}: Rs. ${session.total_amount}`);
 *   console.log(`Orders: ${session.order_count}`);
 * });
 * ```
 */
export async function getTableSessions(restaurantId: string): Promise<TableSession[]> {
  try {
    console.log('[TableSessionService] Fetching active DINE_IN orders for restaurant:', restaurantId);

    // Fetch all active DINE_IN orders (not delivered or cancelled)
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        table_number,
        total_amount,
        created_at,
        status,
        order_type,
        customer_name,
        payment_status,
        order_items(
          id,
          item_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('restaurant_id', restaurantId)
      .eq('order_type', 'DINE_IN')
      .not('status', 'in', '(delivered,cancelled)')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[TableSessionService] Query error:', error);
      return [];
    }

    if (!orders || orders.length === 0) {
      console.log('[TableSessionService] No active DINE_IN orders found');
      return [];
    }

    console.log('[TableSessionService] Found', orders.length, 'active DINE_IN orders');

    // Group orders by table_number
    const tableMap = new Map<string, Order[]>();

    orders.forEach((order: any) => {
      const tableNum = order.table_number?.toString() || 'Unknown';
      
      if (!tableMap.has(tableNum)) {
        tableMap.set(tableNum, []);
      }
      
      tableMap.get(tableNum)!.push(order as Order);
    });

    console.log('[TableSessionService] Grouped into', tableMap.size, 'table sessions');

    // Aggregate each table's orders into a session
    const sessions: TableSession[] = [];

    tableMap.forEach((tableOrders, tableNumber) => {
      // Calculate aggregated totals
      const total_amount = tableOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const order_count = tableOrders.length;
      
      // Find earliest order time (when table was first occupied)
      const created_at = tableOrders.reduce((earliest, order) => {
        return new Date(order.created_at) < new Date(earliest) ? order.created_at : earliest;
      }, tableOrders[0].created_at);

      const session: TableSession = {
        table_number: tableNumber,
        total_amount,
        order_count,
        created_at,
        orders: tableOrders,
      };

      sessions.push(session);

      console.log(
        `[TableSessionService] Table ${tableNumber}: Rs. ${total_amount} (${order_count} orders)`
      );
    });

    // Sort by table number for consistent display
    sessions.sort((a, b) => {
      const numA = parseInt(a.table_number) || 0;
      const numB = parseInt(b.table_number) || 0;
      return numA - numB;
    });

    return sessions;

  } catch (error) {
    console.error('[TableSessionService] Unexpected error:', error);
    return [];
  }
}

/**
 * Get Single Table Session
 * 
 * Fetches aggregated session data for a specific table.
 * Useful for displaying detailed bill for one table.
 * 
 * @param restaurantId - Restaurant ID
 * @param tableNumber - Table number to fetch
 * @returns Promise<TableSession | null> - Session or null if not found
 * 
 * @example
 * ```tsx
 * const session = await getTableSession(restaurantId, "5");
 * if (session) {
 *   console.log(`Table 5 bill: Rs. ${session.total_amount}`);
 * }
 * ```
 */
export async function getTableSession(
  restaurantId: string,
  tableNumber: string
): Promise<TableSession | null> {
  const sessions = await getTableSessions(restaurantId);
  return sessions.find(s => s.table_number === tableNumber) || null;
}

/**
 * USAGE NOTES:
 * 
 * 1. Call after each order update to refresh table totals
 * 2. Use with real-time listener for instant updates
 * 3. Empty tables won't appear in results (no active orders)
 * 4. Delivered/cancelled orders are excluded from totals
 * 
 * INTEGRATION EXAMPLE:
 * ```tsx
 * // In UnifiedOrdersManager.tsx
 * const [tableSessions, setTableSessions] = useState<TableSession[]>([]);
 * 
 * const refreshSessions = async () => {
 *   const sessions = await getTableSessions(restaurantId);
 *   setTableSessions(sessions);
 * };
 * 
 * // Call on mount and after order updates
 * useEffect(() => {
 *   refreshSessions();
 * }, [restaurantId]);
 * 
 * // In real-time listener
 * setupOrderRealtimeListener({
 *   restaurantId,
 *   onOrderChange: () => {
 *     fetchOrders();
 *     refreshSessions(); // ← Refresh table totals
 *   }
 * });
 * ```
 * 
 * TESTING CHECKLIST:
 * ✅ Single order at table: total = order amount
 * ✅ Multiple orders at table: total = sum of all
 * ✅ Deliver one order: total recalculates (remaining orders only)
 * ✅ Multiple tables: Each aggregated independently
 * ✅ Empty restaurant: Returns empty array (no crash)
 * ✅ Real-time updates: Totals update on order changes
 */
