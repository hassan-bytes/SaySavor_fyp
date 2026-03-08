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
                return "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800";
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

            // 4. Construct Ghost Element (LANDSCAPE SPREAD V3)
            const ghost = document.createElement('div');
            Object.assign(ghost.style, {
                position: 'fixed', left: '-9999px', top: '0', zIndex: '-1',
                width: '2400px', backgroundColor: styles.bg, color: styles.text,
                fontFamily: styles.font, boxSizing: 'border-box', padding: '0',
                display: 'flex', flexDirection: 'column', minHeight: '1200px', overflow: 'visible'
            });

            // --- HEADER (Epic Landscape Banner) ---
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

            // --- DEALS SECTION (Wide Spread) ---
            let dealsHtml = '';
            if (deals.length > 0) {
                const dealCards = deals.map((deal: any) => {
                    const src = dealImages[deal.id] || getRealImgSrc(deal);
                    return `
                        <div style="width: calc(33.33% - 27px); background: ${styles.dealGradient}; padding: 45px; border-radius: 50px; border: 4px solid ${styles.accent}; display: flex; gap: 35px; align-items: center; box-shadow: 0 30px 60px rgba(0,0,0,0.4); position: relative; overflow: hidden; transition: transform 0.3s ease;">
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

            // --- CATEGORIES GRID (4-COLUMN LANDSCAPE) ---
            const categories = Object.keys(grouped);
            const categoryCards = categories.map(cat => {
                const itemsList = grouped[cat].map((item: any) => {
                    return `
                        <div style="margin-bottom: 25px; border-bottom: 2px dashed ${styles.border}; padding-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 20px;">
                                <div style="font-size: 24px; font-weight: 900; color: ${styles.text}; text-transform: uppercase; line-height: 1.2;">${item.name}</div>
                                <div style="font-size: 24px; font-weight: 900; color: ${styles.accent}; white-space: nowrap; padding-bottom: 2px;">${item.price}</div>
                            </div>
                            ${exportOptions.includeDescription && item.description ? `<div style="font-size: 16px; color: ${styles.mutedText}; margin-top: 8px; font-weight: 600; line-height: 1.4; opacity: 0.8;">${item.description}</div>` : ''}
                        </div>
                    `;
                }).join('');

                const firstItem = grouped[cat][0];
                const catImgSrc = getRealImgSrc(firstItem);
                
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
                <div style="padding: 40px 100px 100px 100px; column-count: 4; column-gap: 60px; background: ${styles.bg}; flex: 1;">
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
            toast.loading("Rendering professional landscape spread...", { id: exportToast });
            await new Promise(resolve => setTimeout(resolve, 3500)); 

            const canvas = await html2canvas(ghost, {
                scale: 1, // Full size at 1x scale is 2400px wide, perfect
                backgroundColor: styles.bg, useCORS: true, allowTaint: true, imageTimeout: 0, logging: false
            } as any);

            const format = exportOptions.format === 'jpg' ? 'image/jpeg' : 'image/png';
            const ext = exportOptions.format === 'jpg' ? 'jpg' : 'png';
            const finalImage = canvas.toDataURL(format, 0.9); 
            
            const link = document.createElement('a');
            link.href = finalImage;
            link.download = `${slugify(restaurantInfo.name)}_Spread_${currentTheme}.${ext}`;
            link.click();

            document.body.removeChild(ghost);
            toast.dismiss(exportToast);
            toast.success("Brochure Spread Downloaded! 📥🗞️");

        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to generate spread");
        }
    };
'''

new_dialog_content = r'''                {/* --- 5. Export Settings Dialog --- */}
                <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                    <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col bg-white border-0 shadow-3xl p-0 overflow-hidden rounded-[2.5rem]">
                        <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-8 text-white relative overflow-hidden flex-shrink-0">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <FileDown className="w-32 h-32 rotate-12" />
                            </div>
                            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                            
                            <DialogHeader>
                                <DialogTitle className="text-4xl font-black tracking-tighter text-white flex items-center gap-3">
                                    <Sparkles className="w-10 h-10 text-amber-300" />
                                    Menu Designer <span className="text-[10px] bg-white/20 px-3 py-1 rounded-full font-black uppercase tracking-widest ml-2">v2.1 Pro</span>
                                </DialogTitle>
                                <DialogDescription className="text-amber-50 text-xl font-semibold opacity-90 mt-2">
                                    Craft a wide, professional brochure spread.
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-12">
                            {/* Theme Selection */}
                            <div className="space-y-6">
                                <Label className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Utensils className="w-4 h-4 text-amber-500" /> 1. Select Design Template
                                </Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-2">
                                    {[
                                        { id: 'noir', name: 'Cinematic Noir', colors: ['#1a1a1a', '#f59e0b', '#262626'], desc: 'Dark Premium' },
                                        { id: 'minimal', name: 'Elegant Minimal', colors: ['#ffffff', '#0f172a', '#f8fafc'], desc: 'Clean Modern' },
                                        { id: 'royal', name: 'Royal Palace', colors: ['#4c0519', '#fbbf24', '#700320'], desc: 'Lux Burgundy' },
                                        { id: 'cream', name: 'Cream Vintage', colors: ['#fffbf0', '#7c2d12', '#fdf4da'], desc: 'Serif Classic' },
                                        { id: 'teal', name: 'Midnight Teal', colors: ['#042f2e', '#fbbf24', '#0f766e'], desc: 'Teal & Gold' }
                                    ].map(theme => (
                                        <div
                                            key={theme.id}
                                            onClick={() => setExportOptions(prev => ({ ...prev, theme: theme.id as any }))}
                                            className={`group relative cursor-pointer rounded-[1.5rem] border-4 p-4 transition-all duration-300 hover:shadow-2xl active:scale-95 ${exportOptions.theme === theme.id ? 'border-amber-500 bg-amber-50 shadow-amber-500/10' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-white'}`}
                                        >
                                            <div className="flex gap-1.5 mb-3">
                                                {theme.colors.map((c, i) => (
                                                    <div key={i} className="flex-1 h-8 rounded-lg shadow-inner ring-1 ring-black/5" style={{ backgroundColor: c }} />
                                                ))}
                                            </div>
                                            <p className="font-black text-base text-slate-800 flex items-center justify-between">
                                                {theme.name}
                                                {exportOptions.theme === theme.id && <Zap className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />}
                                            </p>
                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-1">{theme.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4 border-t border-slate-100">
                                {/* Format Selection */}
                                <div className="space-y-6">
                                    <Label className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">2. Image Format</Label>
                                    <div className="flex gap-4">
                                        {[
                                            { id: 'png', label: 'Ultra High Res', sub: 'Best for Printing', ext: 'PNG' },
                                            { id: 'jpg', label: 'Social Share', sub: 'Best for Sharing', ext: 'JPG' }
                                        ].map(fmt => (
                                            <div 
                                                key={fmt.id}
                                                onClick={() => setExportOptions(prev => ({ ...prev, format: fmt.id as any }))}
                                                className={`flex-1 cursor-pointer rounded-2xl border-4 p-5 text-center transition-all duration-300 ${exportOptions.format === fmt.id ? 'border-slate-900 bg-slate-900 text-white shadow-2xl scale-105' : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-200 hover:bg-white'}`}
                                            >
                                                <div className={`text-[10px] uppercase font-black tracking-widest mb-1 ${exportOptions.format === fmt.id ? 'text-amber-400' : 'text-slate-400'}`}>
                                                    {fmt.label}
                                                </div>
                                                <div className="font-black text-2xl mb-1">{fmt.ext}</div>
                                                <div className={`text-[10px] font-bold ${exportOptions.format === fmt.id ? 'text-slate-400' : 'text-slate-300'}`}>{fmt.sub}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Information Toggles */}
                                <div className="space-y-6">
                                    <Label className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">3. Details to Show</Label>
                                    <div className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border-2 border-slate-50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-md text-amber-600 ring-1 ring-black/5">
                                                    <Table className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-800">Business Info</span>
                                                    <span className="text-xs text-slate-500 font-medium italic">Address & Phone</span>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={exportOptions.includeLocation}
                                                onCheckedChange={(c) => setExportOptions(prev => ({ ...prev, includeLocation: c }))}
                                                className="scale-125 data-[state=checked]:bg-amber-600"
                                            />
                                        </div>
                                        <div className="h-px bg-slate-200 mx-2" />
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-md text-amber-600 ring-1 ring-black/5">
                                                    <Percent className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-800">Dish Descriptions</span>
                                                    <span className="text-xs text-slate-500 font-medium italic">Detailed menu text</span>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={exportOptions.includeDescription}
                                                onCheckedChange={(c) => setExportOptions(prev => ({ ...prev, includeDescription: c }))}
                                                className="scale-125 data-[state=checked]:bg-amber-600"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                            <Button variant="ghost" className="h-14 rounded-2xl px-10 text-slate-500 font-bold hover:bg-slate-200 transition-all" onClick={() => setIsExportDialogOpen(false)}>Cancel</Button>
                            <Button
                                onClick={() => {
                                    handleDownloadMenu();
                                    setIsExportDialogOpen(false);
                                }}
                                className="h-14 rounded-[1.25rem] px-14 bg-amber-600 hover:bg-amber-700 text-white font-black text-xl gap-4 shadow-3xl shadow-amber-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] ring-4 ring-amber-600/10"
                            >
                                <FileDown className="w-7 h-7" /> Generate Spread
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
'''

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace handleDownloadMenu (Fixed Marker Implementation)
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

# 2. Replace Export Settings Dialog
start_dialog = "{/* --- 5. Export Settings Dialog --- */}"
end_dialog = "</Dialog>"

d_start_idx = content.find(start_dialog)
if d_start_idx != -1:
    d_end_idx = content.find(end_dialog, d_start_idx) + len(end_dialog)
    content = content[:d_start_idx] + new_dialog_content + content[d_end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully implemented Landscape Brochure Spread and Dialog UI Fix")
