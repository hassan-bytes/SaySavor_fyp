import os

file_path = "e:/semester 7/saysavor-web/saysavor-golden-voice-main/src/pages/dashboard/MenuManager.tsx"

# The final handler with all fixes synced
new_handle_download = r'''    const handleDownloadMenu = async () => {
        if (!items.length || !restaurantInfo) {
            toast.error("Menu data not ready");
            return;
        }

        try {
            const exportToast = toast.loading("Generating Multi-Page Horizontal Spread (Master Edition)...");

            // Helper: Slugify (Bulletproof V17 - Sync)
            const slugify = (text: string) => {
                return text.trim().toLowerCase().replace(/[()]/g, '').replace(/\./g, '-').replace(/\s+/g, '-').replace(/ñ/g, 'n').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
            };

            // Helper: Safe Image Wrapper (CORS/CORB Proxy)
            const getSafeImg = (rawUrl: string | null) => {
                if (!rawUrl) return null;
                if (rawUrl.startsWith('data:')) return rawUrl;
                // Use wsrv.nl as an image proxy to guarantee CORS headers for html2canvas
                return `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}&default=https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg`;
            };

            // Helper: Get Image Source (Bulletproof Sync)
            const getRealImgSrc = (item: any) => {
                const containers = [
                    document.querySelector(`[data-item-id="${item.id}"]`),
                    document.getElementById(`menu-item-img-container-${item.id}`),
                    document.getElementById(`dish-img-${item.name.replace(/\s+/g, '-')}`)
                ];
                for (const container of containers) {
                    if (container) {
                        const img = container.querySelector('img');
                        if (img && img.src && img.src.startsWith('http')) {
                            // If it's already proxied, strip and re-proxy or just return
                            if (img.src.includes('wsrv.nl')) return img.src;
                            return img.src;
                        }
                    }
                }
                
                if (item.image_url) return item.image_url;
                
                if (item.cuisine && item.category && item.name) {
                    const cleanCuisine = item.cuisine.trim();
                    let cleanCategory = item.category.trim();
                    if (cleanCuisine === 'Beverages' && cleanCategory === 'ColdDrinks') cleanCategory = 'Cold Drinks';
                    
                    // SMART MAPPING: Same as Dashboard
                    let targetName = item.name.trim();
                    if (targetName.includes('Tex-Mex Jalapeño Popper Burger')) targetName = 'Jalapeno Popper Burgers';

                    const bucket = supabase.storage.from('preset-images');
                    
                    // Priority: Slugified (for Beverages)
                    if (cleanCuisine === 'Beverages') {
                        const { data } = bucket.getPublicUrl(`${cleanCuisine}/${cleanCategory}/${slugify(targetName)}.jpg`);
                        return data.publicUrl;
                    }

                    // Otherwise try Original
                    const { data } = bucket.getPublicUrl(`${cleanCuisine}/${cleanCategory}/${targetName}.jpg`);
                    return data.publicUrl;
                }
                return null;
            };

            const styles = {
                noir: { bg: '#0f0f12', darkerBg: '#050505', cardBg: '#1c1c1f', accent: '#f59e0b', text: '#ffffff', mutedText: '#a1a1aa', border: '#2a2a2e', headerText: '#ffffff', dealGradient: 'linear-gradient(135deg, #1e1b4b 0%, #000 100%)', font: "'Inter', sans-serif" },
                minimal: { bg: '#f8fafc', darkerBg: '#ffffff', cardBg: '#ffffff', accent: '#0f172a', text: '#1e293b', mutedText: '#64748b', border: '#e2e8f0', headerText: '#0f172a', dealGradient: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)', font: "'Inter', sans-serif" },
                royal: { bg: '#4c0519', darkerBg: '#2d020d', cardBg: '#700320', accent: '#fbbf24', text: '#fff1f2', mutedText: '#fecdd3', border: '#9f1239', headerText: '#fbbf24', dealGradient: 'linear-gradient(135deg, #881337 0%, #4c0519 100%)', font: "'Oswald', sans-serif" },
                cream: { bg: '#fffdf5', darkerBg: '#fef3c7', cardBg: '#ffffff', accent: '#7c2d12', text: '#431407', mutedText: '#9a3412', border: '#fde68a', headerText: '#7c2d12', dealGradient: 'linear-gradient(135deg, #ffedd5 0%, #fdba74 100%)', font: "'Playfair Display', serif" },
                teal: { bg: '#042f2e', darkerBg: '#0d9488', cardBg: '#0f766e', accent: '#fbbf24', text: '#f0fdfa', mutedText: '#99f6e4', border: '#115e59', headerText: '#ffffff', dealGradient: 'linear-gradient(135deg, #134e4a 0%, #042f2e 100%)', font: "'Inter', sans-serif" }
            }[exportOptions.theme] || styles.noir;

            // 1. Prepare Content
            const deals = items.filter(i => i.item_type === 'deal');
            const regularItems = items.filter(i => i.item_type !== 'deal');
            const grouped = regularItems.reduce((acc: any, item: any) => {
                const cat = item.category || 'Specials';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
            }, {});

            // Capture Mosaic Images for deals
            const dealImages: Record<string, string> = {};
            if (deals.length > 0) {
                toast.loading("Gathering Deal Collages...", { id: exportToast });
                for (const deal of deals) {
                    const mosaicId = `deal-mosaic-${deal.id}`;
                    let dealElement = document.getElementById(mosaicId);
                    if (!dealElement) dealElement = document.querySelector(`[data-item-id="${deal.id}"] img`)?.parentElement?.parentElement;
                    if (dealElement) {
                        try {
                            const dealCanvas = await html2canvas(dealElement as any, { scale: 3, useCORS: true, backgroundColor: null, logging: false });
                            dealImages[deal.id] = dealCanvas.toDataURL('image/png');
                        } catch (e) { dealImages[deal.id] = deal.image_url || ""; }
                    } else { dealImages[deal.id] = deal.image_url || ""; }
                }
            }

            // 2. Build Horizontal Spread
            const A4_WIDTH = 3508; 
            const A4_HEIGHT = 2480;
            
            // Build Deal Cards (Full View)
            const dealCardsHtml = deals.map(deal => {
                const src = getSafeImg(dealImages[deal.id]);
                const includes = deal.deal_items?.map((di: any) => `<li>${di.item_name} x${di.quantity}</li>`).join('') || '';
                return `
                    <div style="width: 100%; background: ${styles.dealGradient}; padding: 60px; border-radius: 65px; border: 8px solid ${styles.accent}; display: flex; gap: 50px; align-items: flex-start; box-shadow: 0 50px 100px rgba(0,0,0,0.6); margin-bottom: 60px; break-inside: avoid;">
                        <div style="width: 380px; height: 380px; border-radius: 50px; overflow: hidden; border: 15px solid #fff; flex-shrink: 0; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
                            <img src="${src}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;"> 
                        </div>
                        <div style="flex: 1;">
                            <div style="font-size: 60px; font-weight: 950; color: #fff; margin-bottom: 25px; text-transform: uppercase;">${deal.name}</div>
                            <div style="font-size: 28px; color: ${styles.accent}; font-weight: 800; text-transform: uppercase; letter-spacing: 5px; margin-bottom: 20px;">What's Inside:</div>
                            <ul style="color: rgba(255,255,255,0.9); font-size: 26px; padding-left: 25px; margin-bottom: 35px; line-height: 1.5; font-weight: 700;">${includes}</ul>
                            <div style="font-size: 85px; font-weight: 950; color: ${styles.accent}; text-shadow: 4px 4px 0px rgba(0,0,0,0.5);">${formatPriceDisplay(deal.price)}</div>
                        </div>
                    </div>
                `;
            });

            // Build Category Cards
            const categoryCardsHtml = Object.keys(grouped).map(cat => {
                const itemsList = grouped[cat].map((item: any) => {
                    const rawSrc = getRealImgSrc(item);
                    const imgSrc = getSafeImg(rawSrc);
                    return `
                        <div style="margin-bottom: 40px; border-bottom: 3px dashed ${styles.border}; padding-bottom: 30px; display: flex; align-items: center; gap: 35px;">
                            ${imgSrc ? `<div style="width: 100px; height: 100px; border-radius: 20px; overflow: hidden; border: 4px solid ${styles.accent}; flex-shrink: 0;"><img src="${imgSrc}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div style="font-size: 36px; font-weight: 950; color: ${styles.text}; text-transform: uppercase; letter-spacing: 2px;">${item.name}</div>
                                    <div style="font-size: 36px; font-weight: 950; color: ${styles.accent};">${item.price}</div>
                                </div>
                                ${item.description ? `<div style="font-size: 22px; color: ${styles.mutedText}; margin-top: 12px; font-weight: 700; line-height: 1.4;">${item.description}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
                return `
                    <div style="background: ${styles.cardBg}; border-radius: 70px; border: 8px solid ${styles.border}; padding: 75px; margin-bottom: 55px; box-shadow: 15px 15px 0px ${styles.accent}; break-inside: avoid;">
                        <div style="font-weight: 950; font-size: 48px; text-transform: uppercase; color: ${styles.accent}; letter-spacing: 15px; margin-bottom: 50px; border-bottom: 10px solid ${styles.accent}; display: inline-block; padding-bottom: 15px;">${cat}</div>
                        <div>${itemsList}</div>
                    </div>
                `;
            });

            const allContentCards = [...dealCardsHtml, ...categoryCardsHtml];
            const pages: string[][] = [[]];
            const MAX_PER_PAGE = 3; 

            allContentCards.forEach((card, idx) => {
                const pageIdx = pages.length - 1;
                pages[pageIdx].push(card);
                if (pages[pageIdx].length >= MAX_PER_PAGE && idx < allContentCards.length - 1) pages.push([]);
            });

            const totalWidth = pages.length * A4_WIDTH;
            const ghost = document.createElement('div');
            Object.assign(ghost.style, {
                position: 'fixed', left: '-9999px', top: '0', zIndex: '-1',
                width: `${totalWidth}px`, height: `${A4_HEIGHT}px`,
                display: 'flex', flexDirection: 'row', backgroundColor: styles.bg,
                overflow: 'visible', fontFamily: styles.font
            });

            ghost.innerHTML = pages.map((pageContent, idx) => {
                const header = idx === 0 ? `
                    <div style="background: ${styles.darkerBg}; padding: 70px; text-align: center; border-bottom: 25px solid ${styles.accent}; margin-bottom: 60px;">
                        <h1 style="font-size: 150px; font-weight: 950; color: ${styles.headerText}; margin: 0; text-transform: uppercase; letter-spacing: 45px;">${restaurantInfo.name}</h1>
                        <div style="font-size: 44px; color: ${styles.accent}; margin-top: 35px; font-weight: 800; font-style: italic; letter-spacing: 12px;">${restaurantInfo.description || 'ESTABLISHED QUALITY'}</div>
                    </div>
                ` : `
                    <div style="padding: 60px 80px; text-align: left; border-bottom: 8px solid ${styles.accent}; margin-bottom: 60px; display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 50px; font-weight: 950; color: ${styles.accent}; text-transform: uppercase; letter-spacing: 15px;">${restaurantInfo.name} • MENU</div>
                    </div>
                `;

                return `
                    <div style="width: ${A4_WIDTH}px; height: ${A4_HEIGHT}px; border-right: 2px solid ${styles.border}; display: flex; flex-direction: column; overflow: hidden;">
                        ${idx === 0 ? header : ''}
                        <div style="padding: 60px 100px; column-count: 2; column-gap: 80px; flex: 1; overflow: hidden;">
                             ${idx !== 0 ? header : ''}
                             ${pageContent.join('')}
                        </div>
                        <div style="background: ${styles.darkerBg}; padding: 40px; text-align: center; border-top: 15px solid ${styles.accent}; font-size: 26px; color: ${styles.mutedText}; font-weight: 800; letter-spacing: 20px;">
                            ${restaurantInfo.phone} • ${restaurantInfo.address} • SECTION ${idx + 1}
                        </div>
                    </div>
                `;
            }).join('');

            document.body.appendChild(ghost);

            toast.loading("Applying Final Polish & Rendering Master Spread...", { id: exportToast });
            await new Promise(r => setTimeout(r, 12000)); 

            const canvas = await html2canvas(ghost, {
                scale: 1.5, 
                backgroundColor: styles.bg, useCORS: true, allowTaint: false, logging: false,
                imageTimeout: 15000
            } as any);

            const format = exportOptions.format === 'jpg' ? 'image/jpeg' : 'image/png';
            const ext = exportOptions.format === 'jpg' ? 'jpg' : 'png';
            const finalImage = canvas.toDataURL(format, 0.95);
            
            const link = document.createElement('a');
            link.href = finalImage;
            link.download = `${slugify(restaurantInfo.name)}_Horizontal_Master_Spread.${ext}`;
            link.click();

            document.body.removeChild(ghost);
            toast.dismiss(exportToast);
            toast.success("Final Horizontal Master Spread Downloaded! 📥🗞️💎");

        } catch (error) {
            console.error("Export error:", error);
            toast.error("Generation Failed");
        }
    };
'''

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace handleDownloadMenu (Fixed Marker Implementation)
start_marker = "    const handleDownloadMenu = async () => {"
end_marker = "    };"

start_idx = content.find(start_marker)
if start_idx != -1:
    brace_count = 0
    end_idx = -1
    for i in range(start_idx, len(content)):
        char = content[i]
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = i + 1
                break
    if end_idx != -1:
        content = content[:start_idx] + new_handle_download + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully synchronized Smart Mapping and Proxy fixes to MenuManager")
