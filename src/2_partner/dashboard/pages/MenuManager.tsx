// ============================================================
// FILE: MenuManager.tsx
// SECTION: 2_partner > dashboard > pages
// PURPOSE: Restaurant ka menu manage karna â€” items add/edit/delete.
//          Categories, variants, modifiers, deals sab yahan hain.
//          Supabase storage mein images upload hoti hain.
// ROUTE: /dashboard/menu
// ============================================================
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabaseClient';
import {
    Plus, Search, Sparkles, Utensils, Loader2, Package, Clock, Zap, X, UploadCloud, Image as ImageIcon,
    FileDown, Wand2, Table, Percent, Tag, CheckSquare, Square, RotateCcw, Trash2, Box, Bell,
    ChevronDown, ChevronRight, LayoutList, TrendingUp, TrendingDown, BarChart3, ArrowUpRight, AlertTriangle, PowerOff
} from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import html2canvas from 'html2canvas';
import { DynamicFoodImage, getFilesInFolder } from '@/2_partner/setup/pages/RestaurantSetup';
import { predictVisuals } from '@/shared/services/visualMappingUtils';
import { normalizeScannedItem } from '@/shared/services/fuzzyMatch';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/shared/ui/dialog';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter
} from '@/shared/ui/sheet';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/shared/ui/alert-dialog";
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Switch } from '@/shared/ui/switch';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import MenuItemCard from '@/2_partner/dashboard/components/MenuItemCard';
import VariantManager from '@/2_partner/dashboard/components/VariantManager';
import ModifierManager from '@/2_partner/dashboard/components/ModifierManager';
import DealBuilder from "@/2_partner/dashboard/components/DealBuilder";
import { MenuItem, MenuVariant, ModifierGroup, DealItem } from '@/shared/types/menu';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { scanMenuImage, ScannedMainCategory } from '@/shared/services/aiScannerService';
import { CreatableSelect } from "@/shared/ui/creatable-select";
import { findBestPresetImage } from '@/shared/services/imageMatchService';
import { formatPrice, resolveCurrency, CurrencyInfo, DEFAULT_CURRENCY } from '@/shared/lib/currencyUtils';

