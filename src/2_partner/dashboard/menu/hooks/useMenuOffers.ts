import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/shared/lib/supabaseClient';
import { MenuItem } from '@/shared/types/menu';

interface UseMenuOffersProps {
  items: MenuItem[];
  setItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  selectedItems: string[];
  setSelectedItems: React.Dispatch<React.SetStateAction<string[]>>;
  setIsSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useMenuOffers({
  items,
  setItems,
  setLoading,
  selectedItems,
  setSelectedItems,
  setIsSelectionMode,
}: UseMenuOffersProps) {
  const [itemForDirectOffer, setItemForDirectOffer] = useState<MenuItem | null>(null);
  const [directOfferDiscount, setDirectOfferDiscount] = useState(10);
  const [directOfferName, setDirectOfferName] = useState('');
  const [directOfferExpiresAt, setDirectOfferExpiresAt] = useState('');

  const handleApplyCategoryOffer = async (category: string, cuisine: string, discount: number, offerName: string) => {
    try {
      setLoading(true);
      const itemsToUpdate = items.filter(i => i.category === category && i.cuisine === cuisine && i.item_type !== 'deal');
      for (const item of itemsToUpdate) {
        const originalPrice = item.original_price || item.price;
        const newPrice = Math.round(originalPrice * (1 - discount / 100));
        const { error } = await (supabase.from('menu_items') as any)
          .update({
            price: newPrice,
            original_price: originalPrice,
            discount_percentage: discount,
            offer_name: offerName || null
          })
          .eq('id', item.id);
        if (error) throw error;
      }
      setItems(prev => prev.map(i => {
        if (i.category === category && i.cuisine === cuisine && i.item_type !== 'deal') {
          const originalPrice = i.original_price || i.price;
          return { ...i, price: Math.round(originalPrice * (1 - discount / 100)), original_price: originalPrice, discount_percentage: discount, offer_name: offerName || null };
        }
        return i;
      }));
      
      // Broadcast menu update to all connected customers
      try {
        const channel = supabase.channel('menu-updates');
        await channel.subscribe((status) => {
          console.log(`[useMenuOffers] Channel subscription status: ${status}`);
        });
        
        await channel.send('broadcast', {
          event: 'menu_updated',
          payload: {
            type: 'category_offer',
            category,
            cuisine,
            discount,
            offerName,
            timestamp: new Date().toISOString()
          }
        });
        supabase.removeChannel(channel);
      } catch (error) {
        console.error('Failed to broadcast menu update:', error);
      }
      
      toast.success(`Applied ${discount}% offer to all ${category} items!`);
    } catch (error) {
      toast.error('Failed to apply category offer');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCuisineOffer = async (cuisine: string, discount: number, offerName: string) => {
    try {
      setLoading(true);
      const itemsToUpdate = items.filter(i => i.cuisine === cuisine && i.item_type !== 'deal');
      for (const item of itemsToUpdate) {
        const originalPrice = item.original_price || item.price;
        const newPrice = Math.round(originalPrice * (1 - discount / 100));
        const { error } = await (supabase.from('menu_items') as any)
          .update({
            price: newPrice,
            original_price: originalPrice,
            discount_percentage: discount,
            offer_name: offerName || null
          })
          .eq('id', item.id);
        if (error) throw error;
      }
      setItems(prev => prev.map(i => {
        if (i.cuisine === cuisine && i.item_type !== 'deal') {
          const originalPrice = i.original_price || i.price;
          return { ...i, price: Math.round(originalPrice * (1 - discount / 100)), original_price: originalPrice, discount_percentage: discount, offer_name: offerName || null };
        }
        return i;
      }));
      
      // Broadcast menu update to all connected customers
      try {
        const channel = supabase.channel('menu-updates');
        await channel.send('broadcast', {
          event: 'menu_updated',
          payload: {
            type: 'cuisine_offer',
            cuisine,
            discount,
            offerName,
            timestamp: new Date().toISOString()
          }
        });
        supabase.removeChannel(channel);
      } catch (error) {
        console.error('Failed to broadcast menu update:', error);
      }
      
      toast.success(`Applied ${discount}% offer to all ${cuisine} items!`);
    } catch (error) {
      toast.error('Failed to apply cuisine offer');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyBulkOffer = async (discount: number, offerName: string) => {
    try {
      setLoading(true);
      const itemsToUpdate = items.filter(i => selectedItems.includes(i.id) && i.item_type !== 'deal');
      for (const item of itemsToUpdate) {
        const originalPrice = item.original_price || item.price;
        const newPrice = Math.round(originalPrice * (1 - discount / 100));
        const { error } = await (supabase.from('menu_items') as any)
          .update({
            price: newPrice,
            original_price: originalPrice,
            discount_percentage: discount,
            offer_name: offerName || null
          })
          .eq('id', item.id);
        if (error) throw error;
      }
      setItems(prev => prev.map(i => {
        if (selectedItems.includes(i.id) && i.item_type !== 'deal') {
          const originalPrice = i.original_price || i.price;
          return { ...i, price: Math.round(originalPrice * (1 - discount / 100)), original_price: originalPrice, discount_percentage: discount, offer_name: offerName || null };
        }
        return i;
      }));
      
      // Broadcast menu update to all connected customers
      try {
        const channel = supabase.channel('menu-updates');
        await channel.send('broadcast', {
          event: 'menu_updated',
          payload: {
            type: 'bulk_offer',
            itemCount: selectedItems.length,
            discount,
            offerName,
            timestamp: new Date().toISOString()
          }
        });
        supabase.removeChannel(channel);
      } catch (error) {
        console.error('Failed to broadcast menu update:', error);
      }
      
      toast.success(`Applied ${discount}% offer to ${selectedItems.length} selected items!`);
      setSelectedItems([]);
      setIsSelectionMode(false);
    } catch (error) {
      toast.error('Failed to apply bulk offer');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBulkOffer = async () => {
    try {
      setLoading(true);
      const itemsToUpdate = items.filter(i => selectedItems.includes(i.id) && i.item_type !== 'deal');
      for (const item of itemsToUpdate) {
        const originalPrice = item.original_price || item.price;
        const { error } = await (supabase as any).from('menu_items').update({ price: originalPrice, original_price: null, discount_percentage: null, offer_name: null }).eq('id', item.id);
        if (error) throw error;
      }
      setItems(prev => prev.map(i => {
        if (selectedItems.includes(i.id) && i.item_type !== 'deal') {
          return { ...i, price: i.original_price || i.price, original_price: null, discount_percentage: null, offer_name: null };
        }
        return i;
      }));
      toast.success(`Removed offers from ${selectedItems.length} items`);
      setSelectedItems([]);
      setIsSelectionMode(false);
    } catch (error) {
      toast.error('Failed to remove bulk offers');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCategoryOffer = async (category: string, cuisine: string) => {
    try {
      setLoading(true);
      const itemsToUpdate = items.filter(i => i.category === category && i.cuisine === cuisine && i.item_type !== 'deal');
      for (const item of itemsToUpdate) {
        const originalPrice = item.original_price || item.price;
        const { error } = await (supabase as any).from('menu_items').update({ price: originalPrice, original_price: null, discount_percentage: null, offer_name: null }).eq('id', item.id);
        if (error) throw error;
      }
      setItems(prev => prev.map(i => {
        if (i.category === category && i.cuisine === cuisine && i.item_type !== 'deal') {
          return { ...i, price: i.original_price || i.price, original_price: null, discount_percentage: null, offer_name: null };
        }
        return i;
      }));
      toast.success(`Removed offers for ${category}`);
    } catch (error) {
      toast.error('Failed to remove offer');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCuisineOffer = async (cuisine: string) => {
    try {
      setLoading(true);
      const itemsToUpdate = items.filter(i => i.cuisine === cuisine && i.item_type !== 'deal');
      for (const item of itemsToUpdate) {
        const originalPrice = item.original_price || item.price;
        const { error } = await (supabase as any).from('menu_items').update({ price: originalPrice, original_price: null, discount_percentage: null, offer_name: null }).eq('id', item.id);
        if (error) throw error;
      }
      setItems(prev => prev.map(i => {
        if (i.cuisine === cuisine && i.item_type !== 'deal') {
          return { ...i, price: i.original_price || i.price, original_price: null, discount_percentage: null, offer_name: null };
        }
        return i;
      }));
      toast.success(`Removed offers for entire ${cuisine} cuisine`);
    } catch (error) {
      toast.error('Failed to remove cuisine offers');
    } finally {
      setLoading(false);
    }
  };

  const handleClearOffer = async (item: MenuItem) => {
    try {
      setLoading(true);
      const originalPrice = item.original_price || item.price;
      const { error } = await (supabase as any).from('menu_items').update({ price: originalPrice, original_price: null, discount_percentage: null, offer_name: null }).eq('id', item.id);
      if (error) throw error;
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, price: originalPrice, original_price: null, discount_percentage: null, offer_name: null } : i));
      toast.success(`Removed offer for ${item.name}`);
    } catch (error) {
      toast.error('Failed to remove offer');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyIndividualOffer = async () => {
    if (!itemForDirectOffer) return;
    try {
      setLoading(true);
      const originalPrice = itemForDirectOffer.original_price || itemForDirectOffer.price;
      const newPrice = Math.round(originalPrice * (1 - directOfferDiscount / 100));
      const { error } = await (supabase.from('menu_items') as any)
        .update({
          price: newPrice,
          offer_original_price: originalPrice,
          discount_percentage: directOfferDiscount,
          offer_name: directOfferName || null,
          offer_expires_at: directOfferExpiresAt ? new Date(directOfferExpiresAt).toISOString() : null
        })
        .eq('id', itemForDirectOffer.id);
      if (error) throw error;
      setItems(prev => prev.map(i => i.id === itemForDirectOffer.id 
        ? { 
            ...i, 
            price: newPrice, 
            offer_original_price: originalPrice, 
            discount_percentage: directOfferDiscount, 
            offer_name: directOfferName || null,
            offer_expires_at: directOfferExpiresAt ? new Date(directOfferExpiresAt).toISOString() : null
          } : i));
      toast.success(`Applied ${directOfferDiscount}% offer to ${itemForDirectOffer.name}!`);
      setItemForDirectOffer(null);
      setDirectOfferName('');
    } catch (error) {
      toast.error('Failed to apply offer');
    } finally {
      setLoading(false);
    }
  };

  return {
    itemForDirectOffer,
    setItemForDirectOffer,
    directOfferDiscount,
    setDirectOfferDiscount,
    directOfferName,
    setDirectOfferName,
    directOfferExpiresAt,
    setDirectOfferExpiresAt,
    handleApplyCategoryOffer,
    handleRemoveCategoryOffer,
    handleApplyCuisineOffer,
    handleRemoveCuisineOffer,
    handleApplyBulkOffer,
    handleRemoveBulkOffer,
    handleApplyIndividualOffer,
    handleClearOffer,
  };
}
