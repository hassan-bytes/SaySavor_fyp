// ============================================================
// FILE: customer.ts
// SECTION: 3_customer > types
// PURPOSE: Customer side ke saray TypeScript interfaces.
//          Shared types (MenuItem, Order) src/shared/types se import hote hain.
// ============================================================

import type { MenuItem, MenuVariant, Modifier } from '@/shared/types/menu';

// ── Customer Profile ──────────────────────────────────────────
export interface Customer {
    id: string;
    phone: string | null;
    email: string | null;
    name: string | null;
    points: number;
    created_at: string;
}

// ── Auth ──────────────────────────────────────────────────────
export type AuthView = 'IDENTIFIER_ENTRY' | 'LOGIN' | 'SIGNUP';

export type IdentifierType = 'phone' | 'email';

// ── Cart ──────────────────────────────────────────────────────
export interface CartItem {
    menuItem: MenuItem;
    quantity: number;
    selectedVariant?: MenuVariant;
    selectedModifiers?: Modifier[];
    notes?: string;
}

// ── Restaurant Card (for listing) ─────────────────────────────
export interface RestaurantCard {
    id: string;
    name: string;
    image_url: string | null;
    cuisine_type: string | null;
    rating: number | null;
    delivery_time_min: number | null;
    delivery_fee: number | null;
    min_order: number | null;
    is_active: boolean;
    city: string | null;
}

// ── Order Type ────────────────────────────────────────────────
export type CustomerOrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

// ── Guest Mode ────────────────────────────────────────────────
export const GUEST_ID_KEY = 'ss_guest_id';
export const GUEST_MODE_KEY = 'ss_guest_mode';