// --- Helper Component: Category Offer Dialog ---
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
                    <Tag className="w-4 h-4 text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" /> Apply Offer
                </button>
            ) : (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 gap-2 font-bold rounded-xl transition-colors border border-transparent hover:border-amber-500/20"
                    onClick={() => setIsOpen(true)}
                >
                    <Tag className="w-4 h-4" />
                    Apply Offer
                </Button>
            )}
            <DialogContent className="sm:max-w-[420px] bg-slate-900 border-slate-800 shadow-[0_30px_90px_rgba(0,0,0,0.6)] rounded-[2.5rem] overflow-hidden p-0 gap-0">
                <div className="absolute inset-x-0 -top-px h-1.5 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>

                <div className="bg-slate-900/50 p-8 pb-5 border-b border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-4 text-2xl font-black text-white">
                            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                                <Percent className="w-6 h-6 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]" />
                            </div>
                            <div>
                                Offer for <span className="text-amber-500">{category}</span>
                            </div>
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-bold text-sm mt-4 leading-relaxed ml-16">
                            This will update the price and add a discount tag to ALL items in the <span className="text-slate-200">{cuisine} → {category}</span> section.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="space-y-6 px-8 py-8 bg-slate-900">
                    <div className="space-y-3">
                        <Label htmlFor="cat-offer-discount" className="text-slate-400 font-bold text-sm ml-1">Discount Percentage (%)</Label>
                        <div className="relative group">
                            <Input
                                id="cat-offer-discount"
                                type="number"
                                value={discount || ''}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setDiscount(isNaN(val) ? 0 : val);
                                }}
                                className="pl-14 bg-slate-800 border-slate-700 text-green-400 placeholder:text-slate-500 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 rounded-2xl h-14 text-xl font-black shadow-sm transition-all group-hover:border-slate-600 remove-arrow"
                            />
                            <Percent className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500 drop-shadow-md" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="cat-offer-name" className="text-slate-400 font-bold text-sm ml-1">Offer Label (Optional)</Label>
                        <Input
                            id="cat-offer-name"
                            placeholder="e.g. Weekend Special, Happy Hour"
                            value={offerName}
                            onChange={(e) => setOfferName(e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 rounded-2xl h-14 px-5 font-semibold shadow-sm transition-all group-hover:border-slate-600"
                        />
                    </div>
                </div>

                <div className="px-8 py-6 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row gap-4">
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-2xl border-slate-700 text-slate-400 font-bold hover:bg-slate-800 hover:text-white transition-all duration-200">
                        Cancel
                    </Button>
                    <Button
                        className="flex-[1.5] h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/10 active:scale-[0.98] transition-all duration-200"
                        onClick={() => {
                            onApply(category, cuisine, discount, offerName);
                            setIsOpen(false);
                        }}
                    >
                        Apply to {category}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// --- Helper: Format Price for Display ---
const formatPriceDisplay = (price: number | string, currency: CurrencyInfo = DEFAULT_CURRENCY) => {
    return formatPrice(price, currency);
};

const MenuManager = () => {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [restId, setRestId] = useState<string | null>(null);
    const [restaurantInfo, setRestaurantInfo] = useState<{
        name: string;
        description: string;
        address: string;
        phone: string;
        logo_url: string | null;
        proprietorName: string;
        opens_at?: string;
        closes_at?: string;
        currency: CurrencyInfo;
    } | null>(null);
    const navigate = useNavigate();

    // Tab State
    const [activeTab, setActiveTab] = useState('all');

    // Modal State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState('basic');
    const [selectionMode, setSelectionMode] = useState(false); // New state for selection screen

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
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isBulkPriceDialogOpen, setIsBulkPriceDialogOpen] = useState(false);
    const [bulkPriceChange, setBulkPriceChange] = useState(0);

    // Auto-fill State
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                    // Update Supabase
                    const { error } = await (supabase as any)
                        .from('menu_items')
                        .update({ image_url: matchedUrl, updated_at: new Date().toISOString() })
                        .eq('id', item.id);

                    if (!error) {
                        // Update local React state immediately
                        const index = nextItems.findIndex(x => x.id === item.id);
                        if (index !== -1) {
                            nextItems[index] = { ...nextItems[index], image_url: matchedUrl };
                        }
                        updatedCount++;
                    }
                }
            }

            if (updatedCount > 0) {
                setItems(nextItems); // Force re-render with new images
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

    // --- BULK ACTIONS LOGIC ---
    const handleBulkAvailabilityToggle = async (availability: boolean) => {
        if (selectedItems.length === 0) return;
        try {
            setLoading(true);
            const { error } = await (supabase as any)
                .from('menu_items')
                .update({ is_available: availability })
                .in('id', selectedItems);

            if (error) throw error;

            setItems(prev => prev.map(item =>
                selectedItems.includes(item.id) ? { ...item, is_available: availability } : item
            ));

            toast.success(`Updated ${selectedItems.length} items to ${availability ? 'Available' : 'Unavailable'}`);
            setSelectedItems([]);
            setIsSelectionMode(false);
        } catch (error) {
            toast.error("Failed to update items");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkPriceUpdate = async () => {
        if (selectedItems.length === 0) return;
        try {
            setLoading(true);
            const factor = 1 + (bulkPriceChange / 100);

            // Fetch current items to calculate new prices
            const selectedItemsData = items.filter(i => selectedItems.includes(i.id));

            // Note: This logic only updates base prices. 
            // Real-world might need variant price updates too.
            // For simplicity, we update base prices and any variants that have prices.

            for (const item of selectedItemsData) {
                const newPrice = Math.round(item.price * factor);

                // Update Item
                const { error: itemError } = await (supabase as any)
                    .from('menu_items')
                    .update({ price: newPrice })
                    .eq('id', item.id);

                if (itemError) throw itemError;

                // Update Variants if any
                if (item.variants && item.variants.length > 0) {
                    for (const v of item.variants) {
                        if (v.id) {
                            const newVPrice = Math.round(v.price * factor);
                            await (supabase as any)
                                .from('menu_variants')
                                .update({ price: newVPrice })
                                .eq('id', v.id);
                        }
                    }
                }
            }

            await fetchItems(); // Refresh to show new prices
            toast.success(`Prices updated for ${selectedItems.length} items`);
            setIsBulkPriceDialogOpen(false);
            setSelectedItems([]);
            setIsSelectionMode(false);
        } catch (error) {
            toast.error("Failed to update prices");
        } finally {
            setLoading(false);
        }
    };
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

    // Individual Offer Modal State
    const [itemForDirectOffer, setItemForDirectOffer] = useState<MenuItem | null>(null);
    const [directOfferDiscount, setDirectOfferDiscount] = useState(10);
    const [directOfferName, setDirectOfferName] = useState("");

    // Delete Confirmation State
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

    // Export Settings State
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [exportOptions, setExportOptions] = useState({
        format: 'png' as 'png' | 'jpg',
        theme: 'noir' as 'noir' | 'minimal' | 'royal',
        includeLocation: true,
        includeDescription: true
    });

    // Smart List Options
    const [existingCategories, setExistingCategories] = useState<{ value: string; label: string }[]>([]);
    const [existingCuisines, setExistingCuisines] = useState<{ value: string; label: string }[]>([]);

    // AI Scanner State
    const [scannedItems, setScannedItems] = useState<ScannedMainCategory[]>(() => {
        const saved = localStorage.getItem('ss_scanned_items');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('ss_scanned_items', JSON.stringify(scannedItems));
    }, [scannedItems]);
    const [isScanning, setIsScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [scanFile, setScanFile] = useState<File | null>(null);
    const [scanPreview, setScanPreview] = useState<string | null>(null);
    const [importSuccess, setImportSuccess] = useState(false);
    const [scannedItemImageUpdateIndex, setScannedItemImageUpdateIndex] = useState<{ mainIdx: number, subIdx: number, itemIdx: number } | null>(null);
    const scannedImageInputRef = useRef<HTMLInputElement>(null);

    const fetchItems = async () => {
        if (!restId) return;
        setLoading(true);
        try {
            // Fetch Menu Items WITH Category Name (JOIN)
            const { data: menuData, error } = await supabase
                .from('menu_items')
                .select('*, categories(name)') // Join to get category name
                .eq('restaurant_id', restId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Batch-fetch all variants and modifier groups for this restaurant's items
            const itemIds = (menuData || []).map((item: any) => item.id);
            let variantsByItem: Record<string, any[]> = {};
            let modifierGroupsByItem: Record<string, any[]> = {};

            if (itemIds.length > 0) {
                // 1. Fetch Variants
                const { data: allVariants } = await (supabase as any)
                    .from('menu_variants')
                    .select('*')
                    .in('item_id', itemIds);
                if (allVariants) {
                    for (const v of allVariants) {
                        if (!variantsByItem[v.item_id]) variantsByItem[v.item_id] = [];
                        variantsByItem[v.item_id].push(v);
                    }
                }

                // 2. Fetch Modifier Groups with their Modifiers
                const { data: allGroups } = await (supabase as any)
                    .from('menu_modifier_groups')
                    .select('*, menu_modifiers(*)')
                    .in('item_id', itemIds);

                if (allGroups) {
                    for (const group of allGroups) {
                        if (!modifierGroupsByItem[group.item_id]) modifierGroupsByItem[group.item_id] = [];
                        modifierGroupsByItem[group.item_id].push({
                            ...group,
                            modifiers: group.menu_modifiers || []
                        });
                    }
                }
            }

            // Map categories.name to item.category for UI compatibility
            const formattedData = (menuData || []).map((item: any) => ({
                ...item,
                category: item.categories?.name || 'Uncategorized',
                is_available: item.is_available ?? true,
                variants: variantsByItem[item.id] || [],
                modifier_groups: modifierGroupsByItem[item.id] || []
            }));

            setItems(formattedData);
        } catch (error) {
            console.error("Error fetching menu:", error);
            toast.error("Failed to load menu items");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initDashboard = async () => {
            try {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                // Get Restaurant ID & Info
                const { data: rest } = await supabase
                    .from('restaurants')
                    .select('id, name, description, address, phone, logo_url, opens_at, closes_at, currency, profiles(full_name)')
                    .eq('owner_id', user.id)
                    .maybeSingle();

                if (rest) {
                    const r = rest as any;
                    setRestId(r.id);
                    // Resolve currency from stored value or fallback to phone-derived
                    const currencyInfo = r.currency
                        ? resolveCurrency(r.currency)
                        : resolveCurrency(r.phone);
                    setRestaurantInfo({
                        name: r.name || '',
                        description: r.description || '',
                        address: r.address || '',
                        phone: r.phone || '',
                        logo_url: r.logo_url,
                        opens_at: r.opens_at,
                        closes_at: r.closes_at,
                        currency: currencyInfo,
                        proprietorName: r.profiles?.full_name || 'Valued Partner'
                    });
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error("Dashboard init error:", err);
                setLoading(false);
            }
        };

        initDashboard();
    }, []);

    // Separated useEffect for data loading once restId is set
    useEffect(() => {
        if (restId) {
            fetchItems();
        }
    }, [restId]);

    // Default Options for Smart Lists
    const DEFAULT_CATEGORIES = [
        "Fast Food", "Desi", "Chinese", "Italian", "BBQ",
        "Beverages", "Desserts", "Breakfast", "Wraps", "Salads"
    ];

    const DEFAULT_CUISINES = [
        "Pakistani", "American", "Italian", "Continental",
        "Turkish", "Arabian", "Mexican", "Thai"
    ];

    const toggleCuisine = (cuisine: string) => {
        setExpandedCuisines(prev =>
            prev.includes(cuisine) ? prev.filter(c => c !== cuisine) : [...prev, cuisine]
        );
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        );
    };

    // Auto-expand first cuisine on load
    useEffect(() => {
        if (items.length > 0 && expandedCuisines.length === 0) {
            const firstCuisine = items.find(i => i.cuisine)?.cuisine;
            if (firstCuisine) setExpandedCuisines([firstCuisine]);
        }
    }, [items]);
    const handleScan = async () => {
        if (!scanFile) {
            toast.error("Please upload a menu image first");
            return;
        }

        setIsScanning(true);
        setScanStatus("Initializing Local OCR...");
        try {
            const result = await scanMenuImage(scanFile, (status) => setScanStatus(status));
            if (result.success && result.data) {
                setScannedItems(result.data);
                toast.success(`Scan completed successfully!`);
            } else {
                toast.error(result.error || "Failed to scan menu");
            }
        } catch (error: any) {
            toast.error(error.message || "An error occurred during scanning");
        } finally {
            setIsScanning(false);
            setScanStatus(null);
        }
    };

    const handleImportScannedItems = async () => {
        if (!restId || scannedItems.length === 0 || isImporting) return;

        setIsImporting(true);
        let totalItemsCount = 0;

        const importPromise = (async () => {
            // 1. Collect and create unique Categories
            const catNames = new Set<string>();
            scannedItems.forEach(main => {
                main.sub_categories?.forEach(sub => catNames.add(sub.name));
            });
            const uniqueCatNames = Array.from(catNames).filter(Boolean);

            const { data: existingCats } = await supabase
                .from('categories' as any)
                .select('id, name')
                .eq('restaurant_id', restId);

            const catMap = new Map<string, string>();
            (existingCats as any[])?.forEach((c: any) => catMap.set(c.name.toLowerCase().trim(), c.id));

            const missingCats = uniqueCatNames.filter(name => !catMap.has(name.toLowerCase().trim()));
            if (missingCats.length > 0) {
                const { data: newCats, error: catError } = await supabase
                    .from('categories' as any)
                    .insert(missingCats.map(name => ({ restaurant_id: restId, name })) as any)
                    .select();
                if (catError) throw catError;
                (newCats as any[])?.forEach((c: any) => catMap.set(c.name.toLowerCase().trim(), c.id));
            }

            // 2. Insert items and variants
            for (const main of scannedItems) {
                if (!main.sub_categories) continue;
                for (const sub of main.sub_categories) {
                    const categoryId = catMap.get(sub.name.toLowerCase().trim()) || null;
                    if (!sub.items) continue;

                    for (const item of sub.items) {
                        totalItemsCount++;
                        let finalImageUrl = null;

                        if (item.manualImage instanceof File) {
                            const fileExt = item.manualImage.name.split('.').pop();
                            const fileName = `${restId}/${uuidv4()}.${fileExt}`;
                            const { error: uploadError } = await supabase.storage.from('menu-images').upload(fileName, item.manualImage);
                            if (!uploadError) {
                                const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(fileName);
                                finalImageUrl = urlData.publicUrl;
                            }
                        }

                        // Determine item type
                        const isSingle = !item.variants || item.variants.length <= 1;
                        const basePrice = isSingle && item.variants?.[0] ? item.variants[0].price : 0;

                        const { data: insertedItem, error: itemError } = await supabase
                            .from('menu_items')
                            .insert({
                                restaurant_id: restId,
                                name: item.item_name,
                                description: item.description,
                                category_id: categoryId,
                                item_type: isSingle ? 'single' : 'variable',
                                is_available: true,
                                image_url: finalImageUrl,
                                cuisine: main.cuisine_type || null,
                                price: basePrice
                            } as any)
                            .select()
                            .single();

                        if (itemError) throw itemError;
                        if (!insertedItem) throw new Error("Failed to insert item");

                        // Insert variants if needed
                        if (!isSingle && item.variants && item.variants.length > 0) {
                            const varsToInsert = item.variants.map(v => ({
                                item_id: (insertedItem as any).id,
                                name: v.size_or_type,
                                price: v.price || 0,
                                is_available: true
                            }));
                            const { error: varError } = await supabase.from('menu_variants').insert(varsToInsert as any);
                            if (varError) throw varError;
                        }
                    }
                }
            }

            // 3. Cleanup
            localStorage.removeItem('ss_scanned_items');
            setScannedItems([]);
            setScanFile(null);
            setScanPreview(null);
            await fetchItems();
            return totalItemsCount;
        })();

        toast.promise(importPromise, {
            loading: 'Importing full menu structure...',
            success: (count) => `Successfully imported ${count} items with their variants!`,
            error: 'Failed to import menu. Please retry.'
        });

        try {
            await importPromise;
        } catch (e) {
            console.error("Import error:", e);
        } finally {
            setIsImporting(false);
        }
    };

    useEffect(() => {
        const itemCuisines = Array.from(new Set(items.map(i => i.cuisine).filter(Boolean))) as string[];
        const itemCats = Array.from(new Set(items.map(i => i.category).filter(Boolean))) as string[];

        const uniqueCuisines = Array.from(new Set([...DEFAULT_CUISINES, ...itemCuisines]))
            .sort()
            .map(c => ({ value: c, label: c }));

        const uniqueCats = Array.from(new Set([...DEFAULT_CATEGORIES, ...itemCats]))
            .sort()
            .map(c => ({ value: c, label: c }));

        setExistingCuisines(uniqueCuisines);
        setExistingCategories(uniqueCats);
    }, [items]);

    //--- Helper Functions ---
    // Use restaurant's currency for price formatting
    const formatPriceDisplay = (price: any) => {
        const num = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : price;
        const currency = restaurantInfo?.currency || DEFAULT_CURRENCY;
        return formatPrice(num, currency);
    };

    const fetchItemDetails = async (itemId: string) => {
        // Fetch Variants
        const { data: vData } = await (supabase as any)
            .from('menu_variants')
            .select('*')
            .eq('item_id', itemId);

        if (vData) setVariants((vData as any[]).map((v: any) => ({
            ...v,
            is_available: v.is_available ?? true,
            stock_count: v.stock_count ?? null
        })));

        // Fetch Modifier Groups & Modifiers
        // We do this in two steps or a deep query if Supabase supports it fully (it does with proper foreign keys)
        const { data: gData, error } = await (supabase as any)
            .from('menu_modifier_groups')
            .select(`
    *,
    menu_modifiers(*)
        `)
            .eq('item_id', itemId);

        if (gData) {
            const formattedGroups = gData.map((g: any) => ({
                ...g,
                modifiers: g.menu_modifiers || []
            }));
            setModifierGroups(formattedGroups);
        }
    };

    const handleAIGenerate = () => {
        alert("Jarvis AI is writing... (Coming Soon)");
    };

    const openAddModal = () => {
        setCurrentItem({
            name: '', price: 0, category: '', description: '', image_url: '',
            cuisine: '', stock_count: null, low_stock_threshold: 5, is_stock_managed: false,
            is_available: true,
            available_start_time: null, available_end_time: null,
            discount_percentage: null, offer_name: '',
            item_type: 'single'
        });
        setVariants([]);
        setModifierGroups([]);
        setImageFile(null);
        setImagePreview(null);
        setIsEditing(false);
        setActiveModalTab('basic');
        setSelectionMode(true); // Show selection screen first
        setIsDialogOpen(true);
    };

    const openQuickAddModal = (e: React.MouseEvent, cuisine: string, category: string = '') => {
        e.stopPropagation(); // Prevent accordion toggle
        setCurrentItem({
            name: '', price: 0, category: category, description: '', image_url: '',
            cuisine: cuisine, stock_count: null, low_stock_threshold: 5, is_stock_managed: false,
            is_available: true,
            available_start_time: null, available_end_time: null,
            discount_percentage: null, offer_name: '',
            item_type: 'single'
        });
        setVariants([]);
        setModifierGroups([]);
        setImageFile(null);
        setImagePreview(null);
        setIsEditing(false);
        setActiveModalTab('basic');
        setSelectionMode(false); // Head straight to the form
        setIsDialogOpen(true);
    };

    const openAddDealModal = () => {
        openAddModal();
        setCurrentItem(prev => ({
            ...prev,
            item_type: 'deal',
            price: 0,
            is_available: true
        }));
        setSelectionMode(false); // Skip selection since specific action was clicked
        setActiveModalTab('basic');
    };

    const openEditModal = (item: MenuItem) => {
        setCurrentItem({
            ...item,
            offer_name: item.offer_name || '', // Ensure it's at least an empty string for the input
            low_stock_threshold: item.low_stock_threshold ?? 5,
            is_stock_managed: item.is_stock_managed ?? false,
        });
        setImageFile(null);
        setImagePreview(item.image_url || null);
        setIsEditing(true);
        setSelectionMode(false); // Direct edit
        setActiveModalTab('basic');
        setVariants([]);
        setModifierGroups([]);

        // Fetch details
        fetchItemDetails(item.id);

        // Fetch Deal Items if applicable
        if (item.item_type === 'deal' && (item as any).deal_items) {
            // In a real scenario, we might need to fetch names if deal_items only stores IDs.
            // But for now let's assume deal_items stores name/price snapshot or we rely on logic.
            // Simplified: just set it if present.
            setDealItems((item as any).deal_items || []);
        }

        setIsDialogOpen(true);
    };

    // --- 2. CRUD Operations ---

    const handleSave = async () => {
        // Validation
        const hasVariantPrices = variants.length > 0 && variants.some(v => v.price > 0);
        if (!currentItem.name || !restId) {
            toast.error("Please enter a Name in the Basic Info tab");
            setActiveModalTab('basic');
            return;
        }
        if (!currentItem.price && !hasVariantPrices) {
            toast.error("Please enter a Base Price or add Variants with prices");
            setActiveModalTab('basic');
            return;
        }

        if (currentItem.item_type === 'deal' && dealItems.length === 0) {
            toast.error("Please add at least one item to the deal in the Deal Builder tab");
            setActiveModalTab('builder');
            return;
        }

        // Auto-set base price to lowest variant if not entered
        if (hasVariantPrices && !currentItem.price) {
            const lowestPrice = Math.min(...variants.filter(v => v.price > 0).map(v => v.price));
            currentItem.price = lowestPrice;
        }

        setIsSubmitting(true);
        try {
            let finalImageUrl = currentItem.image_url || '';

            // Handle image upload if file selected
            if (imageFile) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const fileExt = imageFile.name.split('.').pop();
                    const fileName = `${user.id}/${uuidv4()}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('menu-images')
                        .upload(fileName, imageFile);

                    if (!uploadError) {
                        const { data: urlData } = supabase.storage
                            .from('menu-images')
                            .getPublicUrl(fileName);
                        finalImageUrl = urlData.publicUrl;
                    }
                }
            }

            // 1. Resolve Category Name to ID
            let catId = null;
            if (currentItem.category) {
                const { data: existingCat } = await supabase
                    .from('categories')
                    .select('id')
                    .eq('restaurant_id', restId)
                    .eq('name', currentItem.category)
                    .maybeSingle();

                if (existingCat) {
                    catId = (existingCat as any).id;
                } else {
                    const { data: newCat, error: catError } = await (supabase
                        .from('categories')
                        .insert({ restaurant_id: restId, name: currentItem.category } as any)
                        .select()
                        .single() as any);
                    if (catError) throw catError;
                    catId = newCat.id;
                }
            }

            const finalCalculatedPrice = currentItem.item_type === 'deal' ? parseFloat(currentItem.price?.toString() || '0') : finalPrice;

            const payload = {
                restaurant_id: restId,
                name: currentItem.name,
                price: parseFloat(finalCalculatedPrice.toString()),
                description: currentItem.description,
                category_id: catId,
                cuisine: currentItem.cuisine,
                image_url: finalImageUrl,
                is_available: currentItem.is_available ?? true,
                stock_count: currentItem.stock_count === 0 ? 0 : (currentItem.stock_count || null),
                low_stock_threshold: currentItem.low_stock_threshold ?? 5,
                is_stock_managed: currentItem.is_stock_managed ?? false,
                item_type: currentItem.item_type || 'single',
                deal_items: currentItem.item_type === 'deal' ? dealItems.map(di => {
                    const original = items.find(i => i.id === di.item_id);
                    return {
                        ...di,
                        image_url: di.image_url || original?.image_url,
                        cuisine: di.cuisine || original?.cuisine,
                        category: di.category || original?.category
                    };
                }) : null,
                original_price: currentItem.item_type === 'deal' ? dealOriginalPrice : (currentItem.discount_percentage ? currentItem.price : (currentItem.original_price || null)),
                discount_percentage: currentItem.discount_percentage || null,
                offer_name: currentItem.offer_name || null,
                available_start_time: currentItem.available_start_time,
                available_end_time: currentItem.available_end_time
            };

            let itemId = currentItem.id;

            if (isEditing && itemId) {
                // UPDATE
                const { data, error } = await ((supabase as any)
                    .from('menu_items')
                    .update(payload)
                    .eq('id', itemId)
                    .select('*, categories(name)')
                    .single() as any);

                if (error) throw error;
                // Refetching at the end to include variants
                // setItems(prev => prev.map(item =>
                //     item.id === itemId ? { ...item, ...(data as any), category: currentItem.category } as MenuItem : item
                // ));
            } else {
                // CREATE
                const { data, error } = await (supabase
                    .from('menu_items')
                    .insert([payload] as any)
                    .select('*, categories(name)')
                    .single() as any);

                if (error) throw error;
                itemId = data.id;
                // Refetching at the end to include variants
                // setItems(prev => [{ ...data, category: currentItem.category }, ...prev]);
            }

            // --- SAVE VARIANTS & MODIFIERS ---
            if (itemId) {
                // 1. Variants (Replace logic)
                await (supabase as any).from('menu_variants').delete().eq('item_id', itemId);
                if (variants.length > 0) {
                    const variantsToInsert = variants.map(v => ({
                        item_id: itemId,
                        name: v.name,
                        description: v.description,
                        price: v.price,
                        original_price: v.original_price,
                        stock_count: v.stock_count,
                        is_available: v.is_available ?? true
                    }));
                    await (supabase as any).from('menu_variants').insert(variantsToInsert);
                }

                // 2. Modifiers (Replace logic)
                // Delete existing groups (cascade deletes modifiers)
                await (supabase as any).from('menu_modifier_groups').delete().eq('item_id', itemId);

                // Insert new groups
                for (const group of modifierGroups) {
                    const { data: groupData, error: groupError } = await (supabase as any)
                        .from('menu_modifier_groups')
                        .insert([{
                            item_id: itemId,
                            name: group.name,
                            min_selection: group.min_selection,
                            max_selection: group.max_selection
                        }])
                        .select()
                        .single();

                    if (groupData && group.modifiers.length > 0) {
                        const modsToInsert = group.modifiers.map(m => ({
                            group_id: groupData.id,
                            name: m.name,
                            price: m.price,
                            is_available: m.is_available,
                            stock_count: m.stock_count
                        }));
                        await (supabase as any).from('menu_modifiers').insert(modsToInsert);
                    }
                }
            }

            // --- CRITICAL: Sync UI state with DB ---
            // Variants and Group Modifiers are in separate tables, 
            // so we refetch everything to ensure current card UI has all data.
            await fetchItems();

            toast.success("Dish saved successfully");
            setIsDialogOpen(false);
            setImageFile(null);
            setImagePreview(null);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to save dish");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;

        try {
            setLoading(true);
            const { error } = await supabase
                .from('menu_items')
                .delete()
                .eq('id', itemToDelete);

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

    const handleBulkDelete = () => {
        if (selectedItems.length === 0) return;
        setIsBulkDeleteConfirmOpen(true);
    };

    const confirmBulkDelete = async () => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from('menu_items')
                .delete()
                .in('id', selectedItems);

            if (error) throw error;

            setItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
            toast.success(`${selectedItems.length} item(s) deleted successfully`);
            setSelectedItems([]);
            setIsSelectionMode(false);
            setIsBulkDeleteConfirmOpen(false);
        } catch (error) {
            toast.error("Failed to delete items");
        } finally {
            setLoading(false);
        }
    };

    const toggleAvailability = async (item: MenuItem) => {
        try {
            const newVal = !item.is_available;
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: newVal } : i));

            await ((supabase as any)
                .from('menu_items')
                .update({ is_available: newVal })
                .eq('id', item.id)
                .select('id'));

            toast.success(newVal ? "Marked as Available" : "Marked as Sold Out");
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleApplyCategoryOffer = async (category: string, cuisine: string, discount: number, offerName: string) => {
        try {
            setLoading(true);
            const itemsToUpdate = items.filter(i => i.category === category && i.cuisine === cuisine && i.item_type !== 'deal');

            for (const item of itemsToUpdate) {
                // Calculate new price
                const originalPrice = item.original_price || item.price;
                const newPrice = Math.round(originalPrice * (1 - discount / 100));

                const { error } = await (supabase as any)
                    .from('menu_items')
                    .update({
                        price: newPrice,
                        original_price: originalPrice,
                        discount_percentage: discount,
                        offer_name: offerName || null
                    })
                    .eq('id', item.id);

                if (error) throw error;
            }

            // Update local state
            setItems(prev => prev.map(i => {
                if (i.category === category && i.cuisine === cuisine && i.item_type !== 'deal') {
                    const originalPrice = i.original_price || i.price;
                    return {
                        ...i,
                        price: Math.round(originalPrice * (1 - discount / 100)),
                        original_price: originalPrice,
                        discount_percentage: discount,
                        offer_name: offerName || null
                    };
                }
                return i;
            }));

            toast.success(`Applied ${discount}% offer to all ${category} items!`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to apply category offer");
        } finally {
            setLoading(false);
        }
    };

    const handleApplyCuisineOffer = async (cuisine: string, discount: number, offerName: string) => {
        try {
            setLoading(true);
            const itemsToUpdate = items.filter(i => i.cuisine === cuisine && i.item_type !== 'deal');

            for (const item of itemsToUpdate) {
                const originalPrice = item.original_price || item.price;
                const newPrice = Math.round(originalPrice * (1 - discount / 100));

                const { error } = await (supabase as any)
                    .from('menu_items')
                    .update({
                        price: newPrice,
                        original_price: originalPrice,
                        discount_percentage: discount,
                        offer_name: offerName || null
                    })
                    .eq('id', item.id);

                if (error) throw error;
            }

            setItems(prev => prev.map(i => {
                if (i.cuisine === cuisine && i.item_type !== 'deal') {
                    const originalPrice = i.original_price || i.price;
                    return {
                        ...i,
                        price: Math.round(originalPrice * (1 - discount / 100)),
                        original_price: originalPrice,
                        discount_percentage: discount,
                        offer_name: offerName || null
                    };
                }
                return i;
            }));

            toast.success(`Applied ${discount}% offer to all ${cuisine} items!`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to apply cuisine offer");
        } finally {
            setLoading(false);
        }
    };

    const handleApplyBulkOffer = async (discount: number, offerName: string) => {
        try {
            setLoading(true);
            const itemsToUpdate = items.filter(i => selectedItems.includes(i.id) && i.item_type !== 'deal');

            for (const item of itemsToUpdate) {
                const originalPrice = item.original_price || item.price;
                const newPrice = Math.round(originalPrice * (1 - discount / 100));

                const { error } = await (supabase as any)
                    .from('menu_items')
                    .update({
                        price: newPrice,
                        original_price: originalPrice,
                        discount_percentage: discount,
                        offer_name: offerName || null
                    })
                    .eq('id', item.id);

                if (error) throw error;
            }

            setItems(prev => prev.map(i => {
                if (selectedItems.includes(i.id) && i.item_type !== 'deal') {
                    const originalPrice = i.original_price || i.price;
                    return {
                        ...i,
                        price: Math.round(originalPrice * (1 - discount / 100)),
                        original_price: originalPrice,
                        discount_percentage: discount,
                        offer_name: offerName || null
                    };
                }
                return i;
            }));

            toast.success(`Applied ${discount}% offer to ${selectedItems.length} selected items!`);
            setSelectedItems([]);
            setIsSelectionMode(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to apply bulk offer");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveBulkOffer = async () => {
        try {
            setLoading(true);
            const itemsToUpdate = items.filter(i => selectedItems.includes(i.id) && i.item_type !== 'deal');

            for (const item of itemsToUpdate) {
                const originalPrice = item.original_price || item.price;

                const { error } = await (supabase as any)
                    .from('menu_items')
                    .update({
                        price: originalPrice,
                        original_price: null,
                        discount_percentage: null,
                        offer_name: null
                    })
                    .eq('id', item.id);

                if (error) throw error;
            }

            setItems(prev => prev.map(i => {
                if (selectedItems.includes(i.id) && i.item_type !== 'deal') {
                    return {
                        ...i,
                        price: i.original_price || i.price,
                        original_price: null,
                        discount_percentage: null,
                        offer_name: null
                    };
                }
                return i;
            }));

            toast.success(`Removed offers from ${selectedItems.length} items`);
            setSelectedItems([]);
            setIsSelectionMode(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to remove bulk offers");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveCategoryOffer = async (category: string, cuisine: string) => {
        try {
            setLoading(true);
            const itemsToUpdate = items.filter(i => i.category === category && i.cuisine === cuisine && i.item_type !== 'deal');

            for (const item of itemsToUpdate) {
                const originalPrice = item.original_price || item.price;
                const { error } = await (supabase as any)
                    .from('menu_items')
                    .update({
                        price: originalPrice,
                        original_price: null,
                        discount_percentage: null,
                        offer_name: null
                    })
                    .eq('id', item.id);
                if (error) throw error;
            }

            setItems(prev => prev.map(i => {
                if (i.category === category && i.cuisine === cuisine && i.item_type !== 'deal') {
                    return { ...i, price: i.original_price || i.price, original_price: null, discount_percentage: null, offer_name: null };
                }
                return i;
            }));

            toast.success(`Removed offers for ${category}`);
        } catch (error) {
            toast.error("Failed to remove offer");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveCuisineOffer = async (cuisine: string) => {
        try {
            setLoading(true);
            const itemsToUpdate = items.filter(i => i.cuisine === cuisine && i.item_type !== 'deal');

            for (const item of itemsToUpdate) {
                const originalPrice = item.original_price || item.price;
                const { error } = await (supabase as any)
                    .from('menu_items')
                    .update({
                        price: originalPrice,
                        original_price: null,
                        discount_percentage: null,
                        offer_name: null
                    })
                    .eq('id', item.id);
                if (error) throw error;
            }

            setItems(prev => prev.map(i => {
                if (i.cuisine === cuisine && i.item_type !== 'deal') {
                    return { ...i, price: i.original_price || i.price, original_price: null, discount_percentage: null, offer_name: null };
                }
                return i;
            }));

            toast.success(`Removed offers for entire ${cuisine} cuisine`);
        } catch (error) {
            toast.error("Failed to remove cuisine offers");
        } finally {
            setLoading(false);
        }
    };

    const handleClearOffer = async (item: MenuItem) => {
        try {
            setLoading(true);
            const originalPrice = item.original_price || item.price;
            const { error } = await (supabase as any)
                .from('menu_items')
                .update({
                    price: originalPrice,
                    original_price: null,
                    discount_percentage: null,
                    offer_name: null
                })
                .eq('id', item.id);

            if (error) throw error;

            setItems(prev => prev.map(i => i.id === item.id ? { ...i, price: originalPrice, original_price: null, discount_percentage: null, offer_name: null } : i));
            toast.success(`Removed offer for ${item.name}`);
        } catch (error) {
            toast.error("Failed to remove offer");
        } finally {
            setLoading(false);
        }
    };

    const handleApplyIndividualOffer = async () => {
        if (!itemForDirectOffer) return;
        try {
            setLoading(true);
            const originalPrice = itemForDirectOffer.original_price || itemForDirectOffer.price;
            const newPrice = Math.round(originalPrice * (1 - directOfferDiscount / 100));

            const { error } = await (supabase as any)
                .from('menu_items')
                .update({
                    price: newPrice,
                    original_price: originalPrice,
                    discount_percentage: directOfferDiscount,
                    offer_name: directOfferName || null
                })
                .eq('id', itemForDirectOffer.id);

            if (error) throw error;

            setItems(prev => prev.map(i => i.id === itemForDirectOffer.id ? {
                ...i,
                price: newPrice,
                original_price: originalPrice,
                discount_percentage: directOfferDiscount,
                offer_name: directOfferName || null
            } : i));

            toast.success(`Applied ${directOfferDiscount}% offer to ${itemForDirectOffer.name}!`);
            setItemForDirectOffer(null);
            setDirectOfferName("");
        } catch (error) {
            console.error(error);
            toast.error("Failed to apply offer");
        } finally {
            setLoading(false);
        }
    };

    const toggleItemSelection = (id: string) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Filtered Items
    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group items by Cuisine -> Category
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

        // Sort cuisines and categories
        const sortedCuisines = Object.keys(groups).sort();
        const sortedGroups: Record<string, Record<string, MenuItem[]>> = {};

        sortedCuisines.forEach(c => {
            const cats = Object.keys(groups[c]).sort();
            sortedGroups[c] = {};
            cats.forEach(cat => {
                sortedGroups[c][cat] = groups[c][cat];
            });
        });

        return sortedGroups;
    }, [filteredItems]);

    // Helper to load external scripts (for jsPDF)
    const loadScript = (src: string) => {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.body.appendChild(script);
        });
    };

    const handleDownloadMenu = async () => {
        if (!items.length || !restaurantInfo) {
            toast.error("Menu data not ready");
            return;
        }

        let exportToast: any;
        try {
            exportToast = toast.loading("Preparing Premium A4 Pages...");

            // Helper: Slugify (Bulletproof Sync)
            const slugify = (text: string) => {
                return text.toString().toLowerCase()
                    .replace(/[()]/g, '')
                    .replace(/\./g, '-')
                    .replace(/\s+/g, '-')
                    .replace(/ñ/g, 'n')
                    .replace(/[^a-z0-9-]/g, '')
                    .replace(/-+/g, '-')
                    .replace(/^-+|-+$/g, '')
                    .trim();
            };

            // Helper: Safe Image Wrapper (Proxy)
            const getSafeImg = (rawUrl: string | null) => {
                if (!rawUrl) return null;
                if (rawUrl.startsWith('data:')) return rawUrl;
                if (rawUrl.startsWith('blob:')) return rawUrl;
                // Block URLs that will cause CORS errors
                const blocked = ['share.google', 'drive.google.com/uc'];
                if (blocked.some(b => rawUrl.includes(b))) return null;
                // Supabase public URLs already have CORS headers — no proxy needed
                if (rawUrl.includes('supabase.co')) return rawUrl;
                // Prevent double-proxying: if already proxied, return as-is
                if (rawUrl.includes('wsrv.nl')) return rawUrl;
                const decodedUrl = decodeURI(rawUrl);
                let encodedUrl = encodeURIComponent(decodedUrl)
                    .replace(/\(/g, '%28')
                    .replace(/\)/g, '%29');
                return `https://wsrv.nl/?url=${encodedUrl}`;
            };

            // Helper: Get Image Source — check DOM first, then Supabase storage.
            // Uses list() API to avoid 404 errors (only constructs URL if file actually exists).
            const getRealImgSrc = async (item: any): Promise<string | null> => {
                // 1. Check DOM for already-loaded images
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

                // 2. Use image_url if valid
                if (item.image_url) {
                    const blocked = ['share.google', 'drive.google.com/uc'];
                    if (!blocked.some((b: string) => item.image_url.includes(b))) {
                        return item.image_url;
                    }
                }

                // 3. Check Supabase storage using list() API (no 404 errors)
                if (item.name) {
                    let cleanCuisine = item.cuisine ? item.cuisine.trim() : 'Beverages';
                    let cleanCategory = item.category ? item.category.trim() : 'Cold Drinks';

                    const isBeverage = cleanCuisine === 'Beverages' ||
                        cleanCategory.toLowerCase().includes('drink') ||
                        cleanCategory.toLowerCase().includes('beverage');

                    if (isBeverage) {
                        cleanCuisine = 'Beverages';
                        cleanCategory = 'Cold Drinks';
                    }

                    let targetName = item.name.trim();
                    if (targetName.includes('Tex-Mex')) targetName = 'Jalapeno Popper Burgers';

                    const folderPath = `${cleanCuisine}/${cleanCategory}`;
                    const candidateFiles: string[] = [];
                    if (!isBeverage) candidateFiles.push(`${targetName}.jpg`);
                    candidateFiles.push(`${slugify(targetName)}.jpg`);

                    try {
                        const existingFiles = await getFilesInFolder(folderPath);
                        for (const fileName of candidateFiles) {
                            if (existingFiles.has(fileName)) {
                                const { data } = supabase.storage.from('preset-dishes').getPublicUrl(`${folderPath}/${fileName}`);
                                // HEAD-verify the URL actually serves (eliminates ghost entries)
                                try {
                                    const headResp = await fetch(data.publicUrl, { method: 'HEAD' });
                                    if (headResp.ok) return data.publicUrl;
                                } catch { /* URL not reachable, skip */ }
                            }
                        }
                    } catch { /* folder doesn't exist, skip */ }
                }

                return null;
            };

            const themeMap = {
                noir: { bg: '#08080a', darkerBg: '#000000', cardBg: '#121214', accent: '#f59e0b', text: '#ffffff', mutedText: '#a1a1aa', border: '#2a2a2e', headerText: '#ffffff', dealGradient: 'linear-gradient(135deg, #1e1b4b 0%, #000 100%)', font: "'Inter', sans-serif" },
                minimal: { bg: '#ffffff', darkerBg: '#f8fafc', cardBg: '#ffffff', accent: '#0f172a', text: '#1e293b', mutedText: '#64748b', border: '#e2e8f0', headerText: '#0f172a', dealGradient: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)', font: "'Inter', sans-serif" },
                royal: { bg: '#3b0717', darkerBg: '#2d020d', cardBg: '#4c0519', accent: '#fbbf24', text: '#fff1f2', mutedText: '#fecdd3', border: '#9f1239', headerText: '#fbbf24', dealGradient: 'linear-gradient(135deg, #881337 0%, #4c0519 100%)', font: "'Oswald', sans-serif" },
                cream: { bg: '#fdfcf7', darkerBg: '#fef3c7', cardBg: '#ffffff', accent: '#7c2d12', text: '#431407', mutedText: '#9a3412', border: '#fde68a', headerText: '#7c2d12', dealGradient: 'linear-gradient(135deg, #ffedd5 0%, #fdba74 100%)', font: "'Playfair Display', serif" },
                teal: { bg: '#042f2e', darkerBg: '#0f172a', cardBg: '#0f766e', accent: '#fbbf24', text: '#f0fdfa', mutedText: '#99f6e4', border: '#115e59', headerText: '#ffffff', dealGradient: 'linear-gradient(135deg, #134e4a 0%, #042f2e 100%)', font: "'Inter', sans-serif" }
            };
            const themeStyles = themeMap[exportOptions.theme as keyof typeof themeMap] || themeMap.noir;

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

            // Capture Deal Mosaic Images — broader DOM search + Supabase fallback
            const dealImages: Record<string, string> = {};
            if (deals.length > 0) {
                toast.loading("Gathering Deal Collages...", { id: exportToast });
                for (const deal of deals) {
                    let captured = false;

                    // Strategy 1: Try to find & capture the deal card element from the DOM
                    const selectors = [`#deal-mosaic-${deal.id}`, `[data-item-id="${deal.id}"]`, `[data-deal-id="${deal.id}"]`];
                    for (const sel of selectors) {
                        const el = document.querySelector(sel) as HTMLElement | null;
                        if (el) {
                            try {
                                const dealCanvas = await html2canvas(el as any, { scale: 3, useCORS: true, backgroundColor: null, logging: false } as any);
                                dealImages[deal.id] = dealCanvas.toDataURL('image/png');
                                captured = true;
                            } catch (e) { /* continue */ }
                            break;
                        }
                    }

                    // Strategy 2: Find any visible <img> with the deal's name
                    if (!captured) {
                        const allImgs = document.querySelectorAll('img');
                        for (const img of allImgs) {
                            const alt = img.alt?.toLowerCase() || '';
                            const dataName = img.closest('[data-item-name]')?.getAttribute('data-item-name')?.toLowerCase() || '';
                            if ((alt && deal.name.toLowerCase().includes(alt)) || (alt && alt.includes(deal.name.toLowerCase())) || (dataName && deal.name.toLowerCase().includes(dataName))) {
                                if (img.src && (img.src.startsWith('http') || img.src.startsWith('blob'))) {
                                    dealImages[deal.id] = img.src;
                                    captured = true;
                                    break;
                                }
                            }
                        }
                    }

                    // Strategy 3: Use deal.image_url if valid
                    if (!captured && deal.image_url) {
                        const blocked = ['share.google', 'drive.google.com/uc'];
                        if (!blocked.some(b => deal.image_url.includes(b))) {
                            dealImages[deal.id] = deal.image_url;
                            captured = true;
                        }
                    }

                    // Strategy 4: Preset Resolution using findBestPresetImage
                    if (!captured && deal.deal_items && deal.deal_items.length > 0) {
                        const itemName = deal.deal_items[0].item_name || '';
                        if (itemName) {
                            const matchedUrl = await findBestPresetImage(itemName, deal.category || "Deals");
                            if (matchedUrl) {
                                dealImages[deal.id] = matchedUrl;
                                captured = true;
                            }
                        }
                    }

                    if (!captured) dealImages[deal.id] = '';
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

            // Pre-resolve all regular item images in parallel (async, zero 404s)
            toast.loading("Resolving menu images...", { id: exportToast });
            const allRegularItems = Object.values(grouped).flat() as any[];
            const resolvedImages: Record<string, string | null> = {};
            await Promise.all(allRegularItems.map(async (item: any) => {
                const rawSrc = await getRealImgSrc(item);
                resolvedImages[item.id] = getSafeImg(rawSrc);
            }));

            const categoryCardsHtml = Object.keys(grouped).map(cat => {
                const itemsList = grouped[cat].map((item: any) => {
                    const imgSrc = resolvedImages[item.id];
                    return `
                        <div style="margin-bottom: 25px; border-bottom: 2px solid ${themeStyles.border}22; padding-bottom: 15px; display: flex; align-items: flex-start; gap: 25px; break-inside: avoid;">
                            ${imgSrc ? `<div style="width: 100px; height: 100px; border-radius: 20px; overflow: hidden; border: 3px solid ${themeStyles.accent}; flex-shrink: 0;"><img src="${imgSrc}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <div style="font-size: 30px; font-weight: 950; color: ${themeStyles.text}; text-transform: uppercase; letter-spacing: 1px;">${item.name}</div>
                                    <div style="font-size: 30px; font-weight: 950; color: ${themeStyles.accent}; white-space: nowrap; margin-left: 15px;">${formatPriceDisplay(item.price)}</div>
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
                        ${restaurantInfo.logo_url ? `<img src="${restaurantInfo.logo_url}" crossorigin="anonymous" style="height: 120px; object-fit: contain; margin-bottom: 30px; border-radius: 20px;" />` : ''}
                        <h1 style="font-size: 160px; font-weight: 950; color: ${themeStyles.headerText}; margin: 0; text-transform: uppercase; letter-spacing: 40px; line-height: 1;">${restaurantInfo.name}</h1>
                        <div style="font-size: 40px; color: ${themeStyles.accent}; margin-top: 30px; font-weight: 800; font-style: italic; letter-spacing: 12px; text-transform: uppercase;">${restaurantInfo.description || 'ESTABLISHED QUALITY'}</div>
                        ${restaurantInfo.opens_at && restaurantInfo.closes_at ? `<div style="font-size: 24px; color: ${themeStyles.mutedText}; margin-top: 25px; font-weight: 700; letter-spacing: 5px; text-transform: uppercase;">🕒 TIMINGS: ${restaurantInfo.opens_at} - ${restaurantInfo.closes_at}</div>` : ''}
                    </div>
                ` : `
                    <div style="padding: 50px 80px; text-align: left; border-bottom: 15px solid ${themeStyles.accent}; margin-bottom: 40px; background: ${themeStyles.darkerBg}99;">
                        <div style="font-size: 50px; font-weight: 950; color: ${themeStyles.accent}; text-transform: uppercase; letter-spacing: 15px;">${restaurantInfo.name} • MENU</div>
                    </div>
                `;

                const pageHtml = `
                    <div style="position: absolute; inset: 0; opacity: 0.04; background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px);"></div>
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

                // Stabilization delay - reduced for better UX
                await new Promise(r => setTimeout(r, 2000));

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
            // Dismiss the specific loading toast on error so it doesn't get stuck
            toast.error("Generation Failed", { id: exportToast });
        }
    }





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
        <div className="min-h-screen relative overflow-hidden flex flex-col text-slate-900 dark:text-slate-200 p-6 md:p-8">
            {/* Ambient Background Glows - Cinematic Dark Refinement */}
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-crimson-orb pointer-events-none z-0 opacity-60"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] ambient-glow-gold pointer-events-none z-0 opacity-40"></div>
            <div className="fixed top-[20%] right-[10%] w-[40%] h-[40%] bg-crimson-orb opacity-30 pointer-events-none z-0"></div>

            <div className="max-w-7xl mx-auto space-y-6 relative z-10">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
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
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/restaurant-setup?step=3&from=menu')}
                            className="order-glass-card hover:bg-white/10 dark:text-slate-200 gap-2 hidden sm:flex font-bold shadow-sm transition-all duration-300"
                        >
                            <Wand2 className="w-4 h-4 text-purple-500" /> Wizard
                        </Button>

                        <Button
                            variant="ghost"
                            onClick={() => setIsExportDialogOpen(true)}
                            className="order-glass-card hover:bg-white/10 dark:text-slate-200 gap-2 hidden sm:flex font-bold shadow-sm transition-all duration-300"
                        >
                            <FileDown className="w-4 h-4 text-amber-500" /> Export
                        </Button>

                        <Button
                            variant={isSelectionMode ? "default" : "ghost"}
                            onClick={() => {
                                setIsSelectionMode(!isSelectionMode);
                                setSelectedItems([]);
                            }}
                            className={`gap-2 hidden sm:flex font-bold shadow-sm transition-all duration-300 ${isSelectionMode ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'order-glass-card hover:bg-white/10 dark:text-slate-200'}`}
                        >
                            {isSelectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-blue-400" />}
                            {isSelectionMode ? 'Exit Selection' : 'Select Items'}
                        </Button>

                        <Button
                            onClick={autoFillMissingImages}
                            disabled={isAutoFilling}
                            variant="ghost"
                            className="hidden lg:flex gap-2 font-bold order-glass-card hover:bg-white/10 dark:text-slate-200 transition-all duration-300"
                        >
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

                    <div className="order-glass-card p-5 rounded-2xl flex items-center gap-4 group hover:-translate-y-1 hover:rotate-x-2 transition-all duration-300 cursor-default relative overflow-hidden">
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

                {/* Tabs & Content */}
                <div ref={menuRef} id="menu-export-container" className="pt-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-transparent">
                            <TabsList className="order-glass-panel border-white/10 p-1.5 flex h-auto w-full md:w-auto overflow-x-auto hide-scrollbar">
                                <TabsTrigger value="all" className="flex-1 md:flex-none gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 data-[state=active]:bg-white/10 data-[state=active]:text-amber-500 data-[state=active]:shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all">
                                    <Utensils className="w-4 h-4" /> All Items
                                </TabsTrigger>
                                <TabsTrigger value="deals" className="flex-1 md:flex-none gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 data-[state=active]:bg-white/10 data-[state=active]:text-purple-400 data-[state=active]:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all">
                                    <Package className="w-4 h-4" /> Deals
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

                        {/* Tab 1: All Items (Grouped) */}
                        <TabsContent value="all" className="m-0 focus-visible:ring-0">
                            {filteredItems.filter(i => i.item_type !== 'deal').length === 0 ? (
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
                            ) : (
                                <div className="space-y-8 pt-4">
                                    {Object.entries(groupedItems).map(([cuisine, categories], index) => {
                                        const isCuisineExpanded = expandedCuisines.includes(cuisine);
                                        return (
                                            <div key={cuisine} className="order-glass-card rounded-3xl overflow-hidden transition-all duration-500 border border-white/5 animate-in fade-in slide-in-from-bottom-8" style={{ animationDelay: `${index * 100}ms` }}>
                                                {/* Cuisine Header */}
                                                <div
                                                    onClick={() => toggleCuisine(cuisine)}
                                                    className={`flex items-center justify-between p-6 cursor-pointer transition-colors relative group ${isCuisineExpanded ? 'bg-white/5 border-b border-white/10' : 'hover:bg-white/5'}`}
                                                >
                                                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    <div className="flex items-center gap-5">
                                                        <div className={`p-4 rounded-2xl transition-all duration-300 relative ${isCuisineExpanded ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] scale-110' : 'bg-white/5 text-slate-400 group-hover:bg-white/10'}`}>
                                                            <Utensils className="w-6 h-6" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <h2 className="text-3xl font-black text-slate-100 tracking-tight leading-none drop-shadow-md">
                                                                {cuisine}
                                                            </h2>
                                                            <span className="text-xs uppercase tracking-[0.2em] font-bold text-amber-500/70 mt-2">
                                                                {Object.keys(categories).length} Categories <span className="mx-2 opacity-50">•</span> {Object.values(categories).flat().length} Items
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => { e.stopPropagation(); openQuickAddModal(e, cuisine, ""); }}
                                                            className="h-10 px-4 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-2 font-bold rounded-xl"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                            Add Dish
                                                        </Button>
                                                        <div onClick={(e) => e.stopPropagation()}>
                                                            <CategoryOfferDialog
                                                                category="Entire Cuisine"
                                                                cuisine={cuisine}
                                                                onApply={(cat, cuis, disc, name) => handleApplyCuisineOffer(cuis, disc, name)}
                                                            />
                                                        </div>
                                                        <div className={`p-3 rounded-full transition-all duration-500 order-glass-panel ${isCuisineExpanded ? 'rotate-180 bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : ''}`}>
                                                            <ChevronDown className="w-5 h-5 text-slate-300" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Cuisine Content (Categories) */}
                                                {isCuisineExpanded && (
                                                    <div className="p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500 bg-black/20">
                                                        {Object.entries(categories).map(([category, catItems]) => {
                                                            const isCategoryExpanded = expandedCategories.includes(`${cuisine}-${category}`);
                                                            return (
                                                                <div key={category} className={`border rounded-3xl transition-all duration-300 overflow-hidden ${isCategoryExpanded ? 'border-amber-500/30 bg-amber-500/5 shadow-[0_0_30px_rgba(245,158,11,0.05)]' : 'border-white/5 bg-transparent'}`}>
                                                                    {/* Category Header */}
                                                                    <div
                                                                        onClick={() => toggleCategory(`${cuisine}-${category}`)}
                                                                        className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors relative overflow-hidden"
                                                                    >
                                                                        <div className="flex items-center gap-4 z-10">
                                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all ${isCategoryExpanded ? 'bg-amber-500 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'order-glass-panel text-slate-300'}`}>
                                                                                {catItems.length}
                                                                            </div>
                                                                            <h3 className="text-xl font-bold text-slate-100">{category}</h3>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 z-10">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={(e) => { e.stopPropagation(); openQuickAddModal(e, cuisine, category); }}
                                                                                className="h-9 px-3 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-1.5 font-bold rounded-lg"
                                                                            >
                                                                                <Plus className="w-3.5 h-3.5" />
                                                                                Add
                                                                            </Button>
                                                                            <div onClick={(e) => e.stopPropagation()}>
                                                                                <CategoryOfferDialog
                                                                                    category={category}
                                                                                    cuisine={cuisine}
                                                                                    onApply={handleApplyCategoryOffer}
                                                                                />
                                                                            </div>
                                                                            <div className={`transition-transform duration-300 ${isCategoryExpanded ? 'rotate-180' : ''}`}>
                                                                                <ChevronDown className="w-5 h-5 text-slate-400" />
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Category Content (Items) */}
                                                                    {isCategoryExpanded && (
                                                                        <div className="p-5 pt-0 animate-in fade-in zoom-in-95 duration-300">
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 perspective-[2000px]">
                                                                                {catItems.map(item => (
                                                                                    <MenuItemCard
                                                                                        key={item.id}
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
                                        <MenuItemCard
                                            key={item.id}
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
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* Tab 3: AI Import */}
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
                                                                                        <span className="text-xs font-bold text-amber-500/70">{restaurantInfo?.currency?.symbol || 'Rs.'}</span>
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

                <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <SheetContent
                        side="right"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        className="sm:max-w-6xl w-[95vw] bg-slate-950 border-slate-900 shadow-[20px_0_90px_rgba(0,0,0,0.6)] p-0 overflow-hidden flex flex-col h-full transition-all duration-500 border-l border-white/5"
                    >
                        <div className="absolute inset-x-0 -top-px h-1.5 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent z-50"></div>

                        {/* Sheet Header - Fixed */}
                        <div className="p-8 pb-5 shrink-0 border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl z-20">
                            <SheetHeader>
                                <SheetTitle className="flex items-center gap-4 text-3xl font-black text-white">
                                    {selectionMode ? (
                                        <>
                                            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                                                <Sparkles className="w-7 h-7 text-amber-600 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]" />
                                            </div>
                                            What would you like to add?
                                        </>
                                    ) : (
                                        <>
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${currentItem.item_type === 'deal' ? 'bg-purple-500/10 border-purple-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                                {currentItem.item_type === 'deal'
                                                    ? <Package className="w-7 h-7 text-purple-600" />
                                                    : <Utensils className="w-7 h-7 text-amber-600" />
                                                }
                                            </div>
                                            <span className="tracking-tight">{isEditing ? 'Edit' : 'Add New'} {currentItem.item_type === 'deal' ? 'Deal' : 'Dish'}</span>
                                        </>
                                    )}
                                </SheetTitle>
                                <SheetDescription className="text-slate-400 font-bold text-base mt-2 ml-16">
                                    {selectionMode ? "Choose the type of menu item you want to create." : (
                                        currentItem.item_type === 'deal'
                                            ? "Bundle items together to create a value meal."
                                            : "Configure dish details, pricing, and variants."
                                    )}
                                </SheetDescription>
                            </SheetHeader>
                        </div>

                        {/* Modal Body - Two Column Side-by-Side Preview */}
                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-950">
                            {/* Left Column: Form Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-10 touch-pan-y border-r border-white/5">
                                {selectionMode && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-10">
                                        <div
                                            onClick={() => {
                                                setCurrentItem(prev => ({ ...prev, item_type: 'single' }));
                                                setSelectionMode(false);
                                            }}
                                            className="flex flex-col items-center justify-center p-10 bg-slate-900 border border-slate-800 rounded-[2.5rem] cursor-pointer hover:border-amber-500/50 hover:shadow-[0_20px_40px_rgba(245,158,11,0.2)] hover:-translate-y-1.5 transition-all group"
                                        >
                                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-6 rounded-3xl mb-6 group-hover:bg-amber-500 group-hover:text-white transition-all transform group-hover:rotate-6">
                                                <Utensils className="w-10 h-10" />
                                            </div>
                                            <h3 className="text-2xl font-black text-white group-hover:text-amber-500 transition-colors">Add Single Dish</h3>
                                            <p className="text-slate-400 text-center text-sm mt-3 leading-relaxed font-bold max-w-[200px]">
                                                Create a standalone menu item with variants and add-ons.
                                            </p>
                                        </div>

                                        <div
                                            onClick={() => {
                                                setCurrentItem(prev => ({ ...prev, item_type: 'deal' }));
                                                setSelectionMode(false);
                                            }}
                                            className="flex flex-col items-center justify-center p-10 bg-slate-900 border border-slate-800 rounded-[2.5rem] cursor-pointer hover:border-purple-500/50 hover:shadow-[0_20px_40px_rgba(168,85,247,0.2)] hover:-translate-y-1.5 transition-all group"
                                        >
                                            <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 p-6 rounded-3xl mb-6 group-hover:bg-purple-500 group-hover:text-white transition-all transform group-hover:-rotate-6">
                                                <Package className="w-10 h-10" />
                                            </div>
                                            <h3 className="text-2xl font-black text-white group-hover:text-purple-400 transition-colors">Create Deal Bundle</h3>
                                            <p className="text-slate-400 text-center text-sm mt-3 leading-relaxed font-bold max-w-[200px]">
                                                Combine multiple items into a discounted value meal.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {!selectionMode && (
                                    <div className="sticky top-0 z-[30] bg-slate-950/80 backdrop-blur-md border-b border-white/5 mx-[-2rem] px-8 py-4 mb-6 flex items-center justify-between">
                                        <div className="flex gap-6">
                                            {[
                                                { id: 'section-basic', label: 'Pricing', icon: LayoutList },
                                                { id: 'section-media', label: 'Media', icon: ImageIcon },
                                                { id: 'section-inventory', label: 'Stock', icon: Box },
                                                { id: 'section-variants', label: 'Variants', icon: Sparkles }
                                            ].map((tab) => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => document.getElementById(tab.id)?.scrollIntoView({ behavior: 'smooth' })}
                                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-amber-500 transition-colors group"
                                                >
                                                    <tab.icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                                    {tab.label}
                                                </button>
                                            ))}
                                        </div>
                                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest">
                                            LIVE SYNC ON
                                        </Badge>
                                    </div>
                                )}

                                {!selectionMode && (
                                    <div className="space-y-12 py-10">
                                        {/* 1. Basic Details & Pricing Section */}
                                        <div id="section-basic" className="space-y-8 scroll-mt-20">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                                                    <LayoutList className="w-5 h-5 text-amber-500" />
                                                </div>
                                                <h4 className="text-xl font-black text-white uppercase tracking-tight">Basic Details & Pricing</h4>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-3 relative group">
                                                    <Label htmlFor="name" className="text-slate-400 font-bold text-sm tracking-wide ml-1">{currentItem.item_type === 'deal' ? 'Deal Name' : 'Dish Name'}</Label>
                                                    <Input
                                                        id="name"
                                                        name="dish-name"
                                                        value={currentItem.name}
                                                        onChange={(e) => setCurrentItem(prev => ({ ...prev, name: e.target.value }))}
                                                        onBlur={async (e) => {
                                                            const val = e.target.value.trim();
                                                            if (val && !currentItem.image_url) {
                                                                const matchedUrl = await findBestPresetImage(val, currentItem.category || currentItem.cuisine || "");
                                                                if (matchedUrl) {
                                                                    setCurrentItem(prev => ({ ...prev, image_url: matchedUrl }));
                                                                    toast.success(`Auto-assigned matching image for "${val}"`);
                                                                }
                                                            }
                                                        }}
                                                        placeholder={currentItem.item_type === 'deal' ? "e.g. Zinger Combo" : "e.g. Zinger Burger"}
                                                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 rounded-2xl h-14 px-5 text-lg font-semibold shadow-sm transition-all group-hover:border-slate-600"
                                                        autoComplete="off"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-3 relative group text-blue-400">
                                                        <Label htmlFor="price" className="text-slate-400 font-bold text-sm tracking-wide ml-1">
                                                            Base Price (Rs)
                                                        </Label>
                                                        <Input
                                                            id="price"
                                                            type="number"
                                                            value={currentItem.price === 0 ? '' : currentItem.price}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                setCurrentItem(prev => ({ ...prev, price: isNaN(val) ? 0 : val }));
                                                            }}
                                                            placeholder="0"
                                                            className="bg-slate-800 border-slate-700 text-amber-500 placeholder:text-slate-500 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 rounded-2xl h-14 px-5 text-xl font-black shadow-sm transition-all group-hover:border-slate-600 remove-arrow"
                                                        />
                                                    </div>
                                                    <div className="space-y-3 relative group">
                                                        <Label htmlFor="item-discount" className="text-slate-400 font-bold text-sm tracking-wide ml-1">Discount (%)</Label>
                                                        <div className="relative">
                                                            <Input
                                                                id="item-discount"
                                                                type="number"
                                                                value={currentItem.discount_percentage || ''}
                                                                onChange={(e) => {
                                                                    const pct = parseFloat(e.target.value);
                                                                    setCurrentItem(prev => ({ ...prev, discount_percentage: isNaN(pct) ? null : pct }));
                                                                }}
                                                                placeholder="0"
                                                                className="pl-12 bg-slate-800 border-slate-700 text-green-500 placeholder:text-slate-500 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 rounded-2xl h-14 text-xl font-black shadow-sm transition-all group-hover:border-slate-600 remove-arrow"
                                                            />
                                                            <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500/50" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Final Price Preview Nudge */}
                                            {currentItem.price && currentItem.price > 0 && (
                                                <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between group/nudge hover:border-amber-500/30 transition-all duration-300 shadow-inner">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 flex items-center justify-center border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                                                            <Zap className="w-7 h-7 text-amber-500 animate-pulse" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Live Sale Price</p>
                                                            <p className="text-3xl font-black text-white tracking-tight">
                                                                {formatPriceDisplay(finalPrice)}
                                                                <span className="text-sm font-bold text-slate-500 ml-3 line-through opacity-50">{formatPriceDisplay(currentItem.price)}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {currentItem.discount_percentage && currentItem.discount_percentage > 0 && (
                                                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20 px-4 py-2 rounded-xl font-black text-sm">
                                                            SAVE {currentItem.discount_percentage}%
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <Label htmlFor="item-category" className="text-slate-400 font-bold text-sm tracking-wide">Category</Label>
                                                    <CreatableSelect
                                                        id="item-category"
                                                        options={existingCategories}
                                                        value={currentItem.category}
                                                        onChange={(val) => setCurrentItem(prev => ({ ...prev, category: val }))}
                                                        onCreate={(val) => {
                                                            setCurrentItem(prev => ({ ...prev, category: val }));
                                                            setExistingCategories(prev => [...prev, { value: val, label: val }]);
                                                        }}
                                                        placeholder="Select or type..."
                                                    />
                                                </div>

                                                <div className="space-y-3">
                                                    <Label htmlFor="item-cuisine" className="text-slate-400 font-bold text-sm tracking-wide">Cuisine</Label>
                                                    <CreatableSelect
                                                        id="item-cuisine"
                                                        options={existingCuisines}
                                                        value={currentItem.cuisine}
                                                        onChange={(val) => setCurrentItem(prev => ({ ...prev, cuisine: val }))}
                                                        onCreate={(val) => {
                                                            setCurrentItem(prev => ({ ...prev, cuisine: val }));
                                                            setExistingCuisines(prev => [...prev, { value: val, label: val }]);
                                                        }}
                                                        placeholder="Select or type..."
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4 relative group">
                                                <div className="flex justify-between items-center ml-1">
                                                    <Label htmlFor="description" className="text-slate-400 font-bold text-sm tracking-wide tracking-tight">Dish Description</Label>
                                                    <button
                                                        onClick={handleAIGenerate}
                                                        type="button"
                                                        className="text-[10px] flex items-center gap-2 text-amber-500 font-black hover:text-amber-400 tracking-widest transition-all bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20"
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5" /> AI ENHANCE
                                                    </button>
                                                </div>
                                                <Textarea
                                                    id="description"
                                                    value={currentItem.description || ''}
                                                    onChange={(e) => setCurrentItem(prev => ({ ...prev, description: e.target.value }))}
                                                    placeholder="Enter a mouth-watering description..."
                                                    className="resize-none h-32 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 rounded-2xl p-4 text-base shadow-sm transition-all group-hover:border-slate-600 custom-scrollbar font-medium leading-relaxed"
                                                />
                                            </div>
                                        </div>

                                        {/* 2. Media Section */}
                                        <div id="section-media" className="space-y-6 scroll-mt-20">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                                                    <ImageIcon className="w-5 h-5 text-blue-500" />
                                                </div>
                                                <h4 className="text-xl font-black text-white uppercase tracking-tight">Dish Media</h4>
                                            </div>

                                            <div className="border border-slate-800 rounded-[2.5rem] p-8 space-y-8 bg-slate-900/50">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-lg font-black text-white">Upload Photograph</h4>
                                                        <p className="text-slate-400 text-xs font-bold leading-tight">High quality images sell 2x more!</p>
                                                    </div>
                                                    {(currentItem.image_url || imagePreview) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2 h-10 px-4 rounded-xl font-bold transition-all border border-transparent hover:border-red-500/20"
                                                            onClick={() => {
                                                                setCurrentItem(prev => ({ ...prev, image_url: '' }));
                                                                setImageFile(null);
                                                                setImagePreview(null);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" /> Remove Image
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                                    <div className="relative aspect-video rounded-[2rem] overflow-hidden border-2 border-slate-800 bg-slate-800 shadow-2xl group/img flex items-center justify-center">
                                                        {(imagePreview || currentItem.image_url) ? (
                                                            <>
                                                                <img src={imagePreview || currentItem.image_url} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white">
                                                                        <Sparkles className="w-6 h-6 animate-pulse" />
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-3 text-slate-500">
                                                                <ImageIcon className="w-12 h-12 opacity-20" />
                                                                <p className="text-xs font-black uppercase tracking-widest opacity-40">No Image Uploaded</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div
                                                            className="border-2 border-dashed border-slate-700 rounded-[2rem] p-8 text-center bg-slate-800 hover:bg-slate-700/50 hover:border-amber-500/40 transition-all cursor-pointer group/upload relative overflow-hidden"
                                                            onClick={() => document.getElementById('dish-image')?.click()}
                                                        >
                                                            <div className="relative z-10 flex flex-col items-center gap-3">
                                                                <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 group-hover/upload:scale-110 group-hover/upload:rotate-3 transition-transform">
                                                                    <UploadCloud className="w-7 h-7 text-amber-500" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="text-white font-black text-sm">Upload Photo</p>
                                                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">PNG, JPG up to 5MB</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="file"
                                                            id="dish-image"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleImageUpload(file);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3. Description Section (Already merged into Basic in my mental model, but keeping it separate for clarity in scroll if needed) */}
                                        {/* Actually, I already moved Description into Basic section above. So I'll delete this duplication. */}

                                        {/* 3. Stock Management Section */}
                                        <div id="section-inventory" className="space-y-6 scroll-mt-20">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                                                    <Box className="w-5 h-5 text-emerald-500" />
                                                </div>
                                                <h4 className="text-xl font-black text-white uppercase tracking-tight">Inventory Tracking</h4>
                                            </div>

                                            <div className="border border-slate-800 rounded-[2.5rem] p-8 bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl overflow-hidden relative">
                                                <div className="flex items-center justify-between mb-8 relative z-10">
                                                    <div>
                                                        <h4 className="text-lg font-black text-white">Stock Management</h4>
                                                        <p className="text-slate-400 text-xs font-bold leading-tight">Track availability automatically</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-2xl border border-slate-700">
                                                        <span className="text-xs font-black text-slate-300 uppercase tracking-widest">{currentItem.is_stock_managed ? 'ON' : 'OFF'}</span>
                                                        <Switch
                                                            checked={currentItem.is_stock_managed}
                                                            onCheckedChange={(val) => setCurrentItem(prev => ({ ...prev, is_stock_managed: val }))}
                                                            className="data-[state=checked]:bg-emerald-500"
                                                        />
                                                    </div>
                                                </div>

                                                {currentItem.is_stock_managed && (
                                                    <div className="grid grid-cols-2 gap-8 animate-in zoom-in-95 duration-300 relative z-10">
                                                        <div className="space-y-3 group">
                                                            <Label className="text-slate-400 font-bold text-sm tracking-wide ml-1">Current Stock</Label>
                                                            <Input
                                                                type="number"
                                                                value={currentItem.stock_count ?? ''}
                                                                onChange={(e) => setCurrentItem(prev => ({ ...prev, stock_count: parseInt(e.target.value) }))}
                                                                placeholder="0"
                                                                className="bg-slate-800 border-slate-700 text-white h-14 rounded-2xl font-black text-xl group-hover:border-slate-600 transition-all text-center"
                                                            />
                                                        </div>
                                                        <div className="space-y-3 group">
                                                            <Label className="text-slate-400 font-bold text-sm tracking-wide ml-1">Low Stock Alert</Label>
                                                            <Input
                                                                type="number"
                                                                value={currentItem.low_stock_threshold || ''}
                                                                onChange={(e) => setCurrentItem(prev => ({ ...prev, low_stock_threshold: parseInt(e.target.value) }))}
                                                                placeholder="5"
                                                                className="bg-slate-800 border-slate-700 text-rose-500 h-14 rounded-2xl font-black text-xl group-hover:border-slate-600 transition-all text-center"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 4. Options & Variants Section */}
                                        <div id="section-variants" className="space-y-6 scroll-mt-20">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                                                    <Sparkles className="w-5 h-5 text-amber-500" />
                                                </div>
                                                <h4 className="text-xl font-black text-white uppercase tracking-tight">Options & Add-ons</h4>
                                            </div>

                                            {currentItem.item_type === 'deal' ? (
                                                <div className="space-y-8 bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800">
                                                    <DealBuilder
                                                        existingItems={items}
                                                        dealItems={dealItems}
                                                        setDealItems={setDealItems}
                                                        originalPrice={dealOriginalPrice}
                                                        discountPercentage={currentItem.discount_percentage || null}
                                                        setDiscountPercentage={(val) => setCurrentItem(prev => ({ ...prev, discount_percentage: val }))}
                                                        offerName={currentItem.offer_name || null}
                                                        setOfferName={(val) => setCurrentItem(prev => ({ ...prev, offer_name: val }))}
                                                        onPriceSync={(price) => setCurrentItem(prev => ({ ...prev, price }))}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-12">
                                                    <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800">
                                                        <VariantManager
                                                            variants={variants}
                                                            setVariants={setVariants}
                                                            basePrice={currentItem.price || 0}
                                                        />
                                                    </div>
                                                    <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800">
                                                        <ModifierManager
                                                            groups={modifierGroups}
                                                            setGroups={setModifierGroups}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Pro-Tip Nudge */}
                                        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/10 relative overflow-hidden group">
                                            <div className="absolute -right-8 -bottom-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Sparkles className="w-32 h-32 text-amber-500" />
                                            </div>
                                            <div className="relative z-10 space-y-3">
                                                <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-[0.2em]">
                                                    <Zap className="w-3.5 h-3.5" /> Pro-Tip
                                                </div>
                                                <h5 className="text-lg font-black text-white leading-tight">Add at least one Variant!</h5>
                                                <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-lg">
                                                    Items with options like "Size" or "Add-ons" have a <span className="text-amber-500 font-bold">40% higher chance</span> of being ordered.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Real-time Live Preview */}
                            {!selectionMode && (
                                <div className="hidden lg:flex lg:w-96 bg-black/40 backdrop-blur-md p-8 flex-col items-center justify-start gap-8 border-l border-white/5 animate-in fade-in slide-in-from-right-10 duration-700">
                                    <div className="w-full">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                <Sparkles className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-widest">Live Preview</h4>
                                                <p className="text-[10px] text-slate-500 font-bold">See changes in real-time</p>
                                            </div>
                                        </div>

                                        <div className="perspective-[1000px] hover:rotate-y-2 transition-transform duration-500">
                                            <div className="w-full max-w-[320px] mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden scale-[1.05]">
                                                <MenuItemCard
                                                    item={{
                                                        ...currentItem,
                                                        name: currentItem.name || "Dish Name",
                                                        price: currentItem.price || 0,
                                                        description: currentItem.description || "Description will appear here...",
                                                        category: currentItem.category,
                                                        image_url: currentItem.image_url,
                                                        item_type: currentItem.item_type,
                                                        variants: variants,
                                                        modifier_groups: modifierGroups,
                                                        deal_items: dealItems
                                                    } as MenuItem}
                                                    onEdit={() => { }}
                                                    onDelete={() => { }}
                                                    onToggleAvailability={() => { }}
                                                    allMenuItems={items}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-12 space-y-4">
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quick Tip</p>
                                                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                                    Your customers will see exactly what you see here. Make sure to add a catchy description!
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sticky Footer */}
                        <div className="p-8 shrink-0 border-t border-slate-800 bg-slate-900/80 backdrop-blur-xl z-20 flex items-center justify-end gap-5">
                            <Button
                                variant="ghost"
                                onClick={() => setIsDialogOpen(false)}
                                className="h-14 px-8 rounded-2xl text-slate-400 font-bold hover:bg-slate-800 hover:text-white transition-all transform active:scale-95"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSubmitting}
                                className={`h-14 px-12 rounded-[1.5rem] font-black text-lg shadow-xl active:scale-[0.98] transition-all flex items-center gap-3 ${currentItem.item_type === 'deal'
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20'
                                    : 'bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-amber-500/20'
                                    }`}
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                {isEditing ? 'Save Changes' : (currentItem.item_type === 'deal' ? 'Launch Deal' : 'Add to Menu')}
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>

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
                    <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col bg-black/95 backdrop-blur-3xl border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-0 overflow-hidden rounded-[2.5rem]">
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
                                                    <Table className="w-5 h-5" />
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
            </div>
        </div>
    );
};

export default MenuManager;
