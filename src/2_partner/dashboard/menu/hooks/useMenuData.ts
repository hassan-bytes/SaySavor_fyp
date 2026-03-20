import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/shared/lib/supabaseClient';
import { MenuItem } from '@/shared/types/menu';

interface RestaurantInfo {
  name: string;
  description: string;
  address: string;
  phone: string;
  logo_url: string | null;
  proprietorName: string;
  opens_at?: string;
  closes_at?: string;
}

export function useMenuData() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restId, setRestId] = useState<string | null>(null);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);

  const fetchItems = async () => {
    if (!restId) return;
    setLoading(true);
    try {
      const { data: menuData, error } = await supabase
        .from('menu_items')
        .select('*, categories(name)')
        .eq('restaurant_id', restId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const itemIds = (menuData || []).map((item: any) => item.id);
      let variantsByItem: Record<string, any[]> = {};
      let modifierGroupsByItem: Record<string, any[]> = {};

      if (itemIds.length > 0) {
        const { data: allVariants } = await (supabase as any)
          .from('menu_variants')
          .select('*')
          .in('item_id', itemIds);

        if (allVariants) {
          for (const v of allVariants) {
            if (!variantsByItem[v.item_id]) variantsByItem[v.item_id] = [];
            variantsByItem[v.item_id].push(v);
          }
        }

        const { data: allGroups } = await (supabase as any)
          .from('menu_modifier_groups')
          .select('*, menu_modifiers(*)')
          .in('item_id', itemIds);

        if (allGroups) {
          for (const group of allGroups) {
            if (!modifierGroupsByItem[group.item_id]) modifierGroupsByItem[group.item_id] = [];
            modifierGroupsByItem[group.item_id].push({
              ...group,
              modifiers: group.menu_modifiers || []
            });
          }
        }
      }

      const formattedData = (menuData || []).map((item: any) => ({
        ...item,
        category: item.categories?.name || 'Uncategorized',
        is_available: item.is_available ?? true,
        variants: variantsByItem[item.id] || [],
        modifier_groups: modifierGroupsByItem[item.id] || []
      }));

      setItems(formattedData);

      // Auto-expire check
      const now = new Date()
      const hasExpiredOffers = formattedData.some(item =>
        item.offer_expires_at && new Date(item.offer_expires_at) < now
      )

      if (hasExpiredOffers) {
        // Silent background call to expire them if cron hasn't yet
        supabase.rpc('expire_menu_offers').then(() => fetchItems())
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: rest } = await supabase
          .from('restaurants')
          .select('id, name, description, address, phone, logo_url, opens_at, closes_at, profiles(full_name)')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (rest) {
          const r = rest as any;
          setRestId(r.id);
          setRestaurantInfo({
            name: r.name || '',
            description: r.description || '',
            address: r.address || '',
            phone: r.phone || '',
            logo_url: r.logo_url,
            opens_at: r.opens_at,
            closes_at: r.closes_at,
            proprietorName: r.profiles?.full_name || 'Valued Partner'
          });
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Dashboard init error:', err);
        setLoading(false);
      }
    };

    initDashboard();
  }, []);

  useEffect(() => {
    if (restId) fetchItems();
  }, [restId]);

  return {
    items,
    setItems,
    loading,
    setLoading,
    restId,
    restaurantInfo,
    fetchItems,
  };
}
