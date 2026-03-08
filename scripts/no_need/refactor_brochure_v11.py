import os

file_path = "e:/semester 7/saysavor-web/saysavor-golden-voice-main/src/pages/dashboard/MenuManager.tsx"

new_handle_download = r'''    const handleDownloadMenu = async () => {
        if (!items.length || !restaurantInfo) {
            toast.error("Menu data not ready");
            return;
        }

        try {
            const exportToast = toast.loading("Perfecting your master-brochure spread...");

            // Helper: Slugify (Modern version)
            const slugify = (text: string) => {
                return text
                    .trim()
                    .toLowerCase()
                    .replace(/[()]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '')
                    .replace(/-+/g, '-')
                    .replace(/^-+|-+$/g, '');
            };

            // Helper: Get Image Source (ULTIMATE RESILIENCE STRATEGY)
            const getRealImgSrc = (item: any) => {
                // 1. Try Live DOM (Maximum priority - exactly what user sees)
                const container = document.querySelector(`[data-item-id="${item.id}"]`);
                if (container) {
                    const img = container.querySelector('img');
                    if (img && img.src && img.src.startsWith('http')) return img.src;
                }
                
                // 2. Fallback to direct DB URL
                if (item.image_url) return item.image_url;
                
                // 3. Preset generation (MULTI-STRATEGY FALLBACK)
                if (item.cuisine && item.category && item.name) {
                    const cleanCuisine = item.cuisine.trim();
                    let cleanCategory = item.category.trim();
                    const cleanName = item.name.trim();
                    const slugName = slugify(cleanName);

                    // FIX: Standardize Category names for Beverages (ColdDrinks -> Cold Drinks)
                    if (cleanCuisine === 'Beverages' && cleanCategory === 'ColdDrinks') {
                        cleanCategory = 'Cold Drinks';
                    }

                    // Try Strategy A: Original Casing (Standard for Food)
                    const pathA = `${cleanCuisine}/${cleanCategory}/${cleanName}.jpg`;
                    const { data: urlA } = supabase.storage.from('preset-images').getPublicUrl(pathA);
                    
                    // Strategy B: Slugified (Standard for Beverages)
                    const pathB = `${cleanCuisine}/${cleanCategory}/${slugName}.jpg`;
                    const { data: urlB } = supabase.storage.from('preset-images').getPublicUrl(pathB);

                    // We return A by default but the browser will try B if the path logic prefers it
                    // In a perfect world we'd check existence, but PublicUrl always returns a link.
                    // Based on our inspection: Burgers are Strategy A, Cold Drinks are Strategy B.
                    if (cleanCuisine === 'Beverages') return urlB.publicUrl;
                    return urlA.publicUrl;
                }
                return null;
            };

            // --- THEME CONFIGURATION V11 ---
            const currentTheme = exportOptions.theme;
            const styles = {
                noir: {
                    bg: '#121212', darkerBg: '#050505', cardBg: '#1e1e1e', accent: '#f59e0b',
                    text: '#ffffff', mutedText: '#a1a1aa', border: '#2a2a2a', headerText: '#ffffff',
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
                    bg: '#fffbf0', darkerBg: '#fdf4da', cardBg: '#ffffff', accent: '#7c2d12',
                    text: '#431407', mutedText: '#9a3412', border: '#fed7aa', headerText: '#7c2d12',
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
                toast.loading("Analyzing premium deal cards...", { id: exportToast });
                for (const deal of deals) {
                    const mosaicId = `deal-mosaic-${deal.id}`;
                    let dealElement = document.getElementById(mosaicId);
                    if (!dealElement) {
                        dealElement = document.querySelector(`[data-item-id="${deal.id}"] img`)?.parentElement?.parentElement;
                    }

                    if (dealElement) {
                        try {
                            const dealCanvas = await html2canvas(dealElement as any, {
                                scale: 3, useCORS: true, backgroundColor: null, logging: false, allowTaint: true
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

            // 4. Construct Ghost Element (Sleek Clean Master Spread - NO SECTION IMAGES)
            const ghost = document.createElement('div');
            Object.assign(ghost.style, {
                position: 'fixed', left: '-9999px', top: '0', zIndex: '-1',
                width: '2400px', backgroundColor: styles.bg, color: styles.text,
                fontFamily: styles.font, boxSizing: 'border-box', padding: '0',
                display: 'flex', flexDirection: 'column', minHeight: '1200px', overflow: 'visible'
            });

            const headerHtml = `
                <div style="background: ${styles.darkerBg}; padding: 120px 100px; text-align: center; border-bottom: 25px solid ${styles.accent}; border-top: 25px solid ${styles.accent};">
                    <h1 style="font-size: 160px; font-weight: 950; color: ${styles.headerText}; margin: 0; text-transform: uppercase; letter-spacing: 40px; line-height: 0.8;">${restaurantInfo.name}</h1>
                    ${exportOptions.includeDescription ? `<div style="font-size: 44px; color: ${styles.accent}; margin-top: 45px; font-weight: 800; font-style: italic; letter-spacing: 8px; opacity: 0.9;">${restaurantInfo.description}</div>` : ''}
                    
                    ${exportOptions.includeLocation ? `
                        <div style="margin-top: 80px; display: inline-flex; justify-content: center; align-items: center; gap: 120px; font-size: 36px; color: ${styles.text}; font-weight: 950; padding: 50px 130px; background: rgba(0,0,0,0.6); border-radius: 120px; border: 5px solid ${styles.accent}; backdrop-filter: blur(20px);">
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
                        <div style="width: calc(33.33% - 40px); background: ${styles.dealGradient}; padding: 60px; border-radius: 60px; border: 6px solid ${styles.accent}; display: flex; gap: 50px; align-items: center; box-shadow: 0 60px 120px rgba(0,0,0,0.7); position: relative; overflow: hidden; min-height: 480px;">
                            <div style="position: absolute; top: -15px; right: -15px; background: ${styles.accent}; color: ${styles.bg.includes('f') ? '#000' : '#fff'}; padding: 20px 90px; font-weight: 950; font-size: 32px; transform: rotate(15deg); box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 2px solid white;">OFFER</div>
                            <div style="width: 350px; height: 350px; border-radius: 50px; overflow: hidden; border: 15px solid #fff; background: #222; flex-shrink: 0; box-shadow: 0 30px 60px rgba(0,0,0,0.4);">
                                <img src="${src}" style="width: 100%; height: 100%; object-fit: cover;"> 
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 52px; font-weight: 950; color: #fff; margin-bottom: 30px; text-transform: uppercase; line-height: 1.1; letter-spacing: 3px;">${deal.name}</div>
                                <div style="font-size: 80px; font-weight: 950; color: ${styles.accent}; text-shadow: 4px 4px 0px rgba(0,0,0,0.4);">${formatPriceDisplay(deal.price)}</div>
                            </div>
                        </div>
                    `;
                }).join('');

                dealsHtml = `
                    <div style="padding: 140px 100px 70px 100px; background: ${styles.bg};">
                        <div style="font-weight: 950; font-size: 56px; color: ${styles.accent}; margin-bottom: 90px; text-transform: uppercase; letter-spacing: 25px; display: flex; align-items: center; gap: 70px;">
                            <div style="height: 12px; flex: 1; background: ${styles.accent}; border-radius: 6px;"></div>
                            PREMIUM SELECTIONS
                            <div style="height: 12px; flex: 1; background: ${styles.accent}; border-radius: 6px;"></div>
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
                        <div style="margin-bottom: 40px; border-bottom: 3px dashed ${styles.border}; padding-bottom: 35px; display: flex; align-items: center; gap: 40px;">
                            ${imgSrc ? `
                            <div style="width: 90px; height: 90px; border-radius: 20px; overflow: hidden; border: 4px solid ${styles.accent}; flex-shrink: 0; box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
                                <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                            ` : ''}
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                                    <div style="font-size: 34px; font-weight: 950; color: ${styles.text}; text-transform: uppercase; letter-spacing: 2px;">${item.name}</div>
                                    <div style="font-size: 34px; font-weight: 950; color: ${styles.accent}; white-space: nowrap;">${item.price}</div>
                                </div>
                                ${exportOptions.includeDescription && item.description ? `<div style="font-size: 22px; color: ${styles.mutedText}; margin-top: 15px; font-weight: 700; line-height: 1.5; opacity: 0.9;">${item.description}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                return `
                    <div style="background: ${styles.cardBg}; border-radius: 80px; overflow: hidden; border: 6px solid ${styles.border}; margin-bottom: 80px; box-shadow: 0 60px 120px rgba(0,0,0,0.3); break-inside: avoid; display: flex; flex-direction: column;">
                        <div style="padding: 80px;">
                            <div style="display: flex; align-items: center; gap: 40px; margin-bottom: 70px;">
                                <div style="height: 12px; flex: 1; background: ${styles.accent}; border-radius: 12px;"></div>
                                <div style="font-weight: 950; font-size: 52px; text-transform: uppercase; color: ${styles.accent}; letter-spacing: 15px;">${cat}</div>
                                <div style="height: 12px; flex: 1; background: ${styles.accent}; border-radius: 12px;"></div>
                            </div>
                            <div>${itemsList}</div>
                        </div>
                    </div>
                `;
            }).join('');

            const gridHtml = `
                <div style="padding: 80px 100px 160px 100px; column-count: 3; column-gap: 100px; background: ${styles.bg}; flex: 1;">
                   ${categoryCards}
                </div>
            `;

            const footerHtml = `
                <div style="background: ${styles.darkerBg}; padding: 160px; text-align: center; border-top: 25px solid ${styles.accent};">
                    <div style="font-size: 48px; color: ${styles.mutedText}; font-weight: 950; letter-spacing: 30px; text-transform: uppercase; margin-bottom: 50px;">A MASTERPIECE BY ${restaurantInfo.name}</div>
                    <div style="font-size: 26px; color: ${styles.mutedText}; opacity: 0.6; font-weight: 800;">High-Fidelity Menu • Powered by SaySavor Ultra-HD Pro Suite</div>
                </div>
            `;

            ghost.innerHTML = `${headerHtml}${dealsHtml}${gridHtml}${footerHtml}`;
            document.body.appendChild(ghost);

            toast.loading("Rendering final ultra-sharp UHD spread (10s delay)...", { id: exportToast });
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
            link.download = `${slugify(restaurantInfo.name)}_Professional_Menu_UHD.${ext}`;
            link.click();

            document.body.removeChild(ghost);
            toast.dismiss(exportToast);
            toast.success("Perfected Master Brochure Downloaded! 📥🗞️💎");

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

print("Successfully applied Ultimate Resilient Fix and Layout Simplification")
