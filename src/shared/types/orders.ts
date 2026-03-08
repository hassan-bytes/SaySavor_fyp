// ============================================================
// FILE: orders.ts
// SECTION: shared > types
// PURPOSE: Orders se related TypeScript interfaces.
//          Order, OrderItem, OrderStatus types yahan defined hain.
// ============================================================
export interface Order {
    id: string;
    restaurant_id: string;
    table_number?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    customer_address?: string | null;
    order_type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
    total_amount: number;
    discount_amount: number;
    session_status: 'OPEN' | 'CLOSED' | 'PREPARING' | 'DISPATCHED';
    payment_status: 'PENDING' | 'PAID';
    payment_method?: 'CASH' | 'BANK' | 'ONLINE' | null;
    created_at: string;
    updated_at: string;
    // Optional joined data
    items?: OrderItem[];
}

export interface OrderItem {
    id: string;
    order_id: string;
    menu_item_id?: string | null;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    variant_details?: any; // JSONB storage for complex variants and addons
    created_at: string;
}
