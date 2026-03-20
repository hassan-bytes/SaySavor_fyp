// ============================================================
// FILE: DishEditorModal.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Reusable modal component for adding/editing dishes and deals
//          Provides a CLEAN, scrollable tabbed interface.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    X, Utensils, Package, ImageIcon, Sparkles, Box, UploadCloud, Percent, Trash2, Loader2, CheckSquare, Zap, Cloud,
    Timer, Tag, AlertCircle
} from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/shared/ui/dialog';
import { toast } from 'sonner';
import { resolvePresetImage } from '../../../shared/lib/imageMatchService';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Switch } from '@/shared/ui/switch';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import VariantManager from './VariantManager';
import ModifierManager from '@/2_partner/dashboard/components/ModifierManager';
import DealBuilder from '@/2_partner/dashboard/components/DealBuilder';
import { MenuItem, MenuVariant, ModifierGroup, DealItem } from '@/shared/types/menu';
import { CreatableSelect } from "@/shared/ui/creatable-select";
import { formatPrice, CurrencyInfo, DEFAULT_CURRENCY } from '@/shared/lib/currencyUtils';

export interface DishEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Partial<MenuItem> | null;
    onSave: () => Promise<void>;
    existingCategories: { value: string; label: string }[];
    existingCuisines: { value: string; label: string }[];
    allMenuItems: MenuItem[];
    isEditing: boolean;
    selectionMode: boolean;
    currency?: CurrencyInfo;
    onItemChange?: (updates: Partial<MenuItem>) => void;
    onVariantsChange?: (variants: MenuVariant[]) => void;
    onModifierGroupsChange?: (groups: ModifierGroup[]) => void;
    onDealItemsChange?: (items: DealItem[]) => void;
    onImageFileChange?: (file: File | null) => void;
}

