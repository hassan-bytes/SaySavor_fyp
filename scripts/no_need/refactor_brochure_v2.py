import os

file_path = "e:/semester 7/saysavor-web/saysavor-golden-voice-main/src/pages/dashboard/MenuManager.tsx"

new_handle_download = r'''    const handleDownloadMenu = async () => {
        if (!items.length || !restaurantInfo) {
            toast.error("Menu data not ready");
            return;
        }

        try {
            const exportToast = toast.loading("Crafting your professional brochure...");

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

            // 4. Construct Ghost Element (BROCHURE V2)
            const ghost = document.createElement('div');
            Object.assign(ghost.style, {
                position: 'fixed', left: '-9999px', top: '0', zIndex: '-1',
                width: '1200px', backgroundColor: styles.bg, color: styles.text,
                fontFamily: styles.font, boxSizing: 'border-box', padding: '0',
                display: 'flex', flexDirection: 'column', minHeight: '1600px', overflow: 'visible'
            });

            // --- HEADER (Premium Banner) ---
            const headerHtml = `
                <div style="background: ${styles.darkerBg}; padding: 60px 40px; text-align: center; border-bottom: 8px solid ${styles.accent};">
                    <h1 style="font-size: 100px; font-weight: 900; color: ${styles.headerText}; margin: 0; text-transform: uppercase; letter-spacing: 15px; line-height: 1; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));">${restaurantInfo.name}</h1>
                    ${exportOptions.includeDescription ? `<div style="font-size: 24px; color: ${styles.accent}; margin-top: 15px; font-weight: 600; font-style: italic; letter-spacing: 2px;">${restaurantInfo.description}</div>` : ''}
                    ${exportOptions.includeLocation ? `
                        <div style="margin-top: 30px; display: flex; justify-content: center; align-items: center; gap: 40px; font-size: 20px; color: ${styles.text}; font-weight: 600; padding: 15px 30px; background: rgba(0,0,0,0.05); display: inline-flex; border-radius: 50px;">
                            <span style="display: flex; align-items: center; gap: 10px;">📍 <span style="border-bottom: 2px solid ${styles.accent}">${restaurantInfo.address || 'Our Location'}</span></span>
                            <span style="display: flex; align-items: center; gap: 10px;">📞 <span style="border-bottom: 2px solid ${styles.accent}">${restaurantInfo.phone || 'Contact Us'}</span></span>
                        </div>
                    ` : ''}
                </div>
            `;

            // --- DEALS HERO (Brochure Style) ---
            let dealsHtml = '';
            if (deals.length > 0) {
                const dealCards = deals.map((deal: any) => {
                    const src = dealImages[deal.id] || getRealImgSrc(deal);
                    return `
                        <div style="flex: 1; min-width: 45%; background: ${styles.dealGradient}; padding: 35px; border-radius: 40px; border: 3px solid ${styles.accent}; display: flex; gap: 30px; align-items: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3); position: relative; overflow: hidden;">
                            <div style="position: absolute; top: -10px; right: -10px; background: ${styles.accent}; color: ${styles.bg.includes('f') ? '#000' : '#fff'}; padding: 10px 30px; font-weight: 900; font-size: 18px; transform: rotate(15deg); box-shadow: 0 4px 10px rgba(0,0,0,0.2);">EXCLUSIVE</div>
                            <div style="width: 160px; height: 160px; border-radius: 25px; overflow: hidden; border: 4px solid #fff; background: #000; flex-shrink: 0;">
                                <img src="${src}" style="width: 100%; height: 100%; object-fit: cover;"> 
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 38px; font-weight: 900; color: #fff; margin-bottom: 10px; text-transform: uppercase;">${deal.name}</div>
                                <div style="font-size: 42px; font-weight: 900; color: ${styles.accent};">${formatPriceDisplay(deal.price)}</div>
                            </div>
                        </div>
                    `;
                }).join('');

                dealsHtml = `
                    <div style="padding: 60px 80px; background: ${styles.bg};">
                        <div style="display: flex; flex-wrap: wrap; gap: 40px;">
                            ${dealCards}
                        </div>
                    </div>
                `;
            }

            // --- BROCHURE CONTENT (Multi-Column Grid) ---
            const categories = Object.keys(grouped);
            const categoryCards = categories.map(cat => {
                const itemsList = grouped[cat].map((item: any) => {
                    return `
                        <div style="margin-bottom: 20px; border-bottom: 1px dashed ${styles.border}; padding-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                                <div style="font-size: 22px; font-weight: 800; color: ${styles.text}; text-transform: uppercase;">${item.name}</div>
                                <div style="font-size: 22px; font-weight: 900; color: ${styles.accent}; white-space: nowrap;">${item.price}</div>
                            </div>
                            ${exportOptions.includeDescription && item.description ? `<div style="font-size: 14px; color: ${styles.mutedText}; margin-top: 6px; font-weight: 500; line-height: 1.4;">${item.description}</div>` : ''}
                        </div>
                    `;
                }).join('');

                const firstItem = grouped[cat][0];
                const catImgSrc = getRealImgSrc(firstItem);
                
                return `
                    <div style="background: ${styles.cardBg}; border-radius: 30px; overflow: hidden; border: 2px solid ${styles.border}; margin-bottom: 40px; box-shadow: 0 15px 35px rgba(0,0,0,0.05); break-inside: avoid; display: flex; flex-direction: column;">
                        ${catImgSrc ? `<div style="height: 220px; width: 100%;"><img src="${catImgSrc}" style="width: 100%; height: 100%; object-fit: cover; border-bottom: 6px solid ${styles.accent}"></div>` : ''}
                        <div style="padding: 35px;">
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px;">
                                <div style="height: 4px; flex: 1; background: ${styles.accent}; border-radius: 2px;"></div>
                                <div style="font-weight: 900; font-size: 26px; text-transform: uppercase; color: ${styles.accent}; letter-spacing: 2px;">${cat}</div>
                                <div style="height: 4px; flex: 1; background: ${styles.accent}; border-radius: 2px;"></div>
                            </div>
                            <div>${itemsList}</div>
                        </div>
                    </div>
                `;
            }).join('');

            const gridHtml = `
                <div style="padding: 0 80px 80px 80px; column-count: 3; column-gap: 50px; background: ${styles.bg}; flex: 1;">
                   ${categoryCards}
                </div>
            `;

            const footerHtml = `
                <div style="background: ${styles.darkerBg}; padding: 60px; text-align: center; border-top: 4px solid ${styles.accent};">
                    <div style="font-size: 20px; color: ${styles.mutedText}; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 15px;">Experience Perfection at ${restaurantInfo.name}</div>
                    <div style="font-size: 14px; color: ${styles.mutedText}; opacity: 0.5;">Generated via SaySavor AI Menu Suite</div>
                </div>
            `;

            ghost.innerHTML = `${headerHtml}${dealsHtml}${gridHtml}${footerHtml}`;
            document.body.appendChild(ghost);

            // 5. Capture & Save
            toast.loading("Rendering ultra-high res brochure...", { id: exportToast });
            await new Promise(resolve => setTimeout(resolve, 3000)); 

            const canvas = await html2canvas(ghost, {
                scale: 2.5, // Even higher quality
                backgroundColor: styles.bg, useCORS: true, allowTaint: true, imageTimeout: 0, logging: false
            } as any);

            const format = exportOptions.format === 'jpg' ? 'image/jpeg' : 'image/png';
            const ext = exportOptions.format === 'jpg' ? 'jpg' : 'png';
            const finalImage = canvas.toDataURL(format, 0.95);
            
            const link = document.createElement('a');
            link.href = finalImage;
            link.download = `${restaurantInfo.name.replace(/\s+/g, '_')}_Brochure_${currentTheme}.${ext}`;
            link.click();

            document.body.removeChild(ghost);
            toast.dismiss(exportToast);
            toast.success("Brochure Downloaded! 📥✨");

        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to generate brochure");
        }
    };
'''

