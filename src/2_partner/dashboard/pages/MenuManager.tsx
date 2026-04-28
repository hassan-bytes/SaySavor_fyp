// ============================================================
// FILE: MenuManager.tsx
// SECTION: 2_partner > dashboard > pages
// PURPOSE: Restaurant ka menu manage karna.
//          Vertical hierarchy ke andar MenuItemCards render hote hain.
// ROUTE: /dashboard/menu
// ============================================================
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabaseClient';
import {
    FileDown, Wand2, Percent, Tag, CheckSquare, Square, RotateCcw, Trash2, Box,
    ChevronDown, ChevronRight, LayoutList, TrendingUp, TrendingDown, AlertTriangle, PowerOff,
    Cloud, Mic, Globe, Timer, Edit2,
    Loader2, Search, Sparkles, ImageIcon, Package, Plus, Utensils, UploadCloud, X, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { DynamicFoodImage } from '@/2_partner/setup/pages/RestaurantSetup';
import { predictVisuals } from '@/shared/services/visualMappingUtils';
import { normalizeScannedItem } from '@/shared/services/fuzzyMatch';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/shared/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/shared/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileNav } from "@/shared/components/MobileNav";
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import MenuItemCard from '@/2_partner/dashboard/components/MenuItemCard';
import { MenuItem, MenuVariant, ModifierGroup, DealItem } from '@/shared/types/menu';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { findBestPresetImage } from '@/shared/services/imageMatchService';
import { resolveCurrency } from '@/shared/lib/currencyUtils';
import DishEditorModal from '@/2_partner/dashboard/components/DishEditorModal';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useRestaurant } from '@/shared/contexts/RestaurantContext';
import { useMenuData } from '@/2_partner/dashboard/menu/hooks/useMenuData';
import { useMenuBulk } from '@/2_partner/dashboard/menu/hooks/useMenuBulk';
import { useMenuOffers } from '@/2_partner/dashboard/menu/hooks/useMenuOffers';
import { useMenuExport } from '@/2_partner/dashboard/menu/hooks/useMenuExport';
import { useMenuScan } from '@/2_partner/dashboard/menu/hooks/useMenuScan';
import OfferModal from '@/2_partner/dashboard/components/OfferModal';
import { usePartnerJarvis } from '@/2_partner/components/ai_agent/usePartnerJarvis';
import { usePartnerActionHandler } from '@/2_partner/components/ai_agent/PartnerActionHandler';

const translations = {
    en: { menuManager: "Menu Manager" },
    ur: { menuManager: "مینو مینیجر" }
};

const CategoryOfferDialog = ({ category, cuisine, onApply, isDropdownItem = false }: { category: string, cuisine: string, onApply: (c: string, cu: string, d: number, o: string) => void, isDropdownItem?: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [discount, setDiscount] = useState(10);
    const [offerName, setOfferName] = useState("");

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {isDropdownItem ? (
                <button
                    className="relative flex w-full cursor-pointer select-none items-center rounded-xl px-3 py-2.5 text-sm outline-none transition-all hover:bg-amber-500/10 hover:text-amber-400 focus:bg-amber-500/10 focus:text-amber-400 font-bold text-slate-300 gap-3"
                    onClick={(e) => { e.preventDefault(); setIsOpen(true); }}
                >
                    <Tag className="w-4 h-4 text-amber-500" /> Apply Offer
                </button>
            ) : (
                <Button variant="ghost" size="sm" className="h-9 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 gap-2 font-bold rounded-xl transition-colors border border-transparent hover:border-amber-500/20" onClick={() => setIsOpen(true)}>
                    <Tag className="w-4 h-4" /> Apply Offer
                </Button>
            )}
            <DialogContent className="sm:max-w-[420px] bg-slate-900 border-slate-800 shadow-[0_30px_90px_rgba(0,0,0,0.6)] rounded-[2.5rem] overflow-hidden p-0 gap-0">
                <div className="absolute inset-x-0 -top-px h-1.5 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>
                <div className="bg-slate-900/50 p-8 pb-5 border-b border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-4 text-2xl font-black text-white">
                            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                                <Percent className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>Offer for <span className="text-amber-500">{category}</span></div>
                        </DialogTitle>
                    </DialogHeader>
                </div>
                <div className="space-y-6 px-8 py-8 bg-slate-900">
                    <div className="space-y-3">
                        <Label htmlFor="cat-offer-discount" className="text-slate-400 font-bold text-sm ml-1">Discount Percentage (%)</Label>
                        <div className="relative group">
                            <Input id="cat-offer-discount" type="number" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value) || 0)} className="pl-14 bg-slate-800 border-slate-700 text-green-400 rounded-2xl h-14 text-xl font-black" />
                            <Percent className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="cat-offer-name" className="text-slate-400 font-bold text-sm ml-1">Offer Label (Optional)</Label>
                        <Input id="cat-offer-name" placeholder="e.g. Weekend Special" value={offerName} onChange={(e) => setOfferName(e.target.value)} className="bg-slate-800 border-slate-700 text-white rounded-2xl h-14 px-5 font-semibold" />
                    </div>
                </div>
                <div className="px-8 py-6 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row gap-4">
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-2xl border-slate-700 text-slate-400">Cancel</Button>
                    <Button className="flex-[1.5] h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-lg" onClick={() => { onApply(category, cuisine, discount, offerName); setIsOpen(false); }}>
                        Apply to {category}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// --- Helper: Visual Sync Indicator ---
const CloudPulseIcon = ({ status }: { status: 'idle' | 'saving' | 'saved' }) => {
    if (status === 'saved') {
        return (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full animate-in zoom-in duration-300">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest leading-none">Synced</span>
            </div>
        );
    }
    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 ${status === 'saving' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/10 opacity-50'}`}>
            <Cloud className={`w-3.5 h-3.5 ${status === 'saving' ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${status === 'saving' ? 'text-amber-500' : 'text-slate-500'}`}>
                {status === 'saving' ? 'Saving...' : 'Cloud Ready'}
            </span>
        </div>
    );
};

