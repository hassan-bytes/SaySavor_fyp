import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';

export interface PromotionRecord {
  id: string;
  code: string;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  max_discount: number | null;
  min_order: number | null;
  starts_at: string | null;
  ends_at: string | null;
  restaurant_id: string;
  restaurants: {
    id: string;
    name: string | null;
    logo_url: string | null;
    currency: string | null;
  } | null;
}

export const usePromotions = (limit: number = 6) => {
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshTimeoutRef = useRef<number | null>(null);

  const fetchPromotions = useCallback(async (background: boolean = false) => {
    if (!background) {
      setLoading(true);
    }
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select(`
          id,
          code,
          discount_type,
          discount_value,
          max_discount,
          min_order,
          starts_at,
          ends_at,
          restaurant_id,
          restaurants (
            id,
            name,
            logo_url,
            currency
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      setPromotions((data || []) as PromotionRecord[]);
    } catch (err) {
      console.error('usePromotions error:', err);
      setPromotions([]);
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, [limit]);

  const scheduleBackgroundRefresh = useCallback((delayMs: number = 300) => {
    if (refreshTimeoutRef.current !== null) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = window.setTimeout(() => {
      void fetchPromotions(true);
    }, delayMs);
  }, [fetchPromotions]);

  useEffect(() => {
    void fetchPromotions();
  }, [fetchPromotions]);

  useEffect(() => {
    const channel = supabase
      .channel('promotions-live-customer-home')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'promotions',
      }, () => {
        scheduleBackgroundRefresh();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'restaurants',
      }, (payload) => {
        const nextRow = payload.new as any;
        const prevRow = payload.old as any;
        const fieldsChanged =
          nextRow?.name !== prevRow?.name ||
          nextRow?.logo_url !== prevRow?.logo_url ||
          nextRow?.currency !== prevRow?.currency;

        if (fieldsChanged) {
          scheduleBackgroundRefresh();
        }
      })
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [scheduleBackgroundRefresh]);

  return {
    promotions,
    loading,
    refresh: fetchPromotions,
  };
};
