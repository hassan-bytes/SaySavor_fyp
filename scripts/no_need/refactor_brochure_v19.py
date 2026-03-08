import os

file_path = "e:/semester 7/saysavor-web/saysavor-golden-voice-main/src/pages/dashboard/MenuManager.tsx"

# The refined handler for individual A4 page downloads
new_handle_download = r'''    const handleDownloadMenu = async () => {
        if (!items.length || !restaurantInfo) {
            toast.error("Menu data not ready");
            return;
        }

        try {
            const exportToast = toast.loading("Preparing Premium A4 Pages...");

            // Helper: Slugify (Bulletproof Sync)
            const slugify = (text: string) => {
                return text.trim().toLowerCase().replace(/[()]/g, '').replace(/\./g, '-').replace(/\s+/g, '-').replace(/ñ/g, 'n').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
            };

            // Helper: Safe Image Wrapper (Proxy)
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
                    if (targetName.includes('Tex-Mex')) targetName = 'Jalapeno Popper Burgers';
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
                if (cat === 'Sandwirches') cat = 'Sandwiches';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
            }, {});

            // Capture Deal Mosaic Images
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
            const dealCardsHtml = deals.map((deal, idx) => {
                const src = getSafeImg(dealImages[deal.id]);
                const includes = deal.deal_items?.map((di: any) => `<li>${di.item_name} x${di.quantity}</li>`).join('') || '';
                const isHero = idx === 0;
                return `
                    <div style="width: 100%; background: ${themeStyles.dealGradient}; padding: ${isHero ? '60px' : '40px'}; border-radius: 50px; border: 6px solid ${themeStyles.accent}; display: flex; gap: 40px; align-items: center; box-shadow: 0 40px 80px rgba(0,0,0,0.5); margin-bottom: 50px; break-inside: avoid;">
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
                    </div>
                `;
            });

            const categoryCardsHtml = Object.keys(grouped).map(cat => {
                const itemsList = grouped[cat].map((item: any) => {
                    const rawSrc = getRealImgSrc(item);
                    const imgSrc = getSafeImg(rawSrc);
                    return `
                        <div style="margin-bottom: 25px; border-bottom: 2px solid ${themeStyles.border}22; padding-bottom: 15px; display: flex; align-items: flex-start; gap: 25px; break-inside: avoid;">
                            ${imgSrc ? `<div style="width: 100px; height: 100px; border-radius: 20px; overflow: hidden; border: 3px solid ${themeStyles.accent}; flex-shrink: 0;"><img src="${imgSrc}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <div style="font-size: 30px; font-weight: 950; color: ${themeStyles.text}; text-transform: uppercase; letter-spacing: 1px;">${item.name}</div>
                                    <div style="font-size: 30px; font-weight: 950; color: ${themeStyles.accent}; white-space: nowrap; margin-left: 15px;">${item.price}</div>
                                </div>
                                ${item.description ? `<div style="font-size: 18px; color: ${themeStyles.mutedText}; margin-top: 5px; font-weight: 600; line-height: 1.2;">${item.description}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
                return `
                    <div style="background: ${themeStyles.cardBg}; border-radius: 50px; border: 4px solid ${themeStyles.border}; padding: 50px; margin-bottom: 40px; box-shadow: 10px 10px 30px rgba(0,0,0,0.2); break-inside: avoid; border-left: 12px solid ${themeStyles.accent};">
                        <div style="font-weight: 950; font-size: 38px; text-transform: uppercase; color: ${themeStyles.accent}; letter-spacing: 8px; margin-bottom: 30px; border-bottom: 5px solid ${themeStyles.accent}; display: inline-block; padding-bottom: 8px;">${cat}</div>
                        <div>${itemsList}</div>
                    </div>
                `;
            });

            // 3. Sequential Page Rendering
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
                Object.assign(ghost.style, {
                    position: 'fixed', left: '-9999px', top: '0', zIndex: '-1',
                    width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px`,
                    display: 'flex', flexDirection: 'column', backgroundColor: themeStyles.bg,
                    fontFamily: themeStyles.font, border: 'none', margin: '0', padding: '0'
                });

                const isFirst = i === 0;
                const header = isFirst ? `
                    <div style="background: ${themeStyles.darkerBg}; padding: 90px 70px; text-align: center; border-bottom: 25px solid ${themeStyles.accent}; margin-bottom: 50px;">
                        <h1 style="font-size: 160px; font-weight: 950; color: ${themeStyles.headerText}; margin: 0; text-transform: uppercase; letter-spacing: 40px; line-height: 1;">${restaurantInfo.name}</h1>
                        <div style="font-size: 40px; color: ${themeStyles.accent}; margin-top: 30px; font-weight: 800; font-style: italic; letter-spacing: 12px; text-transform: uppercase;">${restaurantInfo.description || 'ESTABLISHED QUALITY'}</div>
                    </div>
                ` : `
                    <div style="padding: 50px 80px; text-align: left; border-bottom: 15px solid ${themeStyles.accent}; margin-bottom: 40px; background: ${themeStyles.darkerBg}99;">
                        <div style="font-size: 50px; font-weight: 950; color: ${themeStyles.accent}; text-transform: uppercase; letter-spacing: 15px;">${restaurantInfo.name} • MENU</div>
                    </div>
                `;

                const pageHtml = `
                    <div style="position: absolute; inset: 0; opacity: 0.04; background-image: url('https://www.transparenttextures.com/patterns/carbon-fibre.png');"></div>
                    ${header}
                    <div style="padding: 30px 100px; column-count: 2; column-gap: 80px; flex: 1; overflow: hidden; position: relative; z-index: 1;">
                         ${paginatedContent[i].join('')}
                    </div>
                    <div style="background: ${themeStyles.darkerBg}; padding: 45px; text-align: center; border-top: 15px solid ${themeStyles.accent}; font-size: 28px; color: ${themeStyles.mutedText}; font-weight: 900; letter-spacing: 20px; text-transform: uppercase;">
                        ${restaurantInfo.phone} • ${restaurantInfo.address} • PAGE ${i + 1}
                    </div>
                `;

                ghost.innerHTML = pageHtml;
                document.body.appendChild(ghost);

                // Stabilization delay
                await new Promise(r => setTimeout(r, 6000));

                const canvas = await html2canvas(ghost, {
                    scale: 1.2, 
                    backgroundColor: themeStyles.bg, useCORS: true, allowTaint: false, logging: false
                } as any);

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
            toast.success("Premium A4 Pages Downloaded! 📥🗞️💎");

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

print("Successfully switched to Individual A4 Page Downloads and fixed header artifacts")
