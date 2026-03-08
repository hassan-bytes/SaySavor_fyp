import os

file_path = "e:/semester 7/saysavor-web/saysavor-golden-voice-main/src/pages/dashboard/MenuManager.tsx"

# The new handler will use a pagination system
new_handle_download = r'''    const handleDownloadMenu = async () => {
        if (!items.length || !restaurantInfo) {
            toast.error("Menu data not ready");
            return;
        }

        try {
            const exportToast = toast.loading("Preparing Multi-Page A4 Master Spreads...");

            // Helper: Slugify
            const slugify = (text: string) => {
                return text.trim().toLowerCase().replace(/[()]/g, '').replace(/\./g, '-').replace(/\s+/g, '-').replace(/ñ/g, 'n').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
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
                        if (img && img.src && img.src.startsWith('http')) return img.src;
                    }
                }
                if (item.image_url) return item.image_url;
                if (item.cuisine && item.category && item.name) {
                    const cleanCuisine = item.cuisine.trim();
                    let cleanCategory = item.category.trim();
                    if (cleanCuisine === 'Beverages' && cleanCategory === 'ColdDrinks') cleanCategory = 'Cold Drinks';
                    const pathA = `${cleanCuisine}/${cleanCategory}/${item.name.trim()}.jpg`;
                    const { data: urlA } = supabase.storage.from('preset-images').getPublicUrl(pathA);
                    const pathB = `${cleanCuisine}/${cleanCategory}/${slugify(item.name)}.jpg`;
                    const { data: urlB } = supabase.storage.from('preset-images').getPublicUrl(pathB);
                    if (cleanCuisine === 'Beverages') return urlB.publicUrl;
                    return urlA.publicUrl;
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

            // Prepare Pages
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
                toast.loading("Analyzing Premium Deal Cards...", { id: exportToast });
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

            // --- PAGINATION ENGINE ---
            const pages: string[] = [];
            const A4_WIDTH = 3508; // 300 DPI Landscape
            const A4_HEIGHT = 2480;

            // Page 1: Header + Selected Deals
            const p1Header = `
                <div style="background: ${styles.darkerBg}; padding: 80px 100px; text-align: center; border-bottom: 20px solid ${styles.accent};">
                    <h1 style="font-size: 140px; font-weight: 950; color: ${styles.headerText}; margin: 0; text-transform: uppercase; letter-spacing: 40px; line-height: 0.8;">${restaurantInfo.name}</h1>
                    <div style="font-size: 40px; color: ${styles.accent}; margin-top: 30px; font-weight: 800; font-style: italic; letter-spacing: 10px;">${restaurantInfo.description || 'ESTABLISHED QUALITY'}</div>
                </div>
            `;

            let page1Content = '';
            if (deals.length > 0) {
                const dealCards = deals.map(deal => {
                    const src = dealImages[deal.id] || "";
                    const includes = deal.deal_items?.map((di: any) => `<li>${di.item_name} x${di.quantity}</li>`).join('') || '';
                    return `
                        <div style="width: calc(50% - 40px); background: ${styles.dealGradient}; padding: 50px; border-radius: 55px; border: 6px solid ${styles.accent}; display: flex; gap: 40px; align-items: flex-start; box-shadow: 0 40px 80px rgba(0,0,0,0.6); position: relative; margin-bottom: 40px;">
                            <div style="width: 320px; height: 320px; border-radius: 40px; overflow: hidden; border: 12px solid #fff; background: #1a1a1a; flex-shrink: 0;">
                                <img src="${src}" style="width: 100%; height: 100%; object-fit: cover;"> 
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 48px; font-weight: 950; color: #fff; margin-bottom: 20px; text-transform: uppercase;">${deal.name}</div>
                                <div style="font-size: 24px; color: ${styles.accent}; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 15px;">Includes:</div>
                                <ul style="color: rgba(255,255,255,0.8); font-size: 20px; padding-left: 20px; margin-bottom: 25px; line-height: 1.4; font-weight: 600;">${includes}</ul>
                                <div style="font-size: 70px; font-weight: 950; color: ${styles.accent};">${formatPriceDisplay(deal.price)}</div>
                            </div>
                        </div>
                    `;
                }).join('');
                page1Content = `
                    <div style="flex: 1; padding: 60px 100px; display: flex; flex-wrap: wrap; gap: 40px; justify-content: center; align-content: flex-start;">
                        ${dealCards}
                    </div>
                `;
            }

            pages.push(`
                <div style="width: ${A4_WIDTH}px; height: ${A4_HEIGHT}px; background: ${styles.bg}; display: flex; flex-direction: column; overflow: hidden; font-family: ${styles.font}; text-rendering: optimizeLegibility;">
                    ${p1Header}
                    <div style="padding: 60px 100px 30px 100px; font-weight: 950; font-size: 50px; color: ${styles.accent}; letter-spacing: 20px; text-align: center; text-transform: uppercase;">Exclusive Featured Offers</div>
                    ${page1Content}
                    <div style="background: ${styles.darkerBg}; padding: 40px; text-align: center; border-top: 10px solid ${styles.accent}; font-size: 24px; color: ${styles.mutedText}; font-weight: 800; letter-spacing: 15px;">A MASTER SELECTION • PAGE 1</div>
                </div>
            `);

            // Page 2+: Menu Grid
            const cats = Object.keys(grouped);
            let currentGridHtml = '';
            let catIndex = 0;
            
            // Fixed Column Layout for Menu Pages
            while(catIndex < cats.length) {
                const pageCats = cats.slice(catIndex, catIndex + 3); // 3 categories per page in grid? No, Multi-column.
                // We'll use a multi-column flow and let the height manage it.
                // But since we want "Pages", we'll group categories into chunks of 3-4.
                const categoriesForThisPage = cats.slice(catIndex, catIndex + 4); 
                catIndex += 4;

                const catCards = categoriesForThisPage.map(cat => {
                    const itemsList = grouped[cat].map((item: any) => {
                        const imgSrc = getRealImgSrc(item);
                        return `
                            <div style="margin-bottom: 35px; border-bottom: 2px dashed ${styles.border}; padding-bottom: 25px; display: flex; align-items: center; gap: 30px;">
                                ${imgSrc ? `<div style="width: 80px; height: 80px; border-radius: 18px; overflow: hidden; border: 3px solid ${styles.accent}; flex-shrink: 0;"><img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}
                                <div style="flex: 1;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div style="font-size: 32px; font-weight: 950; color: ${styles.text}; text-transform: uppercase;">${item.name}</div>
                                        <div style="font-size: 32px; font-weight: 950; color: ${styles.accent};">${item.price}</div>
                                    </div>
                                    ${item.description ? `<div style="font-size: 20px; color: ${styles.mutedText}; margin-top: 10px; font-weight: 700; line-height: 1.4;">${item.description}</div>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('');
                    return `
                        <div style="background: ${styles.cardBg}; border-radius: 60px; border: 6px solid ${styles.border}; padding: 60px; margin-bottom: 40px; box-shadow: 10px 10px 0px ${styles.accent}; break-inside: avoid;">
                            <div style="font-weight: 950; font-size: 44px; text-transform: uppercase; color: ${styles.accent}; letter-spacing: 12px; margin-bottom: 40px; border-bottom: 8px solid ${styles.accent}; display: inline-block; padding-bottom: 10px;">${cat}</div>
                            <div>${itemsList}</div>
                        </div>
                    `;
                }).join('');

                pages.push(`
                    <div style="width: ${A4_WIDTH}px; height: ${A4_HEIGHT}px; background: ${styles.bg}; display: flex; flex-direction: column; overflow: hidden; font-family: ${styles.font};">
                        <div style="padding: 60px; column-count: 2; column-gap: 80px; flex: 1;">
                            ${catCards}
                        </div>
                        <div style="background: ${styles.darkerBg}; padding: 40px; text-align: center; border-top: 12px solid ${styles.accent}; font-size: 22px; color: ${styles.mutedText}; font-weight: 800; letter-spacing: 10px;">CONTACT: ${restaurantInfo.phone} • ADDRESS: ${restaurantInfo.address} • PAGE ${pages.length + 1}</div>
                    </div>
                `);
            }

            // Final Render Function
            for(let i=0; i<pages.length; i++) {
                const ghost = document.createElement('div');
                Object.assign(ghost.style, { position: 'fixed', left: '-9999px', top: '0', zIndex: '-1', width: `${A4_WIDTH}px` });
                ghost.innerHTML = pages[i];
                document.body.appendChild(ghost);

                toast.loading(`Capturing A4 Page ${i+1}...`, { id: exportToast });
                await new Promise(r => setTimeout(r, 6000));

                const canvas = await html2canvas(ghost, { scale: 1, backgroundColor: styles.bg, useCORS: true, allowTaint: true });
                const blob = await new Promise(r => canvas.toBlob(r, 'image/png', 0.98));
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob as Blob);
                link.download = `${slugify(restaurantInfo.name)}_Master_A4_L_P${i+1}.png`;
                link.click();
                
                document.body.removeChild(ghost);
            }

            toast.dismiss(exportToast);
            toast.success("All A4 Landscape Master Pages Exported! 📥🗞️💎");

        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to generate master pages");
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

print("Successfully implemented Multi-Page A4 Landscape Export logic")
