// ============================================================
// FILE: VariantManager.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Menu item ke variants manage karna — Small, Medium, Large sizes.
// ============================================================
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Sparkles, Percent, Package } from 'lucide-react';
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
                    onClick={() => setIsAdding(true)}
                    disabled={isAdding}
                    className="h-10 px-4 rounded-xl gap-2 text-amber-500 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500 hover:text-slate-950 transition-all font-bold shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Add Size Option
                </Button>
            </div>

            {variants.length === 0 && !isAdding && (
                <div className="text-center p-12 border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-900/50 group hover:border-amber-500/20 transition-all cursor-pointer" onClick={() => setIsAdding(true)}>
                    <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center border border-slate-700 mx-auto mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                        <Plus className="w-8 h-8 text-slate-500 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <p className="text-lg font-black text-white mb-2">No variants defined yet.</p>
                    <p className="text-sm text-slate-400 font-bold max-w-[280px] mx-auto leading-relaxed">Add sizes like "Small", "Regular" or "Large" if this item has multiple price points.</p>
                </div>
            )}

            <div className="space-y-4">
                {variants.map((variant, idx) => {
                    const isEditing = editingId === (variant.id || `idx-${idx}`);
                    const uniqueId = variant.id || `idx-${idx}`;

                    return (
                        <div key={uniqueId} className={`group border rounded-[2rem] overflow-hidden transition-all duration-300 ${isEditing ? 'border-amber-500/30 bg-slate-900 shadow-xl' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/80 shadow-sm'}`}>
                            {isEditing ? (
                                <div className="p-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2 group/field">
                                            <Label htmlFor={`var-name-${uniqueId}`} className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1 group-focus-within/field:text-amber-500 transition-colors">Variant Name</Label>
                                            <Input
                                                id={`var-name-${uniqueId}`}
                                                className="bg-slate-800 border-slate-700 text-white rounded-2xl h-12 px-5 font-bold focus:border-amber-500/50 transition-all"
                                                placeholder="e.g. Large"
                                                value={variant.name}
                                                onChange={(e) => handleUpdate(variant.id, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2 group/field">
                                            <Label htmlFor={`var-desc-${uniqueId}`} className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1 group-focus-within/field:text-amber-500 transition-colors">Measurement / Note</Label>
                                            <Input
                                                id={`var-desc-${uniqueId}`}
                                                className="bg-slate-800 border-slate-700 text-white rounded-2xl h-12 px-5 font-bold focus:border-amber-500/50 transition-all"
                                                placeholder="e.g. 12 inches"
                                                value={variant.description || ''}
                                                onChange={(e) => handleUpdate(variant.id, 'description', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1">Original Price</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    className="bg-slate-800 border-slate-700 text-white rounded-2xl h-12 px-5 font-bold remove-arrow"
                                                    placeholder="0"
                                                    value={variant.original_price === null ? '' : variant.original_price}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        handleUpdate(variant.id, 'original_price', isNaN(val) ? null : val);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1 text-center block">Off %</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    className="bg-green-500/10 border-green-500/20 text-green-500 rounded-2xl h-12 text-center font-black remove-arrow"
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
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-amber-500/80 font-black tracking-widest ml-1">Final Price</Label>
                                            <Input
                                                type="number"
                                                className="bg-amber-500/10 border-amber-500/30 text-amber-500 rounded-2xl h-12 px-5 font-black remove-arrow"
                                                placeholder="0"
                                                value={variant.price || ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    handleUpdate(variant.id, 'price', isNaN(val) ? 0 : val);
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1">Stock</Label>
                                            <Input
                                                type="number"
                                                className="bg-slate-800 border-slate-700 text-white rounded-2xl h-12 px-5 font-bold remove-arrow"
                                                placeholder="∞"
                                                value={variant.stock_count === null ? '' : variant.stock_count}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    handleUpdate(variant.id, 'stock_count', isNaN(val) ? null : val);
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-6 h-10 rounded-xl font-black gap-2 transition-all shadow-lg shadow-amber-500/20" onClick={() => setEditingId(null)}>
                                            <Check className="w-5 h-5" /> Update Variant
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 flex items-center justify-between group/v">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 bg-slate-800 rounded-[1.25rem] flex items-center justify-center border border-slate-700 text-slate-400 group-hover/v:scale-110 group-hover/v:rotate-3 transition-transform shadow-inner">
                                            <Package className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-black text-white text-xl tracking-tight">{variant.name}</h4>
                                                {variant.description && (
                                                    <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-400 text-[10px] font-bold py-0.5 rounded-lg px-2">
                                                        {variant.description}
                                                    </Badge>
                                                )}
                                                {variant.stock_count !== null && (
                                                    <Badge className={`${variant.stock_count <= 5 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'} text-[10px] uppercase font-black px-2 py-0.5 rounded-lg`}>
                                                        {variant.stock_count} LEFT
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-amber-400 font-black text-lg">{currencySymbol} {variant.price}</span>
                                                {variant.original_price && variant.original_price > variant.price && (
                                                    <span className="text-sm text-slate-500 line-through font-bold opacity-60 tracking-tighter">{currencySymbol} {variant.original_price}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 mr-2 px-3 py-1.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{variant.is_available ? 'Active' : 'Hidden'}</span>
                                            <Switch
                                                checked={variant.is_available}
                                                onCheckedChange={(c) => handleUpdate(variant.id, 'is_available', c)}
                                                className="scale-75 data-[state=checked]:bg-green-500"
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => toggleEdit(variant, idx)}
                                            className="w-11 h-11 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all shadow-sm"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(variant.id)}
                                            className="w-11 h-11 rounded-2xl text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all shadow-sm"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Adding New Variant Row */}
                {isAdding && (
                    <div className="p-8 bg-slate-800/40 border-2 border-dashed border-amber-500/20 rounded-[2.5rem] space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-5">
                            <Sparkles className="w-16 h-16 text-amber-500 rotate-12" />
                        </div>
                        <div className="grid grid-cols-2 gap-6 relative z-10">
                            <div className="space-y-2">
                                <Label className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1">New Variant Name</Label>
                                <Input
                                    className="bg-slate-900 border-slate-700 text-white rounded-2xl h-14 px-6 text-lg font-bold focus:border-amber-500 transition-all"
                                    placeholder="e.g. Medium"
                                    value={newVariant.name}
                                    onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1">Measurement (Optional)</Label>
                                <Input
                                    className="bg-slate-900 border-slate-700 text-white rounded-2xl h-14 px-6 text-lg font-bold focus:border-amber-500 transition-all"
                                    placeholder="e.g. 500ml"
                                    value={newVariant.description || ''}
                                    onChange={(e) => setNewVariant({ ...newVariant, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-6 relative z-10">
                            <div className="space-y-2">
                                <Label className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1">Original Price</Label>
                                <Input
                                    type="number"
                                    className="bg-slate-900 border-slate-700 text-white rounded-2xl h-12 px-6 font-bold remove-arrow"
                                    placeholder="0"
                                    value={newVariant.original_price === null ? '' : newVariant.original_price}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setNewVariant({ ...newVariant, original_price: isNaN(val) ? null : val });
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase text-amber-500/80 font-black tracking-widest ml-1">Sales Price</Label>
                                <Input
                                    type="number"
                                    className="bg-amber-500/10 border-amber-500/30 text-amber-500 rounded-2xl h-12 px-6 font-black remove-arrow shadow-[0_0_15px_rgba(245,158,11,0.05)]"
                                    placeholder="Now Rs."
                                    value={newVariant.price || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setNewVariant({ ...newVariant, price: isNaN(val) ? 0 : val });
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1">Initial Stock</Label>
                                <Input
                                    type="number"
                                    className="bg-slate-900 border-slate-700 text-white rounded-2xl h-12 px-6 font-bold remove-arrow"
                                    placeholder="∞"
                                    value={newVariant.stock_count === null ? '' : newVariant.stock_count}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setNewVariant({ ...newVariant, stock_count: isNaN(val) ? null : val });
                                    }}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 relative z-10">
                            <Button variant="ghost" className="h-12 px-8 rounded-2xl text-slate-400 font-bold hover:bg-slate-700 hover:text-white transition-all" onClick={() => setIsAdding(false)}>Cancel</Button>
                            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 h-12 px-10 rounded-2xl font-black gap-2 transition-all shadow-xl shadow-amber-500/20 active:scale-95" onClick={handleAdd}>
                                <Plus className="w-5 h-5" /> Add to Item
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VariantManager;
