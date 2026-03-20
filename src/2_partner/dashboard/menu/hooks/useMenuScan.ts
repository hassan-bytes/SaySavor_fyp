import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/shared/lib/supabaseClient';
import { scanMenuImage, ScannedMainCategory } from '@/shared/services/aiScannerService';

interface UseMenuScanProps {
  restId: string | null;
  fetchItems: () => Promise<void>;
}

export function useMenuScan({ restId, fetchItems }: UseMenuScanProps) {
  const [scannedItems, setScannedItems] = useState<ScannedMainCategory[]>(() => {
    try {
      const saved = localStorage.getItem('ss_scanned_items');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      localStorage.removeItem('ss_scanned_items');
      return [];
    }
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scannedItemImageUpdateIndex, setScannedItemImageUpdateIndex] = useState<{ mainIdx: number, subIdx: number, itemIdx: number } | null>(null);
  const scannedImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scannedItems.length === 0) {
      localStorage.removeItem('ss_scanned_items');
      return;
    }

    try {
      const serialized = JSON.stringify(scannedItems);
      const sizeInMB = new Blob([serialized]).size / (1024 * 1024);

      if (sizeInMB > 4) {
        toast.warning(
          'Scan data is large. Import your items before refreshing ' +
          'the page to avoid losing your scan results.'
        );
        return;
      }

      localStorage.setItem('ss_scanned_items', serialized);
    } catch (e) {
      toast.warning(
        'Could not save scan progress locally. ' +
        'Please import your items before leaving this page.'
      );
    }
  }, [scannedItems]);

  const handleScan = async () => {
    if (!scanFile) {
      toast.error('Please upload a menu image first');
      return;
    }

    setIsScanning(true);
    setScanStatus('Initializing Local OCR...');
    try {
      const result = await scanMenuImage(scanFile, (status) => setScanStatus(status));
      if (result.success && result.data) {
        setScannedItems(result.data);
        toast.success('Scan completed successfully!');
      } else {
        toast.error(result.error || 'Failed to scan menu');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during scanning');
    } finally {
      setIsScanning(false);
      setScanStatus(null);
    }
  };

  const handleImportScannedItems = async () => {
    if (!restId || scannedItems.length === 0 || isImporting) return;

    setIsImporting(true);
    let totalItemsCount = 0;

    const importPromise = (async () => {
      const catNames = new Set<string>();
      scannedItems.forEach(main => main.sub_categories?.forEach(sub => catNames.add(sub.name)));
      const uniqueCatNames = Array.from(catNames).filter(Boolean);

      const { data: existingCats } = await supabase.from('categories' as any).select('id, name').eq('restaurant_id', restId);
      const catMap = new Map<string, string>();
      (existingCats as any[])?.forEach((c: any) => catMap.set(c.name.toLowerCase().trim(), c.id));

      const missingCats = uniqueCatNames.filter(name => !catMap.has(name.toLowerCase().trim()));
      if (missingCats.length > 0) {
        const { data: newCats, error: catError } = await supabase.from('categories' as any).insert(missingCats.map(name => ({ restaurant_id: restId, name })) as any).select();
        if (catError) throw catError;
        (newCats as any[])?.forEach((c: any) => catMap.set(c.name.toLowerCase().trim(), c.id));
      }

      for (const main of scannedItems) {
        if (!main.sub_categories) continue;
        for (const sub of main.sub_categories) {
          const categoryId = catMap.get(sub.name.toLowerCase().trim()) || null;
          if (!sub.items) continue;

          for (const item of sub.items) {
            totalItemsCount++;
            let finalImageUrl = null;

            if (item.manualImage instanceof File) {
              const fileExt = item.manualImage.name.split('.').pop();
              const fileName = `${restId}/${uuidv4()}.${fileExt}`;
              const { error: uploadError } = await supabase.storage.from('menu-images').upload(fileName, item.manualImage);
              if (!uploadError) {
                const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(fileName);
                finalImageUrl = urlData.publicUrl;
              }
            }

            const isSingle = !item.variants || item.variants.length <= 1;
            const basePrice = isSingle && item.variants?.[0] ? item.variants[0].price : 0;

            const { data: insertedItem, error: itemError } = await supabase
              .from('menu_items')
              .insert({
                restaurant_id: restId, name: item.item_name, description: item.description,
                category_id: categoryId, item_type: isSingle ? 'single' : 'variable',
                is_available: true, image_url: finalImageUrl, cuisine: main.cuisine_type || null, price: basePrice
              } as any)
              .select().single();

            if (itemError) throw itemError;
            if (!insertedItem) throw new Error('Failed to insert item');

            if (!isSingle && item.variants && item.variants.length > 0) {
              const varsToInsert = item.variants.map(v => ({
                item_id: (insertedItem as any).id, name: v.size_or_type, price: v.price || 0, is_available: true
              }));
              const { error: varError } = await supabase.from('menu_variants').insert(varsToInsert as any);
              if (varError) throw varError;
            }
          }
        }
      }

      localStorage.removeItem('ss_scanned_items');
      setScannedItems([]);
      setScanFile(null);
      setScanPreview(null);
      await fetchItems();
      return totalItemsCount;
    })();

    toast.promise(importPromise, {
      loading: 'Importing full menu structure...',
      success: (count) => `Successfully imported ${count} items with their variants!`,
      error: 'Failed to import menu. Please retry.'
    });

    try {
      await importPromise;
    } catch (e) {
      console.error('Import error:', e);
    } finally {
      setIsImporting(false);
    }
  };

  return {
    scannedItems,
    setScannedItems,
    isScanning,
    scanStatus,
    isImporting,
    scanFile,
    setScanFile,
    scanPreview,
    setScanPreview,
    scannedItemImageUpdateIndex,
    setScannedItemImageUpdateIndex,
    scannedImageInputRef,
    handleScan,
    handleImportScannedItems,
  };
}
