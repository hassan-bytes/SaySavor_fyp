// ============================================================
// FILE: supabaseClient.ts
// SECTION: shared > lib
// PURPOSE: Supabase client initialize karna â€” BaaS connection yahan hai.
//          Puri app mein yahan se supabase import hota hai.
//          .env file se VITE_SUPABASE_URL aur VITE_SUPABASE_ANON_KEY aata hai.
// ============================================================
/**
 * Supabase Client Initialization
 * 
 * This file initializes and exports the Supabase client instance
 * configured with environment variables.
 * 
 * Important: Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 * are set in your .env file before using this client.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
    throw new Error(
        'Missing VITE_SUPABASE_URL environment variable. ' +
        'Please add it to your .env file.'
    );
}

if (!supabaseAnonKey) {
    throw new Error(
        'Missing VITE_SUPABASE_ANON_KEY environment variable. ' +
        'Please add it to your .env file.'
    );
}

// Create and export the Supabase client with TypeScript types
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Configure auth settings
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});

// Export type helper for use in components
export type SupabaseClient = typeof supabase;

/**
 * Usage example in components:
 * 
 * import { supabase } from '@/shared/lib/supabaseClient';
 * 
 * // Type-safe query
 * const { data, error } = await supabase
 *   .from('restaurants')
 *   .select('*')
 *   .eq('id', restaurantId);
 * 
 * // TypeScript will automatically infer the correct types!
 */
