import { useState } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { supabase } from '@/shared/lib/supabaseClient';
import { MenuItem } from '@/shared/types/menu';
import { getFilesInFolder } from '@/2_partner/setup/pages/RestaurantSetup';
import { findBestPresetImage } from '@/shared/services/imageMatchService';

interface RestaurantInfo {
  name: string;
  description: string;
  address: string;
  phone: string;
  logo_url: string | null;
  opens_at?: string;
  closes_at?: string;
}

interface UseMenuExportProps {
  items: MenuItem[];
  restaurantInfo: RestaurantInfo | null;
  currencyCode: string;
  formatPriceDisplay: (price: number | string) => string;
}

export function useMenuExport({ items, restaurantInfo, currencyCode, formatPriceDisplay }: UseMenuExportProps) {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    format: 'png' as 'png' | 'jpg',
    theme: 'noir' as 'noir' | 'minimal' | 'royal',
    includeLocation: true,
    includeDescription: true,
  });

  const handleDownloadMenu = async () => {
    if (!items.length || !restaurantInfo) { toast.error('Menu data not ready'); return; }
    let exportToast: any;
    try {
      exportToast = toast.loading('Preparing Premium A4 Pages...');
      const slugify = (text: string) => text.toString().toLowerCase().replace(/[()]/g, '').replace(/\./g, '-').replace(/\s+/g, '-').replace(/ñ/g, 'n').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '').trim();
      const getSafeImg = (rawUrl: string | null) => {
        if (!rawUrl) return null;
        if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) return rawUrl;
        const blocked = ['share.google', 'drive.google.com/uc'];
        if (blocked.some(b => rawUrl.includes(b))) return null;
        if (rawUrl.includes('supabase.co') || rawUrl.includes('wsrv.nl')) return rawUrl;
        const encodedUrl = encodeURIComponent(decodeURI(rawUrl)).replace(/\(/g, '%28').replace(/\)/g, '%29');
        return `https://wsrv.nl/?url=${encodedUrl}`;
      };
      const getRealImgSrc = async (item: any): Promise<string | null> => {
        const containers = [document.querySelector(`[data-item-id="${item.id}"]`), document.getElementById(`menu-item-img-container-${item.id}`), document.getElementById(`dish-img-${item.name.replace(/\s+/g, '-')}`)];
        for (const container of containers) {
          if (container) {
            const img = container.querySelector('img');
            if (img && img.src && (img.src.startsWith('http') || img.src.startsWith('blob'))) return img.src;
          }
        }
        if (item.image_url && !['share.google', 'drive.google.com/uc'].some(b => item.image_url.includes(b))) return item.image_url;
        if (item.name) {
          let cleanCuisine = item.cuisine ? item.cuisine.trim() : 'Beverages';
          let cleanCategory = item.category ? item.category.trim() : 'Cold Drinks';
          const isBeverage = cleanCuisine === 'Beverages' || cleanCategory.toLowerCase().includes('drink') || cleanCategory.toLowerCase().includes('beverage');
          if (isBeverage) { cleanCuisine = 'Beverages'; cleanCategory = 'Cold Drinks'; }
          let targetName = item.name.trim();
          if (targetName.includes('Tex-Mex')) targetName = 'Jalapeno Popper Burgers';
          const folderPath = `${cleanCuisine}/${cleanCategory}`;
          const candidateFiles: string[] = [];
          if (!isBeverage) candidateFiles.push(`${targetName}.jpg`);
          candidateFiles.push(`${slugify(targetName)}.jpg`);
          try {
            const existingFiles = await getFilesInFolder(folderPath);
            for (const fileName of candidateFiles) {
              if (existingFiles.has(fileName)) {
                const { data } = supabase.storage.from('preset-images').getPublicUrl(`${folderPath}/${fileName}`);
                try {
                  const headResp = await fetch(data.publicUrl, { method: 'HEAD' });
                  if (headResp.ok) return data.publicUrl;
                } catch { }
              }
            }
          } catch { }
        }
        return null;
      };

      const themeMap = {
        noir: { bg: '#08080a', darkerBg: '#000000', cardBg: '#121214', accent: '#f59e0b', text: '#ffffff', mutedText: '#a1a1aa', border: '#2a2a2e', headerText: '#ffffff', dealGradient: 'linear-gradient(135deg, #1e1b4b 0%, #000 100%)', font: "'Inter', sans-serif" },
        minimal: { bg: '#ffffff', darkerBg: '#f8fafc', cardBg: '#ffffff', accent: '#0f172a', text: '#1e293b', mutedText: '#64748b', border: '#e2e8f0', headerText: '#0f172a', dealGradient: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)', font: "'Inter', sans-serif" },
        royal: { bg: '#3b0717', darkerBg: '#2d020d', cardBg: '#4c0519', accent: '#fbbf24', text: '#fff1f2', mutedText: '#fecdd3', border: '#9f1239', headerText: '#fbbf24', dealGradient: 'linear-gradient(135deg, #881337 0%, #4c0519 100%)', font: "'Oswald', sans-serif" },
        cream: { bg: '#fdfcf7', darkerBg: '#fef3c7', cardBg: '#ffffff', accent: '#7c2d12', text: '#431407', mutedText: '#9a3412', border: '#fde68a', headerText: '#7c2d12', dealGradient: 'linear-gradient(135deg, #ffedd5 0%, #fdba74 100%)', font: "'Playfair Display', serif" },
        teal: { bg: '#042f2e', darkerBg: '#0f172a', cardBg: '#0f766e', accent: '#fbbf24', text: '#f0fdfa', mutedText: '#99f6e4', border: '#115e59', headerText: '#ffffff', dealGradient: 'linear-gradient(135deg, #134e4a 0%, #042f2e 100%)', font: "'Inter', sans-serif" }
      };
      const themeStyles = themeMap[exportOptions.theme as keyof typeof themeMap] || themeMap.noir;

      const deals = items.filter(i => i.item_type === 'deal');
      const regularItems = items.filter(i => i.item_type !== 'deal');
      const grouped = regularItems.reduce((acc: any, item: any) => {
        let cat = item.category || 'Specials';
        if (cat === 'Sandwirches') cat = 'Sandwiches';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {});

      const dealImages: Record<string, string> = {};
      if (deals.length > 0) {
        toast.loading('Gathering Deal Collages...', { id: exportToast });
        for (const deal of deals) {
          let captured = false;
          const selectors = [`#deal-mosaic-${deal.id}`, `[data-item-id="${deal.id}"]`, `[data-deal-id="${deal.id}"]`];
          for (const sel of selectors) {
            const el = document.querySelector(sel) as HTMLElement | null;
            if (el) {
              try {
                const dealCanvas = await html2canvas(el as any, { scale: 3, useCORS: true, backgroundColor: null, logging: false } as any);
                dealImages[deal.id] = dealCanvas.toDataURL('image/png');
                captured = true;
              } catch (e) { }
              break;
            }
          }
          if (!captured) {
            const allImgs = document.querySelectorAll('img');
            for (const img of allImgs) {
              const alt = img.alt?.toLowerCase() || '';
              const dataName = img.closest('[data-item-name]')?.getAttribute('data-item-name')?.toLowerCase() || '';
              if ((alt && deal.name.toLowerCase().includes(alt)) || (alt && alt.includes(deal.name.toLowerCase())) || (dataName && deal.name.toLowerCase().includes(dataName))) {
                if (img.src && (img.src.startsWith('http') || img.src.startsWith('blob'))) { dealImages[deal.id] = img.src; captured = true; break; }
              }
            }
          }
          if (!captured && deal.image_url) {
            const blocked = ['share.google', 'drive.google.com/uc'];
            if (!blocked.some(b => deal.image_url.includes(b))) { dealImages[deal.id] = deal.image_url; captured = true; }
          }
          if (!captured && deal.deal_items && deal.deal_items.length > 0) {
            const itemName = deal.deal_items[0].item_name || '';
            if (itemName) {
              const matchedUrl = await findBestPresetImage(itemName, deal.category || 'Deals');
              if (matchedUrl) { dealImages[deal.id] = matchedUrl; captured = true; }
            }
          }
          if (!captured) dealImages[deal.id] = '';
        }
      }

      const dealCardsHtml = deals.map((deal, idx) => {
        const src = getSafeImg(dealImages[deal.id]);
        const includes = deal.deal_items?.map((di: any) => `<li>${di.item_name} x${di.quantity}</li>`).join('') || '';
        const isHero = idx === 0;
        return `<div style="width: 100%; background: ${themeStyles.dealGradient}; padding: ${isHero ? '60px' : '40px'}; border-radius: 50px; border: 6px solid ${themeStyles.accent}; display: flex; gap: 40px; align-items: center; box-shadow: 0 40px 80px rgba(0,0,0,0.5); margin-bottom: 50px; break-inside: avoid;">
                        <div style="width: ${isHero ? '350px' : '280px'}; height: ${isHero ? '350px' : '280px'}; border-radius: 40px; overflow: hidden; border: 12px solid #fff; flex-shrink: 0;">
                            <img src="${src}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;"> 
                        </div>
                        <div style="flex: 1;">
                            ${isHero ? `<div style="background: ${themeStyles.accent}; color: #000; padding: 5px 20px; border-radius: 12px; font-weight: 950; display: inline-block; margin-bottom: 15px; font-size: 20px; letter-spacing: 3px;">BEST VALUE</div>` : ''}
                            <div style="font-size: ${isHero ? '65px' : '45px'}; font-weight: 950; color: #fff; margin-bottom: 10px; text-transform: uppercase;">${deal.name}</div>
                            <div style="font-size: 22px; color: ${themeStyles.accent}; font-weight: 800; text-transform: uppercase; margin-bottom: 10px;">Includes:</div>
                            <ul style="color: rgba(255,255,255,0.9); font-size: 20px; padding-left: 25px; margin-bottom: 20px; font-weight: 700;">${includes}</ul>
                            <div style="font-size: ${isHero ? '90px' : '70px'}; font-weight: 950; color: ${themeStyles.accent};">${formatPriceDisplay(deal.price)}</div>
                        </div>
                    </div>`;
      });

      toast.loading('Resolving menu images...', { id: exportToast });
      const allRegularItems = Object.values(grouped).flat() as any[];
      const resolvedImages: Record<string, string | null> = {};
      await Promise.all(allRegularItems.map(async (item: any) => {
        const rawSrc = await getRealImgSrc(item);
        resolvedImages[item.id] = getSafeImg(rawSrc);
      }));

      const categoryCardsHtml = Object.keys(grouped).map(cat => {
        const itemsList = grouped[cat].map((item: any) => {
          const imgSrc = resolvedImages[item.id];
          return `<div style="margin-bottom: 25px; border-bottom: 2px solid ${themeStyles.border}22; padding-bottom: 15px; display: flex; align-items: flex-start; gap: 25px; break-inside: avoid;">${imgSrc ? `<div style="width: 100px; height: 100px; border-radius: 20px; overflow: hidden; border: 3px solid ${themeStyles.accent}; flex-shrink: 0;"><img src="${imgSrc}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}<div style="flex: 1;"><div style="display: flex; justify-content: space-between; align-items: flex-start;"><div style="font-size: 30px; font-weight: 950; color: ${themeStyles.text}; text-transform: uppercase; letter-spacing: 1px;">${item.name}</div><div style="font-size: 30px; font-weight: 950; color: ${themeStyles.accent}; white-space: nowrap; margin-left: 15px;">${formatPriceDisplay(item.price)}</div></div>${item.description ? `<div style="font-size: 18px; color: ${themeStyles.mutedText}; margin-top: 5px; font-weight: 600; line-height: 1.2;">${item.description}</div>` : ''}</div></div>`;
        }).join('');
        return `<div style="background: ${themeStyles.cardBg}; border-radius: 50px; border: 4px solid ${themeStyles.border}; padding: 50px; margin-bottom: 40px; box-shadow: 10px 10px 30px rgba(0,0,0,0.2); break-inside: avoid; border-left: 12px solid ${themeStyles.accent};"><div style="font-weight: 950; font-size: 38px; text-transform: uppercase; color: ${themeStyles.accent}; letter-spacing: 8px; margin-bottom: 30px; border-bottom: 5px solid ${themeStyles.accent}; display: inline-block; padding-bottom: 8px;">${cat}</div><div>${itemsList}</div></div>`;
      });

      const allContentCards = [...dealCardsHtml, ...categoryCardsHtml];
      const paginatedContent: string[][] = [[]];
      const MAX_WEIGHT = 7.5;
      let currentWeight = 0;

      allContentCards.forEach((card) => {
        const weight = card.includes('Includes:') ? 2.8 : 1;
        if (currentWeight + weight > MAX_WEIGHT && paginatedContent[paginatedContent.length - 1].length > 0) {
          paginatedContent.push([]);
          currentWeight = 0;
        }
        paginatedContent[paginatedContent.length - 1].push(card);
        currentWeight += weight;
      });

      const A4_WIDTH = 3508;
      const A4_HEIGHT = 2480;

      for (let i = 0; i < paginatedContent.length; i++) {
        toast.loading(`Rendering Page ${i + 1} of ${paginatedContent.length}...`, { id: exportToast });
        const ghost = document.createElement('div');
        Object.assign(ghost.style, { position: 'fixed', left: '-9999px', top: '0', zIndex: '-1', width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px`, display: 'flex', flexDirection: 'column', backgroundColor: themeStyles.bg, fontFamily: themeStyles.font, border: 'none', margin: '0', padding: '0' });
        const isFirst = i === 0;
        const header = isFirst ? `<div style="background: ${themeStyles.darkerBg}; padding: 90px 70px; text-align: center; border-bottom: 25px solid ${themeStyles.accent}; margin-bottom: 50px;">${restaurantInfo.logo_url ? `<img src="${restaurantInfo.logo_url}" crossorigin="anonymous" style="height: 120px; object-fit: contain; margin-bottom: 30px; border-radius: 20px;" />` : ''}<h1 style="font-size: 160px; font-weight: 950; color: ${themeStyles.headerText}; margin: 0; text-transform: uppercase; letter-spacing: 40px; line-height: 1;">${restaurantInfo.name}</h1><div style="font-size: 40px; color: ${themeStyles.accent}; margin-top: 30px; font-weight: 800; font-style: italic; letter-spacing: 12px; text-transform: uppercase;">${restaurantInfo.description || 'ESTABLISHED QUALITY'}</div>${restaurantInfo.opens_at && restaurantInfo.closes_at ? `<div style="font-size: 24px; color: ${themeStyles.mutedText}; margin-top: 25px; font-weight: 700; letter-spacing: 5px; text-transform: uppercase;">🕒 TIMINGS: ${restaurantInfo.opens_at} - ${restaurantInfo.closes_at}</div>` : ''}</div>` : `<div style="padding: 50px 80px; text-align: left; border-bottom: 15px solid ${themeStyles.accent}; margin-bottom: 40px; background: ${themeStyles.darkerBg}99;"><div style="font-size: 50px; font-weight: 950; color: ${themeStyles.accent}; text-transform: uppercase; letter-spacing: 15px;">${restaurantInfo.name} • MENU</div></div>`;
        ghost.innerHTML = `<div style="position: absolute; inset: 0; opacity: 0.04; background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px);"></div>${header}<div style="padding: 30px 100px; column-count: 2; column-gap: 80px; flex: 1; overflow: hidden; position: relative; z-index: 1;">${paginatedContent[i].join('')}</div><div style="background: ${themeStyles.darkerBg}; padding: 45px; text-align: center; border-top: 15px solid ${themeStyles.accent}; font-size: 28px; color: ${themeStyles.mutedText}; font-weight: 900; letter-spacing: 20px; text-transform: uppercase;">${restaurantInfo.phone} • ${restaurantInfo.address} • All prices in ${currencyCode} • PAGE ${i + 1}</div>`;
        document.body.appendChild(ghost);
        await new Promise(r => setTimeout(r, 2000));
        const canvas = await html2canvas(ghost, { scale: 1.2, backgroundColor: themeStyles.bg, useCORS: true, allowTaint: false, logging: false } as any);
        const format = exportOptions.format === 'jpg' ? 'image/jpeg' : 'image/png';
        const ext = exportOptions.format === 'jpg' ? 'jpg' : 'png';
        const pageImage = canvas.toDataURL(format, 1.0);

        const link = document.createElement('a');
        link.href = pageImage;
        link.download = `${slugify(restaurantInfo.name)}_Page_${i + 1}.${ext}`;
        link.click();
        document.body.removeChild(ghost);
      }
      toast.dismiss(exportToast);
      toast.success('Premium A4 Pages Downloaded! 📥🗞️💎');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Generation Failed', { id: exportToast });
    }
  };

  return {
    isExportDialogOpen,
    setIsExportDialogOpen,
    exportOptions,
    setExportOptions,
    handleDownloadMenu,
  };
}
