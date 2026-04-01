// ============================================================
// FILE: customerOrderService.ts  (FINAL — uses your actual DB columns)
//
// YOUR ACTUAL orders columns:
//   id, restaurant_id, table_number, customer_name,
//   customer_phone, customer_address, order_type,
//   total_amount, discount_amount, session_status,
//   payment_status, payment_method, created_at,
//   updated_at, status
//   + NEW: customer_id, delivery_fee, tax_amount,
//          is_guest, stripe_payment_intent_id
//
// YOUR ACTUAL order_items columns:
//   id, order_id, menu_item_id, item_name, quantity,
//   unit_price, total_price, variant_details, created_at
//   + NEW: item_notes, modifiers_info
// ============================================================
import { supabase } from '@/shared/lib/supabaseClient';
import type { CartItem } from '@/3_customer/types/customer';
import { ORDER_TYPE } from '@/shared/types/orderTypes';
import { PaymentStatus } from '@/shared/types/paymentTypes';

export interface CreateOrderParams {
    restaurant_id: string;
    total_amount: number;
    delivery_fee: number;
    tax_amount: number;
    discount_amount?: number;
    items: CartItem[];
    item_notes?: Record<number, string>;
    payment_method: 'COD' | 'ONLINE';
    delivery_address: string;   // → customer_address in DB
    delivery_phone: string;     // → customer_phone in DB
    customer_name?: string;     // → customer_name in DB
    customer_id?: string;       // → customer_id in DB
    is_guest?: boolean;         // → is_guest in DB
    stripe_payment_intent_id?: string;
    table_number?: string | null;
    order_type?: string;
}

