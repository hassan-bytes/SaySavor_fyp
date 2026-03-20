// ============================================================
// FILE: menu.ts
// SECTION: shared > types
// PURPOSE: Menu se related TypeScript interfaces aur types.
//          MenuItem, Category, Modifier, Variant types yahan hain.
// ============================================================
export interface MenuVariant {
    id?: string;
    menu_item_id?: string;
    name: string;
    description?: string;
    price: number;
    original_price?: number | null;
    stock_count: number | null;
    is_available: boolean;
}

export interface Modifier {
    id?: string;
    name: string;
    price: number;
    stock_count: number | null;
    is_available: boolean;
}

export interface ModifierGroup {
    id?: string;
    name: string;
    min_selection: number;
    max_selection: number;
    required: boolean;
    modifiers: Modifier[];
}

export interface DealItem {
    item_id: string;
    item_name: string;
    original_price: number;
    quantity: number;
    image_url?: string | null;
    cuisine?: string | null;
    category?: string | null;
    is_free?: boolean;
}

export interface MenuItem {
    id: string;
    restaurant_id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    category_id: string | null;
    categories?: { name: string } | null;
    category?: string;
    cuisine: string | null;
    item_type?: 'single' | 'deal';
    deal_items?: DealItem[] | null;
    stock_count?: number | null;
    low_stock_threshold?: number | null;
    is_stock_managed?: boolean;
    is_available: boolean;
    original_price?: number | null;
    discount_percentage?: number | null;
    offer_name?: string | null;
    tags?: string[];
    variants?: MenuVariant[];
    available_start_time?: string | null;
    available_end_time?: string | null;
    modifier_groups?: ModifierGroup[];
    offer_expires_at?:      string | null;
    offer_original_price?:  number | null;
}
