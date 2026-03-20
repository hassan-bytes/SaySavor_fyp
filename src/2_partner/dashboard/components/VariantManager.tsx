// ============================================================
// FILE: VariantManager.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Menu item ke variants manage karna — Small, Medium, Large sizes.
// ============================================================
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { toast } from 'sonner';

import { MenuVariant } from '@/shared/types/menu';

export type { MenuVariant };

interface VariantManagerProps {
    variants: MenuVariant[];
    setVariants: (variants: MenuVariant[]) => void;
    basePrice: number;
    formatPrice?: (price: number) => string;
    currencySymbol?: string;
    itemDiscountPercent?: number;
}

interface NewVariantDraft {
    name: string;
    description: string;
    original_price: number;
    price: number;
    discountPercent: number;
    stock_count: number | null;
    is_available: boolean;
    inheritItemOffer: boolean;
}

const EMPTY_VARIANT: NewVariantDraft = {
    name: '',
    description: '',
    original_price: 0,
    price: 0,
    discountPercent: 0,
    stock_count: null,
    is_available: true,
    inheritItemOffer: false,
};

const NO_SPINNER_CLASS = 'remove-arrow [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

const VariantManager: React.FC<VariantManagerProps> = ({
    variants,
    setVariants,
    basePrice,
    formatPrice = (p: number) => p.toLocaleString('en', { maximumFractionDigits: 0 }),
    currencySymbol = '$',
    itemDiscountPercent = 0,
}) => {
    const [isAddingVariant, setIsAddingVariant] = useState(false);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [newVariant, setNewVariant] = useState<NewVariantDraft>(EMPTY_VARIANT);

    const suggestedBasePrice = basePrice > 0 ? Math.round(basePrice) : 0;

    const clampDiscount = (value: number) => Math.min(100, Math.max(0, value));

    const calculateSellingPrice = (fullPrice: number, discountPercent: number): number => {
        if (fullPrice <= 0) return 0;
        return discountPercent > 0
            ? Math.round(fullPrice * (1 - discountPercent / 100))
            : fullPrice;
    };

    const getVariantDiscountPercent = (variant: MenuVariant): number => {
        if (!variant.original_price || variant.original_price <= 0) return 0;
        if (variant.price >= variant.original_price) return 0;
        return Math.round(((variant.original_price - variant.price) / variant.original_price) * 100);
    };

    const handleUpdate = (id: string | undefined, updates: Partial<MenuVariant>) => {
        setVariants(variants.map(v => (v.id === id ? { ...v, ...updates } : v)));
    };

    const handleOriginalPriceChange = (variant: MenuVariant, rawValue: string) => {
        const nextOriginal = parseFloat(rawValue);

        setVariants(variants.map(v => {
            if (v.id !== variant.id) return v;
            if (isNaN(nextOriginal) || nextOriginal <= 0) {
                return { ...v, original_price: null };
            }

            const discount = getVariantDiscountPercent(v);
            return {
                ...v,
                original_price: nextOriginal,
                price: calculateSellingPrice(nextOriginal, discount),
            };
        }));
    };

    const handleVariantDiscountChange = (variant: MenuVariant, rawValue: string) => {
        const parsed = parseFloat(rawValue);
        const discount = clampDiscount(isNaN(parsed) ? 0 : parsed);
        const full = variant.original_price || variant.price || 0;

        if (full <= 0) {
            handleUpdate(variant.id, { price: 0 });
            return;
        }

        handleUpdate(variant.id, {
            original_price: variant.original_price ?? full,
            price: calculateSellingPrice(full, discount),
        });
    };

    const handleNewOriginalPriceChange = (rawValue: string) => {
        const fullPrice = parseFloat(rawValue);
        const normalizedFullPrice = isNaN(fullPrice) ? 0 : fullPrice;
        const discount = newVariant.inheritItemOffer
            ? clampDiscount(itemDiscountPercent)
            : clampDiscount(newVariant.discountPercent || 0);

        setNewVariant({
            ...newVariant,
            original_price: normalizedFullPrice,
            discountPercent: discount,
            price: calculateSellingPrice(normalizedFullPrice, discount),
        });
    };

    const handleNewDiscountChange = (rawValue: string) => {
        const parsed = parseFloat(rawValue);
        const discount = clampDiscount(isNaN(parsed) ? 0 : parsed);
        const full = newVariant.original_price || 0;

        setNewVariant({
            ...newVariant,
            inheritItemOffer: false,
            discountPercent: discount,
            price: calculateSellingPrice(full, discount),
        });
    };

    const handleToggleInheritItemOffer = (val: boolean) => {
        const full = newVariant.original_price || 0;
        const discount = val ? clampDiscount(itemDiscountPercent) : 0;

        setNewVariant({
            ...newVariant,
            inheritItemOffer: val,
            discountPercent: discount,
            price: calculateSellingPrice(full, discount),
        });
    };

    const handleAddVariant = () => {
        if (!newVariant.name) return;
        if (!newVariant.original_price || newVariant.original_price <= 0) {
            toast.error('Please enter a valid Full Price greater than 0');
            return;
        }

        const variantToAdd: MenuVariant = {
            id: `temp-${Date.now()}`,
            name: newVariant.name,
            description: newVariant.description || '',
            original_price: newVariant.original_price,
            price: newVariant.price > 0 ? newVariant.price : newVariant.original_price,
            stock_count: newVariant.stock_count,
            is_available: true,
        };

        const updated = [...variants, variantToAdd];
        setVariants(updated);
        setNewVariant(EMPTY_VARIANT);
        setIsAddingVariant(false);
    };

    const removeVariant = (id: string | undefined) => {
        setVariants(variants.filter(v => v.id !== id));
    };

    const toggleEdit = (variant: MenuVariant, index: number) => {
        if (editingId === variant.id) {
            setEditingId(null);
        } else {
            setEditingId(variant.id || `idx-${index}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <Label className="text-xl font-black text-white tracking-tight">Size Variants</Label>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingVariant(true)}
                    disabled={isAddingVariant}
                    className="h-10 px-4 rounded-xl gap-2 text-amber-500 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500 hover:text-slate-950 transition-all font-bold shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Add Size Option
                </Button>
            </div>

            {variants.length === 0 && !isAddingVariant && (
                <div
                    className="text-center p-12 border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-900/50 group hover:border-amber-500/20 transition-all cursor-pointer"
                    onClick={() => setIsAddingVariant(true)}
                >
                    <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center border border-slate-700 mx-auto mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                        <Plus className="w-8 h-8 text-slate-500 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <p className="text-lg font-black text-white mb-2">No variants defined yet.</p>
                    <p className="text-sm text-slate-400 font-bold max-w-[280px] mx-auto leading-relaxed">
                        Add sizes like "Small", "Regular" or "Large" if this item has multiple price points.
                    </p>
                </div>
            )}

            <div className="space-y-4">
                {variants.map((v, idx) => {
                    const isEditing = editingId === (v.id || `idx-${idx}`);
                    const uniqueId = v.id || `idx-${idx}`;

                    return (
                        <div
                            key={uniqueId}
                            className={`group border rounded-[2rem] overflow-hidden transition-all duration-300 ${
                                isEditing
                                    ? 'border-blue-500/30 bg-slate-900 shadow-xl'
                                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/80 shadow-sm'
                            }`}
                        >
                            {isEditing ? (
                                <div className="p-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1">Variant Name</Label>
                                            <Input
                                                className="bg-slate-800 border-slate-700 text-white rounded-2xl h-12 px-5 font-bold"
                                                placeholder="e.g. Large"
                                                value={v.name}
                                                onChange={(e) => handleUpdate(v.id, { name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1">Measurement / Note</Label>
                                            <Input
                                                className="bg-slate-800 border-slate-700 text-white rounded-2xl h-12 px-5 font-bold"
                                                placeholder="e.g. 12 inches"
                                                value={v.description || ''}
                                                onChange={(e) => handleUpdate(v.id, { description: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1">Full Price ({currencySymbol})</Label>
                                            <Input
                                                type="number"
                                                className={`bg-slate-800 border-slate-700 text-white rounded-2xl h-12 px-5 font-bold ${NO_SPINNER_CLASS}`}
                                                placeholder="0"
                                                value={v.original_price === null || v.original_price === undefined ? '' : v.original_price}
                                                onChange={(e) => handleOriginalPriceChange(v, e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1 text-center block">Discount %</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                className={`bg-green-500/10 border-green-500/20 text-green-500 rounded-2xl h-12 text-center font-black ${NO_SPINNER_CLASS}`}
                                                placeholder="%"
                                                value={getVariantDiscountPercent(v) || ''}
                                                onChange={(e) => handleVariantDiscountChange(v, e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-amber-500/80 font-black tracking-widest ml-1">Selling Price ({currencySymbol})</Label>
                                            <Input
                                                type="number"
                                                className={`bg-amber-500/10 border-amber-500/30 text-amber-500 rounded-2xl h-12 px-5 font-black ${NO_SPINNER_CLASS}`}
                                                placeholder="0"
                                                value={v.price || ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    handleUpdate(v.id, { price: isNaN(val) ? 0 : val });
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1">Stock</Label>
                                            <Input
                                                type="number"
                                                className={`bg-slate-800 border-slate-700 text-white rounded-2xl h-12 px-5 font-bold ${NO_SPINNER_CLASS}`}
                                                placeholder="∞"
                                                value={v.stock_count === null || v.stock_count === undefined ? '' : v.stock_count}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value, 10);
                                                    handleUpdate(v.id, { stock_count: isNaN(val) ? null : val });
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <Button
                                            size="sm"
                                            className="bg-blue-500 hover:bg-blue-400 text-white px-6 h-10 rounded-xl font-black gap-2 transition-all shadow-lg shadow-blue-500/20"
                                            onClick={() => setEditingId(null)}
                                        >
                                            <Check className="w-5 h-5" /> Update Variant
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50 group hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                                            <span className="text-xs font-black text-slate-400">{idx + 1}</span>
                                        </div>
                                        <div>
                                            <p className="font-black text-white text-sm">{v.name}</p>
                                            {v.description && <p className="text-[10px] text-slate-500">{v.description}</p>}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-base font-black text-white">{formatPrice(v.price)}</p>
                                            {v.original_price && v.original_price > v.price && (
                                                <p className="text-[10px] text-slate-500 line-through">{formatPrice(v.original_price)}</p>
                                            )}
                                        </div>

                                        {v.original_price && v.original_price > v.price && (
                                            <span className="text-[9px] font-black text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                                                Save {formatPrice(v.original_price - v.price)} ({getVariantDiscountPercent(v)}%)
                                            </span>
                                        )}

                                        {v.stock_count !== null && v.stock_count !== undefined && (
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                                v.stock_count <= 0
                                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    : v.stock_count <= 5
                                                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                        : 'bg-slate-800 text-slate-400 border-slate-700'
                                            }`}>
                                                {v.stock_count <= 0 ? 'Out' : `${v.stock_count} left`}
                                            </span>
                                        )}

                                        <div className="flex items-center gap-2 mr-2 px-3 py-1.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{v.is_available ? 'Active' : 'Hidden'}</span>
                                            <Switch
                                                checked={v.is_available}
                                                onCheckedChange={(checked) => handleUpdate(v.id, { is_available: checked })}
                                                className="scale-75 data-[state=checked]:bg-green-500"
                                            />
                                        </div>

                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => toggleEdit(v, idx)}
                                                className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => removeVariant(v.id)}
                                                className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {isAddingVariant && (
                    <div className="space-y-4 p-6 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">
                                    Variant Name *
                                </Label>
                                <Input
                                    value={newVariant.name}
                                    onChange={e => setNewVariant({ ...newVariant, name: e.target.value })}
                                    placeholder="e.g. Medium, Large, 500ml"
                                    className="h-11 bg-slate-900 border-slate-700 text-white rounded-xl font-bold"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">
                                    Description (optional)
                                </Label>
                                <Input
                                    value={newVariant.description || ''}
                                    onChange={e => setNewVariant({ ...newVariant, description: e.target.value })}
                                    placeholder="e.g. 12 inches, 500ml"
                                    className="h-11 bg-slate-900 border-slate-700 text-white rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">
                                    Full Price ({currencySymbol})
                                </Label>
                                <Input
                                    type="number"
                                    value={newVariant.original_price || ''}
                                    onChange={e => handleNewOriginalPriceChange(e.target.value)}
                                    placeholder={suggestedBasePrice > 0 ? String(suggestedBasePrice) : '0'}
                                    className={`h-11 bg-slate-900 border-slate-700 text-white font-black rounded-xl text-center ${NO_SPINNER_CLASS}`}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">
                                    Discount %
                                </Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={newVariant.discountPercent || ''}
                                    onChange={e => handleNewDiscountChange(e.target.value)}
                                    disabled={newVariant.inheritItemOffer}
                                    placeholder="0"
                                    className={`h-11 bg-slate-900 border-slate-700 text-green-400 font-black rounded-xl text-center ${NO_SPINNER_CLASS}`}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    Selling Price ({currencySymbol})
                                    <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-black ml-1">
                                        AUTO
                                    </span>
                                </Label>
                                <div className="h-11 bg-slate-800 border border-slate-600 rounded-xl flex items-center px-4 text-amber-400 font-black text-lg">
                                    {newVariant.price > 0
                                        ? formatPrice(newVariant.price)
                                        : <span className="text-slate-600 text-sm font-normal">Set Full Price first</span>}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">
                                Stock Count
                                <span className="text-slate-600 font-normal ml-1">(optional)</span>
                            </Label>
                            <Input
                                type="number"
                                value={newVariant.stock_count ?? ''}
                                onChange={e => setNewVariant({ ...newVariant, stock_count: parseInt(e.target.value, 10) || null })}
                                placeholder="Leave empty for unlimited"
                                className={`h-11 bg-slate-900 border-slate-700 text-white rounded-xl ${NO_SPINNER_CLASS}`}
                            />
                        </div>

                        {itemDiscountPercent > 0 && (
                            <div className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                <div>
                                    <p className="text-xs font-black text-amber-400">
                                        Apply item offer ({itemDiscountPercent}% OFF) to this variant?
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        Automatically applies {itemDiscountPercent}% discount to the full price
                                    </p>
                                </div>
                                <Switch
                                    checked={newVariant.inheritItemOffer}
                                    onCheckedChange={val => handleToggleInheritItemOffer(val)}
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setNewVariant(EMPTY_VARIANT);
                                    setIsAddingVariant(false);
                                }}
                                className="text-slate-400 hover:text-white h-10 px-6 rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddVariant}
                                disabled={!newVariant.name || !newVariant.original_price}
                                className="bg-blue-500 hover:bg-blue-400 text-white font-black h-10 px-8 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add Variant
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VariantManager;
