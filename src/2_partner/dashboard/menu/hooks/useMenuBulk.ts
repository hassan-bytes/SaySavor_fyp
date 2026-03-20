import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/shared/lib/supabaseClient';
import { MenuItem } from '@/shared/types/menu';

interface UseMenuBulkProps {
  items: MenuItem[];
  setItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  fetchItems: () => Promise<void>;
}

export function useMenuBulk({ items, setItems, setLoading, fetchItems }: UseMenuBulkProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isBulkPriceDialogOpen, setIsBulkPriceDialogOpen] = useState(false);
  const [bulkPriceChange, setBulkPriceChange] = useState(0);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  const handleBulkAvailabilityToggle = async (availability: boolean) => {
    if (selectedItems.length === 0) return;
    try {
      setLoading(true);
      const { error } = await (supabase.from('menu_items') as any)
        .update({ is_available: availability })
        .in('id', selectedItems);

      if (error) throw error;

      setItems(prev => prev.map(item =>
        selectedItems.includes(item.id) ? { ...item, is_available: availability } : item
      ));

      toast.success(`Updated ${selectedItems.length} items to ${availability ? 'Available' : 'Unavailable'}`);
      setSelectedItems([]);
      setIsSelectionMode(false);
    } catch (error) {
      toast.error('Failed to update items');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPriceUpdate = async () => {
    if (selectedItems.length === 0) return;
    try {
      setLoading(true);
      const factor = 1 + (bulkPriceChange / 100);
      const selectedItemsData = items.filter(i => selectedItems.includes(i.id));

      for (const item of selectedItemsData) {
        const newPrice = Math.round(item.price * factor);
        const { error: itemError } = await (supabase as any)
          .from('menu_items')
          .update({ price: newPrice })
          .eq('id', item.id);

        if (itemError) throw itemError;

        if (item.variants && item.variants.length > 0) {
          for (const v of item.variants) {
            if (v.id) {
              const newVPrice = Math.round(v.price * factor);
              await (supabase as any)
                .from('menu_variants')
                .update({ price: newVPrice })
                .eq('id', v.id);
            }
          }
        }
      }

      await fetchItems();
      toast.success(`Prices updated for ${selectedItems.length} items`);
      setIsBulkPriceDialogOpen(false);
      setSelectedItems([]);
      setIsSelectionMode(false);
    } catch (error) {
      toast.error('Failed to update prices');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    setIsBulkDeleteConfirmOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.from('menu_items').delete().in('id', selectedItems);
      if (error) throw error;
      setItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
      toast.success(`${selectedItems.length} item(s) deleted successfully`);
      setSelectedItems([]);
      setIsSelectionMode(false);
      setIsBulkDeleteConfirmOpen(false);
    } catch (error) {
      toast.error('Failed to delete items');
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return {
    isSelectionMode,
    setIsSelectionMode,
    selectedItems,
    setSelectedItems,
    isBulkPriceDialogOpen,
    setIsBulkPriceDialogOpen,
    bulkPriceChange,
    setBulkPriceChange,
    isBulkDeleteConfirmOpen,
    setIsBulkDeleteConfirmOpen,
    handleBulkAvailabilityToggle,
    handleBulkPriceUpdate,
    handleBulkDelete,
    confirmBulkDelete,
    toggleItemSelection,
  };
}
