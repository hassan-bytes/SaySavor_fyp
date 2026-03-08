// ============================================================
// FILE: database.types.ts
// SECTION: shared > lib
// PURPOSE: Supabase database ka pura TypeScript type definition.
//          Yeh Supabase CLI se generate hota hai.
//          Saari tables ki field types yahan defined hain.
// ============================================================
/**
 * Supabase Database Type Definitions
 * 
 * This file contains TypeScript interfaces for all database tables
 * to ensure type safety when querying Supabase.
 * 
 * Update these types as your database schema evolves.
 */

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string;
                    full_name: string | null;
                    avatar_url: string | null;
                    role: 'foodie' | 'partner';
                    setup_complete: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    role: 'foodie' | 'partner';
                    setup_complete?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    role?: 'foodie' | 'partner';
                    setup_complete?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            restaurants: {
                Row: {
                    id: string;
                    owner_id: string;
                    name: string;
                    business_category: string;
                    address: string;
                    city: string;
                    phone: string;
                    description: string | null;
                    cuisine_types: string[];
                    opening_hours: Record<string, any> | null;
                    logo_url: string | null;
                    subscription_plan_id: string | null;
                    subscription_status: 'trial' | 'active' | 'inactive' | 'cancelled';
                    trial_ends_at: string | null;
                    onboarding_completed: boolean;
                    is_open: boolean;
                    currency: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    owner_id: string;
                    name: string;
                    business_category: string;
                    address: string;
                    city: string;
                    phone: string;
                    description?: string | null;
                    cuisine_types: string[];
                    opening_hours?: Record<string, any> | null;
                    logo_url?: string | null;
                    subscription_plan_id?: string | null;
                    subscription_status?: 'trial' | 'active' | 'inactive' | 'cancelled';
                    trial_ends_at?: string | null;
                    onboarding_completed?: boolean;
                    is_open?: boolean;
                    currency?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    owner_id?: string;
                    name?: string;
                    business_category?: string;
                    address?: string;
                    city?: string;
                    phone?: string;
                    description?: string | null;
                    cuisine_types?: string[];
                    opening_hours?: Record<string, any> | null;
                    logo_url?: string | null;
                    subscription_plan_id?: string | null;
                    subscription_status?: 'trial' | 'active' | 'inactive' | 'cancelled';
                    trial_ends_at?: string | null;
                    onboarding_completed?: boolean;
                    is_open?: boolean;
                    currency?: string;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            orders: {
                Row: {
                    id: string;
                    restaurant_id: string;
                    customer_name: string;
                    customer_phone: string;
                    customer_email: string | null;
                    items: Record<string, any>[];
                    total_amount: number;
                    status: 'pending' | 'confirmed' | 'cooking' | 'ready' | 'delivered' | 'cancelled';
                    voice_recognition_data: Record<string, any> | null;
                    special_instructions: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    restaurant_id: string;
                    customer_name: string;
                    customer_phone: string;
                    customer_email?: string | null;
                    items: Record<string, any>[];
                    total_amount: number;
                    status?: 'pending' | 'confirmed' | 'cooking' | 'ready' | 'delivered' | 'cancelled';
                    voice_recognition_data?: Record<string, any> | null;
                    special_instructions?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    restaurant_id?: string;
                    customer_name?: string;
                    customer_phone?: string;
                    customer_email?: string | null;
                    items?: Record<string, any>[];
                    total_amount?: number;
                    status?: 'pending' | 'confirmed' | 'cooking' | 'ready' | 'delivered' | 'cancelled';
                    voice_recognition_data?: Record<string, any> | null;
                    special_instructions?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            menu_items: {
                Row: {
                    id: string;
                    restaurant_id: string;
                    name: string;
                    description: string | null;
                    price: number;
                    image_url: string | null;
                    category: string | null;
                    cultural_tags: string[];
                    available: boolean;
                    created_at: string;
                    updated_at: string;
                    // v2.0 fields
                    item_type?: 'single' | 'deal';
                    stock_count?: number | null;
                    is_available?: boolean;
                };
                Insert: {
                    id?: string;
                    restaurant_id: string;
                    name: string;
                    description?: string | null;
                    price: number;
                    image_url?: string | null;
                    category?: string | null;
                    cultural_tags?: string[];
                    available?: boolean;
                    created_at?: string;
                    updated_at?: string;
                    // v2.0 fields
                    item_type?: 'single' | 'deal';
                    stock_count?: number | null;
                    is_available?: boolean;
                };
                Update: {
                    id?: string;
                    restaurant_id?: string;
                    name?: string;
                    description?: string | null;
                    price?: number;
                    image_url?: string | null;
                    category?: string | null;
                    cultural_tags?: string[];
                    available?: boolean;
                    created_at?: string;
                    updated_at?: string;
                    // v2.0 fields
                    item_type?: 'single' | 'deal';
                    stock_count?: number | null;
                    is_available?: boolean;
                };
            };

            menu_variants: {
                Row: {
                    id: string;
                    item_id: string;
                    name: string;
                    price: number;
                    stock_count: number | null;
                    is_available: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    item_id: string;
                    name: string;
                    price: number;
                    stock_count?: number | null;
                    is_available?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    item_id?: string;
                    name?: string;
                    price?: number;
                    stock_count?: number | null;
                    is_available?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            menu_modifier_groups: {
                Row: {
                    id: string;
                    item_id: string;
                    name: string;
                    min_selection: number;
                    max_selection: number;
                    created_at: string;
                    updated_at: string;
                    menu_modifiers?: Database['public']['Tables']['menu_modifiers']['Row'][];
                };
                Insert: {
                    id?: string;
                    item_id: string;
                    name: string;
                    min_selection?: number;
                    max_selection?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    item_id?: string;
                    name?: string;
                    min_selection?: number;
                    max_selection?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            menu_modifiers: {
                Row: {
                    id: string;
                    group_id: string;
                    name: string;
                    price: number;
                    is_available: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    group_id: string;
                    name: string;
                    price?: number;
                    is_available?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    group_id?: string;
                    name?: string;
                    price?: number;
                    is_available?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            subscription_plans: {
                Row: {
                    id: string;
                    name: string;
                    price_monthly: number;
                    price_yearly: number | null;
                    commission_rate: number;
                    features: string[];
                    max_menu_items: number | null;
                    max_orders_per_month: number | null;
                    is_popular: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    price_monthly: number;
                    price_yearly?: number | null;
                    commission_rate: number;
                    features: string[];
                    max_menu_items?: number | null;
                    max_orders_per_month?: number | null;
                    is_popular?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    price_monthly?: number;
                    price_yearly?: number | null;
                    commission_rate?: number;
                    features?: string[];
                    max_menu_items?: number | null;
                    max_orders_per_month?: number | null;
                    is_popular?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            check_user_exists: {
                Args: { email_check: string };
                Returns: boolean;
            };
            get_dashboard_stats: {
                Args: { p_restaurant_id: string };
                Returns: {
                    revenue: number;
                    total_orders: number;
                    active_orders: number;
                    avg_prep_time: string;
                };
            };
        };
        Enums: {
            user_role: 'foodie' | 'partner';
            order_status: 'pending' | 'confirmed' | 'cooking' | 'ready' | 'delivered' | 'cancelled';
            subscription_status: 'trial' | 'active' | 'inactive' | 'cancelled';
        };
    };
}
