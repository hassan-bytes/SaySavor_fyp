import { useEffect, useState } from 'react';
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

  const fetchPromotions = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [limit]);

  return {
    promotions,
    loading,
    refresh: fetchPromotions,
  };
};