new_dialog_content = r'''                {/* --- 5. Export Settings Dialog --- */}
                <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                    <DialogContent className="sm:max-w-[650px] bg-white border-0 shadow-2xl p-0 overflow-hidden rounded-3xl">
                        <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-8 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <FileDown className="w-32 h-32 rotate-12" />
                            </div>
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                                    <Sparkles className="w-8 h-8" />
                                    Brochure Designer <span className="text-xs bg-white/20 px-2 py-1 rounded font-bold">V2.0</span>
                                </DialogTitle>
                                <DialogDescription className="text-amber-50 text-lg font-medium">
                                    Create a stunning professional layout for your menu.
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar p-8">
                            {/* Theme Selection - SCROLLABLE */}
                            <div className="space-y-4">
                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Utensils className="w-3 h-3" /> Select Design Template
                                </Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
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
                                            className={`group relative cursor-pointer rounded-2xl border-2 p-3 transition-all hover:shadow-lg ${exportOptions.theme === theme.id ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                                        >
                                            <div className="flex gap-1 mb-2">
                                                {theme.colors.map((c, i) => (
                                                    <div key={i} className="flex-1 h-6 rounded-md shadow-inner" style={{ backgroundColor: c }} />
                                                ))}
                                            </div>
                                            <p className="font-bold text-sm text-slate-800 flex items-center justify-between">
                                                {theme.name}
                                                {exportOptions.theme === theme.id && <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />}
                                            </p>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">{theme.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                                {/* Format Selection - Improved UX */}
                                <div className="space-y-4">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Image Format</Label>
                                    <div className="flex gap-3">
                                        {[
                                            { id: 'png', label: 'PNG Image', sub: 'Best Quality', icon: 'High Res' },
                                            { id: 'jpg', label: 'JPG Image', sub: 'Smaller Size', icon: 'Fast Share' }
                                        ].map(fmt => (
                                            <div 
                                                key={fmt.id}
                                                onClick={() => setExportOptions(prev => ({ ...prev, format: fmt.id as any }))}
                                                className={`flex-1 cursor-pointer rounded-xl border-2 p-3 text-center transition-all ${exportOptions.format === fmt.id ? 'border-slate-900 bg-slate-900 text-white shadow-xl translate-y-[-2px]' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                                            >
                                                <Badge variant="outline" className={`mb-2 text-[8px] uppercase ${exportOptions.format === fmt.id ? 'border-white/20 text-white' : 'text-slate-400'}`}>
                                                    {fmt.icon}
                                                </Badge>
                                                <div className="font-bold text-sm">{fmt.label}</div>
                                                <div className={`text-[9px] ${exportOptions.format === fmt.id ? 'text-slate-400' : 'text-slate-400'}`}>{fmt.sub}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Information Toggles */}
                                <div className="space-y-4">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Details to Include</Label>
                                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-amber-600">
                                                    <Table className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700">Location & Contact</span>
                                                    <span className="text-[10px] text-slate-500">Address/Phone in header</span>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={exportOptions.includeLocation}
                                                onCheckedChange={(c) => setExportOptions(prev => ({ ...prev, includeLocation: c }))}
                                                className="data-[state=checked]:bg-amber-600"
                                            />
                                        </div>
                                        <div className="h-px bg-slate-200" />
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-amber-600">
                                                    <Percent className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700">Item Descriptions</span>
                                                    <span className="text-[10px] text-slate-500">Show details for each dish</span>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={exportOptions.includeDescription}
                                                onCheckedChange={(c) => setExportOptions(prev => ({ ...prev, includeDescription: c }))}
                                                className="data-[state=checked]:bg-amber-600"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100">
                            <Button variant="ghost" className="h-12 rounded-xl px-8" onClick={() => setIsExportDialogOpen(false)}>Cancel</Button>
                            <Button
                                onClick={() => {
                                    handleDownloadMenu();
                                    setIsExportDialogOpen(false);
                                }}
                                className="h-14 rounded-2xl px-12 bg-amber-600 hover:bg-amber-700 text-white font-black text-xl gap-3 shadow-2xl shadow-amber-600/30 transition-all hover:scale-105 active:scale-95"
                            >
                                <FileDown className="w-6 h-6" /> Export Brochure
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
'''

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace handleDownloadMenu
start_marker = "    const handleDownloadMenu = async () => {"
end_marker = "    };"

# Find handleDownloadMenu
start_idx = content.find(start_marker)
if start_idx != -1:
    # Find the end of this function by counting braces
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

print("Successfully upgraded Menu Export to Brochure v2.0 using fixed markers")