const DishEditorModal: React.FC<DishEditorModalProps> = ({
    isOpen, onClose, initialData, onSave, existingCategories, existingCuisines,
    allMenuItems, isEditing, selectionMode, currency = DEFAULT_CURRENCY,
    onItemChange, onVariantsChange, onModifierGroupsChange, onDealItemsChange, onImageFileChange
}) => {
    const [activeTab, setActiveTab] = useState('basic');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const [currentItem, setCurrentItem] = useState<Partial<MenuItem>>(initialData || {
        name: '', price: 0, category: '', description: '', image_url: '', cuisine: '',
        stock_count: null, low_stock_threshold: 5, is_stock_managed: false, is_available: true,
        discount_percentage: null, offer_name: '', item_type: 'single'
    });

    const [variants, setVariants] = useState<MenuVariant[]>(initialData?.variants || []);
    const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>(initialData?.modifier_groups || []);
    const [dealItems, setDealItems] = useState<DealItem[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [offerDiscount,   setOfferDiscount]   = useState<number>(0)
    const [offerLabel,      setOfferLabel]      = useState('')
    const [offerExpiresAt,  setOfferExpiresAt]  = useState('')
    const [offerSaving,     setOfferSaving]     = useState(false)
    const isInitializedRef = React.useRef(false);

    useEffect(() => {
        if (!isOpen) {
            isInitializedRef.current = false;
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !initialData) return;
        if (isInitializedRef.current) return;

        isInitializedRef.current = true;

        setCurrentItem(initialData);
        setVariants((initialData as any).variants || []);
        setModifierGroups((initialData as any).modifier_groups || []);
        setImagePreview((initialData as any).image_url || null);
        setImageFile(null);

        if ((initialData as any).item_type === 'deal') {
            const existingDealItems = (initialData as any).deal_items || [];
            setDealItems(existingDealItems);
            onDealItemsChange?.(existingDealItems);
            setActiveTab('options');
        } else {
            setDealItems([]);
            setActiveTab('basic');
        }

        // Load existing offer data if editing
        if ((initialData as any).discount_percentage) {
            setOfferDiscount((initialData as any).discount_percentage || 0)
            setOfferLabel((initialData as any).offer_name || '')
            if ((initialData as any).offer_expires_at) {
                const d = new Date((initialData as any).offer_expires_at)
                setOfferExpiresAt(
                    new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                        .toISOString().slice(0, 16)
                )
            }
        } else {
            setOfferDiscount(0)
            setOfferLabel('')
            setOfferExpiresAt('')
        }
    }, [isOpen, initialData]);

    const syncToParent = React.useMemo(() => ({
        item: (updates: Partial<MenuItem>) => onItemChange?.(updates),
        variants: (nextVariants: MenuVariant[]) => onVariantsChange?.(nextVariants),
        modifiers: (nextGroups: ModifierGroup[]) => onModifierGroupsChange?.(nextGroups),
        deals: (nextDealItems: DealItem[]) => onDealItemsChange?.(nextDealItems),
        image: (file: File | null) => onImageFileChange?.(file),
    }), [onDealItemsChange, onImageFileChange, onItemChange, onModifierGroupsChange, onVariantsChange]);

    const updateCurrentItem = React.useCallback((updates: Partial<MenuItem>) => {
        setCurrentItem(prev => ({ ...prev, ...updates }));
        syncToParent.item(updates);
    }, [syncToParent]);

    const updateVariants = React.useCallback((nextVariants: MenuVariant[]) => {
        setVariants(nextVariants);
        syncToParent.variants(nextVariants);
    }, [syncToParent]);

    const updateModifierGroups = React.useCallback((nextGroups: ModifierGroup[]) => {
        setModifierGroups(nextGroups);
        syncToParent.modifiers(nextGroups);
    }, [syncToParent]);

    const updateDealItems = React.useCallback((nextDealItems: DealItem[]) => {
        setDealItems(nextDealItems);
        syncToParent.deals(nextDealItems);
    }, [syncToParent]);

    const handleImageUpload = (file: File | null) => {
        setImageFile(file);
        syncToParent.image(file);
        if (!file) {
            setImagePreview(null);
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleAutoFillImage = async () => {
        if (!currentItem.name?.trim()) {
            toast.error('Please enter a dish name first');
            return;
        }

        setIsAutoFilling(true);
        try {
            const url = await resolvePresetImage(
                currentItem.name,
                currentItem.category || '',
                currentItem.cuisine || ''
            );

            if (url) {
                // Update image preview to show it immediately
                setImagePreview(url);
                // Clear any manually selected file
                setImageFile(null);
                // Sync to parent MenuManager state
                updateCurrentItem({ image_url: url });
                onImageFileChange?.(null);
                toast.success('Image auto-filled!');
            } else {
                toast.error('No matching image found. Try adding a more specific dish name.');
            }
        } catch (err) {
            toast.error('Could not load preset images.');
        } finally {
            setIsAutoFilling(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSubmitting(true);
            setSaveStatus('saving');
            await onSave();
            setSaveStatus('saved');
        } catch (error) {
            setSaveStatus('idle');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveOffer = async () => {
        if (!currentItem.id) {
            toast.error('Save the dish first before adding an offer')
            return
        }
        if (offerDiscount <= 0) {
            // Remove offer
            await (supabase.from('menu_items') as any)
                .update({
                    price: currentItem.offer_original_price || currentItem.price,
                    discount_percentage: null,
                    offer_name: null,
                    offer_expires_at: null,
                    offer_original_price: null,
                } as any)
                .eq('id', currentItem.id)
            updateCurrentItem({
                discount_percentage: null,
                offer_name: null,
                offer_expires_at: null,
            })
            toast.success('Offer removed')
            return
        }

        const basePrice = (currentItem as any).offer_original_price
            || currentItem.price
            || 0
        const discountedPrice = Math.round(basePrice * (1 - offerDiscount / 100))

        const updateData: any = {
            price: discountedPrice,
            discount_percentage: offerDiscount,
            offer_name: offerLabel || `${offerDiscount}% Off`,
            offer_original_price: basePrice,
            offer_expires_at: offerExpiresAt
                ? new Date(offerExpiresAt).toISOString()
                : null,
        }

        setOfferSaving(true)
        try {
            await (supabase.from('menu_items') as any)
                .update(updateData)
                .eq('id', currentItem.id)

            updateCurrentItem(updateData)
            toast.success(
                offerExpiresAt
                    ? `Offer set! Expires ${new Date(offerExpiresAt).toLocaleString()}`
                    : 'Permanent offer applied!'
            )
        } catch {
            toast.error('Failed to save offer')
        } finally {
            setOfferSaving(false)
        }
    }

    const finalPrice = React.useMemo(() => {
        const base = currentItem.price || 0;
        const disc = currentItem.discount_percentage || 0;
        return Math.round(base - (base * (disc / 100)));
    }, [currentItem.price, currentItem.discount_percentage]);

    const variantPriceRange = React.useMemo(() => {
        const prices = variants
            .map(v => v.price)
            .filter(p => typeof p === 'number' && p > 0);
        if (prices.length === 0) return null;
        return {
            min: Math.min(...prices),
            max: Math.max(...prices)
        };
    }, [variants]);

    const maxModifierTotal = React.useMemo(() => {
        return modifierGroups
            .flatMap(g => g.modifiers)
            .reduce((sum, m) => sum + (m.price || 0), 0);
    }, [modifierGroups]);

    const maxPossiblePrice = React.useMemo(() => {
        const baseOrMaxVariant = variantPriceRange
            ? variantPriceRange.max
            : (currentItem.price || 0);
        return baseOrMaxVariant + maxModifierTotal;
    }, [variantPriceRange, currentItem.price, maxModifierTotal]);

    const formatPriceDisplay = React.useCallback((price: number | string): string => {
        const num = typeof price === 'string' ? parseFloat(price) || 0 : price;
        return formatPrice(num, currency);
    }, [currency]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            {/* 1. MODAL CONTAINER - Fixed Size & Prevents outside interaction issues */}
            <DialogContent
                className={`w-[95vw] bg-[#0f172a] border border-slate-700 shadow-2xl p-0 flex flex-col rounded-2xl overflow-hidden ${currentItem.item_type === 'deal' ? 'sm:max-w-4xl h-[92vh]' : 'sm:max-w-3xl h-[85vh]'}`}
                style={currentItem.item_type === 'deal' ? { '--modal-h': '92vh' } as React.CSSProperties : undefined}
                onInteractOutside={(e) => {
                    // Allow scroll wheel interactions while keeping outside click from closing the modal
                    if (e.type === 'dismissableLayer.pointerDownOutside') {
                        e.preventDefault();
                    }
                }}
            >
                {/* 2. HEADER - Always Visible at Top */}
                <div className="shrink-0 bg-slate-900 border-b border-slate-800 p-5 flex justify-between items-center z-20">
                    <DialogHeader className="flex flex-row items-center gap-4 text-left space-y-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${currentItem.item_type === 'deal' ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' : 'bg-amber-500/20 border-amber-500/30 text-amber-500'}`}>
                            {currentItem.item_type === 'deal' ? <Package className="w-6 h-6" /> : <Utensils className="w-6 h-6" />}
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold text-white">
                                {selectionMode && !currentItem.item_type ? 'What would you like to add?' : `${isEditing ? 'Edit' : 'Add'} ${currentItem.item_type === 'deal' ? 'Deal' : 'Dish'}`}
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 text-sm mt-1">
                                {selectionMode && !currentItem.item_type ? 'Choose the item type below.' : 'Configure details, pricing, and availability.'}
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* 3. BODY - Handle Selection Mode OR Tabs */}
                {selectionMode && !currentItem.item_type ? (
                    // --- SELECTION SCREEN ---
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex flex-col sm:flex-row items-center justify-center gap-6 bg-slate-950/50">
                        <button
                            onClick={() => {
                                updateCurrentItem({ item_type: 'single', name: '', price: 0, category: '' });
                                setActiveTab('basic');
                            }}
                            className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-2xl hover:border-amber-500 hover:bg-slate-800 transition-all w-full max-w-[300px]"
                        >
                            <Utensils className="w-12 h-12 text-amber-500 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Single Dish</h3>
                            <p className="text-sm text-slate-400 text-center">A standard menu item with variants and add-ons.</p>
                        </button>
                        <button
                            onClick={() => {
                                updateCurrentItem({ item_type: 'deal', name: '', price: 0, category: '' });
                                setActiveTab('options');
                            }}
                            className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-2xl hover:border-purple-500 hover:bg-slate-800 transition-all w-full max-w-[300px]"
                        >
                            <Package className="w-12 h-12 text-purple-400 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Deal Bundle</h3>
                            <p className="text-sm text-slate-400 text-center">Combine multiple dishes into a discounted meal.</p>
                        </button>
                    </div>
                ) : (
                    // --- TABS & FORM ---
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
                        
                        {/* Tab Navigation (Fixed below header) */}
                        <div className="shrink-0 border-b border-slate-800 bg-slate-900/80 px-6 pt-2" onWheel={(e) => e.stopPropagation()}>
                            <TabsList className="bg-transparent h-auto p-0 flex gap-6 overflow-x-auto custom-scrollbar">
                                <TabsTrigger value="basic" className="px-1 py-3 text-sm font-bold text-slate-400 data-[state=active]:text-amber-500 data-[state=active]:border-b-2 data-[state=active]:border-amber-500 rounded-none bg-transparent hover:text-slate-300">
                                    <CheckSquare className="w-4 h-4 mr-2" /> Basic Info
                                </TabsTrigger>
                                <TabsTrigger value="media" className="px-1 py-3 text-sm font-bold text-slate-400 data-[state=active]:text-blue-500 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none bg-transparent hover:text-slate-300">
                                    <ImageIcon className="w-4 h-4 mr-2" /> Media
                                </TabsTrigger>
                                <TabsTrigger value="options" className="px-1 py-3 text-sm font-bold text-slate-400 data-[state=active]:text-purple-400 data-[state=active]:border-b-2 data-[state=active]:border-purple-400 rounded-none bg-transparent hover:text-slate-300">
                                    <Sparkles className="w-4 h-4 mr-2" /> Options & Deals
                                    {(variants.length > 0 || modifierGroups.length > 0) && (
                                        <span className="ml-2 bg-purple-500/20 text-purple-400 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-purple-500/20">
                                            {variants.length + modifierGroups.length}
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="inventory" className="px-1 py-3 text-sm font-bold text-slate-400 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 rounded-none bg-transparent hover:text-slate-300">
                                    <Box className="w-4 h-4 mr-2" /> Inventory
                                    {currentItem.is_stock_managed && (
                                        <span className={`ml-2 text-[9px] font-black px-1.5 py-0.5 rounded-full border
        ${(currentItem.stock_count || 0) <= 0
                                                ? 'bg-red-500/20 text-red-400 border-red-500/20'
                                                : (currentItem.stock_count || 0) <= (currentItem.low_stock_threshold || 5)
                                                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/20'
                                                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                            }`}>
                                            {(currentItem.stock_count || 0) <= 0
                                                ? 'Out'
                                                : `${currentItem.stock_count} left`}
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="offers" className="px-1 py-3 text-sm font-bold text-slate-400 data-[state=active]:text-orange-500 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none bg-transparent hover:text-slate-300">
                                    <Tag className="w-4 h-4 mr-1.5" />
                                    Offers
                                    {(currentItem.discount_percentage || 0) > 0 && (
                                        <span className="ml-1.5 bg-orange-500 text-white text-[9px]
                                                         font-black px-1.5 py-0.5 rounded-full">
                                            {currentItem.discount_percentage}%
                                        </span>
                                    )}
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Form Body (Scrollable, Isolated) */}
                        <div
                            className="bg-slate-950"
                            style={{
                                overscrollBehavior: 'contain',
                                ...(currentItem.item_type === 'deal'
                                    ? {
                                        height: 'calc(92vh - 82px - 48px - 72px)',
                                        minHeight: 0,
                                        position: 'relative',
                                    }
                                    : {
                                        flex: 1,
                                        overflowY: 'auto',
                                        padding: '24px 32px',
                                    }
                                ),
                            }}
                            onWheel={(e) => {
                                if (currentItem.item_type !== 'deal') e.stopPropagation();
                            }}
                            onTouchMove={(e) => {
                                if (currentItem.item_type !== 'deal') e.stopPropagation();
                            }}
                        >
                            
                            <TabsContent
                                value="basic"
                                className={`mt-0 outline-none ${currentItem.item_type === 'deal' ? 'custom-scrollbar' : ''}`}
                                style={currentItem.item_type === 'deal'
                                    ? {
                                        position: 'absolute',
                                        inset: 0,
                                        overflowY: 'auto',
                                        padding: '20px 24px',
                                    }
                                    : { padding: 0 }
                                }
                                onWheel={currentItem.item_type === 'deal'
                                    ? (e: React.WheelEvent) => e.stopPropagation()
                                    : undefined
                                }
                            >
                                {currentItem.item_type === 'deal' ? (
                                    <div className="space-y-5 max-w-2xl mx-auto">

                                        <div className="space-y-2">
                                            <Label className="text-slate-300 font-bold">Deal Name *</Label>
                                            <Input
                                                value={currentItem.name || ''}
                                                onChange={e => updateCurrentItem({ name: e.target.value, offer_name: e.target.value })}
                                                className="bg-slate-900 border-slate-700 h-12 text-white
                       rounded-xl text-base font-bold"
                                                placeholder="e.g. Family Feast, Weekend Special"
                                                autoFocus
                                            />
                                            <p className="text-[11px] text-slate-500">
                                                This name appears on your customer menu
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-slate-300 font-bold">
                                                Description
                                                <span className="text-slate-500 font-normal ml-1">(optional)</span>
                                            </Label>
                                            <Textarea
                                                value={currentItem.description || ''}
                                                onChange={e => updateCurrentItem({ description: e.target.value })}
                                                className="bg-slate-900 border-slate-700 text-white
                       rounded-xl min-h-[90px] resize-none"
                                                placeholder="e.g. Perfect for 2 people — includes main, side, and drink"
                                            />
                                        </div>

                                        <div className="flex items-start gap-3 p-4
                        bg-purple-500/5 border border-purple-500/20
                        rounded-xl">
                                            <div className="w-8 h-8 rounded-lg bg-purple-500/15 border
                          border-purple-500/20 flex items-center
                          justify-center shrink-0 mt-0.5">
                                                <Package className="w-4 h-4 text-purple-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-purple-400 mb-1">
                                                    Pricing is calculated automatically
                                                </p>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                                    Go to the{' '}
                                                    <button
                                                        onClick={() => setActiveTab('options')}
                                                        className="text-purple-400 font-bold hover:text-purple-300
                           underline transition-colors"
                                                    >
                                                        Options & Deals tab
                                                    </button>
                                                    {' '}to add items. Price auto-calculates from your selections.
                                                </p>
                                            </div>
                                        </div>

                                        {(currentItem.price || 0) > 0 && (
                                            <div className="flex items-center justify-between p-4
                          bg-slate-900 border border-slate-800 rounded-xl">
                                                <div>
                                                    <p className="text-[10px] text-slate-500 font-black
                            uppercase tracking-wider mb-1">
                                                        Current Deal Price
                                                    </p>
                                                    <p className="text-2xl font-black text-white">
                                                        {formatPriceDisplay(currentItem.price || 0)}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setActiveTab('options')}
                                                    className="text-xs font-bold text-purple-400
                         hover:text-purple-300 transition-colors
                         bg-purple-500/10 hover:bg-purple-500/20
                         px-3 py-2 rounded-lg border border-purple-500/20"
                                                >
                                                    Edit Items →
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                ) : (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-slate-300 font-bold">Dish Name</Label>
                                                <Input
                                                    value={currentItem.name || ''}
                                                    onChange={e => updateCurrentItem({ name: e.target.value })}
                                                    className="bg-slate-900 border-slate-700 h-12 text-white rounded-xl"
                                                    placeholder="e.g. Zinger Burger"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-slate-300 font-bold">Base Price</Label>
                                                    <Input
                                                        type="number"
                                                        value={currentItem.price || ''}
                                                        onChange={e => updateCurrentItem({ price: parseFloat(e.target.value) || 0 })}
                                                        className="bg-slate-900 border-slate-700 h-12 text-amber-500
                           font-bold rounded-xl remove-arrow"
                                                    />
                                                </div>
                                                <div className="space-y-2 relative">
                                                    <Label className="text-slate-300 font-bold">Discount %</Label>
                                                    <Input
                                                        type="number"
                                                        value={currentItem.discount_percentage || ''}
                                                        onChange={e => updateCurrentItem({
                                                            discount_percentage: parseFloat(e.target.value) || null
                                                        })}
                                                        className="pl-8 bg-slate-900 border-slate-700 h-12 text-green-400
                           font-bold rounded-xl remove-arrow"
                                                    />
                                                    <Percent className="w-4 h-4 text-green-500/50 absolute left-3 top-10" />
                                                </div>
                                            </div>
                                        </div>

                                        {currentItem.price && currentItem.price > 0 ? (
                                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl
                          flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs text-slate-500 font-bold uppercase
                            tracking-wider mb-1">
                                                        Final Sale Price
                                                    </p>
                                                    <p className="text-2xl font-black text-white">
                                                        {formatPriceDisplay(finalPrice)}
                                                        {currentItem.discount_percentage ? (
                                                            <span className="text-sm font-medium text-slate-500
                                   line-through ml-2">
                                                                {formatPriceDisplay(currentItem.price)}
                                                            </span>
                                                        ) : null}
                                                    </p>
                                                </div>
                                                {currentItem.discount_percentage ? (
                                                    <Badge className="bg-green-500/20 text-green-400 border-none px-3 py-1">
                                                        -{currentItem.discount_percentage}% OFF
                                                    </Badge>
                                                ) : null}
                                            </div>
                                        ) : null}

                                        {(variantPriceRange || maxModifierTotal > 0) && (
                                            <div className="bg-slate-900 border border-slate-800
                          rounded-xl overflow-hidden mt-3">
                                                <div className="px-4 py-2 border-b border-slate-800">
                                                    <p className="text-xs text-slate-500 font-bold
                            uppercase tracking-wider">
                                                        Customer Price Breakdown
                                                    </p>
                                                </div>
                                                <div className="p-4 space-y-3">
                                                    {variantPriceRange && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs text-slate-400 font-bold">Variant Range</span>
                                                            <span className="text-sm font-black text-blue-400">
                                                                {formatPriceDisplay(variantPriceRange.min)}
                                                                {variantPriceRange.min !== variantPriceRange.max && (
                                                                    <> - {formatPriceDisplay(variantPriceRange.max)}</>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {maxModifierTotal > 0 && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs text-slate-400 font-bold">Max Add-ons</span>
                                                            <span className="text-sm font-black text-purple-400">
                                                                +{formatPriceDisplay(maxModifierTotal)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {maxPossiblePrice > 0 && maxModifierTotal > 0 && (
                                                        <div className="flex justify-between items-center
                                pt-3 border-t border-slate-800">
                                                            <span className="text-xs text-slate-400 font-bold">Max Customer Pays</span>
                                                            <span className="text-base font-black text-white">
                                                                {formatPriceDisplay(maxPossiblePrice)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-slate-300 font-bold">Category</Label>
                                                <CreatableSelect
                                                    options={existingCategories}
                                                    value={currentItem.category}
                                                    onChange={val => updateCurrentItem({ category: val })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300 font-bold">Cuisine</Label>
                                                <CreatableSelect
                                                    options={existingCuisines}
                                                    value={currentItem.cuisine}
                                                    onChange={val => updateCurrentItem({ cuisine: val })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-slate-300 font-bold">Description</Label>
                                            <Textarea
                                                value={currentItem.description || ''}
                                                onChange={e => updateCurrentItem({ description: e.target.value })}
                                                className="bg-slate-900 border-slate-700 text-white rounded-xl
                       min-h-[100px] resize-none"
                                                placeholder="Add a delicious description..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            {/* TAB 2: MEDIA */}
                            <TabsContent
                                value="media"
                                className={`mt-0 outline-none ${currentItem.item_type === 'deal' ? 'custom-scrollbar' : ''}`}
                                style={currentItem.item_type === 'deal'
                                    ? {
                                        position: 'absolute',
                                        inset: 0,
                                        overflowY: 'auto',
                                        padding: '20px 24px',
                                    }
                                    : { padding: 0 }
                                }
                                onWheel={currentItem.item_type === 'deal'
                                    ? (e: React.WheelEvent) => e.stopPropagation()
                                    : undefined
                                }
                            >
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="aspect-video bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center relative overflow-hidden group">
                                            {imagePreview ? (
                                                <>
                                                    <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <Button variant="destructive" size="sm" onClick={() => { setImagePreview(null); setImageFile(null); syncToParent.image(null); updateCurrentItem({ image_url: '' }); }}>
                                                            <Trash2 className="w-4 h-4 mr-2" /> Remove Image
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center text-slate-600">
                                                    <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm font-bold">No Image Uploaded</p>
                                                </div>
                                            )}
                                        </div>
                                        <div 
                                            className="border-2 border-dashed border-slate-700 bg-slate-900/50 hover:bg-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer rounded-2xl flex flex-col items-center justify-center p-6 text-center"
                                            onClick={() => document.getElementById('image-upload')?.click()}
                                        >
                                            <UploadCloud className="w-10 h-10 text-amber-500 mb-3" />
                                            <p className="font-bold text-white text-sm">Click to upload photo</p>
                                            <p className="text-xs text-slate-500 mt-1">JPG or PNG up to 5MB</p>
                                            <input type="file" id="image-upload" className="hidden" accept="image/*" onChange={e => handleImageUpload(e.target.files?.[0] || null)} />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleAutoFillImage}
                                        disabled={isAutoFilling || !currentItem.name?.trim()}
                                        className="w-full mt-3 flex items-center justify-center gap-2
               h-10 rounded-xl border border-dashed
               border-purple-500/40 bg-purple-500/5
               text-purple-400 text-sm font-bold
               hover:bg-purple-500/10 hover:border-purple-500/60
               disabled:opacity-40 disabled:cursor-not-allowed
               transition-all"
                                    >
                                        {isAutoFilling ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Finding image...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                Auto-fill from preset
                                            </>
                                        )}
                                    </button>

                                    {!currentItem.name?.trim() && (
                                        <p className="text-[11px] text-slate-500 text-center mt-1">
                                            Enter dish name first to auto-fill
                                        </p>
                                    )}
                                </div>
                            </TabsContent>

                            {/* TAB 3: OPTIONS & DEALS */}
                            <TabsContent
                                value="options"
                                className="mt-0 outline-none"
                                style={currentItem.item_type === 'deal'
                                    ? {
                                        position: 'absolute',
                                        inset: 0,
                                        overflow: 'hidden',
                                    }
                                    : { padding: 0 }
                                }
                            >
                                {currentItem.item_type === 'deal' ? (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            padding: '12px',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}
                                    >
                                        <DealBuilder
                                            existingItems={allMenuItems}
                                            initialDealItems={dealItems}
                                            onDealItemsChange={updateDealItems}
                                            discountPercentage={currentItem.discount_percentage ?? null}
                                            setDiscountPercentage={val => updateCurrentItem({ discount_percentage: val })}
                                            offerName={currentItem.offer_name || null}
                                            setOfferName={val => updateCurrentItem({ offer_name: val, name: val })}
                                            onPriceSync={price => updateCurrentItem({ price })}
                                            formatPrice={formatPriceDisplay}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <VariantManager variants={variants} setVariants={updateVariants} basePrice={currentItem.price || 0} formatPrice={formatPriceDisplay} currencySymbol={currency.symbol} itemDiscountPercent={currentItem.discount_percentage || 0} />
                                        <ModifierManager groups={modifierGroups} setGroups={updateModifierGroups} formatPrice={formatPriceDisplay} currencySymbol={currency.symbol} />
                                    </div>
                                )}
                            </TabsContent>

                            {/* TAB 4: INVENTORY */}
                            <TabsContent
                                value="inventory"
                                className={`mt-0 outline-none ${currentItem.item_type === 'deal' ? 'custom-scrollbar' : ''}`}
                                style={currentItem.item_type === 'deal'
                                    ? {
                                        position: 'absolute',
                                        inset: 0,
                                        overflowY: 'auto',
                                        padding: '20px 24px',
                                    }
                                    : { padding: 0 }
                                }
                                onWheel={currentItem.item_type === 'deal'
                                    ? (e: React.WheelEvent) => e.stopPropagation()
                                    : undefined
                                }
                            >
                                <div className="space-y-6">
                                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-white text-sm">Manage Stock</h4>
                                            <p className="text-xs text-slate-500 mt-1">Track availability automatically</p>
                                        </div>
                                        <Switch checked={currentItem.is_stock_managed} onCheckedChange={val => updateCurrentItem({ is_stock_managed: val })} />
                                    </div>

                                    {currentItem.is_stock_managed && (
                                        <div className="grid grid-cols-2 gap-6 bg-slate-900 p-5 rounded-2xl border border-slate-800">
                                            <div className="space-y-2">
                                                <Label className="text-slate-400 font-bold">In-Stock Quantity</Label>
                                                <Input type="number" value={currentItem.stock_count ?? ''} onChange={e => updateCurrentItem({ stock_count: parseInt(e.target.value) || 0 })} className="bg-slate-950 border-slate-700 text-white font-bold h-12 rounded-xl text-center" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-400 font-bold">Low Stock Alert</Label>
                                                <Input type="number" value={currentItem.low_stock_threshold || ''} onChange={e => updateCurrentItem({ low_stock_threshold: parseInt(e.target.value) || 0 })} className="bg-slate-950 border-slate-700 text-rose-400 font-bold h-12 rounded-xl text-center" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="offers" className={`mt-0 outline-none ${currentItem.item_type === 'deal' ? 'custom-scrollbar' : ''}`}
                                style={currentItem.item_type === 'deal'
                                    ? {
                                        position: 'absolute',
                                        inset: 0,
                                        overflowY: 'auto',
                                        padding: '20px 24px',
                                    }
                                    : { padding: '24px 32px' }
                                }
                                onWheel={(e) => e.stopPropagation()}
                            >

                                {!currentItem.id && (
                                    <div className="flex items-center gap-3 p-4 bg-amber-500/10
                      border border-amber-500/20 rounded-xl mb-5">
                                        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                                        <p className="text-sm text-amber-400 font-bold">
                                            Save this dish first, then come back to set an offer.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-5">
                                    {/* Discount input */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-black text-slate-400
                          uppercase tracking-wider">
                                                Discount %
                                            </Label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="99"
                                                    value={offerDiscount || ''}
                                                    placeholder="0"
                                                    onChange={(e) => setOfferDiscount(
                                                        Math.min(99, Math.max(0, Number(e.target.value)))
                                                    )}
                                                    className="w-full h-12 bg-slate-800/60 border border-slate-700
                       rounded-xl pl-8 pr-3 text-xl font-black text-amber-400
                       focus:outline-none focus:border-amber-500/50
                       placeholder:text-slate-600 remove-arrow"
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2
                           text-slate-500 font-black">%</span>
                                            </div>
                                            <p className="text-[10px] text-slate-600">
                                                Set 0 to remove existing offer
                                            </p>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-black text-slate-400
                          uppercase tracking-wider">
                                                Offer Label
                                            </Label>
                                            <input
                                                placeholder="e.g. Happy Hour, Flash Sale"
                                                value={offerLabel}
                                                onChange={(e) => setOfferLabel(e.target.value)}
                                                className="w-full h-12 bg-slate-800/60 border border-slate-700
                     rounded-xl px-4 text-white font-bold text-sm
                     focus:outline-none focus:border-slate-500
                     placeholder:text-slate-600"
                                            />
                                        </div>
                                    </div>

                                    {/* Price preview */}
                                    {offerDiscount > 0 && currentItem.price! > 0 && (
                                        <div className="flex items-center gap-4 p-4
                      bg-slate-800/40 rounded-xl border border-slate-700/50">
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-black uppercase">
                                                    Original
                                                </p>
                                                <p className="text-base font-black text-slate-400 line-through">
                                                    {formatPriceDisplay(
                                                        (currentItem as any).offer_original_price || currentItem.price!
                                                    )}
                                                </p>
                                            </div>
                                            <span className="text-slate-600 text-xl">→</span>
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-black uppercase">
                                                    Offer Price
                                                </p>
                                                <p className="text-2xl font-black text-green-400">
                                                    {formatPriceDisplay(
                                                        Math.round(
                                                            ((currentItem as any).offer_original_price || currentItem.price!)
                                                            * (1 - offerDiscount / 100)
                                                        )
                                                    )}
                                                </p>
                                            </div>
                                            <div className="ml-auto text-right">
                                                <p className="text-[10px] text-slate-500 font-black uppercase">
                                                    Saves
                                                </p>
                                                <p className="text-lg font-black text-amber-400">
                                                    {formatPriceDisplay(
                                                        Math.round(
                                                            ((currentItem as any).offer_original_price || currentItem.price!)
                                                            * offerDiscount / 100
                                                        )
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Expiry section */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-slate-400
                        uppercase tracking-wider flex items-center gap-2">
                                            <Timer className="w-3.5 h-3.5" />
                                            Offer Expiry (optional)
                                        </Label>
                                        <p className="text-[11px] text-slate-500">
                                            Leave empty for a permanent offer.
                                            Set a time to auto-remove it.
                                        </p>

                                        {/* Quick presets */}
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { label: '2 hours', hours: 2 },
                                                { label: '6 hours', hours: 6 },
                                                { label: 'Tonight', toMidnight: true },
                                                { label: 'Tomorrow', hours: 24 },
                                                { label: '3 days', hours: 72 },
                                                { label: '1 week', hours: 168 },
                                            ].map(preset => (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() => {
                                                        const now = new Date()
                                                        if (preset.toMidnight) {
                                                            now.setHours(23, 59, 0, 0)
                                                        } else {
                                                            now.setTime(now.getTime() + (preset.hours || 0) * 3600000)
                                                        }
                                                        setOfferExpiresAt(
                                                            new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                                                                .toISOString().slice(0, 16)
                                                        )
                                                    }}
                                                    className="px-3 py-1.5 rounded-xl text-xs font-bold
                       bg-slate-800 border border-slate-700
                       text-slate-300 hover:border-orange-500/40
                       hover:text-orange-400 transition-all"
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                            {offerExpiresAt && (
                                                <button
                                                    type="button"
                                                    onClick={() => setOfferExpiresAt('')}
                                                    className="px-3 py-1.5 rounded-xl text-xs font-bold
                       bg-red-500/10 border border-red-500/20
                       text-red-400 hover:bg-red-500/20 transition-all"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>

                                        <input
                                            type="datetime-local"
                                            value={offerExpiresAt}
                                            min={new Date(
                                                Date.now() - new Date().getTimezoneOffset() * 60000
                                            ).toISOString().slice(0, 16)}
                                            onChange={(e) => setOfferExpiresAt(e.target.value)}
                                            className="w-full h-11 bg-slate-800 border border-slate-700
                   rounded-xl px-4 text-white font-bold text-sm
                   focus:outline-none focus:border-orange-500/50"
                                        />

                                        {offerExpiresAt ? (
                                            <p className="text-xs text-orange-400 font-bold flex items-center gap-1.5">
                                                <Timer className="w-3.5 h-3.5" />
                                                Auto-expires {new Date(offerExpiresAt).toLocaleDateString()} at{' '}
                                                {new Date(offerExpiresAt).toLocaleTimeString([], {
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                                <Tag className="w-3.5 h-3.5" />
                                                Permanent offer — will not expire
                                            </p>
                                        )}
                                    </div>

                                    {/* Save button */}
                                    <button
                                        type="button"
                                        onClick={handleSaveOffer}
                                        disabled={offerSaving || !currentItem.id}
                                        className="w-full h-11 bg-orange-500 hover:bg-orange-400
                 disabled:opacity-30 disabled:cursor-not-allowed
                 text-white font-black rounded-xl transition-all
                 flex items-center justify-center gap-2"
                                    >
                                        {offerSaving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : offerDiscount > 0 ? (
                                            <>
                                                <Tag className="w-4 h-4" />
                                                Apply Offer
                                            </>
                                        ) : (
                                            <>
                                                <X className="w-4 h-4" />
                                                Remove Offer
                                            </>
                                        )}
                                    </button>
                                </div>
                            </TabsContent>

                        </div>
                    </Tabs>
                )}

                {/* 4. FOOTER - Fixed at Bottom */}
                {!(selectionMode && !currentItem.item_type) && (
                    <div className="shrink-0 bg-slate-900 border-t border-slate-800 p-5 flex justify-between items-center z-20">
                        <div className="flex items-center gap-3">
                            <Switch checked={currentItem.is_available} onCheckedChange={val => updateCurrentItem({ is_available: val })} />
                            <span className="text-sm font-bold text-slate-300">{currentItem.is_available ? 'Available' : 'Hidden'}</span>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">Cancel</Button>
                            <Button onClick={handleSave} disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 rounded-xl shadow-lg">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Save Dish
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default DishEditorModal;
