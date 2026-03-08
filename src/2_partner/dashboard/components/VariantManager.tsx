// ============================================================
// FILE: VariantManager.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Menu item ke variants manage karna â€” Small, Medium, Large sizes.
// ============================================================
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
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
}

const VariantManager: React.FC<VariantManagerProps> = ({ 
    variants, setVariants, basePrice, 
    formatPrice = (p) => `Rs. ${p.toLocaleString()}`,
    currencySymbol = 'Rs.'
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [newVariant, setNewVariant] = useState<MenuVariant>({
        name: '',
        description: '',
        price: 0,
        original_price: null,
        stock_count: null,
        is_available: true
    });

    const handleAdd = () => {
        if (!newVariant.name.trim()) {
            toast.error("Please enter a Variant Name");
            return;
        }
        if (newVariant.price <= 0) {
            toast.error("Please enter a valid Current Price greater than 0");
            return;
        }

        setVariants([...variants, { ...newVariant, name: newVariant.name.trim(), id: `temp-${Date.now()}` }]);
        setNewVariant({ name: '', description: '', price: 0, original_price: null, stock_count: null, is_available: true });
        setIsAdding(false);
    };

    const handleUpdate = (id: string | undefined, field: keyof MenuVariant, value: any) => {
        setVariants(variants.map(v =>
            v.id === id ? { ...v, [field]: value } : v
        ));
    };

    const handleDelete = (id: string | undefined) => {
        setVariants(variants.filter(v => v.id !== id));
    };

    const toggleEdit = (variant: MenuVariant, index: number) => {
        if (editingId === variant.id) {
            setEditingId(null); // Save (already updating state directly)
        } else {
            setEditingId(variant.id || `idx-${index}`);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Label className="text-base font-semibold text-black">Size Variants</Label>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAdding(true)}
                    disabled={isAdding}
                    className="h-8 gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                >
                    <Plus className="w-3.5 h-3.5" /> Add Size
                </Button>
            </div>

            {variants.length === 0 && !isAdding && (
                <div className="text-center p-6 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                    <p className="text-sm text-black mb-2">No variants added.</p>
                    <p className="text-xs text-slate-700">Add sizes like "Small", "Large" if this item has multiple options.</p>
                </div>
            )}

            <div className="space-y-3">
                {variants.map((variant, idx) => {
                    const isEditing = editingId === (variant.id || `idx-${idx}`);
                    const uniqueId = variant.id || `idx-${idx}`;

                    return (
                        <div key={uniqueId} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                            {isEditing ? (
                                <div className="flex-1 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label htmlFor={`var-name-${uniqueId}`} className="text-[10px] uppercase text-slate-400 font-bold ml-1">Variant Name</Label>
                                            <Input
                                                id={`var-name-${uniqueId}`}
                                                name={`var-name-${uniqueId}`}
                                                className="force-black-input h-8 text-sm bg-white"
                                                placeholder="e.g. Large"
                                                value={variant.name}
                                                onChange={(e) => handleUpdate(variant.id, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor={`var-desc-${uniqueId}`} className="text-[10px] uppercase text-slate-400 font-bold ml-1">Measurement</Label>
                                            <Input
                                                id={`var-desc-${uniqueId}`}
                                                name={`var-desc-${uniqueId}`}
                                                className="force-black-input h-8 text-sm bg-white"
                                                placeholder="e.g. 12 inches"
                                                value={variant.description || ''}
                                                onChange={(e) => handleUpdate(variant.id, 'description', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="space-y-1">
                                            <Label htmlFor={`var-orig-${uniqueId}`} className="text-[10px] uppercase text-slate-400 font-bold ml-1">Original Price</Label>
                                            <Input
                                                id={`var-orig-${uniqueId}`}
                                                name={`var-orig-${uniqueId}`}
                                                type="number"
                                                className="force-black-input h-8 text-sm bg-white border-amber-200"
                                                placeholder="Original"
                                                value={variant.original_price === null ? '' : variant.original_price}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    handleUpdate(variant.id, 'original_price', isNaN(val) ? null : val);
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor={`var-pct-${uniqueId}`} className="text-[10px] uppercase text-slate-400 font-bold ml-1">Off %</Label>
                                            <Input
                                                id={`var-pct-${uniqueId}`}
                                                name={`var-pct-${uniqueId}`}
                                                type="number"
                                                className="force-black-input h-8 text-sm bg-green-50/50 border-green-200 text-green-700 font-bold text-center"
                                                placeholder="%"
                                                value={variant.original_price && variant.original_price > variant.price
                                                    ? Math.round(((variant.original_price - variant.price) / variant.original_price) * 100)
                                                    : ''}
                                                onChange={(e) => {
                                                    const pct = parseFloat(e.target.value);
                                                    if (!isNaN(pct) && pct > 0 && pct < 100 && variant.original_price) {
                                                        const newPrice = Math.round(variant.original_price * (1 - pct / 100));
                                                        handleUpdate(variant.id, 'price', newPrice);
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor={`var-price-${uniqueId}`} className="text-[10px] uppercase text-slate-400 font-bold ml-1">Current Price</Label>
                                            <Input
                                                id={`var-price-${uniqueId}`}
                                                name={`var-price-${uniqueId}`}
                                                type="number"
                                                className="force-black-input h-8 text-sm bg-amber-50/30 border-amber-200 font-bold"
                                                placeholder="Now Rs."
                                                value={variant.price || ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    handleUpdate(variant.id, 'price', isNaN(val) ? 0 : val);
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor={`var-stock-${uniqueId}`} className="text-[10px] uppercase text-slate-400 font-bold ml-1">Stock</Label>
                                            <Input
                                                id={`var-stock-${uniqueId}`}
                                                name={`var-stock-${uniqueId}`}
                                                type="number"
                                                className="force-black-input h-8 text-sm bg-white"
                                                placeholder="Stock"
                                                value={variant.stock_count === null ? '' : variant.stock_count}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    handleUpdate(variant.id, 'stock_count', isNaN(val) ? null : val);
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-1">
                                        <Button size="sm" variant="ghost" className="h-7 px-3 text-green-600 gap-1 hover:bg-green-50" onClick={() => setEditingId(null)}>
                                            <Check className="w-3.5 h-3.5" /> Done
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-black">{variant.name}</span>
                                            {variant.description && (
                                                <span className="text-[10px] text-slate-500 font-medium">({variant.description})</span>
                                            )}
                                            {variant.stock_count !== null && (
                                                <Badge variant="outline" className="text-[10px] h-5 px-1 text-slate-400 border-slate-100">
                                                    {variant.stock_count} left
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="font-black text-xs text-amber-600">{formatPrice(variant.price)}</span>
                                            {variant.original_price && variant.original_price > variant.price && (
                                                <span className="text-[10px] text-slate-400 line-through">{formatPrice(variant.original_price)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Switch
                                            id={`var-avail-${uniqueId}`}
                                            name={`var-avail-${uniqueId}`}
                                            checked={variant.is_available}
                                            onCheckedChange={(c) => handleUpdate(variant.id, 'is_available', c)}
                                            className="scale-75"
                                        />
                                        <div className="h-4 w-px bg-slate-100 mx-1" />
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-300 hover:text-blue-600" onClick={() => toggleEdit(variant, idx)}>
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-300 hover:text-red-600" onClick={() => handleDelete(variant.id)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Add New Row */}
                {isAdding && (
                    <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="new-var-name" className="text-xs font-bold text-slate-600 ml-1">Variant Name</Label>
                                <Input
                                    id="new-var-name"
                                    name="new-var-name"
                                    className="force-black-input h-9 text-sm bg-white"
                                    placeholder="e.g. Medium"
                                    value={newVariant.name}
                                    onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="new-var-desc" className="text-xs font-bold text-slate-600 ml-1">Measurement (Opt)</Label>
                                <Input
                                    id="new-var-desc"
                                    name="new-var-desc"
                                    className="force-black-input h-9 text-sm bg-white"
                                    placeholder="e.g. 1.5 Liters"
                                    value={newVariant.description || ''}
                                    onChange={(e) => setNewVariant({ ...newVariant, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="new-var-orig" className="text-xs font-bold text-slate-600 ml-1">Original Price</Label>
                                <Input
                                    id="new-var-orig"
                                    name="new-var-orig"
                                    type="number"
                                    className="force-black-input h-9 text-sm bg-white border-amber-200"
                                    placeholder="Original"
                                    value={newVariant.original_price === null ? '' : newVariant.original_price}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setNewVariant({ ...newVariant, original_price: isNaN(val) ? null : val });
                                    }}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="new-var-pct" className="text-xs font-bold text-slate-600 ml-1">Off (%)</Label>
                                <Input
                                    id="new-var-pct"
                                    name="new-var-pct"
                                    type="number"
                                    className="force-black-input h-9 text-sm bg-green-50/50 border-green-200 text-green-700 font-bold text-center"
                                    placeholder="%"
                                    value={newVariant.original_price && newVariant.original_price > newVariant.price
                                        ? Math.round(((newVariant.original_price - newVariant.price) / newVariant.original_price) * 100)
                                        : ''}
                                    onChange={(e) => {
                                        const pct = parseFloat(e.target.value);
                                        if (!isNaN(pct) && pct > 0 && pct < 100 && newVariant.original_price) {
                                            const newPrice = Math.round(newVariant.original_price * (1 - pct / 100));
                                            setNewVariant({ ...newVariant, price: newPrice });
                                        }
                                    }}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="new-var-price" className="text-xs font-bold text-slate-600 ml-1">Current Price</Label>
                                <Input
                                    id="new-var-price"
                                    name="new-var-price"
                                    type="number"
                                    className="force-black-input h-9 text-sm bg-amber-50/30 border-amber-200 font-bold"
                                    placeholder="Now Rs."
                                    value={newVariant.price || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setNewVariant({ ...newVariant, price: isNaN(val) ? 0 : val });
                                    }}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="new-var-stock" className="text-xs font-bold text-slate-600 ml-1">Stock (Opt)</Label>
                                <Input
                                    id="new-var-stock"
                                    name="new-var-stock"
                                    type="number"
                                    className="force-black-input h-9 text-sm bg-white"
                                    placeholder="Quantity"
                                    value={newVariant.stock_count === null ? '' : newVariant.stock_count}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setNewVariant({ ...newVariant, stock_count: isNaN(val) ? null : val });
                                    }}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white gap-2 font-bold" onClick={handleAdd}>
                                <Plus className="w-3.5 h-3.5" /> Add to List
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VariantManager;