// ── Jarvis floating mic for the Menu page ────────────────────────────────────
const MenuJarvisMic = ({ restaurantId }: { restaurantId: string }) => {
    const { isRecording, isProcessing, isAutoMode, error, lastData, startRecording, stopRecording, toggleAutoMode } =
        usePartnerJarvis({ restaurantId });
    const { executeAction } = usePartnerActionHandler();
    const handledRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        if (!lastData) return;
        const key = `${lastData.action}:${lastData.target}:${Date.now()}`;
        if (handledRef.current === key) return;
        handledRef.current = key;
        executeAction(lastData.action, lastData.target, lastData.tool_result);
    }, [lastData, executeAction]);

    React.useEffect(() => { if (error) toast.error(error); }, [error]);

    const handleClick = async () => {
        if (isProcessing || isAutoMode) return;
        if (isRecording) { stopRecording(); return; }
        await startRecording();
    };

    return (
        <div className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-50 flex flex-col items-end gap-2">
            {/* Auto-mode pill */}
            <button
                type="button"
                onClick={toggleAutoMode}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition ${
                    isAutoMode
                        ? 'border-green-400/50 bg-green-500/20 text-green-300 animate-pulse'
                        : 'border-white/20 bg-black/60 text-slate-400 hover:text-slate-200'
                }`}
            >
                {isAutoMode ? 'AUTO ON' : 'AUTO'}
            </button>

            {/* Main mic button */}
            <button
                type="button"
                onClick={handleClick}
                disabled={isProcessing}
                title={isRecording ? 'Stop' : 'Jarvis ko bolo...'}
                className={`w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-lg transition-all hover:scale-110 disabled:opacity-60 ${
                    isRecording
                        ? 'border-red-400/70 bg-red-500/30 text-red-200 animate-pulse shadow-red-500/30'
                        : isProcessing
                        ? 'border-amber-400/50 bg-amber-500/20 text-amber-200 shadow-amber-500/30'
                        : 'border-amber-400/40 bg-black/70 text-amber-300 shadow-amber-500/20 hover:bg-amber-500/20'
                }`}
            >
                {isProcessing
                    ? <Loader2 className="w-6 h-6 animate-spin" />
                    : isRecording
                    ? <Square className="w-5 h-5 text-red-400" />
                    : <Mic className="w-6 h-6" />}
            </button>
        </div>
    );
};

const MenuManager = () => {
    const {
        items,
        setItems,
        loading,
        setLoading,
        restId,
        restaurantInfo,
        fetchItems,
    } = useMenuData();
    const [searchTerm, setSearchTerm] = useState('');
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const navigate = useNavigate();

    // ── Jarvis voice bridge — listens for window events dispatched by PartnerActionHandler ──
    useEffect(() => {
        const onSearch = (e: Event) => {
            const query = (e as CustomEvent<{ query: string }>).detail?.query || '';
            setSearchTerm(query);
            if (query) toast.info(`Jarvis: "${query}" search ho raha hai...`);
        };
        const onRefresh = () => { void fetchItems(); };
        window.addEventListener('jarvis:menu:search', onSearch);
        window.addEventListener('jarvis:menu:refresh', onRefresh);
        return () => {
            window.removeEventListener('jarvis:menu:search', onSearch);
            window.removeEventListener('jarvis:menu:refresh', onRefresh);
        };
    }, [fetchItems]);

    // Tab State
    const [activeItemTab, setActiveItemTab] = useState('all');
    const [offerModalOpen, setOfferModalOpen] = useState(false)
    const [offerTargetItem, setOfferTargetItem] = useState<MenuItem | null>(null)

    const activeOfferCount = items.filter(i =>
        i.discount_percentage &&
        i.discount_percentage > 0 &&
        i.offer_expires_at &&
        new Date(i.offer_expires_at) > new Date()
    ).length

    // Modal State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);

    // Form State
    const [currentItem, setCurrentItem] = useState<Partial<MenuItem>>({
        name: '', price: 0, category: '', description: '', image_url: '',
        cuisine: '', stock_count: null, low_stock_threshold: 5, is_stock_managed: false,
        is_available: true,
        available_start_time: null, available_end_time: null,
        discount_percentage: null, offer_name: ''
    });
    const [variants, setVariants] = useState<MenuVariant[]>([]);
    const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
    const [expandedCuisines, setExpandedCuisines] = useState<string[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    // Deal State
    const [dealItems, setDealItems] = useState<DealItem[]>([]);
    const {
        isSelectionMode,
        setIsSelectionMode,
        selectedItems,
        setSelectedItems,
        isBulkPriceDialogOpen,
        setIsBulkPriceDialogOpen,
        bulkPriceChange,
        setBulkPriceChange,
        isBulkDeleteConfirmOpen,
        setIsBulkDeleteConfirmOpen,
        handleBulkAvailabilityToggle,
        handleBulkPriceUpdate,
        handleBulkDelete,
        confirmBulkDelete,
        toggleItemSelection,
    } = useMenuBulk({ items, setItems, setLoading, fetchItems });

    // Auto-fill State
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Responsive & UX State
    const isMobile = useIsMobile();
    const { language, setLanguage } = useLanguage();
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const menuLanguage = language === 'ur' ? 'ur' : 'en';
    const t = translations[menuLanguage];
    const { currencySymbol, currencyCode } = useRestaurant();
    const formatPriceDisplay = React.useCallback((price: number | string): string => {
        const num = typeof price === 'string' ? parseFloat(price) || 0 : price;
        return `${currencySymbol}\u00A0${num.toLocaleString('en', { maximumFractionDigits: 0 })}`;
    }, [currencySymbol]);

    // --- AUTO-FILL MISSING IMAGES LOGIC ---
    const autoFillMissingImages = async () => {
        if (!restId) return;

        const itemsNeedingImages = items.filter(item => !item.image_url || item.image_url.trim() === '');

        if (itemsNeedingImages.length === 0) {
            toast.success("All items already have images!");
            return;
        }

        setIsAutoFilling(true);
        toast.message(`Searching for missing images for ${itemsNeedingImages.length} items...`);

        let updatedCount = 0;
        const nextItems = [...items];

        try {
            for (let i = 0; i < itemsNeedingImages.length; i++) {
                const item = itemsNeedingImages[i];
                if (!item.name) continue;

                const matchedUrl = await findBestPresetImage(item.name || "", item.category || item.cuisine || "");
                if (matchedUrl) {
                    // TODO: regenerate Supabase types to remove this cast
                    const { error } = await ((supabase as any)
                        .from('menu_items')
                        .update({ image_url: matchedUrl, updated_at: new Date().toISOString() } as any)
                        .eq('id', item.id) as any);

                    if (!error) {
                        const index = nextItems.findIndex(x => x.id === item.id);
                        if (index !== -1) {
                            nextItems[index] = { ...nextItems[index], image_url: matchedUrl };
                        }
                        updatedCount++;
                    }
                }
            }

            if (updatedCount > 0) {
                setItems(nextItems);
                toast.success(`Successfully auto-filled ${updatedCount} images! ✨`);
            } else {
                toast.error("No suitable images found in the bucket for the remaining items.");
            }
        } catch (error) {
            console.error("Auto-fill error:", error);
            toast.error("An error occurred during auto-fill.");
        } finally {
            setIsAutoFilling(false);
        }
    };

    // --- ANALYTICS LOGIC ---
    const stats = useMemo(() => {
        const totalItems = items.length;
        const outOfStock = items.filter(item => {
            const variantStock = (item.variants || []).map(v => v.stock_count).filter((s): s is number => typeof s === 'number');
            const hasVariantStock = variantStock.length > 0;
            const currentStock = hasVariantStock ? variantStock.reduce((acc, curr) => acc + curr, 0) : (item.stock_count ?? null);
            const isStockManaged = item.is_stock_managed || hasVariantStock;
            return isStockManaged && currentStock !== null && currentStock <= 0;
        }).length;

        const lowStock = items.filter(item => {
            const variantStock = (item.variants || []).map(v => v.stock_count).filter((s): s is number => typeof s === 'number');
            const hasVariantStock = variantStock.length > 0;
            const currentStock = hasVariantStock ? variantStock.reduce((acc, curr) => acc + curr, 0) : (item.stock_count ?? null);
            const isStockManaged = item.is_stock_managed || hasVariantStock;
            const threshold = item.low_stock_threshold || 5;
            return isStockManaged && currentStock !== null && currentStock > 0 && currentStock <= threshold;
        }).length;

        const categoryCounts = items.reduce((acc, item) => {
            const cat = item.category || 'Uncategorized';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

        return { totalItems, outOfStock, lowStock, topCategory };
    }, [items]);


    const menuRef = useRef<HTMLDivElement>(null);
    const dealOriginalPrice = dealItems.reduce((sum, item) => sum + (item.original_price * item.quantity), 0);

    const finalPrice = useMemo(() => {
        const base = currentItem.price || 0;
        const disc = currentItem.discount_percentage || 0;
        return Math.round(base - (base * (disc / 100)));
    }, [currentItem.price, currentItem.discount_percentage]);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleImageUpload = (file: File | null) => {
        if (!file) {
            setImageFile(null);
            setImagePreview(null);
            return;
        }
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const {
        itemForDirectOffer,
        setItemForDirectOffer,
        directOfferDiscount,
        setDirectOfferDiscount,
        directOfferName,
        setDirectOfferName,
        directOfferExpiresAt, // Added this line
        setDirectOfferExpiresAt, // Added this line
        handleApplyCategoryOffer,
        handleRemoveCategoryOffer,
        handleApplyCuisineOffer,
        handleRemoveCuisineOffer,
        handleApplyBulkOffer,
        handleRemoveBulkOffer,
        handleApplyIndividualOffer,
        handleClearOffer,
    } = useMenuOffers({ items, setItems, setLoading, selectedItems, setSelectedItems, setIsSelectionMode });

    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedMark = useRef<string>("");
    const isModalJustOpened = useRef(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (isModalJustOpened.current) {
            isModalJustOpened.current = false;
            return;
        }

        if (!isDialogOpen || !currentItem.id || isSubmitting) return;

        const currentMark = JSON.stringify({
            currentItem: { ...currentItem, image_url: currentItem.image_url || "" },
            variants,
            modifierGroups,
            dealItems
        });

        if (lastSavedMark.current === currentMark) return;

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        autoSaveTimerRef.current = setTimeout(() => {
            handleSave(true);
            lastSavedMark.current = currentMark;
        }, 2000);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [currentItem, variants, modifierGroups, dealItems, isDialogOpen]);

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const {
        isExportDialogOpen,
        setIsExportDialogOpen,
        exportOptions,
        setExportOptions,
        handleDownloadMenu,
    } = useMenuExport({ items, restaurantInfo, currencyCode, formatPriceDisplay });

    const [existingCategories, setExistingCategories] = useState<{ value: string; label: string }[]>([]);
    const [existingCuisines, setExistingCuisines] = useState<{ value: string; label: string }[]>([]);

    const {
        scannedItems,
        setScannedItems,
        isScanning,
        scanStatus,
        isImporting,
        scanFile,
        setScanFile,
        scanPreview,
        setScanPreview,
        scannedItemImageUpdateIndex,
        setScannedItemImageUpdateIndex,
        scannedImageInputRef,
        handleScan,
        handleImportScannedItems,
    } = useMenuScan({ restId, fetchItems });

    const DEFAULT_CATEGORIES = ["Fast Food", "Desi", "Chinese", "Italian", "BBQ", "Beverages", "Desserts", "Breakfast", "Wraps", "Salads"];
    const DEFAULT_CUISINES = ["Pakistani", "American", "Italian", "Continental", "Turkish", "Arabian", "Mexican", "Thai"];

    const toggleCuisine = (cuisine: string) => {
        setExpandedCuisines(prev => prev.includes(cuisine) ? prev.filter(c => c !== cuisine) : [...prev, cuisine]);
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
    };

    useEffect(() => {
        if (items.length > 0 && expandedCuisines.length === 0) {
            const firstCuisine = items.find(i => i.cuisine)?.cuisine;
            if (firstCuisine) setExpandedCuisines([firstCuisine]);
        }
    }, [items]);

    useEffect(() => {
        const itemCuisines = Array.from(new Set(items.map(i => i.cuisine).filter(Boolean))) as string[];
        const itemCats = Array.from(new Set(items.map(i => i.category).filter(Boolean))) as string[];

        const uniqueCuisines = Array.from(new Set([...DEFAULT_CUISINES, ...itemCuisines])).sort().map(c => ({ value: c, label: c }));
        const uniqueCats = Array.from(new Set([...DEFAULT_CATEGORIES, ...itemCats])).sort().map(c => ({ value: c, label: c }));

        setExistingCuisines(uniqueCuisines);
        setExistingCategories(uniqueCats);
    }, [items]);


    const fetchItemDetails = async (itemId: string) => {
        const { data: vData } = await supabase.from('menu_variants').select('*').eq('item_id', itemId);
        if (vData) setVariants((vData as any[]).map((v: any) => ({ ...v, is_available: v.is_available ?? true, stock_count: v.stock_count ?? null })));

        const { data: gData } = await supabase.from('menu_modifier_groups').select(`*, menu_modifiers(*)`).eq('item_id', itemId);
        if (gData) {
            const formattedGroups = gData.map((g: any) => ({ ...g, modifiers: g.menu_modifiers || [] }));
            setModifierGroups(formattedGroups);
        }
    };

    const handleAIGenerate = () => {
        alert("Jarvis is listening... Voice commands integration activated! Tell me what to edit.");
    };

    const openAddModal = () => {
        setCurrentItem({
            name: '',
            price: 0,
            category: '',
            description: '',
            image_url: '',
            cuisine: '',
            stock_count: null,
            low_stock_threshold: 5,
            is_stock_managed: false,
            is_available: true,
            available_start_time: null,
            available_end_time: null,
            discount_percentage: null,
            offer_name: '',
            item_type: undefined,
        });
        setDealItems([]);
        setVariants([]);
        setModifierGroups([]);
        setImageFile(null);
        setImagePreview(null);
        setIsEditing(false);
        setSelectionMode(true);
        setIsDialogOpen(true);
    };

    const openQuickAddModal = (e: React.MouseEvent, cuisine: string, category: string = '') => {
        e.stopPropagation();
        setCurrentItem({
            name: '', price: 0, category: category, description: '', image_url: '', cuisine: cuisine, stock_count: null, low_stock_threshold: 5, is_stock_managed: false,
            is_available: true, available_start_time: null, available_end_time: null, discount_percentage: null, offer_name: '', item_type: 'single'
        });
        setVariants([]); setModifierGroups([]); setImageFile(null); setImagePreview(null); setIsEditing(false); setSelectionMode(false); setIsDialogOpen(true);
    };

    const openAddDealModal = () => {
        setCurrentItem({
            name: '',
            price: 0,
            category: '',
            description: '',
            image_url: '',
            cuisine: '',
            stock_count: null,
            low_stock_threshold: 5,
            is_stock_managed: false,
            is_available: true,
            available_start_time: null,
            available_end_time: null,
            discount_percentage: null,
            offer_name: '',
            item_type: 'deal',
        });
        setDealItems([]);
        setVariants([]);
        setModifierGroups([]);
        setImageFile(null);
        setImagePreview(null);
        setIsEditing(false);
        setSelectionMode(false);
        setIsDialogOpen(true);
    };

    const openEditModal = async (item: MenuItem) => {
        const basePrice = (item.discount_percentage && item.discount_percentage > 0) ? (item.original_price || item.price) : item.price;
        setCurrentItem({ ...item, price: basePrice, offer_name: item.offer_name || '', low_stock_threshold: item.low_stock_threshold ?? 5, is_stock_managed: item.is_stock_managed ?? false });
        setImageFile(null); setImagePreview(item.image_url || null); setIsEditing(true); setSelectionMode(false); setVariants([]); setModifierGroups([]);
        
        // ✅ FIXED: Wait for variants/modifiers to load BEFORE opening modal
        await fetchItemDetails(item.id);
        
        if (item.item_type === 'deal' && (item as any).deal_items) setDealItems((item as any).deal_items || []);
        
        // ✅ Now open modal with fully loaded data
        isModalJustOpened.current = true;
        setIsDialogOpen(true);
    };

    const handleRemoveOffer = async (itemId: string) => {
        try {
            const item = items.find(i => i.id === itemId)
            if (!item) return

            const updatePayload: any = {
                price: item.offer_original_price || item.price,
                discount_percentage: null,
                offer_name: null,
                offer_expires_at: null,
                offer_original_price: null
            };

            const { error } = await (supabase.from('menu_items') as any)
                .update(updatePayload)
                .eq('id', itemId);

            if (error) throw error
            toast.success("Offer removed successfully")
            fetchItems()
        } catch (error) {
            console.error(error)
            toast.error("Failed to remove offer")
        }
    }

    const handleSave = async (isAutoSave = false) => {
        console.log('[MenuManager.handleSave] currentItem.name:', currentItem.name);
        const hasVariantPrices = variants.length > 0 && variants.some(v => v.price > 0);
        if (!currentItem.name || !restId) { toast.error("Please enter a Dish Name."); return; }
        if (!currentItem.price && !hasVariantPrices) { toast.error("Please enter a Base Price or add Variants with prices"); return; }
        if (currentItem.item_type === 'deal' && dealItems.length === 0) { toast.error("Please add at least one item to the deal."); return; }

        if (hasVariantPrices && !currentItem.price) {
            const lowestPrice = Math.min(...variants.filter(v => v.price > 0).map(v => v.price));
            currentItem.price = lowestPrice;
        }

        setIsSubmitting(true);
        setSaveStatus('saving');
        try {
            let finalImageUrl = currentItem.image_url || '';

            if (imageFile) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const fileExt = imageFile.name.split('.').pop();
                    const fileName = `${user.id}/${uuidv4()}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage.from('menu-images').upload(fileName, imageFile);
                    if (!uploadError) {
                        const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(fileName);
                        finalImageUrl = urlData.publicUrl;
                    }
                }
            }

            let catId = null;
            if (currentItem.category) {
                const { data: existingCat } = await supabase.from('categories').select('id').eq('restaurant_id', restId).eq('name', currentItem.category).maybeSingle();
                if (existingCat) {
                    catId = (existingCat as any).id;
                } else {
                    const { data: newCat, error: catError } = await (supabase.from('categories').insert({ restaurant_id: restId, name: currentItem.category } as any).select().single() as any);
                    if (catError) throw catError;
                    catId = newCat.id;
                }
            }

            const finalCalculatedPrice = currentItem.item_type === 'deal' ? parseFloat(currentItem.price?.toString() || '0') : finalPrice;

            const payload = {
                restaurant_id: restId, name: currentItem.name, price: parseFloat(finalCalculatedPrice.toString()),
                description: currentItem.description, category_id: catId, cuisine: currentItem.cuisine, image_url: finalImageUrl,
                is_available: currentItem.is_available ?? true, stock_count: currentItem.stock_count === 0 ? 0 : (currentItem.stock_count || null),
                low_stock_threshold: currentItem.low_stock_threshold ?? 5, is_stock_managed: currentItem.is_stock_managed ?? false,
                item_type: currentItem.item_type || 'single',
                deal_items: currentItem.item_type === 'deal' ? dealItems.map(di => {
                    const original = items.find(i => i.id === di.item_id);
                    return { ...di, image_url: di.image_url || original?.image_url, cuisine: di.cuisine || original?.cuisine, category: di.category || original?.category };
                }) : null,
                original_price: currentItem.item_type === 'deal' ? dealOriginalPrice : (currentItem.discount_percentage && currentItem.discount_percentage > 0 ? currentItem.price : null),
                discount_percentage: currentItem.discount_percentage || null, offer_name: currentItem.offer_name || null,
                available_start_time: currentItem.available_start_time, available_end_time: currentItem.available_end_time
            };

            let itemId = currentItem.id;
            let data: any = null;

            if (isEditing && itemId) {
                // TODO: regenerate Supabase types to remove this cast
                const { data: updateData, error } = await ((supabase as any).from('menu_items').update(payload as any).eq('id', itemId).select('*, categories(name)').single() as any);
                if (error) throw error;
                data = updateData;
            } else {
                // TODO: regenerate Supabase types to remove this cast
                const { data: insertData, error } = await ((supabase as any).from('menu_items').insert([payload] as any).select('*, categories(name)').single() as any);
                if (error) throw error;
                itemId = insertData.id;
                data = insertData;
            }

            if (itemId) {
                await supabase.from('menu_variants').delete().eq('item_id', itemId);
                if (variants.length > 0) {
                    const variantsToInsert = variants.map(v => ({
                        item_id: itemId, name: v.name, description: v.description, price: v.price,
                        original_price: v.original_price, stock_count: v.stock_count, is_available: v.is_available ?? true
                    }));
                    await supabase.from('menu_variants').insert(variantsToInsert as any);
                }

                await supabase.from('menu_modifier_groups').delete().eq('item_id', itemId);
                for (const group of modifierGroups) {
                    // TODO: regenerate Supabase types to remove this cast
                    const { data: groupDataRaw } = await (supabase as any).from('menu_modifier_groups').insert([{ item_id: itemId, name: group.name, min_selection: group.min_selection, max_selection: group.max_selection }]).select().single();
                    const groupData: any = groupDataRaw;
                    if (groupData && group.modifiers.length > 0) {
                        const modsToInsert = group.modifiers.map(m => ({ group_id: groupData.id, name: m.name, price: m.price, is_available: m.is_available, stock_count: m.stock_count }));
                        await supabase.from('menu_modifiers').insert(modsToInsert as any);
                    }
                }
            }

            setItems(prev => prev.map(item => item.id === itemId ? ({ ...item, ...data, variants: variants, modifier_groups: modifierGroups, category: currentItem.category } as MenuItem) : item));
            setSaveStatus('saved');
            if (!isAutoSave) {
                toast.success(isEditing ? "Item updated successfully!" : "Item added successfully!");
                setTimeout(() => {
                    setIsDialogOpen(false);
                    fetchItems();
                }, 800);
            }
            setTimeout(() => setSaveStatus('idle'), 3000);

        } catch (error: any) {
            setSaveStatus('idle');
            console.error("Error saving item:", error);
            toast.error(error.message || "Failed to save item");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            setLoading(true);
            const { error } = await supabase.from('menu_items').delete().eq('id', itemToDelete);
            if (error) throw error;
            setItems(prev => prev.filter(item => item.id !== itemToDelete));
            toast.success("Dish deleted successfully");
            setIsDeleteConfirmOpen(false);
            setItemToDelete(null);
        } catch (error) {
            toast.error("Failed to delete dish");
        } finally {
            setLoading(false);
        }
    };

    const toggleAvailability = async (item: MenuItem) => {
        try {
            const newVal = !item.is_available;
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: newVal } : i));
            await (supabase.from('menu_items') as any)
                .update({ is_available: newVal })
                .eq('id', item.id)
                .select('id');
            toast.success(newVal ? "Marked as Available" : "Marked as Sold Out");
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch =
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
        if (!showLowStockOnly) return true;

        const variantStock = (item.variants || [])
            .map(v => v.stock_count)
            .filter((s): s is number => typeof s === 'number');
        const hasVariantStock = variantStock.length > 0;
        const currentStock = hasVariantStock
            ? variantStock.reduce((a, c) => a + c, 0)
            : (item.stock_count ?? null);
        const isManaged = item.is_stock_managed || hasVariantStock;
        const threshold = item.low_stock_threshold || 5;

        return isManaged && currentStock !== null && currentStock <= threshold;
    });

    useEffect(() => {
        if (!showLowStockOnly) return;
        const cuisines = filteredItems
            .filter(i => i.item_type !== 'deal')
            .map(i => i.cuisine?.trim() || 'General');
        const cats = filteredItems
            .filter(i => i.item_type !== 'deal')
            .map(i => `${i.cuisine?.trim() || 'General'}-${i.category?.trim() || 'Other'}`);
        setExpandedCuisines(Array.from(new Set(cuisines)));
        setExpandedCategories(Array.from(new Set(cats)));
    }, [showLowStockOnly, filteredItems.length]);

    const groupedItems = useMemo(() => {
        const singles = filteredItems.filter(i => i.item_type !== 'deal');
        const groups: Record<string, Record<string, MenuItem[]>> = {};

        singles.forEach(item => {
            const cuisine = item.cuisine?.trim() || 'General';
            const category = item.category?.trim() || 'Other';
            if (!groups[cuisine]) groups[cuisine] = {};
            if (!groups[cuisine][category]) groups[cuisine][category] = [];
            groups[cuisine][category].push(item);
        });

        const sortedCuisines = Object.keys(groups).sort();
        const sortedGroups: Record<string, Record<string, MenuItem[]>> = {};
        sortedCuisines.forEach(c => {
            const cats = Object.keys(groups[c]).sort();
            sortedGroups[c] = {};
            cats.forEach(cat => { sortedGroups[c][cat] = groups[c][cat]; });
        });

        return sortedGroups;
    }, [filteredItems]);

    const handleItemChange = React.useCallback(
        (updates: Partial<MenuItem>) => {
            setCurrentItem(prev => ({ ...prev, ...updates }));
        },
        []
    );

    const handleVariantsChange = React.useCallback(
        (v: MenuVariant[]) => setVariants(v),
        []
    );

    const handleModifierGroupsChange = React.useCallback(
        (mg: ModifierGroup[]) => setModifierGroups(mg),
        []
    );

    const handleDealItemsChange = React.useCallback(
        (di: DealItem[]) => setDealItems(di),
        []
    );

    const handleImageFileChange = React.useCallback(
        (file: File | null) => {
            setImageFile(file);
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => setImagePreview(reader.result as string);
                reader.readAsDataURL(file);
            } else {
                setImagePreview(null);
            }
        },
        []
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                    <p className="text-slate-500 font-medium">Loading your menu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col text-slate-900 dark:text-slate-200 bg-slate-50 dark:bg-black/95 transition-colors duration-500">
            {/* Ambient Background Glows */}
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-crimson-orb pointer-events-none z-0 opacity-40"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] ambient-glow-gold pointer-events-none z-0 opacity-20"></div>

            {/* Sticky Professional Header */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 shadow-xl">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="hidden lg:block">
                            <h1 className="text-2xl font-black text-slate-100 flex items-center gap-3">
                                {t.menuManager}
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 px-2.5 py-0.5 rounded-full border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                    PRO
                                </Badge>
                            </h1>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Global Menu Dashboard</p>
                        </div>

                        {/* Voice Readiness & Sync Status */}
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-1 rounded-2xl">
                            <CloudPulseIcon status={saveStatus} />
                            <div className="h-4 w-px bg-white/10"></div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 group cursor-help transition-all hover:bg-blue-500/20" title="AI Voice Commands Ready">
                                <Mic className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">Voice Ready</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-4">
                        {/* Language Toggle */}
                        <div className="bg-white/5 border border-white/10 p-1 rounded-2xl flex items-center">
                            <button onClick={() => setLanguage('en')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${menuLanguage === 'en' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>English</button>
                            <button onClick={() => setLanguage('ur')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${menuLanguage === 'ur' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Urdu</button>
                        </div>

                        <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/settings')} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
                                <Globe className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 pb-32 lg:pb-8">
                <div className="max-w-7xl mx-auto space-y-6 relative z-10">

                    {/* Compact Actions Bar */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 bg-white/5 border border-white/5 p-4 rounded-3xl backdrop-blur-md">
                        <div className="hidden lg:block text-slate-400 font-bold text-sm">
                            Last synced: <span className="text-slate-200">Just now</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
                                Menu Manager
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-500 px-2.5 py-0.5 rounded-full border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                    v2.0
                                </Badge>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your 3D digital menu experiences.</p>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <Button variant="ghost" onClick={() => navigate('/restaurant-setup?step=3&from=menu')} className="order-glass-card hover:bg-white/10 dark:text-slate-200 gap-2 hidden sm:flex font-bold shadow-sm transition-all duration-300">
                                <Wand2 className="w-4 h-4 text-purple-500" /> Wizard
                            </Button>

                            <Button variant="ghost" onClick={() => setIsExportDialogOpen(true)} className="order-glass-card hover:bg-white/10 dark:text-slate-200 gap-2 hidden sm:flex font-bold shadow-sm transition-all duration-300">
                                <FileDown className="w-4 h-4 text-amber-500" /> Export
                            </Button>

                            <Button
                                variant={isSelectionMode ? "default" : "ghost"}
                                onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedItems([]); }}
                                className={`gap-2 hidden sm:flex font-bold shadow-sm transition-all duration-300 ${isSelectionMode ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'order-glass-card hover:bg-white/10 dark:text-slate-200'}`}
                            >
                                {isSelectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-blue-400" />}
                                {isSelectionMode ? 'Exit Selection' : 'Select Items'}
                            </Button>

                            <Button onClick={autoFillMissingImages} disabled={isAutoFilling} variant="ghost" className="hidden lg:flex gap-2 font-bold order-glass-card hover:bg-white/10 dark:text-slate-200 transition-all duration-300">
                                {isAutoFilling ? <Loader2 className="w-4 h-4 animate-spin text-purple-500" /> : <Sparkles className="w-4 h-4 text-purple-400" />}
                                {isAutoFilling ? 'Processing...' : 'Auto-Fill Images'}
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-black gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] flex-1 sm:flex-none transition-all duration-300 rounded-xl">
                                        <Plus className="w-4 h-4" /> Add New
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="order-glass-panel border-white/10 backdrop-blur-2xl bg-black/40">
                                    <DropdownMenuItem onClick={openAddModal} className="gap-2 cursor-pointer text-slate-200 hover:bg-white/10 focus:bg-white/10">
                                        <Utensils className="w-4 h-4 text-amber-500" /> Add Single Dish
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={openAddDealModal} className="gap-2 cursor-pointer text-slate-200 hover:bg-white/10 focus:bg-white/10">
                                        <Package className="w-4 h-4 text-purple-500" /> Create Deal
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Analytics Snapshot */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 perspective-[2000px] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                        <div className="order-glass-card p-5 rounded-2xl flex items-center gap-4 group hover:-translate-y-1 hover:rotate-x-2 transition-all duration-300 cursor-default relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all">
                                <Utensils className="w-6 h-6" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Dishes</p>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1 drop-shadow-md">{stats.totalItems}</h4>
                            </div>
                        </div>

                        <div
                            className={`order-glass-card p-5 rounded-2xl flex items-center gap-4 group hover:-translate-y-1 hover:rotate-x-2 transition-all duration-300 cursor-pointer relative overflow-hidden ${showLowStockOnly ? 'ring-2 ring-orange-500/40 border-orange-500/30' : ''}`}
                            onClick={() => setShowLowStockOnly(prev => !prev)}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/10 border border-red-500/30 flex items-center justify-center text-red-500 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Low Stock Alerts</p>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1 drop-shadow-md">{stats.lowStock + stats.outOfStock}</h4>
                            </div>
                        </div>

                        <div className="order-glass-card p-5 rounded-2xl flex items-center gap-4 group hover:-translate-y-1 hover:rotate-x-2 transition-all duration-300 cursor-default relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(56,187,248,0.4)] transition-all">
                                <LayoutList className="w-6 h-6" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Top Category</p>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mt-1 truncate max-w-[120px] drop-shadow-md">{stats.topCategory}</h4>
                            </div>
                        </div>

                        <div className="order-glass-card p-5 rounded-2xl flex items-center gap-4 group hover:-translate-y-1 hover:rotate-x-2 transition-all duration-300 cursor-default relative overflow-hidden sm:col-span-2 lg:col-span-1">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Menu Status</p>
                                <h4 className="text-lg font-bold text-emerald-500 leading-tight mt-1 drop-shadow-md">90% Complete</h4>
                            </div>
                        </div>
                    </div>

                    {showLowStockOnly && (
                        <div className="flex items-center justify-between px-5 py-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl animate-in fade-in duration-300">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
                                <div>
                                    <p className="text-sm font-black text-orange-400">
                                        Low Stock Filter Active
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                        Showing {stats.lowStock + stats.outOfStock} items needing attention
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowLowStockOnly(false)}
                                className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all"
                            >
                                <X className="w-3 h-3" /> Clear
                            </button>
                        </div>
                    )}

                    {/* Tabs & Content */}
                    <div ref={menuRef} id="menu-export-container" className="pt-4">
                        <Tabs value={activeItemTab} onValueChange={setActiveItemTab} className="w-full space-y-8">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-transparent">
                                <TabsList className="order-glass-panel border-white/10 p-1.5 flex h-auto w-full md:w-auto overflow-x-auto hide-scrollbar">
                                    <TabsTrigger value="all" className="flex-1 md:flex-none gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 data-[state=active]:bg-white/10 data-[state=active]:text-amber-500 data-[state=active]:shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all">
                                        <Utensils className="w-4 h-4" /> All Items
                                    </TabsTrigger>
                                    <TabsTrigger value="deals" className="flex-1 md:flex-none gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 data-[state=active]:bg-white/10 data-[state=active]:text-purple-400 data-[state=active]:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all">
                                        <Package className="w-4 h-4" /> Deals
                                    </TabsTrigger>
                                    <TabsTrigger value="offers" className="flex-1 md:flex-none gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 data-[state=active]:bg-white/10 data-[state=active]:text-orange-400 data-[state=active]:shadow-[0_0_15px_rgba(251,146,60,0.2)] transition-all">
                                        <div className="relative">
                                            <Timer className="w-4 h-4" />
                                            {activeOfferCount > 0 && (
                                                <span className="absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-orange-500 text-[8px] flex items-center justify-center text-slate-900 rounded-full font-black animate-pulse">
                                                    {activeOfferCount}
                                                </span>
                                            )}
                                        </div>
                                        Offers
                                    </TabsTrigger>
                                    <TabsTrigger value="ai" className="flex-1 md:flex-none gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 data-[state=active]:bg-white/10 data-[state=active]:text-blue-400 data-[state=active]:shadow-[0_0_15px_rgba(56,187,248,0.2)] transition-all">
                                        <Sparkles className="w-4 h-4" /> AI Import
                                    </TabsTrigger>
                                </TabsList>

                                <div className="relative w-full md:w-80 group">
                                    <Label htmlFor="global-dish-search" className="sr-only">Search dishes</Label>
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                                    <input
                                        id="global-dish-search"
                                        name="dishSearch"
                                        placeholder="Search dishes or categories..."
                                        className="order-glass-panel border-white/10 w-full h-12 pl-11 pr-4 rounded-xl text-slate-200 placeholder:text-slate-500 focus:bg-white/5 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 focus:outline-none transition-all"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            {/* Tab 1: All Items (Vertical SaaS Hierarchy) */}
                            <TabsContent value="all" className="m-0 focus-visible:ring-0">
                                {filteredItems.filter(i => i.item_type !== 'deal').length === 0 ? (
                                    showLowStockOnly ? (
                                        <div className="text-center py-24 order-glass-card border-dashed border-white/20 rounded-3xl">
                                            <div className="order-glass-panel p-5 rounded-3xl inline-flex mb-6 text-green-500">
                                                <TrendingUp className="w-10 h-10" />
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-100 mb-3">
                                                All stock levels healthy!
                                            </h3>
                                            <p className="text-slate-400 mb-6 max-w-sm mx-auto">
                                                None of your items are running low.
                                            </p>
                                            <Button
                                                onClick={() => setShowLowStockOnly(false)}
                                                className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-6 h-10 rounded-xl font-bold"
                                            >
                                                ← Show All Items
                                            </Button>
                                        </div>
                                    ) : (
                                    <div className="text-center py-24 order-glass-card border-dashed border-white/20 rounded-3xl animate-in fade-in zoom-in-95 duration-500">
                                        <div className="order-glass-panel p-5 rounded-3xl inline-flex mb-6 text-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                                            <Utensils className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-100 mb-3 drop-shadow-md">No dishes found</h3>
                                        <p className="text-slate-400 mb-8 max-w-md mx-auto text-lg leading-relaxed">
                                            Your 3D menu is waiting. Start by adding your first dish or try the AI importer.
                                        </p>
                                        <Button onClick={openAddModal} className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-6 h-12 rounded-xl font-bold gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all">
                                            <Plus className="w-5 h-5" /> Add First Dish
                                        </Button>
                                    </div>
                                    )
                                ) : (
                                    <div className="space-y-4 pt-4 pb-12">
                                        {Object.entries(groupedItems).map(([cuisine, categories], index) => {
                                            const isCuisineExpanded = expandedCuisines.includes(cuisine);
                                            return (
                                                <div key={cuisine} className="bg-slate-900/40 rounded-[2rem] border border-slate-800/60 overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-4 shadow-xl shadow-black/20" style={{ animationDelay: `${index * 50}ms` }}>
                                                    {/* LEVEL 1: CUISINE TRUNK */}
                                                    <div
                                                        onClick={() => toggleCuisine(cuisine)}
                                                        className={`flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-white/5 transition-colors group ${isCuisineExpanded ? 'border-b border-slate-800/60 bg-white/5' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 group-hover:scale-105 transition-transform">
                                                                <Globe className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <h2 className="text-xl font-black text-slate-100 tracking-tight">{cuisine} Menu</h2>
                                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">{Object.values(categories).flat().length} Items</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div onClick={e => e.stopPropagation()}>
                                                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openQuickAddModal(e, cuisine, ""); }} className="h-9 px-4 text-xs font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-xl">
                                                                    <Plus className="w-4 h-4 mr-1.5" /> Add Category
                                                                </Button>
                                                            </div>
                                                            <ChevronRight className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isCuisineExpanded ? 'rotate-90 text-amber-500' : ''}`} />
                                                        </div>
                                                    </div>

                                                    {/* LEVEL 2: CATEGORY BRANCHES */}
                                                    {isCuisineExpanded && (
                                                        <div className="divide-y divide-slate-800/50 bg-black/20">
                                                            {Object.entries(categories).map(([category, catItems]) => {
                                                                const isCategoryExpanded = expandedCategories.includes(`${cuisine}-${category}`);
                                                                return (
                                                                    <div key={category} className="group/branch">
                                                                        <div
                                                                            onClick={() => toggleCategory(`${cuisine}-${category}`)}
                                                                            className="flex items-center justify-between py-3 px-6 cursor-pointer hover:bg-white/5 transition-colors"
                                                                        >
                                                                            <div className="flex items-center gap-3 pl-14">
                                                                                <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform duration-300 ${isCategoryExpanded ? 'rotate-90 text-amber-400' : ''}`} />
                                                                                <h3 className="text-sm font-bold text-slate-300 group-hover/branch:text-white transition-colors uppercase tracking-wider">{category}</h3>
                                                                                <Badge className="bg-slate-800 text-slate-400 border-none px-2 py-0 h-5 font-black">{catItems.length}</Badge>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 opacity-0 group-hover/branch:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openQuickAddModal(e, cuisine, category); }} className="h-8 text-xs font-bold text-green-400 hover:text-green-300 hover:bg-green-400/10 px-3 rounded-lg">
                                                                                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Dish
                                                                                </Button>
                                                                            </div>
                                                                        </div>

                                                                        {/* LEVEL 3: ITEM CARDS */}
                                                                        {isCategoryExpanded && (
                                                                            <div className="pl-6 pr-6 py-3 pb-6">
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                                                    {catItems.map(item => (
                                                                                        <div key={item.id} className={showLowStockOnly ? 'ring-1 ring-orange-500/30 rounded-2xl' : ''}>
                                                                                            <MenuItemCard
                                                                                                item={item}
                                                                                                onEdit={openEditModal}
                                                                                                onToggleAvailability={toggleAvailability}
                                                                                                allMenuItems={items}
                                                                                                isSelectionMode={isSelectionMode}
                                                                                                isSelected={selectedItems.includes(item.id)}
                                                                                                onSelect={toggleItemSelection}
                                                                                                onClearOffer={handleClearOffer}
                                                                                                formatPrice={formatPriceDisplay}
                                                                                                onDelete={(id) => {
                                                                                                    setItemToDelete(id);
                                                                                                    setIsDeleteConfirmOpen(true);
                                                                                                }}
                                                                                                onApplyOffer={(it) => {
                                                                                                    setItemForDirectOffer(it);
                                                                                                    setDirectOfferDiscount(it.discount_percentage || 10);
                                                                                                    setDirectOfferName(it.offer_name || "");
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </TabsContent>

                            {/* Tab 2: Deals */}
                                <TabsContent value="deals">
                                    {filteredItems.filter(i => i.item_type === 'deal').length === 0 ? (
                                        <div className="text-center py-24 order-glass-card border-dashed border-white/20 rounded-3xl animate-in fade-in zoom-in-95 duration-500 mt-4">
                                            <div className="order-glass-panel p-5 rounded-3xl inline-flex mb-6 text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                                                <Package className="w-10 h-10" />
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-100 mb-3 drop-shadow-md">No active deals</h3>
                                            <p className="text-slate-400 mb-8 max-w-md mx-auto text-lg leading-relaxed">
                                                Create attractive bundles (e.g. Burger + Fries + Drink) to boost your average order value.
                                            </p>
                                            <Button onClick={openAddDealModal} className="bg-purple-600 hover:bg-purple-500 text-white px-6 h-12 rounded-xl font-bold gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all">
                                                <Plus className="w-5 h-5" /> Create First Deal
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4 perspective-[2000px] animate-in slide-in-from-bottom-8 duration-500">
                                            {filteredItems.filter(i => i.item_type === 'deal').map(item => (
                                                <div key={item.id} className={showLowStockOnly ? 'ring-1 ring-orange-500/30 rounded-2xl' : ''}>
                                                    <MenuItemCard
                                                        item={item}
                                                        onEdit={openEditModal}
                                                        onToggleAvailability={toggleAvailability}
                                                        allMenuItems={items}
                                                        isSelectionMode={isSelectionMode}
                                                        isSelected={selectedItems.includes(item.id)}
                                                        onSelect={toggleItemSelection}
                                                        onClearOffer={handleClearOffer}
                                                        formatPrice={formatPriceDisplay}
                                                        onDelete={(id) => {
                                                            setItemToDelete(id);
                                                            setIsDeleteConfirmOpen(true);
                                                        }}
                                                        onApplyOffer={(it) => {
                                                            setItemForDirectOffer(it);
                                                            setDirectOfferDiscount(it.discount_percentage || 10);
                                                            setDirectOfferName(it.offer_name || "");
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                { /* Tab: Offers */ }
                                <TabsContent value="offers" className="focus-visible:ring-0">
                                    <div className="flex flex-col gap-6 pt-4">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div>
                                                <h3 className="text-2xl font-black text-white">Time-Limited Offers</h3>
                                                <p className="text-sm text-slate-500 mt-1">
                                                    Manage discounts that expire automatically to drive urgent sales.
                                                </p>
                                            </div>
                                            <Button
                                                onClick={() => {
                                                    setOfferTargetItem(null)
                                                    setOfferModalOpen(true)
                                                }}
                                                className="bg-orange-500 hover:bg-orange-400 text-slate-900 font-bold gap-2 rounded-xl"
                                            >
                                                <Plus className="w-4 h-4" />
                                                New Offer
                                            </Button>
                                        </div>

                                        {items.filter(i => i.discount_percentage && i.discount_percentage > 0).length === 0 ? (
                                            <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800">
                                                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                    <Timer className="w-8 h-8 text-slate-600" />
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-2">No active offers</h3>
                                                <p className="text-slate-500 max-w-xs mx-auto text-sm">
                                                    Set short-time discounts on your best dishes to attract more customers tonight.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid gap-4">
                                                {items
                                                    .filter(i => i.discount_percentage && i.discount_percentage > 0)
                                                    .sort((a, b) => {
                                                        const dateA = a.offer_expires_at ? new Date(a.offer_expires_at).getTime() : 0
                                                        const dateB = b.offer_expires_at ? new Date(b.offer_expires_at).getTime() : 0
                                                        return dateA - dateB
                                                    })
                                                    .map(item => {
                                                        const isExpired = item.offer_expires_at && new Date(item.offer_expires_at) < new Date()
                                                        const expiresSoon = item.offer_expires_at &&
                                                            (new Date(item.offer_expires_at).getTime() - new Date().getTime()) < (2 * 60 * 60 * 1000)

                                                        return (
                                                            <div key={item.id} className={`flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl border transition-all ${isExpired ? 'bg-slate-900/20 border-slate-800 opacity-60' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}>
                                                                <div className="w-20 h-20 rounded-xl bg-slate-800 overflow-hidden shrink-0 shadow-lg">
                                                                    <DynamicFoodImage
                                                                        name={item.name}
                                                                        category={item.category || ''}
                                                                        cuisine={item.cuisine || ''}
                                                                        manualImage={item.image_url}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <h4 className="text-lg font-black text-white truncate">{item.name}</h4>
                                                                        <Badge className="bg-orange-500/20 text-orange-400 border-none font-black">-{item.discount_percentage}%</Badge>
                                                                    </div>
                                                                    <p className="text-xs text-slate-500 line-clamp-1">{item.category} · {item.offer_name || 'Limited Time Discount'}</p>
                                                                </div>

                                                                <div className="flex flex-row md:flex-col items-end gap-1 px-4 border-l border-slate-800/50">
                                                                    <p className="text-sm font-bold text-slate-500 line-through">{formatPriceDisplay(item.offer_original_price || item.price)}</p>
                                                                    <p className="text-xl font-black text-emerald-400">{formatPriceDisplay(item.price)}</p>
                                                                </div>

                                                                <div className="flex flex-col items-center md:items-start gap-1 min-w-[140px] px-4 border-l border-slate-800/50">
                                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                                                                        {isExpired ? 'Status' : 'Ends In'}
                                                                    </p>
                                                                    {isExpired ? (
                                                                        <span className="text-xs font-black text-red-400 bg-red-400/10 px-2.5 py-1 rounded-lg border border-red-400/20">
                                                                            Expired
                                                                        </span>
                                                                    ) : (
                                                                        <div className={`flex items-center gap-1.5 text-sm font-black ${expiresSoon ? 'text-orange-400' : 'text-slate-300'}`}>
                                                                            <Timer className={`w-4 h-4 ${expiresSoon ? 'animate-pulse' : ''}`} />
                                                                            {item.offer_expires_at ? (() => {
                                                                                const diff = new Date(item.offer_expires_at).getTime() - new Date().getTime()
                                                                                const hours = Math.floor(diff / (1000 * 60 * 60))
                                                                                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                                                                                return `${hours}h ${mins}m`
                                                                            })() : 'Permanent'}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-2 pl-4 border-l border-slate-800/50">
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => {
                                                                            setOfferTargetItem(item)
                                                                            setOfferModalOpen(true)
                                                                        }}
                                                                        className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/10"
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => handleRemoveOffer(item.id)}
                                                                        className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="ai" className="focus-visible:ring-0">
                                    {!scannedItems.length ? (
                                        <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
                                            <div className="order-glass-card rounded-3xl border border-blue-500/20 p-8 md:p-12 text-center relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
                                                <div className="order-glass-panel p-5 rounded-3xl inline-flex mb-6 shadow-[0_0_30px_rgba(59,130,246,0.2)] relative z-10 transition-transform duration-500 group-hover:scale-110">
                                                    <Sparkles className="w-10 h-10 text-blue-400" />
                                                </div>
                                                <h3 className="text-3xl font-black text-slate-100 mb-4 drop-shadow-md relative z-10">AI Menu Scanner</h3>
                                                <p className="text-slate-400 mb-8 max-w-lg mx-auto text-lg leading-relaxed relative z-10">
                                                    Upload a photo of your paper menu and let our AI digitize it instantly.
                                                    We'll extract item names, prices, and categories for you.
                                                </p>

                                                <div className="max-w-2xl mx-auto relative z-10">
                                                    {scanPreview ? (
                                                        <div className="relative rounded-3xl overflow-hidden border border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.2)] mb-8 glass-card">
                                                            <img src={scanPreview} alt="Scan Preview" className="w-full h-auto max-h-96 object-contain bg-black/50 backdrop-blur-sm" />
                                                            <button
                                                                onClick={() => { setScanFile(null); setScanPreview(null); }}
                                                                className="absolute top-4 right-4 bg-red-500/20 hover:bg-red-500/40 text-red-400 backdrop-blur-md p-3 rounded-full transition-colors shadow-lg border border-red-500/30"
                                                            >
                                                                <X className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <label className="flex flex-col items-center justify-center w-full h-72 border-2 border-dashed border-white/20 rounded-3xl cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group order-glass-panel relative overflow-hidden mb-8">
                                                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                                            <div className="flex flex-col items-center justify-center pt-5 pb-6 relative z-10 transition-transform duration-500 group-hover:-translate-y-2">
                                                                <div className="w-20 h-20 rounded-2xl order-glass-panel flex items-center justify-center mb-6 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all">
                                                                    <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                                                </div>
                                                                <p className="text-xl font-bold text-slate-200 mb-2 group-hover:text-blue-300 transition-colors">Click to upload menu image</p>
                                                                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">PNG, JPG or WEBP (Max 10MB)</p>
                                                            </div>
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        setScanFile(file);
                                                                        const reader = new FileReader();
                                                                        reader.onloadend = () => setScanPreview(reader.result as string);
                                                                        reader.readAsDataURL(file);
                                                                    }
                                                                }}
                                                            />
                                                        </label>
                                                    )}

                                                    <Button
                                                        onClick={handleScan}
                                                        disabled={!scanFile || isScanning}
                                                        className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] gap-3 text-lg transform transition-all hover:-translate-y-0.5 relative overflow-hidden group disabled:opacity-50 disabled:hover:translate-y-0"
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                                                        <span className="relative z-10 flex items-center justify-center w-full">
                                                            {isScanning ? (
                                                                <div className="flex items-center">
                                                                    <Loader2 className="mr-3 h-6 w-6 animate-spin text-white" />
                                                                    {scanStatus || "AI is Analyzing..."}
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <Sparkles className="w-6 h-6 mr-2" />
                                                                    Start Smart Scan
                                                                </>
                                                            )}
                                                        </span>
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="order-glass-card rounded-2xl p-6 border border-white/5 hover:border-green-500/30 transition-colors group">
                                                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                        <Zap className="w-6 h-6 text-green-400" />
                                                    </div>
                                                    <h4 className="font-bold text-slate-100 text-lg mb-2">Instant Digitization</h4>
                                                    <p className="text-sm text-slate-400 leading-relaxed">Convert hours of manual entry into seconds. Our AI accurately interprets varied formats.</p>
                                                </div>
                                                <div className="order-glass-card rounded-2xl p-6 border border-white/5 hover:border-purple-500/30 transition-colors group">
                                                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                        <Percent className="w-6 h-6 text-purple-400" />
                                                    </div>
                                                    <h4 className="font-bold text-slate-100 text-lg mb-2">Precise Prices</h4>
                                                    <p className="text-sm text-slate-400 leading-relaxed">Accurately extracts currency, numerics, and distinguishes sizes seamlessly.</p>
                                                </div>
                                                <div className="order-glass-card rounded-2xl p-6 border border-white/5 hover:border-amber-500/30 transition-colors group">
                                                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                        <CheckSquare className="w-6 h-6 text-amber-400" />
                                                    </div>
                                                    <h4 className="font-bold text-slate-100 text-lg mb-2">Smart Categorization</h4>
                                                    <p className="text-sm text-slate-400 leading-relaxed">AI automatically groups items by cuisine and category, arranging your menu intelligently.</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in slide-in-from-bottom-8 opacity-100 duration-500 pt-4 cursor-default">
                                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 order-glass-panel p-6 rounded-3xl">
                                                <div>
                                                    <h3 className="text-2xl font-black text-slate-100 drop-shadow-md">Scan Results</h3>
                                                    <p className="text-amber-500/80 font-medium">Review your digitally extracted menu structure before importing.</p>
                                                </div>
                                                <div className="flex gap-3 w-full md:w-auto">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => { setScannedItems([]); setScanFile(null); setScanPreview(null); }}
                                                        className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white flex-1 md:flex-none glass-card"
                                                    >
                                                        Discard
                                                    </Button>
                                                    <Button
                                                        onClick={handleImportScannedItems}
                                                        disabled={isImporting}
                                                        className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 font-bold gap-2 px-6 disabled:opacity-50 flex-1 md:flex-none shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                                                    >
                                                        {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                        {isImporting ? 'Importing...' : 'Import Full Menu'}
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-8">
                                                {scannedItems.map((mainCat, mainIdx) => (
                                                    <div key={mainIdx} className="order-glass-card rounded-3xl border border-white/10 shadow-xl overflow-hidden group">
                                                        <div className="order-glass-panel px-6 py-5 flex items-center justify-between border-b border-white/5 relative overflow-hidden">
                                                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent"></div>
                                                            <div className="relative z-10">
                                                                <h4 className="text-xl font-black text-slate-100 group-hover:text-amber-400 transition-colors">{mainCat.main_category}</h4>
                                                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Cuisine: <span className="text-amber-500/70">{mainCat.cuisine_type || 'N/A'}</span></p>
                                                            </div>
                                                        </div>

                                                        <div className="p-6 md:p-8 space-y-10 bg-black/20">
                                                            {mainCat.sub_categories?.map((subCat, subIdx) => (
                                                                <div key={subIdx} className="space-y-6">
                                                                    <div className="flex items-center gap-4">
                                                                        <h5 className="font-bold text-slate-200 text-lg uppercase tracking-wider">{subCat.name}</h5>
                                                                        <div className="h-px bg-gradient-to-r from-white/10 to-transparent flex-1"></div>
                                                                    </div>

                                                                    <div className="grid gap-4">
                                                                        {subCat.items?.map((item, itemIdx) => (
                                                                            <div key={itemIdx} className="flex flex-col md:flex-row gap-4 p-5 rounded-3xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group/item">
                                                                                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-black/50 border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex-shrink-0 cursor-pointer"
                                                                                    onClick={() => {
                                                                                        setScannedItemImageUpdateIndex({ mainIdx, subIdx, itemIdx });
                                                                                        scannedImageInputRef.current?.click();
                                                                                    }}
                                                                                >
                                                                                    <DynamicFoodImage
                                                                                        name={item.item_name}
                                                                                        category={subCat.name}
                                                                                        cuisine={mainCat.cuisine_type}
                                                                                        manualImage={item.manualImage}
                                                                                        className="w-full h-full object-cover"
                                                                                    />
                                                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity backdrop-blur-sm">
                                                                                        <UploadCloud className="w-6 h-6 text-white" />
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex-1 space-y-3 shrink min-w-0">
                                                                                    <div className="flex items-start justify-between gap-4">
                                                                                        <div className="space-y-2 flex-1 shrink min-w-0">
                                                                                            <Input
                                                                                                value={item.item_name}
                                                                                                name="item_name"
                                                                                                onChange={(e) => {
                                                                                                    const next = [...scannedItems];
                                                                                                    next[mainIdx].sub_categories[subIdx].items[itemIdx].item_name = e.target.value;
                                                                                                    setScannedItems(next);
                                                                                                }}
                                                                                                className="h-10 font-bold text-slate-100 border-white/5 bg-black/20 hover:bg-black/40 focus:bg-black/60 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 w-full transition-colors rounded-xl truncate"
                                                                                            />
                                                                                            <Input
                                                                                                value={item.description || ''}
                                                                                                name="item_description"
                                                                                                placeholder="Description..."
                                                                                                onChange={(e) => {
                                                                                                    const next = [...scannedItems];
                                                                                                    next[mainIdx].sub_categories[subIdx].items[itemIdx].description = e.target.value;
                                                                                                    setScannedItems(next);
                                                                                                }}
                                                                                                className="h-8 text-sm text-slate-400 border-transparent bg-transparent hover:bg-white/5 focus:bg-white/5 focus:border-white/10 w-full rounded-lg transition-colors truncate"
                                                                                            />
                                                                                        </div>

                                                                                        <div className="flex gap-2 shrink-0">
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="h-10 w-10 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                                                                                                onClick={() => {
                                                                                                    const next = [...scannedItems];
                                                                                                    next[mainIdx].sub_categories[subIdx].items.splice(itemIdx, 1);
                                                                                                    setScannedItems(next);
                                                                                                }}
                                                                                            >
                                                                                                <Trash2 className="w-5 h-5" />
                                                                                            </Button>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Variants */}
                                                                                    <div className="flex flex-wrap gap-3 pt-3 border-t border-white/5 mt-3">
                                                                                        {item.variants?.map((v, vIdx) => (
                                                                                            <div key={vIdx} className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-1.5 pr-3 shadow-inner">
                                                                                                <Input
                                                                                                    value={v.size_or_type}
                                                                                                    name="variant_size"
                                                                                                    onChange={(e) => {
                                                                                                        const next = [...scannedItems];
                                                                                                        next[mainIdx].sub_categories[subIdx].items[itemIdx].variants[vIdx].size_or_type = e.target.value;
                                                                                                        setScannedItems(next);
                                                                                                    }}
                                                                                                    className="h-8 w-24 text-xs font-bold border-transparent bg-white/5 hover:bg-white/10 focus:bg-white/10 text-slate-300 rounded-lg text-center"
                                                                                                />
                                                                                                <span className="text-xs font-bold text-amber-500/70">{currencySymbol}</span>
                                                                                                <Input
                                                                                                    type="number"
                                                                                                    value={v.price}
                                                                                                    name="variant_price"
                                                                                                    onChange={(e) => {
                                                                                                        const next = [...scannedItems];
                                                                                                        next[mainIdx].sub_categories[subIdx].items[itemIdx].variants[vIdx].price = Number(e.target.value);
                                                                                                        setScannedItems(next);
                                                                                                    }}
                                                                                                    className="h-8 w-20 text-sm font-black text-slate-100 border-transparent bg-white/5 hover:bg-white/10 focus:bg-white/10 rounded-lg text-center remove-arrow"
                                                                                                />
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}

                                                <input
                                                    type="file"
                                                    ref={scannedImageInputRef}
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file && scannedItemImageUpdateIndex !== null) {
                                                            const { mainIdx, subIdx, itemIdx } = scannedItemImageUpdateIndex;
                                                            const next = [...scannedItems];
                                                            next[mainIdx].sub_categories[subIdx].items[itemIdx].manualImage = file;
                                                            setScannedItems(next);
                                                            toast.success(`Image added!`);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent className="sm:max-w-[420px] bg-black/90 backdrop-blur-2xl border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] rounded-3xl overflow-hidden p-0 gap-0">
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></div>
                    <div className="bg-gradient-to-br from-red-500/10 to-black p-8 flex flex-col items-center text-center">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-red-500 blur-2xl opacity-30 animate-pulse"></div>
                            <div className="relative w-20 h-20 bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.3)] transform hover:rotate-6 transition-transform duration-300">
                                <Trash2 className="w-10 h-10 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                            </div>
                        </div>

                        <AlertDialogHeader className="space-y-3">
                            <AlertDialogTitle className="text-2xl font-black text-white tracking-tight">
                                Confirm Deletion
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400 font-medium leading-relaxed">
                                Are you sure you want to remove this dish? This action is permanent and cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </div>

                    <div className="px-8 py-6 bg-white/5 border-t border-white/10 flex flex-col sm:flex-row gap-3">
                        <AlertDialogCancel className="flex-1 h-12 rounded-2xl border-white/10 text-slate-300 font-bold hover:bg-white/10 hover:text-white transition-all duration-200 border glass-card">
                            Keep Dish
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDelete();
                            }}
                            className="flex-1 h-12 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold shadow-[0_0_15px_rgba(239,68,68,0.2)] active:scale-[0.98] transition-all duration-200"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Yes, Delete"}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Confirmation Dialog */}
            <AlertDialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
                <AlertDialogContent className="sm:max-w-[420px] bg-black/90 backdrop-blur-2xl border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] rounded-3xl overflow-hidden p-0 gap-0">
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></div>
                    <div className="bg-gradient-to-br from-red-500/10 to-black p-8 flex flex-col items-center text-center">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-red-500 blur-2xl opacity-30 animate-pulse"></div>
                            <div className="relative w-20 h-20 bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.3)] transform hover:rotate-6 transition-transform duration-300">
                                <Trash2 className="w-10 h-10 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                            </div>
                        </div>

                        <AlertDialogHeader className="space-y-3">
                            <AlertDialogTitle className="text-2xl font-black text-white tracking-tight">
                                Bulk Delete Items
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400 font-medium leading-relaxed">
                                Are you sure you want to delete {selectedItems.length} selected item(s)? This action is permanent and cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </div>

                    <div className="px-8 py-6 bg-white/5 border-t border-white/10 flex flex-col sm:flex-row gap-3">
                        <AlertDialogCancel className="flex-1 h-12 rounded-2xl border-white/10 text-slate-300 font-bold hover:bg-white/10 hover:text-white transition-all duration-200 border glass-card">
                            Keep Items
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmBulkDelete();
                            }}
                            className="flex-1 h-12 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold shadow-[0_0_15px_rgba(239,68,68,0.2)] active:scale-[0.98] transition-all duration-200"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Yes, Delete All"}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            {/* Individual Item Offer Dialog */}
            <Dialog open={!!itemForDirectOffer} onOpenChange={(open) => !open && setItemForDirectOffer(null)}>
                <DialogContent className="sm:max-w-[400px] bg-black/90 backdrop-blur-2xl border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl">
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent"></div>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-2xl font-black text-slate-100">
                            <Tag className="w-6 h-6 text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                            Apply Offer: <span className="text-green-400 ml-1">{itemForDirectOffer?.name}</span>
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium text-base">
                            Set a discount and optional promotion name for this specific item.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="direct-offer-discount" className="text-slate-300 font-medium">Discount Percentage (%)</Label>
                            <div className="relative">
                                <Input
                                    id="direct-offer-discount"
                                    type="number"
                                    value={directOfferDiscount || ''}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setDirectOfferDiscount(isNaN(val) ? 0 : val);
                                    }}
                                    className="pl-10 h-12 bg-black/40 border-white/10 text-slate-100 placeholder:text-slate-600 focus:border-green-500/50 focus:ring-green-500/50 rounded-xl text-lg font-black"
                                />
                                <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="direct-offer-name" className="text-slate-300 font-medium">Offer Name (Optional)</Label>
                            <Input
                                id="direct-offer-name"
                                placeholder="e.g. Daily Deal, Flash Sale"
                                value={directOfferName}
                                onChange={(e) => setDirectOfferName(e.target.value)}
                                className="h-12 bg-black/40 border-white/10 text-slate-100 placeholder:text-slate-600 focus:border-green-500/50 focus:ring-green-500/50 rounded-xl"
                            />
                        </div>

                        <div className="space-y-3 pt-2">
                            <Label className="text-slate-300 font-medium flex items-center gap-2">
                                <Timer className="w-4 h-4 text-orange-400" />
                                Expiry (Leave empty for permanent)
                            </Label>
                            
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { label: '2h', h: 2 },
                                    { label: '6h', h: 6 },
                                    { label: 'Tonight', mid: true },
                                    { label: 'Tomorrow', h: 24 },
                                ].map(p => (
                                    <button
                                        key={p.label}
                                        onClick={() => {
                                            const now = new Date();
                                            if (p.mid) now.setHours(23, 59, 0, 0);
                                            else now.setTime(now.getTime() + (p.h || 0) * 3600000);
                                            setDirectOfferExpiresAt(
                                                new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                                                .toISOString().slice(0, 16)
                                            );
                                        }}
                                        className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-slate-400 hover:text-orange-400 transition-colors"
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            <input
                                type="datetime-local"
                                value={directOfferExpiresAt}
                                onChange={(e) => setDirectOfferExpiresAt(e.target.value)}
                                className="w-full h-11 bg-black/40 border border-white/10 rounded-xl px-4 text-white text-sm focus:border-orange-500/50 outline-none"
                            />

                            {directOfferExpiresAt && (
                                <button 
                                    onClick={() => setDirectOfferExpiresAt('')}
                                    className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300"
                                >
                                    Remove Expiry
                                </button>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="border-t border-white/5 pt-4 mt-2">
                        <Button variant="outline" onClick={() => setItemForDirectOffer(null)} className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white glass-card font-bold">Cancel</Button>
                        <Button
                            className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)] font-bold px-6"
                            onClick={handleApplyIndividualOffer}
                        >
                            Apply Discount
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DishEditorModal
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                initialData={currentItem}
                onSave={async () => {
                    await handleSave(false);
                }}
                existingCategories={existingCategories}
                existingCuisines={existingCuisines}
                allMenuItems={items}
                currency={resolveCurrency(currencyCode)}
                isEditing={isEditing}
                selectionMode={selectionMode}
                onItemChange={handleItemChange}
                onVariantsChange={handleVariantsChange}
                onModifierGroupsChange={handleModifierGroupsChange}
                onDealItemsChange={handleDealItemsChange}
                onImageFileChange={handleImageFileChange}
            />

            <OfferModal
                isOpen={offerModalOpen}
                onClose={() => {
                    setOfferModalOpen(false)
                    setOfferTargetItem(null)
                }}
                items={items}
                editItem={offerTargetItem}
                onSaved={() => {
                    fetchItems()
                    setOfferModalOpen(false)
                    setOfferTargetItem(null)
                }}
                formatPrice={formatPriceDisplay}
            />

            {/* Floating Bulk Actions Bar */}
            {
                isSelectionMode && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-8 duration-300">
                        <div className="order-glass-panel px-6 py-4 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.15)] flex items-center gap-4 lg:gap-6 border border-amber-500/20 backdrop-blur-3xl bg-black/80">
                            <div className="flex items-center gap-3 pr-4 lg:pr-6 border-r border-white/10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm transition-all shadow-inner ${selectedItems.length > 0 ? 'bg-amber-500 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-black/50 text-slate-500 border border-white/5'}`}>
                                    {selectedItems.length}
                                </div>
                                <span className="font-bold text-sm text-slate-100 hidden sm:inline tracking-wide uppercase">Items Selected</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedItems(items.map(i => i.id))}
                                    className="text-slate-300 hover:text-amber-400 hover:bg-white/5 gap-2 rounded-xl"
                                >
                                    <CheckSquare className="w-4 h-4" /> <span className="hidden lg:inline font-bold">Select All</span>
                                </Button>

                                {/* Actions Dropdown Menu */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={selectedItems.length === 0}
                                            className="bg-black/40 border-white/10 text-white hover:bg-white/10 hover:text-white gap-2 rounded-xl transition-colors"
                                        >
                                            Actions <ChevronDown className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="center" className="w-60 p-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/10 z-[100] bg-black/95 backdrop-blur-3xl">
                                        <div className="flex flex-col gap-1">
                                            <CategoryOfferDialog
                                                category={`${selectedItems.length} Selected Items`}
                                                cuisine="Bulk Selection"
                                                onApply={(cat, cuis, disc, name) => handleApplyBulkOffer(disc, name)}
                                                isDropdownItem={true}
                                            />
                                            <DropdownMenuItem onClick={() => setIsBulkPriceDialogOpen(true)} className="gap-2 cursor-pointer font-bold text-slate-300 focus:bg-amber-500/10 focus:text-amber-400 rounded-xl transition-colors">
                                                <Percent className="w-4 h-4 text-amber-500" /> Update Prices
                                            </DropdownMenuItem>
                                            <div className="h-px bg-white/5 my-1 rounded-full"></div>
                                            <DropdownMenuItem onClick={() => handleBulkAvailabilityToggle(true)} className="gap-2 cursor-pointer font-bold text-slate-300 focus:bg-green-500/10 focus:text-green-400 rounded-xl transition-colors">
                                                <Zap className="w-4 h-4 text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]" /> Mark Available
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleBulkAvailabilityToggle(false)} className="gap-2 cursor-pointer font-bold text-slate-300 focus:bg-orange-500/10 focus:text-orange-400 rounded-xl transition-colors">
                                                <PowerOff className="w-4 h-4 text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]" /> Mark Unavailable
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={handleRemoveBulkOffer} className="gap-2 cursor-pointer font-bold text-slate-300 focus:bg-white/10 focus:text-white rounded-xl transition-colors">
                                                <RotateCcw className="w-4 h-4 text-slate-400" /> Remove Offers
                                            </DropdownMenuItem>
                                            <div className="h-px bg-white/5 my-1 rounded-full"></div>
                                            <DropdownMenuItem onClick={handleBulkDelete} className="gap-2 cursor-pointer font-black text-red-500 focus:bg-red-500/10 focus:text-red-400 rounded-xl transition-colors">
                                                <Trash2 className="w-4 h-4" /> Delete Selected
                                            </DropdownMenuItem>
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <div className="w-px h-6 bg-white/10 mx-2"></div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedItems([])}
                                    className="text-slate-400 hover:text-white hover:bg-white/5 gap-2 rounded-xl"
                                    disabled={selectedItems.length === 0}
                                >
                                    Clear
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsSelectionMode(false)}
                                    className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 px-2 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Bulk Price Update Dialog */}
            <Dialog open={isBulkPriceDialogOpen} onOpenChange={setIsBulkPriceDialogOpen}>
                <DialogContent className="sm:max-w-[400px] bg-black/90 backdrop-blur-2xl border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl">
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-2xl font-black text-slate-100">
                            <Percent className="w-6 h-6 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                            Bulk Price Update
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium text-base">
                            Change the price of {selectedItems.length} selected items by a percentage.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="bulk-price-input" className="text-slate-300 font-medium">Percentage Change (%)</Label>
                            <div className="relative">
                                <Input
                                    id="bulk-price-input"
                                    type="number"
                                    value={bulkPriceChange || ''}
                                    onChange={(e) => setBulkPriceChange(Number(e.target.value))}
                                    placeholder="e.g. 10 for increase, -10 for decrease"
                                    className="pr-10 bg-black/40 border-white/10 text-slate-100 placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-amber-500/50 rounded-xl h-12 text-lg font-black"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 font-black text-lg drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">%</span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium tracking-wide">
                                <span className="text-amber-500/70">Examples:</span> 10 = 10% Increase, -5 = 5% Decrease.
                            </p>
                        </div>

                        {bulkPriceChange !== 0 && (
                            <div className={`p-4 rounded-xl text-sm font-bold border flex items-center gap-3 shadow-[0_0_15px_rgba(0,0,0,0.2)] inset-0 ${bulkPriceChange > 0 ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                                {bulkPriceChange > 0 ? <TrendingUp className="w-5 h-5 text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]" /> : <TrendingDown className="w-5 h-5 text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]" />}
                                {bulkPriceChange > 0
                                    ? `Prices will be increased by ${bulkPriceChange}%.`
                                    : `Prices will be decreased by ${Math.abs(bulkPriceChange)}%.`}
                            </div>
                        )}
                    </div>
                    <DialogFooter className="border-t border-white/5 pt-4 mt-2">
                        <Button variant="outline" onClick={() => setIsBulkPriceDialogOpen(false)} className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white glass-card">Cancel</Button>
                        <Button
                            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] font-bold px-6"
                            onClick={handleBulkPriceUpdate}
                            disabled={bulkPriceChange === 0 || loading}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Update All Prices'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- 5. Export Settings Dialog --- */}
            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogContent className="sm:max-w-[700px] w-[95vw] h-[90vh] max-h-[850px] flex flex-col bg-black/95 backdrop-blur-3xl border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-0 overflow-hidden rounded-[2.5rem]">
                    <div className="bg-gradient-to-br from-amber-500/20 to-black p-8 text-white relative overflow-hidden flex-shrink-0 border-b border-white/10">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <FileDown className="w-32 h-32 rotate-12 text-amber-500" />
                        </div>
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"></div>

                        <DialogHeader>
                            <DialogTitle className="text-4xl font-black tracking-tighter text-white flex items-center gap-3">
                                <Sparkles className="w-10 h-10 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
                                Menu Designer <span className="text-[10px] bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-black uppercase tracking-widest ml-2 border border-amber-500/30">v2.1 Pro</span>
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 text-xl font-medium mt-2">
                                Craft a wide, professional brochure spread.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-12">
                        {/* Theme Selection */}
                        <div className="space-y-6">
                            <Label className="text-sm font-black text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
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
                                        className={`group relative cursor-pointer rounded-[1.5rem] border-4 p-4 transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] active:scale-95 ${exportOptions.theme === theme.id ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}
                                    >
                                        <div className="flex gap-1.5 mb-3">
                                            {theme.colors.map((c, i) => (
                                                <div key={i} className="flex-1 h-8 rounded-lg shadow-inner ring-1 ring-white/10" style={{ backgroundColor: c }} />
                                            ))}
                                        </div>
                                        <p className="font-black text-base text-slate-100 flex items-center justify-between">
                                            {theme.name}
                                            {exportOptions.theme === theme.id && <Zap className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]" />}
                                        </p>
                                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider mt-1">{theme.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4 border-t border-white/10">
                            {/* Format Selection */}
                            <div className="space-y-6">
                                <Label className="text-sm font-black text-slate-300 uppercase tracking-[0.2em]">2. Image Format</Label>
                                <div className="flex gap-4">
                                    {[
                                        { id: 'png', label: 'Ultra High Res', sub: 'Best for Printing', ext: 'PNG' },
                                        { id: 'jpg', label: 'Social Share', sub: 'Best for Sharing', ext: 'JPG' }
                                    ].map(fmt => (
                                        <div
                                            key={fmt.id}
                                            onClick={() => setExportOptions(prev => ({ ...prev, format: fmt.id as any }))}
                                            className={`flex-1 cursor-pointer rounded-2xl border-4 p-5 text-center transition-all duration-300 ${exportOptions.format === fmt.id ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)] scale-105' : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10'}`}
                                        >
                                            <div className={`text-[10px] uppercase font-black tracking-widest mb-1 ${exportOptions.format === fmt.id ? 'text-amber-400' : 'text-slate-500'}`}>
                                                {fmt.label}
                                            </div>
                                            <div className={`font-black text-2xl mb-1 ${exportOptions.format === fmt.id ? 'text-white' : 'text-slate-300'}`}>{fmt.ext}</div>
                                            <div className={`text-[10px] font-bold ${exportOptions.format === fmt.id ? 'text-amber-200/50' : 'text-slate-600'}`}>{fmt.sub}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Information Toggles */}
                            <div className="space-y-6">
                                <Label className="text-sm font-black text-slate-300 uppercase tracking-[0.2em]">3. Details to Show</Label>
                                <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-black/40 flex items-center justify-center shadow-inner text-amber-500 ring-1 ring-white/10">
                                                <LayoutList className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-100">Business Info</span>
                                                <span className="text-xs text-slate-500 font-medium italic">Address & Phone</span>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={exportOptions.includeLocation}
                                            onCheckedChange={(c) => setExportOptions(prev => ({ ...prev, includeLocation: c }))}
                                            className="scale-125 data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-slate-700"
                                        />
                                    </div>
                                    <div className="h-px bg-white/10 mx-2" />
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-black/40 flex items-center justify-center shadow-inner text-amber-500 ring-1 ring-white/10">
                                                <Percent className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-100">Dish Descriptions</span>
                                                <span className="text-xs text-slate-500 font-medium italic">Detailed menu text</span>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={exportOptions.includeDescription}
                                            onCheckedChange={(c) => setExportOptions(prev => ({ ...prev, includeDescription: c }))}
                                            className="scale-125 data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-slate-700"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-black/50 border-t border-white/10 flex-shrink-0 backdrop-blur-xl">
                        <Button variant="ghost" className="h-14 rounded-2xl px-10 text-slate-400 font-bold hover:bg-white/5 hover:text-white transition-all glass-card border border-white/5" onClick={() => setIsExportDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => {
                                handleDownloadMenu();
                                setIsExportDialogOpen(false);
                            }}
                            className="h-14 rounded-[1.25rem] px-14 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 font-black text-xl gap-4 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98] ring-4 ring-amber-500/10"
                        >
                            <FileDown className="w-7 h-7 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]" /> Generate Spread
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Floating Jarvis Assistant (Bubble) */}
            {/* Jarvis Voice Button — single mic for menu page */}
            <MenuJarvisMic restaurantId={restId || ''} />

            {/* Bottom Mobile Navigation */}
            <MobileNav />
        </div>
    );
};

export default MenuManager;