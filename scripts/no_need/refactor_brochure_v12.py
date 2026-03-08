import os

file_path = "e:/semester 7/saysavor-web/saysavor-golden-voice-main/src/pages/dashboard/MenuManager.tsx"

new_handle_download = r'''    const handleDownloadMenu = async () => {
        if (!items.length || !restaurantInfo) {
            toast.error("Menu data not ready");
            return;
        }

        try {
            const exportToast = toast.loading("Perfecting your master-brochure spread...");

            // Helper: Slugify (Bulletproof Version)
            const slugify = (text: string) => {
                return text
                    .trim()
                    .toLowerCase()
                    .replace(/[()]/g, '')
                    .replace(/\./g, '-') // CRITICAL: Dots to hyphens for Beverages
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '')
                    .replace(/-+/g, '-')
                    .replace(/^-+|-+$/g, '');
            };

            // Helper: Get Image Source (BULLETPROOF EDITION)
            const getRealImgSrc = (item: any) => {
                // 1. Try Live DOM (Maximum priority - deep search)
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
                
                // 2. Fallback to direct DB URL
                if (item.image_url) return item.image_url;
                
                // 3. Preset generation (MULTI-PATTERN LOOKUP)
                if (item.cuisine && item.category && item.name) {
                    const cleanCuisine = item.cuisine.trim();
                    let cleanCategory = item.category.trim();
                    const cleanName = item.name.trim();
                    const slugName = slugify(cleanName);

                    // Normalize Category names (Storage uses spaces)
                    if (cleanCuisine === 'Beverages' && cleanCategory === 'ColdDrinks') {
                        cleanCategory = 'Cold Drinks';
                    }

                    // Special Overrides for known data mismatches
                    if (cleanName.includes('Jalapeño')) {
                        // Storage has "Jalapeno Popper Burgers.jpg"
                        return supabase.storage.from('preset-images').getPublicUrl(`Fast Food/Burgers/Jalapeno Popper Burgers.jpg`).data.publicUrl;
                    }

                    // Try Strategy A: Original Case (General Food)
                    const pathA = `${cleanCuisine}/${cleanCategory}/${cleanName}.jpg`;
                    const { data: urlA } = supabase.storage.from('preset-images').getPublicUrl(pathA);
                    
                    // Strategy B: Slugified (Beverages / Standardized)
                    const pathB = `${cleanCuisine}/${cleanCategory}/${slugName}.jpg`;
                    const { data: urlB } = supabase.storage.from('preset-images').getPublicUrl(pathB);

                    if (cleanCuisine === 'Beverages') return urlB.publicUrl;
                    return urlA.publicUrl;
                }
                return null;
            };

            // --- THEME CONFIGURATION V12 (PRO) ---
            const currentTheme = exportOptions.theme;
            const styles = {
                noir: {
                    bg: '#0f0f12', darkerBg: '#050505', cardBg: '#1c1c1f', accent: '#f59e0b',
                    text: '#ffffff', mutedText: '#a1a1aa', border: '#2a2a2e', headerText: '#ffffff',
                    dealGradient: 'linear-gradient(135deg, #1e1b4b 0%, #000 100%)', font: "'Inter', sans-serif"
                },
                minimal: {
                    bg: '#f8fafc', darkerBg: '#ffffff', cardBg: '#ffffff', accent: '#0f172a',
                    text: '#1e293b', mutedText: '#64748b', border: '#e2e8f0', headerText: '#0f172a',
                    dealGradient: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)', font: "'Inter', sans-serif"
                },
                royal: {
                    bg: '#4c0519', darkerBg: '#2d020d', cardBg: '#700320', accent: '#fbbf24',
                    text: '#fff1f2', mutedText: '#fecdd3', border: '#9f1239', headerText: '#fbbf24',
                    dealGradient: 'linear-gradient(135deg, #881337 0%, #4c0519 100%)', font: "'Oswald', sans-serif"
                },
                cream: {
                    bg: '#fffdf5', darkerBg: '#fef3c7', cardBg: '#ffffff', accent: '#7c2d12',
                    text: '#431407', mutedText: '#9a3412', border: '#fde68a', headerText: '#7c2d12',
                    dealGradient: 'linear-gradient(135deg, #ffedd5 0%, #fdba74 100%)', font: "'Playfair Display', serif"
                },
                teal: {
                    bg: '#042f2e', darkerBg: '#0d9488', cardBg: '#0f766e', accent: '#fbbf24',
                    text: '#f0fdfa', mutedText: '#99f6e4', border: '#115e59', headerText: '#ffffff',
                    dealGradient: 'linear-gradient(135deg, #134e4a 0%, #042f2e 100%)', font: "'Inter', sans-serif"
                }
            }[currentTheme] || styles.noir;

            // 1. Prepare Data
            const deals = items.filter(i => i.item_type === 'deal');
            const regularItems = items.filter(i => i.item_type !== 'deal');

            const dealImages: Record<string, string> = {};
            if (deals.length > 0) {
                toast.loading("Capturing premium deal collages...", { id: exportToast });
                for (const deal of deals) {
                    const mosaicId = `deal-mosaic-${deal.id}`;
                    let dealElement = document.getElementById(mosaicId);
                    if (!dealElement) {
                        dealElement = document.querySelector(`[data-item-id="${deal.id}"] img`)?.parentElement?.parentElement;
                    }

                    if (dealElement) {
                        try {
                            const dealCanvas = await html2canvas(dealElement as any, {
                                scale: 3, useCORS: true, backgroundColor: null, logging: false
                            } as any);
                            dealImages[deal.id] = dealCanvas.toDataURL('image/png');
                        } catch (e) {
                            dealImages[deal.id] = deal.image_url || "";
                        }
                    } else {
                        dealImages[deal.id] = deal.image_url || "";
                    }
                }
            }

            const grouped = regularItems.reduce((acc: any, item: any) => {
                const cat = item.category || 'Specials';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
            }, {});

            // 4. Construct Ghost Element (Zero-Cluster Clean Layout)
            const ghost = document.createElement('div');
            Object.assign(ghost.style, {
                position: 'fixed', left: '-9999px', top: '0', zIndex: '-1',
                width: '2400px', backgroundColor: styles.bg, color: styles.text,
                fontFamily: styles.font, boxSizing: 'border-box', padding: '0',
                display: 'flex', flexDirection: 'column', minHeight: '1200px', overflow: 'visible'
            });

            const headerHtml = `
                <div style="background: ${styles.darkerBg}; padding: 130px 100px; text-align: center; border-bottom: 25px solid ${styles.accent}; border-top: 25px solid ${styles.accent};">
                    <h1 style="font-size: 160px; font-weight: 950; color: ${styles.headerText}; margin: 0; text-transform: uppercase; letter-spacing: 45px; line-height: 0.8;">${restaurantInfo.name}</h1>
                    ${exportOptions.includeDescription ? `<div style="font-size: 46px; color: ${styles.accent}; margin-top: 50px; font-weight: 800; font-style: italic; letter-spacing: 12px; opacity: 0.9;">${restaurantInfo.description}</div>` : ''}
                    
                    ${exportOptions.includeLocation ? `
                        <div style="margin-top: 90px; display: inline-flex; justify-content: center; align-items: center; gap: 140px; font-size: 38px; color: ${styles.text}; font-weight: 950; padding: 55px 140px; background: rgba(0,0,0,0.65); border-radius: 120px; border: 5px solid ${styles.accent}; backdrop-filter: blur(25px);">
                            <span>📍 <span style="border-bottom: 5px solid ${styles.accent}; padding-bottom: 5px;">${restaurantInfo.address || 'Join Us'}</span></span>
                            <span>📞 <span style="border-bottom: 5px solid ${styles.accent}; padding-bottom: 5px;">${restaurantInfo.phone || 'Contact'}</span></span>
                        </div>
                    ` : ''}
                </div>
            `;

            let dealsHtml = '';
            if (deals.length > 0) {
                const dealCards = deals.map((deal: any) => {
                    const src = dealImages[deal.id] || "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800";
                    return `
                        <div style="width: calc(33.33% - 40px); background: ${styles.dealGradient}; padding: 60px; border-radius: 60px; border: 6px solid ${styles.accent}; display: flex; gap: 50px; align-items: center; box-shadow: 0 70px 140px rgba(0,0,0,0.75); position: relative; overflow: hidden; min-height: 500px;">
                            <div style="position: absolute; top: -15px; right: -15px; background: ${styles.accent}; color: ${styles.bg.includes('f') ? '#000' : '#fff'}; padding: 22px 100px; font-weight: 950; font-size: 34px; transform: rotate(15deg); box-shadow: 0 10px 30px rgba(0,0,0,0.6); border: 3px solid white;">BEST DEAL</div>
                            <div style="width: 380px; height: 380px; border-radius: 50px; overflow: hidden; border: 15px solid #fff; background: #1a1a1a; flex-shrink: 0; box-shadow: 0 35px 70px rgba(0,0,0,0.5);">
                                <img src="${src}" style="width: 100%; height: 100%; object-fit: cover;"> 
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 56px; font-weight: 950; color: #fff; margin-bottom: 35px; text-transform: uppercase; line-height: 1.1; letter-spacing: 4px;">${deal.name}</div>
                                <div style="font-size: 90px; font-weight: 950; color: ${styles.accent}; text-shadow: 5px 5px 0px rgba(0,0,0,0.5);">${formatPriceDisplay(deal.price)}</div>
                            </div>
                        </div>
                    `;
                }).join('');

                dealsHtml = `
                    <div style="padding: 150px 100px 80px 100px; background: ${styles.bg};">
                        <div style="font-weight: 950; font-size: 60px; color: ${styles.accent}; margin-bottom: 100px; text-transform: uppercase; letter-spacing: 30px; display: flex; align-items: center; gap: 80px;">
                            <div style="height: 14px; flex: 1; background: ${styles.accent}; border-radius: 7px;"></div>
                            EXCLUSIVE OFFERS
                            <div style="height: 14px; flex: 1; background: ${styles.accent}; border-radius: 7px;"></div>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 60px;">
                            ${dealCards}
                        </div>
                    </div>
                `;
            }

            const categoryCards = Object.keys(grouped).map(cat => {
                const itemsList = grouped[cat].map((item: any) => {
                    const imgSrc = getRealImgSrc(item);
                    return `
                        <div style="margin-bottom: 45px; border-bottom: 3px dashed ${styles.border}; padding-bottom: 40px; display: flex; align-items: center; gap: 45px;">
                            ${imgSrc ? `
                            <div style="width: 100px; height: 100px; border-radius: 22px; overflow: hidden; border: 4px solid ${styles.accent}; flex-shrink: 0; box-shadow: 0 15px 30px rgba(0,0,0,0.5);">
                                <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                            ` : ''}
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                                    <div style="font-size: 38px; font-weight: 950; color: ${styles.text}; text-transform: uppercase; letter-spacing: 3px;">${item.name}</div>
                                    <div style="font-size: 38px; font-weight: 950; color: ${styles.accent}; white-space: nowrap;">${item.price}</div>
                                </div>
                                ${exportOptions.includeDescription && item.description ? `<div style="font-size: 24px; color: ${styles.mutedText}; margin-top: 18px; font-weight: 700; line-height: 1.5; opacity: 0.9;">${item.description}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                return `
                    <div style="background: ${styles.cardBg}; border-radius: 90px; overflow: hidden; border: 7px solid ${styles.border}; margin-bottom: 90px; box-shadow: 0 70px 140px rgba(0,0,0,0.35); break-inside: avoid; display: flex; flex-direction: column;">
                        <div style="padding: 90px;">
                            <div style="display: flex; align-items: center; gap: 50px; margin-bottom: 75px;">
                                <div style="height: 14px; flex: 1; background: ${styles.accent}; border-radius: 14px;"></div>
                                <div style="font-weight: 950; font-size: 56px; text-transform: uppercase; color: ${styles.accent}; letter-spacing: 18px;">${cat}</div>
                                <div style="height: 14px; flex: 1; background: ${styles.accent}; border-radius: 14px;"></div>
                            </div>
                            <div>${itemsList}</div>
                        </div>
                    </div>
                `;
            }).join('');

            const gridHtml = `
                <div style="padding: 100px 100px 180px 100px; column-count: 3; column-gap: 110px; background: ${styles.bg}; flex: 1;">
                   ${categoryCards}
                </div>
            `;

            const footerHtml = `
                <div style="background: ${styles.darkerBg}; padding: 180px; text-align: center; border-top: 25px solid ${styles.accent};">
                    <div style="font-size: 52px; color: ${styles.mutedText}; font-weight: 950; letter-spacing: 35px; text-transform: uppercase; margin-bottom: 60px;">A MASTER SELECTION BY ${restaurantInfo.name}</div>
                    <div style="font-size: 28px; color: ${styles.mutedText}; opacity: 0.6; font-weight: 800;">Ultra-Fidelity Menu • Powered by SaySavor UHD Pro Spread</div>
                </div>
            `;

            ghost.innerHTML = `${headerHtml}${dealsHtml}${gridHtml}${footerHtml}`;
            document.body.appendChild(ghost);

            toast.loading("Rendering ultra-sharp master spread (Stabilizing Assets)...", { id: exportToast });
            await new Promise(resolve => setTimeout(resolve, 10000)); 

            const canvas = await html2canvas(ghost, {
                scale: 2, 
                backgroundColor: styles.bg, useCORS: true, allowTaint: true, imageTimeout: 0, logging: false
            } as any);

            const format = exportOptions.format === 'jpg' ? 'image/jpeg' : 'image/png';
            const ext = exportOptions.format === 'jpg' ? 'jpg' : 'png';
            const finalImage = canvas.toDataURL(format, 0.98); 
            
            const link = document.createElement('a');
            link.href = finalImage;
            link.download = `${slugify(restaurantInfo.name)}_Master_UHD_Brochure.${ext}`;
            link.click();

            document.body.removeChild(ghost);
            toast.dismiss(exportToast);
            toast.success("Master UHD Brochure Downloaded! 📥🗞️💎");

        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to generate master spread");
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

print("Successfully applied Bulletproof UHD fixes and Absolute layout cleanup")
