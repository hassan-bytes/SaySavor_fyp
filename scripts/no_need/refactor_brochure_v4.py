import os

file_path = "e:/semester 7/saysavor-web/saysavor-golden-voice-main/src/pages/dashboard/MenuManager.tsx"

new_handle_download = r'''    const handleDownloadMenu = async () => {
        if (!items.length || !restaurantInfo) {
            toast.error("Menu data not ready");
            return;
        }

        try {
            const exportToast = toast.loading("Crafting your professional brochure spread...");

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

            // Helper: Get Image Source
            const getRealImgSrc = (item: any) => {
                const containerId = `menu-item-img-container-${item.id}`;
                const container = document.getElementById(containerId);
                if (container) {
                    const img = container.querySelector('img');
                    if (img && img.src && img.src.startsWith('http')) return img.src;
                }
                if (item.image_url) return item.image_url;
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

            // --- THEME CONFIGURATION V2 ---
            const currentTheme = exportOptions.theme;
            const styles = {
                noir: {
                    bg: '#1a1a1a',
                    darkerBg: '#0f0f0f',
                    cardBg: '#262626',
                    accent: '#f59e0b',
                    text: '#ffffff',
                    mutedText: '#a1a1aa',
                    border: '#3f3f46',
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

            const dealImages: Record<string, string> = {};
            if (deals.length > 0) {
                toast.loading("Gathering visual assets...", { id: exportToast });
                for (const deal of deals) {
                    const targetEl = document.getElementById(`deal-mosaic-${deal.id}`) || document.getElementById(`menu-item-img-container-${deal.id}`);
                    if (targetEl) {
                        try {
                            const dealCanvas = await html2canvas(targetEl, {
                                scale: 2, useCORS: true, backgroundColor: null, logging: false, allowTaint: true
                            } as any);
                            dealImages[deal.id] = dealCanvas.toDataURL('image/png');
                        } catch (e) {
                            console.warn("Failed deal capture", deal.id);
                        }
                    }
                }
            }

            const grouped = regularItems.reduce((acc: any, item: any) => {
                const cat = item.category || 'Specials';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
            }, {});

            // 4. Construct Ghost Element (LANDSCAPE SPREAD V4 - Detailed Imagery)
            const ghost = document.createElement('div');
            Object.assign(ghost.style, {
                position: 'fixed', left: '-9999px', top: '0', zIndex: '-1',
                width: '2400px', backgroundColor: styles.bg, color: styles.text,
                fontFamily: styles.font, boxSizing: 'border-box', padding: '0',
                display: 'flex', flexDirection: 'column', minHeight: '1200px', overflow: 'visible'
            });

            // --- HEADER ---
            const headerHtml = `
                <div style="background: ${styles.darkerBg}; padding: 80px 100px; text-align: center; border-bottom: 12px solid ${styles.accent}; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -50px; left: -50px; width: 300px; height: 300px; background: ${styles.accent}; opacity: 0.05; border-radius: 50%;"></div>
                    <div style="position: absolute; bottom: -50px; right: -50px; width: 300px; height: 300px; background: ${styles.accent}; opacity: 0.05; border-radius: 50%;"></div>
                    
                    <h1 style="font-size: 140px; font-weight: 900; color: ${styles.headerText}; margin: 0; text-transform: uppercase; letter-spacing: 25px; line-height: 0.9; filter: drop-shadow(0 8px 15px rgba(0,0,0,0.2)); text-shadow: 4px 4px 0px rgba(0,0,0,0.1);">${restaurantInfo.name}</h1>
                    ${exportOptions.includeDescription ? `<div style="font-size: 32px; color: ${styles.accent}; margin-top: 25px; font-weight: 700; font-style: italic; letter-spacing: 4px; opacity: 0.9;">${restaurantInfo.description}</div>` : ''}
                    
                    ${exportOptions.includeLocation ? `
                        <div style="margin-top: 50px; display: inline-flex; justify-content: center; align-items: center; gap: 80px; font-size: 28px; color: ${styles.text}; font-weight: 800; padding: 25px 60px; background: rgba(255,255,255,0.05); border-radius: 100px; border: 2px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px);">
                            <span style="display: flex; align-items: center; gap: 15px;">📍 <span style="border-bottom: 3px solid ${styles.accent}">${restaurantInfo.address || 'Visit Us'}</span></span>
                            <span style="display: flex; align-items: center; gap: 15px;">📞 <span style="border-bottom: 3px solid ${styles.accent}">${restaurantInfo.phone || 'Call Now'}</span></span>
                        </div>
                    ` : ''}
                </div>
            `;

            // --- DEALS SECTION ---
            let dealsHtml = '';
            if (deals.length > 0) {
                const dealCards = deals.map((deal: any) => {
                    const src = dealImages[deal.id] || getRealImgSrc(deal) || "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800";
                    return `
                        <div style="width: calc(33.33% - 27px); background: ${styles.dealGradient}; padding: 45px; border-radius: 50px; border: 4px solid ${styles.accent}; display: flex; gap: 35px; align-items: center; box-shadow: 0 30px 60px rgba(0,0,0,0.4); position: relative; overflow: hidden;">
                            <div style="position: absolute; top: -15px; right: -15px; background: ${styles.accent}; color: ${styles.bg.includes('f') ? '#000' : '#fff'}; padding: 12px 40px; font-weight: 900; font-size: 20px; transform: rotate(15deg); box-shadow: 0 8px 20px rgba(0,0,0,0.3); letter-spacing: 1px;">EXCLUSIVE</div>
                            <div style="width: 200px; height: 200px; border-radius: 35px; overflow: hidden; border: 6px solid #fff; background: #000; flex-shrink: 0; transform: rotate(-3deg);">
                                <img src="${src}" style="width: 100%; height: 100%; object-fit: cover;"> 
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 36px; font-weight: 900; color: #fff; margin-bottom: 15px; text-transform: uppercase; line-height: 1.1;">${deal.name}</div>
                                <div style="font-size: 50px; font-weight: 900; color: ${styles.accent}; text-shadow: 2px 2px 0px rgba(0,0,0,0.2);">${formatPriceDisplay(deal.price)}</div>
                            </div>
                        </div>
                    `;
                }).join('');

                dealsHtml = `
                    <div style="padding: 100px 100px 60px 100px; background: ${styles.bg};">
                        <div style="font-weight: 950; font-size: 40px; color: ${styles.accent}; margin-bottom: 50px; text-transform: uppercase; letter-spacing: 10px; display: flex; align-items: center; gap: 30px;">
                            <div style="height: 4px; flex: 1; background: ${styles.accent};"></div>
                            FEAST FOR LESS
                            <div style="height: 4px; flex: 1; background: ${styles.accent};"></div>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 40px;">
                            ${dealCards}
                        </div>
                    </div>
                `;
            }

            // --- CATEGORIES GRID ---
            const categories = Object.keys(grouped);
            const categoryCards = categories.map(cat => {
                const itemsList = grouped[cat].map((item: any) => {
                    const imgSrc = getRealImgSrc(item);
                    return `
                        <div style="margin-bottom: 25px; border-bottom: 2px dashed ${styles.border}; padding-bottom: 20px; display: flex; align-items: center; gap: 20px;">
                            ${imgSrc ? `
                            <div style="width: 80px; height: 80px; border-radius: 12px; overflow: hidden; border: 2px solid ${styles.accent}; flex-shrink: 0;">
                                <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                            ` : ''}
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 20px;">
                                    <div style="font-size: 24px; font-weight: 900; color: ${styles.text}; text-transform: uppercase; line-height: 1.2;">${item.name}</div>
                                    <div style="font-size: 24px; font-weight: 900; color: ${styles.accent}; white-space: nowrap; padding-bottom: 2px;">${item.price}</div>
                                </div>
                                ${exportOptions.includeDescription && item.description ? `<div style="font-size: 16px; color: ${styles.mutedText}; margin-top: 8px; font-weight: 600; line-height: 1.4; opacity: 0.8;">${item.description}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                const firstItemWithImg = grouped[cat].find((i: any) => getRealImgSrc(i));
                const catImgSrc = firstItemWithImg ? getRealImgSrc(firstItemWithImg) : null;
                
                return `
                    <div style="background: ${styles.cardBg}; border-radius: 40px; overflow: hidden; border: 3px solid ${styles.border}; margin-bottom: 40px; box-shadow: 0 20px 50px rgba(0,0,0,0.08); break-inside: avoid; display: flex; flex-direction: column;">
                        ${catImgSrc ? `<div style="height: 280px; width: 100%;"><img src="${catImgSrc}" style="width: 100%; height: 100%; object-fit: cover; border-bottom: 8px solid ${styles.accent}"></div>` : ''}
                        <div style="padding: 40px;">
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 30px;">
                                <div style="height: 5px; flex: 1; background: ${styles.accent}; border-radius: 5px;"></div>
                                <div style="font-weight: 950; font-size: 32px; text-transform: uppercase; color: ${styles.accent}; letter-spacing: 3px;">${cat}</div>
                                <div style="height: 5px; flex: 1; background: ${styles.accent}; border-radius: 5px;"></div>
                            </div>
                            <div>${itemsList}</div>
                        </div>
                    </div>
                `;
            }).join('');

            const gridHtml = `
                <div style="padding: 40px 100px 100px 100px; column-count: 3; column-gap: 60px; background: ${styles.bg}; flex: 1;">
                   ${categoryCards}
                </div>
            `;

            const footerHtml = `
                <div style="background: ${styles.darkerBg}; padding: 80px; text-align: center; border-top: 8px solid ${styles.accent};">
                    <div style="font-size: 28px; color: ${styles.mutedText}; font-weight: 800; letter-spacing: 8px; text-transform: uppercase; margin-bottom: 20px; opacity: 0.9;">Crafted for Connoisseurs at ${restaurantInfo.name}</div>
                    <div style="font-size: 16px; color: ${styles.mutedText}; opacity: 0.4;">Savor the Moment • Powered by SaySavor AI Menu Suite</div>
                </div>
            `;

            ghost.innerHTML = `${headerHtml}${dealsHtml}${gridHtml}${footerHtml}`;
            document.body.appendChild(ghost);

            // 5. Capture & Save
            toast.loading("Rendering professional landscape spread with detailed imagery...", { id: exportToast });
            await new Promise(resolve => setTimeout(resolve, 4000)); 

            const canvas = await html2canvas(ghost, {
                scale: 1, 
                backgroundColor: styles.bg, useCORS: true, allowTaint: true, imageTimeout: 0, logging: false
            } as any);

            const format = exportOptions.format === 'jpg' ? 'image/jpeg' : 'image/png';
            const ext = exportOptions.format === 'jpg' ? 'jpg' : 'png';
            const finalImage = canvas.toDataURL(format, 0.9); 
            
            const link = document.createElement('a');
            link.href = finalImage;
            link.download = `${slugify(restaurantInfo.name)}_Detailed_Spread_${currentTheme}.${ext}`;
            link.click();

            document.body.removeChild(ghost);
            toast.dismiss(exportToast);
            toast.success("Detailed Brochure Spread Downloaded! 📸🗞️");

        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to generate detailed spread");
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

print("Successfully implemented Detailed Imagery Layout with Item Thumbnails")
