// ============================================================
// FILE: DealBuilder.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Special deals aur combos banana â€” partner promotions ke liye.
// ============================================================
import React, { useState, useEffect } from 'react';
import {
    Package, Plus, Search, Trash2, X, AlertCircle, Check
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { ScrollArea } from "@/shared/ui/scroll-area";
import { MenuItem, DealItem } from '@/shared/types/menu';
import { DynamicFoodImage } from '@/2_partner/setup/pages/RestaurantSetup';

export type { DealItem };

interface DealBuilderProps {
    existingItems: MenuItem[];
    dealItems: DealItem[];
    setDealItems: (items: DealItem[]) => void;
    originalPrice: number;
    discountPercentage: number | null;
    setDiscountPercentage: (val: number | null) => void;
    offerName: string | null;
    setOfferName: (val: string | null) => void;
    onPriceSync: (price: number) => void;
    formatPrice?: (price: number) => string;
}

const DealBuilder: React.FC<DealBuilderProps> = ({
    existingItems, dealItems, setDealItems, originalPrice,
    discountPercentage, setDiscountPercentage, offerName, setOfferName,
    onPriceSync, formatPrice = (p) => `Rs. ${p.toLocaleString()}`
}) => {
    const [searchTerm, setSearchTerm] = useState("");

    // Filter and Group Items
    const availableItems = existingItems.filter(item =>
        item.item_type !== 'deal' &&
        (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.cuisine?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Group items by category
    const groupedItems = availableItems.reduce((acc, item) => {
        const cat = item.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, MenuItem[]>);

    const categories = Object.keys(groupedItems).sort();

    const addItemToDeal = (item: MenuItem) => {
        const existing = dealItems.find(d => d.item_id === item.id);
        if (existing) {
            setDealItems(dealItems.map(d =>
                d.item_id === item.id ? { ...d, quantity: d.quantity + 1 } : d
            ));
        } else {
            setDealItems([...dealItems, {
                item_id: item.id,
                item_name: item.name,
                original_price: item.price,
                quantity: 1,
                image_url: item.image_url,
                cuisine: item.cuisine,
                category: item.category
            }]);
        }
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setDealItems(dealItems.map(d => {
            if (d.item_id === itemId) {
                const newQty = Math.max(0, d.quantity + delta);
                return { ...d, quantity: newQty };
            }
            return d;
        }).filter(d => d.quantity > 0));
    };

    const removeItemFromDeal = (itemId: string) => {
        setDealItems(dealItems.filter(d => d.item_id !== itemId));
    };


    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
            {/* Left: Item Selector */}
            <div className="flex flex-col h-full border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Label htmlFor="deal-search-items" className="sr-only">Search items to add</Label>
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                        id="deal-search-items"
                        name="dealSearch"
                        placeholder="Search by name, category or cuisine..."
                        className="force-black-input h-8 text-sm w-full border-0 bg-transparent focus:outline-none px-0 text-black placeholder:text-slate-400"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoComplete="off"
                    />
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-6">
                        {categories.map(cat => (
                            <div key={cat} className="space-y-2">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                                    {cat}
                                </h4>
                                <div className="space-y-1">
                                    {groupedItems[cat].map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-2 hover:bg-amber-50 rounded-lg border border-transparent hover:border-amber-100 transition-all group cursor-pointer" onClick={() => addItemToDeal(item)}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                                                    <DynamicFoodImage
                                                        cuisine={item.cuisine || ''}
                                                        category={item.category || ''}
                                                        name={item.name}
                                                        manualImage={item.image_url || null}
                                                        className="w-full h-full"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs font-bold text-amber-600">{formatPrice(item.price)}</p>
                                                        {item.cuisine && (
                                                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                                                                {item.cuisine}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 group-hover:text-amber-600 group-hover:border-amber-200">
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <div className="text-center py-12 flex flex-col items-center gap-2">
                                <Search className="w-8 h-8 text-slate-200" />
                                <p className="text-slate-500 text-sm">No items found matching "{searchTerm}"</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Right: Deal Contents */}
            <div className="flex flex-col h-full bg-amber-50/30 border border-amber-100 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-amber-100 bg-white/50 backdrop-blur-sm">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-600" /> Deal Contents
                    </h3>
                </div>

                <div className="flex-1 p-4 overflow-y-auto">
                    {dealItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 px-6 text-center">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                                <Plus className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-sm font-medium">Select items from the left to build your value meal.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {dealItems.map(item => (
                                <div key={item.item_id} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-amber-100 group animate-in slide-in-from-right-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-7 w-7 flex items-center justify-center rounded-lg bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-600/20">
                                            {item.quantity}x
                                        </div>
                                        <span className="text-sm font-bold text-slate-800">{item.item_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400 line-through mr-1">
                                            {formatPrice(item.original_price * item.quantity)}
                                        </span>
                                        <div className="flex items-center bg-slate-50 rounded-lg border border-slate-100 p-0.5">
                                            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md hover:bg-white text-slate-500" onClick={() => updateQuantity(item.item_id, -1)}>
                                                <div className="w-2.5 h-0.5 bg-current" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md hover:bg-white text-slate-500" onClick={() => updateQuantity(item.item_id, 1)}>
                                                <Plus className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            onClick={() => removeItemFromDeal(item.item_id)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-amber-100 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Deal Discount (%)</Label>
                            <Input
                                type="number"
                                placeholder="e.g. 10"
                                className="h-8 text-sm focus:ring-amber-500"
                                value={discountPercentage || ''}
                                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Offer Name (Optional)</Label>
                            <Input
                                placeholder="e.g. Ramadan Special"
                                className="h-8 text-sm focus:ring-amber-500"
                                value={offerName || ''}
                                onChange={(e) => setOfferName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Value of Items:</span>
                            <span className="font-medium text-slate-500 line-through">{formatPrice(originalPrice)}</span>
                        </div>

                        {(discountPercentage || 0) > 0 && (
                            <div className="flex justify-between items-center text-xs text-green-600 font-medium">
                                <span>Discount ({discountPercentage}%):</span>
                                <span>- {formatPrice(Math.round(originalPrice * (discountPercentage || 0) / 100))}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-1 border-t border-amber-200">
                            <span className="text-sm font-bold text-slate-900">Calculated Deal Price:</span>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-black text-amber-600">
                                    {formatPrice(Math.round(originalPrice * (1 - (discountPercentage || 0) / 100)))}
                                </span>
                                <Button
                                    size="sm"
                                    className="h-7 px-2 text-[10px] bg-amber-600 hover:bg-amber-700 text-white gap-1"
                                    onClick={() => {
                                        const calcPrice = Math.round(originalPrice * (1 - (discountPercentage || 0) / 100));
                                        onPriceSync(calcPrice);
                                    }}
                                >
                                    <Check className="w-3 h-3" /> Sync
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 items-center text-green-700/70 text-[10px] italic px-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Applying a discount makes your deal stand out with a "SALE" badge!</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DealBuilder;
