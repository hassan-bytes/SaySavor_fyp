import os

file_path = "e:/semester 7/saysavor-web/saysavor-golden-voice-main/src/pages/dashboard/MenuManager.tsx"

# The refined handler with better density and dividers
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
                        if (img && img.src && (img.src.startsWith('http') || img.src.startsWith('blob'))) return img.src;
                    }
                }
                if (item.image_url) return item.image_url;
                if (item.cuisine && item.category && item.name) {
                    const cleanCuisine = item.cuisine.trim();
                    let cleanCategory = item.category.trim();
                    if (cleanCuisine === 'Beverages' && (cleanCategory === 'ColdDrinks' || cleanCategory === 'Cold Drinks')) cleanCategory = 'Cold Drinks';
                    let targetName = item.name.trim();
                    if (targetName.includes('Tex-Mex Jalapeño Popper Burger')) targetName = 'Jalapeno Popper Burgers';
                    const bucket = supabase.storage.from('preset-images');
                    if (cleanCuisine === 'Beverages') {
                        const { data } = bucket.getPublicUrl(`${cleanCuisine}/${cleanCategory}/${slugify(targetName)}.jpg`);
                        return data.publicUrl;
                    }
                    const { data } = bucket.getPublicUrl(`${cleanCuisine}/${cleanCategory}/${targetName}.jpg`);
                    return data.publicUrl;
                }
                return null;
            };

            const themeStyles = {
                noir: { bg: '#08080a', darkerBg: '#000000', cardBg: '#121214', accent: '#f59e0b', text: '#ffffff', mutedText: '#a1a1aa', border: '#2a2a2e', headerText: '#ffffff', dealGradient: 'linear-gradient(135deg, #1e1b4b 0%, #000 100%)', font: "'Inter', sans-serif" },
                minimal: { bg: '#ffffff', darkerBg: '#f8fafc', cardBg: '#ffffff', accent: '#0f172a', text: '#1e293b', mutedText: '#64748b', border: '#e2e8f0', headerText: '#0f172a', dealGradient: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)', font: "'Inter', sans-serif" },
                royal: { bg: '#3b0717', darkerBg: '#2d020d', cardBg: '#4c0519', accent: '#fbbf24', text: '#fff1f2', mutedText: '#fecdd3', border: '#9f1239', headerText: '#fbbf24', dealGradient: 'linear-gradient(135deg, #881337 0%, #4c0519 100%)', font: "'Oswald', sans-serif" },
                cream: { bg: '#fdfcf7', darkerBg: '#fef3c7', cardBg: '#ffffff', accent: '#7c2d12', text: '#431407', mutedText: '#9a3412', border: '#fde68a', headerText: '#7c2d12', dealGradient: 'linear-gradient(135deg, #ffedd5 0%, #fdba74 100%)', font: "'Playfair Display', serif" },
                teal: { bg: '#042f2e', darkerBg: '#0f172a', cardBg: '#0f766e', accent: '#fbbf24', text: '#f0fdfa', mutedText: '#99f6e4', border: '#115e59', headerText: '#ffffff', dealGradient: 'linear-gradient(135deg, #134e4a 0%, #042f2e 100%)', font: "'Inter', sans-serif" }
            }[exportOptions.theme] || themeStyles.noir;

            // 1. Prepare Content
            const deals = items.filter(i => i.item_type === 'deal');
            const regularItems = items.filter(i => i.item_type !== 'deal');
            const grouped = regularItems.reduce((acc: any, item: any) => {
                let cat = item.category || 'Specials';
                if (cat === 'Sandwirches') cat = 'Sandwiches'; // FIX TYPO
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

            // 2. Build Content Cards
            // DEALS - Luxury Card Style
            const dealCardsHtml = deals.map((deal, idx) => {
                const src = getSafeImg(dealImages[deal.id]);
                const includes = deal.deal_items?.map((di: any) => `<li>${di.item_name} x${di.quantity}</li>`).join('') || '';
                const isHero = idx === 0;
                return `
                    <div style="width: 100%; background: ${themeStyles.dealGradient}; padding: ${isHero ? '80px' : '50px'}; border-radius: 65px; border: 8px solid ${themeStyles.accent}; display: flex; gap: 50px; align-items: center; box-shadow: 0 50px 100px rgba(0,0,0,0.6); margin-bottom: 60px; break-inside: avoid; transition: transform 0.3s ease;">
                        <div style="width: ${isHero ? '450px' : '350px'}; height: ${isHero ? '450px' : '350px'}; border-radius: 50px; overflow: hidden; border: 15px solid #fff; flex-shrink: 0; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
                            <img src="${src}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;"> 
                        </div>
                        <div style="flex: 1;">
                            ${isHero ? `<div style="background: ${themeStyles.accent}; color: #000; padding: 10px 30px; border-radius: 20px; font-weight: 950; display: inline-block; margin-bottom: 20px; font-size: 24px; letter-spacing: 5px;">BEST VALUE</div>` : ''}
                            <div style="font-size: ${isHero ? '80px' : '55px'}; font-weight: 950; color: #fff; margin-bottom: 15px; text-transform: uppercase; line-height: 1;">${deal.name}</div>
                            <div style="font-size: 24px; color: ${themeStyles.accent}; font-weight: 800; text-transform: uppercase; letter-spacing: 5px; margin-bottom: 15px;">Includes:</div>
                            <ul style="color: rgba(255,255,255,0.9); font-size: 24px; padding-left: 25px; margin-bottom: 25px; line-height: 1.2; font-weight: 700;">${includes}</ul>
                            <div style="font-size: ${isHero ? '110px' : '80px'}; font-weight: 950; color: ${themeStyles.accent}; text-shadow: 4px 4px 0px rgba(0,0,0,0.5);">${formatPriceDisplay(deal.price)}</div>
                        </div>
                    </div>
                `;
            });

            // CATEGORIES - Dense Grid Style
            const categoryCardsHtml = Object.keys(grouped).map(cat => {
                const itemsList = grouped[cat].map((item: any) => {
                    const rawSrc = getRealImgSrc(item);
                    const imgSrc = getSafeImg(rawSrc);
                    return `
                        <div style="margin-bottom: 30px; border-bottom: 2px solid ${themeStyles.border}33; padding-bottom: 20px; display: flex; align-items: flex-start; gap: 30px; break-inside: avoid;">
                            ${imgSrc ? `<div style="width: 120px; height: 120px; border-radius: 25px; overflow: hidden; border: 4px solid ${themeStyles.accent}; flex-shrink: 0; background: ${themeStyles.darkerBg};"><img src="${imgSrc}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <div style="font-size: 34px; font-weight: 950; color: ${themeStyles.text}; text-transform: uppercase; letter-spacing: 1px; line-height: 1.1;">${item.name}</div>
                                    <div style="font-size: 34px; font-weight: 950; color: ${themeStyles.accent}; white-space: nowrap; margin-left: 20px;">${item.price}</div>
                                </div>
                                ${item.description ? `<div style="font-size: 20px; color: ${themeStyles.mutedText}; margin-top: 8px; font-weight: 600; line-height: 1.3;">${item.description}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
                return `
                    <div style="background: ${themeStyles.cardBg}; border-radius: 60px; border: 4px solid ${themeStyles.border}; padding: 60px; margin-bottom: 40px; box-shadow: 10px 10px 30px rgba(0,0,0,0.3); break-inside: avoid; border-left: 10px solid ${themeStyles.accent};">
                        <div style="font-weight: 950; font-size: 44px; text-transform: uppercase; color: ${themeStyles.accent}; letter-spacing: 10px; margin-bottom: 40px; border-bottom: 6px solid ${themeStyles.accent}; display: inline-block; padding-bottom: 10px;">${cat}</div>
                        <div style="display: flex; flex-direction: column; gap: 5px;">${itemsList}</div>
                    </div>
                `;
            });

            // 3. Smart Pagination (Fill the spread)
            const allContentCards = [...dealCardsHtml, ...categoryCardsHtml];
            const pages: string[][] = [[]];
            const MAX_WEIGHT_PER_PAGE = 7; // Estimated weight: Deal=2.5, Category=1
            let currentWeight = 0;

            allContentCards.forEach((card, idx) => {
                const isDeal = deals.some(d => card.includes(d.name));
                const weight = isDeal ? 2.5 : 1;
                
                if (currentWeight + weight > MAX_WEIGHT_PER_PAGE && pages[pages.length - 1].length > 0) {
                    pages.push([]);
                    currentWeight = 0;
                }
                
                pages[pages.length - 1].push(card);
                currentWeight += weight;
            });

            // 4. Render Horizontal spread
            const A4_WIDTH = 3508; 
            const A4_HEIGHT = 2480;
            const totalWidth = pages.length * A4_WIDTH;
            
            const ghost = document.createElement('div');
            Object.assign(ghost.style, {
                position: 'fixed', left: '-9999px', top: '0', zIndex: '-1',
                width: `${totalWidth}px`, height: `${A4_HEIGHT}px`,
                display: 'flex', flexDirection: 'row', backgroundColor: themeStyles.bg,
                overflow: 'visible', fontFamily: themeStyles.font
            });

            // Background Texture / Noise
            const overlay = `<div style="position: absolute; inset: 0; opacity: 0.05; pointer-events: none; background-image: url('https://www.transparenttextures.com/patterns/carbon-fibre.png'); z-index: 10;"></div>`;

            ghost.innerHTML = overlay + pages.map((pageContent, idx) => {
                const isFirst = idx === 0;
                const header = isFirst ? `
                    <div style="background: ${themeStyles.darkerBg}; padding: 100px 70px; text-align: center; border-bottom: 30px solid ${themeStyles.accent}; margin-bottom: 60px; position: relative; overflow: hidden;">
                        <div style="position: absolute; right: 10%; top: -50%; width: 500px; height: 500px; background: ${themeStyles.accent}; filter: blur(250px); opacity: 0.2;"></div>
                        <h1 style="font-size: 180px; font-weight: 950; color: ${themeStyles.headerText}; margin: 0; text-transform: uppercase; letter-spacing: 50px; line-height: 0.8;">${restaurantInfo.name}</h1>
                        <div style="font-size: 50px; color: ${themeStyles.accent}; margin-top: 40px; font-weight: 800; font-style: italic; letter-spacing: 15px; text-transform: uppercase;">${restaurantInfo.description || 'ESTABLISHED QUALITY'}</div>
                    </div>
                ` : `
                    <div style="padding: 60px 80px; text-align: left; border-bottom: 15px solid ${themeStyles.accent}; margin-bottom: 50px; display: flex; justify-content: space-between; align-items: center; background: ${themeStyles.darkerBg}99;">
                        <div style="font-size: 55px; font-weight: 950; color: ${themeStyles.accent}; text-transform: uppercase; letter-spacing: 20px;">${restaurantInfo.name} • MENU</div>
                    </div>
                `;

                // Add a vertical divider between A4 sections
                const divider = idx < pages.length - 1 ? `<div style="position: absolute; right: 0; top: 10%; bottom: 10%; width: 10px; background: linear-gradient(to bottom, transparent, ${themeStyles.accent}, transparent); opacity: 0.5;"></div>` : '';

                return `
                    <div style="width: ${A4_WIDTH}px; height: ${A4_HEIGHT}px; border-right: 2px solid ${themeStyles.border}; display: flex; flex-direction: column; overflow: hidden; position: relative;">
                        ${divider}
                        ${header}
                        <div style="padding: 40px 100px; column-count: 2; column-gap: 80px; flex: 1; overflow: hidden;">
                             ${pageContent.join('')}
                        </div>
                        <div style="background: ${themeStyles.darkerBg}; padding: 50px; text-align: center; border-top: 20px solid ${themeStyles.accent}; font-size: 30px; color: ${themeStyles.mutedText}; font-weight: 950; letter-spacing: 25px; text-transform: uppercase;">
                            ${restaurantInfo.phone} • ${restaurantInfo.address} • SECTION ${idx + 1}
                        </div>
                    </div>
                `;
            }).join('');

            document.body.appendChild(ghost);

            toast.loading("Applying Cinematic Polish & Rendering...", { id: exportToast });
            await new Promise(r => setTimeout(r, 12000)); 

            const canvas = await html2canvas(ghost, {
                scale: 1.5, 
                backgroundColor: themeStyles.bg, useCORS: true, allowTaint: false, logging: false,
                imageTimeout: 15000
            } as any);

            const format = exportOptions.format === 'jpg' ? 'image/jpeg' : 'image/png';
            const ext = exportOptions.format === 'jpg' ? 'jpg' : 'png';
            const finalImage = canvas.toDataURL(format, 1.0);
            
            const link = document.createElement('a');
            link.href = finalImage;
            link.download = `${slugify(restaurantInfo.name)}_Master_Horizontal_Spread.${ext}`;
            link.click();

            document.body.removeChild(ghost);
            toast.dismiss(exportToast);
            toast.success("Golden Savor Master Spread Downloaded! 📥💎🗞️");

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

print("Successfully applied Premium Aesthetic Refinements to MenuManager")