export const customerOrderService = {

    async createOrder(params: CreateOrderParams) {
        // 1. Get current user (permanent or anonymous)
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('Login required to place an order.');
        }

        const isGuest = user.is_anonymous === true;

        // Determine and normalize order type
        const normalizedRequestedType = String(params.order_type || '')
            .trim()
            .toUpperCase()
            .replace('-', '_');

        const orderType = (
            normalizedRequestedType === ORDER_TYPE.DINE_IN
            || normalizedRequestedType === ORDER_TYPE.DELIVERY
            || normalizedRequestedType === ORDER_TYPE.TAKEAWAY
        )
            ? normalizedRequestedType
            : (params.table_number ? ORDER_TYPE.DINE_IN : ORDER_TYPE.DELIVERY);

        const buildOrderItems = (orderId: string) => params.items.map((item, index) => ({
            order_id: orderId,
            menu_item_id: item.menuItem.id,
            item_name: item.menuItem.name,
            unit_price: item.selectedVariant?.price ?? item.menuItem.price,
            total_price: (item.selectedVariant?.price ?? item.menuItem.price) * item.quantity,
            quantity: item.quantity,
            item_notes: params.item_notes?.[index] ?? null,
            variant_details: item.selectedVariant
                ? JSON.stringify(item.selectedVariant)
                : null,
            modifiers_info: item.selectedModifiers?.length
                ? JSON.stringify(item.selectedModifiers)
                : null,
        }));

        const stripePaymentIntentId = params.stripe_payment_intent_id?.trim();

        // ONLINE orders should be idempotent per Stripe PaymentIntent to avoid duplicates on retries
        if (params.payment_method === 'ONLINE' && stripePaymentIntentId) {
            const { data: existingOrder, error: existingOrderError } = await (supabase
                .from('orders') as any)
                .select('*')
                .eq('stripe_payment_intent_id', stripePaymentIntentId)
                .maybeSingle();

            if (existingOrderError) {
                console.warn('[customerOrderService] Existing Stripe order lookup failed:', existingOrderError);
            }

            if (existingOrder) {
                const { count: existingItemsCount, error: existingItemsError } = await (supabase
                    .from('order_items') as any)
                    .select('id', { count: 'exact', head: true })
                    .eq('order_id', existingOrder.id);

                if (!existingItemsError && (existingItemsCount ?? 0) === 0 && params.items.length > 0) {
                    const recoveryItems = buildOrderItems(existingOrder.id);
                    const { error: recoveryItemsError } = await (supabase
                        .from('order_items') as any)
                        .insert(recoveryItems);

                    if (recoveryItemsError) {
                        throw new Error(`Order items recovery failed: ${recoveryItemsError.message}`);
                    }
                }

                return existingOrder;
            }
        }

        // 2. Insert order — using YOUR actual column names
        const { data: orderData, error: orderError } = await (supabase
            .from('orders') as any)
            .insert({
                customer_id: user.id,          // NEW column we added
                restaurant_id: params.restaurant_id,
                customer_name: params.customer_name || (isGuest ? 'Guest' : null),
                customer_phone: params.delivery_phone,    // your column name
                customer_address: params.delivery_address,  // your column name
                order_type: orderType,
                table_number: params.table_number ?? null,
                total_amount: params.total_amount,
                discount_amount: params.discount_amount ?? 0,
                delivery_fee: params.delivery_fee,      // NEW column we added
                tax_amount: params.tax_amount,        // NEW column we added
                payment_method: params.payment_method,
                payment_status: params.payment_method === 'ONLINE' && stripePaymentIntentId
                    ? PaymentStatus.PAID
                    : PaymentStatus.PENDING,
                status: 'pending',
                session_status: 'active',
                is_guest: isGuest,          // NEW column we added
                stripe_payment_intent_id: stripePaymentIntentId ?? null,
            })
            .select()
            .single();

        if (orderError) {
            console.error('[customerOrderService] 💥 Order INSERT FAILED:', {
                message: orderError.message,
                code: orderError.code,
                details: orderError.details,
                hint: orderError.hint,
                status: orderError.status
            });
            throw orderError;
        }
        if (!orderData) throw new Error('Order creation returned no data');

        // 3. Insert order items — using YOUR actual column names
        // YOUR columns: unit_price (not item_price), total_price (not subtotal),
        //               variant_details (not variants_info)
        const orderItems = buildOrderItems(orderData.id);

        const { error: itemsError } = await (supabase
            .from('order_items') as any)
            .insert(orderItems);

        if (itemsError) {
            console.error('Order items insert error:', itemsError);
            throw new Error(`Order items failed: ${itemsError.message}`);
        }

        return orderData;
    },

    // Get all orders for current logged-in user
    async getMyOrders() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await (supabase
            .from('orders') as any)
            .select(`
        *,
        restaurants (
          id,
          name,
          logo_url,
          currency,
          phone
        )
      `)
            .eq('customer_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data ?? [];
    },

    // Get single order with items (for tracking page)
    async getOrderById(orderId: string) {
        const { data, error } = await (supabase
            .from('orders') as any)
            .select(`
        *,
        restaurants (
          id,
          name,
          logo_url,
          currency,
          phone,
          address
        ),
        order_items (
          id,
          item_name,
          unit_price,
          total_price,
          quantity,
          item_notes,
          variant_details,
          modifiers_info
        )
      `)
            .eq('id', orderId)
            .single();

        if (error) throw error;
        return data;
    },

    // Cancel pending order
    async cancelOrder(orderId: string) {
        const { data, error } = await (supabase
            .from('orders') as any)
            .update({ status: 'cancelled' })
            .eq('id', orderId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Legacy — kept for backward compat
    async getCustomerOrders(customerId: string) {
        const { data, error } = await (supabase
            .from('orders') as any)
            .select('*, restaurants(name, logo_url, currency)')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
};

// ── PARTNER ORDER SERVICE ─────────────────────────────────────
export const partnerOrderService = {

    async getRestaurantOrders(restaurantId: string, filters?: {
        status?: string;
        date?: 'today' | 'all';
        limit?: number;
    }) {
        let query = (supabase
            .from('orders') as any)
            .select(`
        id,
        status,
        payment_method,
        payment_status,
        total_amount,
        delivery_fee,
        tax_amount,
        discount_amount,
        customer_name,
        customer_phone,
        customer_address,
        order_type,
        is_guest,
        created_at,
        updated_at,
        order_items (
          id,
          item_name,
          unit_price,
          total_price,
          quantity,
          item_notes,
          variant_details
        )
      `)
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false });

        if (filters?.status && filters.status !== 'all') {
            query = query.eq('status', filters.status);
        }

        if (filters?.date === 'today') {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            query = query.gte('created_at', todayStart.toISOString());
        }

        if (filters?.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data ?? [];
    },

    async updateOrderStatus(
        orderId: string,
        newStatus: 'confirmed' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled'
    ) {
        const { data, error } = await (supabase
            .from('orders') as any)
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getOrderStats(restaurantId: string) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data, error } = await (supabase
            .from('orders') as any)
            .select('status, total_amount, created_at')
            .eq('restaurant_id', restaurantId)
            .gte('created_at', todayStart.toISOString());

        if (error) throw error;
        const orders = data ?? [];

        return {
            total: orders.length,
            pending: orders.filter(o => o.status === 'pending').length,
            confirmed: orders.filter(o => o.status === 'confirmed').length,
            preparing: orders.filter(o => o.status === 'preparing').length,
            on_the_way: orders.filter(o => o.status === 'on_the_way').length,
            delivered: orders.filter(o => o.status === 'delivered').length,
            cancelled: orders.filter(o => o.status === 'cancelled').length,
            revenue_today: orders
                .filter(o => o.status !== 'cancelled')
                .reduce((sum, o) => sum + (o.total_amount || 0), 0),
        };
    },
};