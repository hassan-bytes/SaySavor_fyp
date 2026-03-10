// ============================================================
// FILE: DealBuilder.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Special deals aur combos banana — partner promotions ke liye.
// ============================================================
import React, { useState, useEffect } from 'react';
import {
    Package, Plus, Search, Trash2, X, AlertCircle, Check, ArrowRight, Wand2, Sparkles, Minus
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { ScrollArea } from "@/shared/ui/scroll-area";
import { MenuItem, DealItem } from '@/shared/types/menu';
import { toast } from 'sonner';
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[700px] mt-6 bg-slate-950 p-6 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full -ml-32 -mb-32 blur-3xl opacity-50" />

            {/* Left: Item Selector */}
            <div className="flex flex-col h-full bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-xl overflow-hidden relative z-10 transition-all hover:border-slate-700/50">
                <div className="p-8 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-xl text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-inner">
                                <Plus className="w-5 h-5 text-amber-500" />
                            </div>
                            Select Items
                        </h3>
                        <Badge variant="outline" className="bg-slate-800/50 border-slate-700 text-slate-400 font-bold px-3 py-1 rounded-lg">
                            {availableItems.length} Available
                        </Badge>
                    </div>
                    <div className="relative group/search">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/search:text-amber-500 transition-colors" />
                        <input
                            id="deal-search-items"
                            name="dealSearch"
                            placeholder="Search dishes by name or category..."
                            className="w-full bg-slate-800/50 border-slate-800 rounded-2xl h-14 pl-14 pr-6 text-white font-bold placeholder:text-slate-600 focus:bg-slate-800 focus:border-amber-500/50 transition-all shadow-inner outline-none text-lg"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-10">
                        {categories.map(cat => (
                            <div key={cat} className="space-y-4">
                                <div className="flex items-center gap-3 pl-2">
                                    <div className="h-1 w-8 bg-amber-500/30 rounded-full" />
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
                                        {cat}
                                    </h4>
                                </div>
                                <div className="space-y-3">
                                    {groupedItems[cat].map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-4 bg-slate-800/20 hover:bg-slate-800/60 rounded-3xl border border-transparent hover:border-slate-700/50 transition-all group cursor-pointer" onClick={() => addItemToDeal(item)}>
                                            <div className="flex items-center gap-5">
                                                <div className="w-16 h-16 rounded-2xl bg-slate-900 overflow-hidden border border-slate-800 shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-lg">
                                                    <DynamicFoodImage
                                                        cuisine={item.cuisine || ''}
                                                        category={item.category || ''}
                                                        name={item.name}
                                                        manualImage={item.image_url || null}
                                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-lg font-black text-white truncate tracking-tight group-hover:text-amber-400 transition-colors">{item.name}</p>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <p className="text-base font-black text-amber-500/90">{formatPrice(item.price)}</p>
                                                        {item.cuisine && (
                                                            <span className="text-[10px] font-black text-slate-500 bg-slate-800 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-slate-700/50">
                                                                {item.cuisine}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-11 w-11 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 group-hover:text-white group-hover:bg-amber-500 group-hover:border-amber-400 transition-all shadow-xl">
                                                <Plus className="w-6 h-6" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <div className="text-center py-32 flex flex-col items-center gap-6 opacity-40">
                                <Search className="w-16 h-16 text-slate-700" />
                                <p className="text-slate-500 font-black text-xl tracking-tight">No matching dishes found</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Right: Deal Contents */}
            <div className="flex flex-col h-full bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-xl overflow-hidden relative z-10 transition-all hover:border-slate-700/50">
                <div className="p-8 border-b border-slate-800/80 bg-slate-950/50 backdrop-blur-md">
                    <h3 className="font-black text-xl flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-inner">
                                <Package className="w-5 h-5 text-purple-400" />
                            </div>
                            Deal Bundle
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black border-none px-4 py-1.5 rounded-xl shadow-lg shadow-amber-500/10">
                                {dealItems.reduce((acc, i) => acc + i.quantity, 0)} Items Added
                            </Badge>
                        </div>
                    </h3>
                </div>

                <div className="flex-1 p-8 overflow-y-auto bg-slate-900/50 scrollbar-hide">
                    {dealItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 px-10 text-center bg-slate-950/40 rounded-[3rem] border-2 border-dashed border-slate-800 relative group overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Sparkles className="w-20 h-20 text-amber-500" />
                            </div>
                            <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center shadow-2xl mb-8 group-hover:scale-110 transition-transform duration-500 border border-slate-800">
                                <Plus className="w-12 h-12 text-slate-700" />
                            </div>
                            <p className="text-2xl font-black text-white tracking-tight mb-3">Your bundle is empty</p>
                            <p className="text-sm font-bold text-slate-500 leading-relaxed max-w-[280px]">Select delicious items from the left to create a special promotional deal for your customers.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {dealItems.map(item => (
                                <div key={item.item_id} className="flex items-center justify-between bg-slate-800/40 p-5 rounded-3xl border border-slate-800 group animate-in slide-in-from-right-6 duration-500 hover:border-slate-700 transition-all hover:bg-slate-800/80">
                                    <div className="flex items-center gap-5">
                                        <div className="h-14 w-14 flex items-center justify-center rounded-[1.25rem] bg-slate-950 text-amber-400 text-xl font-black shadow-2xl border border-slate-800 group-hover:scale-105 transition-transform">
                                            {item.quantity}<span className="text-[10px] ml-1 opacity-60">X</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-lg font-black text-white group-hover:text-amber-400 transition-colors tracking-tight">{item.item_name}</span>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] mt-1">{formatPrice(item.original_price)} PER UNIT</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center bg-slate-950 rounded-2xl border border-slate-800 p-1.5 shadow-inner">
                                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white font-black transition-all" onClick={() => updateQuantity(item.item_id, -1)}>
                                                <Minus className="w-4 h-4" />
                                            </Button>
                                            <div className="w-px h-6 bg-slate-800 mx-1" />
                                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all" onClick={() => updateQuantity(item.item_id, 1)}>
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-12 w-12 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all border border-transparent hover:border-red-500/20 shadow-sm"
                                            onClick={() => removeItemFromDeal(item.item_id)}
                                        >
                                            <Trash2 className="w-6 h-6" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-10 bg-slate-950 border-t border-slate-800 space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3 group/field">
                            <Label className="text-xs uppercase font-black text-slate-500 tracking-widest ml-1 group-focus-within/field:text-amber-500 transition-colors">Bundle Discount (%)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                className="h-16 text-2xl font-black bg-slate-900 border-slate-800 rounded-2xl focus:bg-slate-900 focus:border-amber-500/50 transition-all shadow-inner px-6 text-white remove-arrow"
                                value={discountPercentage || ''}
                                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-3 group/field">
                            <Label className="text-xs uppercase font-black text-slate-500 tracking-widest ml-1 group-focus-within/field:text-purple-400 transition-colors">Internal Bundle Name</Label>
                            <Input
                                placeholder="e.g. Mega Saver Combo"
                                className="h-16 text-lg font-bold bg-slate-900 border-slate-800 rounded-2xl focus:bg-slate-900 focus:border-purple-500/50 transition-all shadow-inner px-6 text-white"
                                value={offerName || ''}
                                onChange={(e) => setOfferName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-4 relative overflow-hidden group/summary">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover/summary:scale-150 transition-transform duration-700" />

                        <div className="flex justify-between items-center text-sm relative z-10">
                            <span className="text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                                Subtotal
                            </span>
                            <span className="font-black text-slate-500 line-through decoration-slate-600 decoration-2 tracking-tighter">{formatPrice(originalPrice)}</span>
                        </div>

                        {(discountPercentage || 0) > 0 && (
                            <div className="flex justify-between items-center text-sm font-black relative z-10 animate-in fade-in slide-in-from-left-2 transition-all">
                                <span className="text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Bundle Offer ({discountPercentage}%)
                                </span>
                                <span className="text-amber-500 tracking-tighter">- {formatPrice(Math.round(originalPrice * (discountPercentage || 0) / 100))}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-6 border-t border-slate-800 mt-2 relative z-10">
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-1">FINAL BUNDLE PRICE</span>
                                <span className="text-4xl font-black text-white tracking-tight">
                                    {formatPrice(Math.round(originalPrice * (1 - (discountPercentage || 0) / 100)))}
                                </span>
                            </div>
                            <Button
                                size="lg"
                                className="h-16 px-10 bg-amber-500 hover:bg-amber-600 text-slate-950 gap-4 font-black text-xl rounded-2xl shadow-2xl shadow-amber-500/30 active:scale-95 transition-all hover:translate-y-[-2px]"
                                onClick={() => {
                                    const calcPrice = Math.round(originalPrice * (1 - (discountPercentage || 0) / 100));
                                    onPriceSync(calcPrice);
                                    toast.success("Price synchronized to deal total!");
                                }}
                            >
                                <Check className="w-7 h-7 stroke-[3]" /> Sync Price
                            </Button>
                        </div>
                    </div>

                    <div className="flex gap-4 items-center bg-slate-900/50 p-5 rounded-3xl border border-slate-800 text-amber-500/80 text-xs font-bold leading-relaxed relative overflow-hidden group/alert">
                        <div className="absolute left-0 top-0 w-1 h-full bg-amber-500/20" />
                        <AlertCircle className="w-6 h-6 shrink-0 text-amber-500 group-hover:rotate-12 transition-transform" />
                        <span className="tracking-tight">This deal will be showcased on your menu with a premium <span className="text-amber-500 font-black">"VALUE BUNDLE"</span> tag to attract more customers!</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DealBuilder;
