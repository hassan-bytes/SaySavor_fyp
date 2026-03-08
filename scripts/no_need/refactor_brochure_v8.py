import os

file_path = "e:/semester 7/saysavor-web/saysavor-golden-voice-main/src/pages/dashboard/MenuManager.tsx"

new_handle_download = r'''    const handleDownloadMenu = async () => {
        if (!items.length || !restaurantInfo) {
            toast.error("Menu data not ready");
            return;
        }

        try {
            const exportToast = toast.loading("Finalizing your UHD master-brochure...");

            // Helper: Slugify for Preset Images
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

            // Helper: Get Image Source (ULTIMATE PRIORITY)
            const getRealImgSrc = (item: any) => {
                // 1. Try Live DOM (Any visible container)
                const container = document.querySelector(`[data-item-id="${item.id}"]`);
                if (container) {
                    const img = container.querySelector('img');
                    if (img && img.src && img.src.startsWith('http')) return img.src;
                }
                
                // 2. Fallback to direct DB URL
                if (item.image_url) return item.image_url;
                
                // 3. Last fallback: Preset generation
                if (item.cuisine && item.category && item.name) {
                    const cleanCuisine = item.cuisine.trim();
                    const cleanCategory = item.category.trim();
                    const slugName = slugify(item.name);
                    const path = `${cleanCuisine}/${cleanCategory}/${slugName}.jpg`;
                    const { data } = supabase.storage.from('preset-images').getPublicUrl(path);
                    return data.publicUrl;
                }
                return null;
            };

            // --- THEME CONFIGURATION ---
            const currentTheme = exportOptions.theme;
            const styles = {
                noir: {
                    bg: '#1a1a1a',
                    darkerBg: '#050505',
                    cardBg: '#222222',
                    accent: '#f59e0b',
                    text: '#ffffff',
                    mutedText: '#a1a1aa',
                    border: '#333333',
                    headerText: '#ffffff',
                    dealGradient: 'linear-gradient(135deg, #1e1b4b 0%, #000 100%)',
                    font: "'Inter', sans-serif"
                },
                minimal: {
                    bg: '#f8fafc',
                    darkerBg: '#ffffff',
                    cardBg: '#ffffff',
                    accent: '#0f172a',
                    text: '#1e293b',
                    mutedText: '#64748b',
                    border: '#e2e8f0',
                    headerText: '#0f172a',
                    dealGradient: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)',
                    font: "'Inter', sans-serif"
                },
                royal: {
                    bg: '#4c0519',
                    darkerBg: '#2d020d',
                    cardBg: '#700320',
                    accent: '#fbbf24',
                    text: '#fff1f2',
                    mutedText: '#fecdd3',
                    border: '#9f1239',
                    headerText: '#fbbf24',
                    dealGradient: 'linear-gradient(135deg, #881337 0%, #4c0519 100%)',
                    font: "'Oswald', sans-serif"
                },
                cream: {
                    bg: '#fffbf0',
                    darkerBg: '#fdf4da',
                    cardBg: '#ffffff',
                    accent: '#7c2d12',
                    text: '#431407',
                    mutedText: '#9a3412',
                    border: '#fed7aa',
                    headerText: '#7c2d12',
                    dealGradient: 'linear-gradient(135deg, #ffedd5 0%, #fdba74 100%)',
                    font: "'Playfair Display', serif"
                },
                teal: {
                    bg: '#042f2e',
                    darkerBg: '#0d9488',
                    cardBg: '#0f766e',
                    accent: '#fbbf24',
                    text: '#f0fdfa',
                    mutedText: '#99f6e4',
                    border: '#115e59',
                    headerText: '#ffffff',
                    dealGradient: 'linear-gradient(135deg, #134e4a 0%, #042f2e 100%)',
                    font: "'Inter', sans-serif"
                }
            }[currentTheme] || styles.noir;

            // 1. Prepare Data
            const deals = items.filter(i => i.item_type === 'deal');
            const regularItems = items.filter(i => i.item_type !== 'deal');

            const grouped = regularItems.reduce((acc: any, item: any) => {
                const cat = item.category || 'Specials';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
            }, {});

            // 4. Construct Ghost Element (LANDSCAPE SPREAD V8 - FINAL PERFECTION)
            const ghost = document.createElement('div');
            Object.assign(ghost.style, {
                position: 'fixed', left: '-9999px', top: '0', zIndex: '-1',
                width: '2400px', backgroundColor: styles.bg, color: styles.text,
                fontFamily: styles.font, boxSizing: 'border-box', padding: '0',
                display: 'flex', flexDirection: 'column', minHeight: '1200px', overflow: 'visible'
            });

            // --- HEADER ---
            const headerHtml = `
                <div style="background: ${styles.darkerBg}; padding: 100px; text-align: center; border-bottom: 12px solid ${styles.accent}; position: relative; overflow: hidden;">
                    <h1 style="font-size: 150px; font-weight: 950; color: ${styles.headerText}; margin: 0; text-transform: uppercase; letter-spacing: 30px; line-height: 0.8; filter: drop-shadow(0 15px 30px rgba(0,0,0,0.4));">${restaurantInfo.name}</h1>
                    ${exportOptions.includeDescription ? `<div style="font-size: 38px; color: ${styles.accent}; margin-top: 35px; font-weight: 800; font-style: italic; letter-spacing: 5px; opacity: 0.9;">${restaurantInfo.description}</div>` : ''}
                    
                    ${exportOptions.includeLocation ? `
                        <div style="margin-top: 60px; display: inline-flex; justify-content: center; align-items: center; gap: 100px; font-size: 30px; color: ${styles.text}; font-weight: 950; padding: 40px 100px; background: rgba(255,255,255,0.05); border-radius: 100px; border: 3px solid ${styles.accent}; backdrop-filter: blur(20px);">
                            <span>📍 <span style="border-bottom: 3px solid ${styles.accent}">${restaurantInfo.address || 'Join Us'}</span></span>
                            <span>📞 <span style="border-bottom: 3px solid ${styles.accent}">${restaurantInfo.phone || 'Contact'}</span></span>
                        </div>
                    ` : ''}
                </div>
            `;

            // --- DEALS SECTION ---
            let dealsHtml = '';
            if (deals.length > 0) {
                const dealCards = deals.map((deal: any) => {
                    // ULTIMATE DEAL IMAGE RECONSTRUCTION
                    let src = deal.image_url;
                    if (!src) {
                        const firstDealItem = deal.deal_items?.[0];
                        if (firstDealItem) {
                            const matchingItem = items.find(i => i.name === firstDealItem.item_name);
                            if (matchingItem) src = getRealImgSrc(matchingItem);
                        }
                    }
                    src = src || "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800";

                    return `
                        <div style="width: calc(33.33% - 27px); background: ${styles.dealGradient}; padding: 45px; border-radius: 50px; border: 4px solid ${styles.accent}; display: flex; gap: 40px; align-items: center; box-shadow: 0 40px 80px rgba(0,0,0,0.5); position: relative; overflow: hidden; min-height: 380px;">
                            <div style="position: absolute; top: -15px; right: -15px; background: ${styles.accent}; color: ${styles.bg.includes('f') ? '#000' : '#fff'}; padding: 15px 50px; font-weight: 950; font-size: 24px; transform: rotate(15deg); box-shadow: 0 10px 25px rgba(0,0,0,0.4);">OFFER</div>
                            <div style="width: 250px; height: 250px; border-radius: 40px; overflow: hidden; border: 8px solid #fff; background: #222; flex-shrink: 0; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
                                <img src="${src}" style="width: 100%; height: 100%; object-fit: cover;"> 
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 40px; font-weight: 950; color: #fff; margin-bottom: 15px; text-transform: uppercase; line-height: 1.1; letter-spacing: 2px;">${deal.name}</div>
                                <div style="font-size: 55px; font-weight: 950; color: ${styles.accent}; text-shadow: 3px 3px 0px rgba(0,0,0,0.3);">${formatPriceDisplay(deal.price)}</div>
                            </div>
                        </div>
                    `;
                }).join('');

                dealsHtml = `
                    <div style="padding: 120px 100px 80px 100px; background: ${styles.bg};">
                        <div style="font-weight: 950; font-size: 45px; color: ${styles.accent}; margin-bottom: 60px; text-transform: uppercase; letter-spacing: 15px; display: flex; align-items: center; gap: 40px;">
                            <div style="height: 6px; flex: 1; background: ${styles.accent}; border-radius: 4px;"></div>
                            PREMIUM SELECTIONS
                            <div style="height: 6px; flex: 1; background: ${styles.accent}; border-radius: 4px;"></div>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 40px;">
                            ${dealCards}
                        </div>
                    </div>
                `;
            }

            // --- CATEGORIES GRID ---
            const categoryCards = Object.keys(grouped).map(cat => {
                const itemsList = grouped[cat].map((item: any) => {
                    const imgSrc = getRealImgSrc(item);
                    return `
                        <div style="margin-bottom: 25px; border-bottom: 2px dashed ${styles.border}; padding-bottom: 20px; display: flex; align-items: center; gap: 20px;">
                            ${imgSrc ? `
                            <div style="width: 65px; height: 65px; border-radius: 12px; overflow: hidden; border: 2.5px solid ${styles.accent}; flex-shrink: 0; shadow: 0 4px 10px rgba(0,0,0,0.2);">
                                <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                            ` : ''}
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                                    <div style="font-size: 24px; font-weight: 950; color: ${styles.text}; text-transform: uppercase; letter-spacing: 0.5px;">${item.name}</div>
                                    <div style="font-size: 24px; font-weight: 950; color: ${styles.accent}; white-space: nowrap;">${item.price}</div>
                                </div>
                                ${exportOptions.includeDescription && item.description ? `<div style="font-size: 16px; color: ${styles.mutedText}; margin-top: 8px; font-weight: 700; line-height: 1.4; opacity: 0.85;">${item.description}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                const firstItemWithImg = grouped[cat].find((i: any) => getRealImgSrc(i));
                const catImgSrc = firstItemWithImg ? getRealImgSrc(firstItemWithImg) : null;
                
                return `
                    <div style="background: ${styles.cardBg}; border-radius: 50px; overflow: hidden; border: 3px solid ${styles.border}; margin-bottom: 50px; box-shadow: 0 30px 60px rgba(0,0,0,0.15); break-inside: avoid; display: flex; flex-direction: column; position: relative;">
                        ${catImgSrc ? `
                            <div style="height: 220px; width: 100%; overflow: hidden; background: #000; border-bottom: 8px solid ${styles.accent}">
                                <img src="${catImgSrc}" style="width: 100%; height: 100%; object-fit: cover; object-position: center 30%;">
                            </div>
                        ` : ''}
                        <div style="padding: 50px;">
                            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 40px;">
                                <div style="height: 5px; flex: 1; background: ${styles.accent}; border-radius: 5px;"></div>
                                <div style="font-weight: 950; font-size: 34px; text-transform: uppercase; color: ${styles.accent}; letter-spacing: 5px;">${cat}</div>
                                <div style="height: 5px; flex: 1; background: ${styles.accent}; border-radius: 5px;"></div>
                            </div>
                            <div>${itemsList}</div>
                        </div>
                    </div>
                `;
            }).join('');

            const gridHtml = `
                <div style="padding: 40px 100px 120px 100px; column-count: 3; column-gap: 80px; background: ${styles.bg}; flex: 1;">
                   ${categoryCards}
                </div>
            `;

            const footerHtml = `
                <div style="background: ${styles.darkerBg}; padding: 100px; text-align: center; border-top: 10px solid ${styles.accent};">
                    <div style="font-size: 32px; color: ${styles.mutedText}; font-weight: 950; letter-spacing: 15px; text-transform: uppercase; margin-bottom: 25px;">EXPERIENCE ${restaurantInfo.name}</div>
                    <div style="font-size: 16px; color: ${styles.mutedText}; opacity: 0.5; font-weight: 600;">Handcrafted Menu • Powered by SaySavor Pro Suite</div>
                </div>
            `;

            ghost.innerHTML = `${headerHtml}${dealsHtml}${gridHtml}${footerHtml}`;
            document.body.appendChild(ghost);

            // 5. Capture & Save
            toast.loading("Rendering ultra-sharp UHD final...", { id: exportToast });
            await new Promise(resolve => setTimeout(resolve, 6000)); 

            const canvas = await html2canvas(ghost, {
                scale: 2, 
                backgroundColor: styles.bg, useCORS: true, allowTaint: true, imageTimeout: 0, logging: false
            } as any);

            const format = exportOptions.format === 'jpg' ? 'image/jpeg' : 'image/png';
            const ext = exportOptions.format === 'jpg' ? 'jpg' : 'png';
            const finalImage = canvas.toDataURL(format, 0.95); 
            
            const link = document.createElement('a');
            link.href = finalImage;
            link.download = `${slugify(restaurantInfo.name)}_Master_Brochure.${ext}`;
            link.click();

            document.body.removeChild(ghost);
            toast.dismiss(exportToast);
            toast.success("Master Brochure Downloaded! 📥🗞️🔥");

        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to generate master-spread");
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

print("Successfully applied Reliable Asset Extraction and Layout Refinement")
