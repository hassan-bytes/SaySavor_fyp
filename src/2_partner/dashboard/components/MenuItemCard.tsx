// ============================================================
// FILE: MenuItemCard.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Ek menu item ka card — name, price, image, edit/delete buttons.
//          Ab yeh Variants, Addons, aur precise Stock details show karta hai.
// ============================================================
import React from 'react';
import { Edit2, MoreVertical, Trash2, Tag, Check, Sparkles, RotateCcw, Box, Wand2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Switch } from '@/shared/ui/switch';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { DynamicFoodImage } from '@/2_partner/setup/pages/RestaurantSetup';
import DealMosaicImage from './DealMosaicImage';
import { MenuItem } from '@/shared/types/menu';

export type { MenuItem };

interface MenuItemCardProps {
    item: MenuItem;
    onEdit: (item: MenuItem) => void;
    onDelete: (id: string) => void;
    onToggleAvailability: (item: MenuItem) => void;
    allMenuItems?: MenuItem[]; // Pass the full list for deal enrichment
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
    onClearOffer?: (item: MenuItem) => void;
    onApplyOffer?: (item: MenuItem) => void;
    formatPrice?: (price: number) => string; // Currency formatting function
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
    item, onEdit, onDelete, onToggleAvailability, allMenuItems,
    isSelectionMode, isSelected, onSelect, onClearOffer, onApplyOffer,
    formatPrice = (p: number) => p.toLocaleString('en', { maximumFractionDigits: 0 })
}) => {
    // --- SMART STOCK LOGIC ---
    const variantStock = (item.variants || [])
        .map(v => v.stock_count)
        .filter((s): s is number => typeof s === 'number' && !isNaN(s));

    const hasVariantStock = variantStock.length > 0;
    const totalVariantStock = hasVariantStock ? variantStock.reduce((acc, curr) => acc + curr, 0) : 0;

    const isStockManaged = item.is_stock_managed || hasVariantStock;
    const currentStock = hasVariantStock ? totalVariantStock : (item.stock_count ?? null);

    const isSoldOut = !item.is_available || (isStockManaged && currentStock !== null && currentStock <= 0);
    const isLowStock = isStockManaged && currentStock !== null && currentStock > 0 && currentStock <= (item.low_stock_threshold || 5);

    // --- SMART DISCOUNT LOGIC ---
    const itemDiscount = item.discount_percentage || 0;
    
    const finalPrice = React.useMemo(() => {
        const base = item.price || 0;
        return Math.round(base - (base * (itemDiscount / 100)));
    }, [item.price, itemDiscount]);

    return (
        <div
            onClick={() => isSelectionMode && onSelect?.(item.id)}
            data-item-id={item.id}
            className={`glass-card rounded-2xl overflow-hidden group relative flex flex-col h-full cursor-pointer bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/80 hover:border-amber-500/30 hover:shadow-xl transition-all duration-300 ${isSelected ? 'ring-2 ring-primary shadow-[0_0_20px_rgba(212,17,50,0.4)]' : ''}`}
        >
            {/* Selection Overlay */}
            {isSelectionMode && (
                <div className={`absolute inset-0 z-20 flex items-start justify-end p-4 transition-colors ${isSelected ? 'bg-primary/10' : 'bg-transparent'}`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary shadow-lg shadow-primary/40 scale-110' : 'bg-black/50 border-white/40 backdrop-blur-md'}`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                </div>
            )}

            {/* Image Header with Overlays */}
            <div id={`menu-item-img-container-${item.id}`} className="h-40 w-full bg-slate-950 relative overflow-hidden shrink-0">
                {item.item_type === 'deal' && !item.image_url ? (
                    <DealMosaicImage divId={`deal-mosaic-${item.id}`} items={item.deal_items || []} className="w-full h-full" allMenuItems={allMenuItems} />
                ) : (
                    <DynamicFoodImage
                        cuisine={item.cuisine || undefined}
                        category={item.category || undefined}
                        name={item.name}
                        manualImage={item.image_url}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-90"></div>

                {/* Top-Left Badges (Stock & Offer) */}
                <div className="absolute top-3 left-3 flex flex-col items-start gap-2 z-10">
                    {itemDiscount > 0 && (
                        <Badge className="bg-red-500 text-white font-black px-2 py-0.5 border-none shadow-lg flex items-center gap-1 rounded-md text-[10px]">
                            <Tag className="w-3 h-3" /> {itemDiscount}% OFF
                        </Badge>
                    )}
                    {isStockManaged && (
                        <Badge className={`px-2 py-0.5 border-none shadow-lg font-bold rounded-md flex items-center gap-1 text-[10px] ${
                            isSoldOut ? 'bg-rose-600 text-white' :
                            isLowStock ? 'bg-orange-500 text-white' :
                            'bg-slate-900/80 text-emerald-400 backdrop-blur-md border border-white/10'
                        }`}>
                            <Box className="w-3 h-3" />
                            {isSoldOut ? 'Out of Stock' :
                             isLowStock ? `Low Stock (${currentStock})` :
                             `${currentStock} Left`}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Card Content Body */}
            <div className="p-5 flex-1 flex flex-col gap-3">
                <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <h4 className="text-base font-extrabold text-slate-100 leading-tight truncate mb-1" title={item.name}>
                            {item.name}
                        </h4>
                        {item.category && (
                            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                {item.category}
                            </span>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-lg font-black text-white">{formatPrice(finalPrice)}</div>
                        {itemDiscount > 0 && (
                            <div className="text-[10px] text-slate-500 line-through font-bold">{formatPrice(item.price)}</div>
                        )}
                    </div>
                </div>

                {item.item_type === 'deal' && item.deal_items && item.deal_items.length > 0 ? (
                    <div className="flex-1 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Meal Includes:
                        </p>
                        <ul className="space-y-1">
                            {item.deal_items.slice(0, 3).map((di: any, idx: number) => (
                                <li
                                    key={idx}
                                    className={`text-[10px] text-slate-300 flex justify-between items-center px-2 py-1 rounded border ${
                                        di.is_free
                                            ? 'bg-green-500/5 border-green-500/20'
                                            : 'bg-white/5 border-white/10'
                                    }`}
                                >
                                    <span className="font-medium truncate mr-2">{di.item_name}</span>
                                    <span
                                        className={`font-bold shrink-0 px-1.5 py-0.5 rounded text-[9px] ${
                                            di.is_free
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-purple-500/20 text-purple-400'
                                        }`}
                                    >
                                        {di.is_free ? '🎁 FREE' : `x${di.quantity}`}
                                    </span>
                                </li>
                            ))}
                            {item.deal_items.length > 3 && (
                                <li className="text-[10px] text-slate-500 text-center font-bold pt-1">+{item.deal_items.length - 3} more items</li>
                            )}
                        </ul>
                    </div>
                ) : (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-snug flex-1">
                        {item.description || "No description provided."}
                    </p>
                )}

                {/* Details: Variants & Addons */}
                {(item.variants?.length > 0 || item.modifier_groups?.length > 0) && (
                    <div className="space-y-2 pt-3 border-t border-white/5">
                        {item.variants && item.variants.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Sizes:</span>
                                {item.variants.slice(0, 3).map((v, i) => (
                                    <Badge key={i} variant="outline" className="bg-blue-500/10 border-blue-500/20 text-blue-300 text-[9px] px-1.5 h-4 rounded">
                                        {v.name}: {formatPrice(v.price)}
                                    </Badge>
                                ))}
                                {item.variants.length > 3 && <span className="text-[9px] text-slate-500">+{item.variants.length - 3}</span>}
                            </div>
                        )}
                        
                        {item.modifier_groups && item.modifier_groups.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Add-ons:</span>
                                {item.modifier_groups.flatMap(g => g.modifiers).slice(0, 3).map((m, i) => (
                                    <Badge key={i} variant="outline" className="bg-purple-500/10 border-purple-500/20 text-purple-300 text-[9px] px-1.5 h-4 rounded">
                                        {m.price > 0 ? `${m.name} (+${formatPrice(m.price)})` : `${m.name} (Free)`}
                                    </Badge>
                                ))}
                                {item.modifier_groups.flatMap(g => g.modifiers).length > 3 && <span className="text-[9px] text-slate-500">+{item.modifier_groups.flatMap(g => g.modifiers).length - 3}</span>}
                            </div>
                        )}
                    </div>
                )}

                {/* Bottom Action Footer */}
                <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Switch
                            checked={item.is_available}
                            onCheckedChange={() => onToggleAvailability(item)}
                            className="scale-75 origin-left data-[state=checked]:bg-emerald-500"
                        />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${item.is_available ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {item.is_available ? 'Live' : 'Hidden'}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-400/10">
                            <Wand2 className="w-4 h-4" />
                        </Button>
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 shadow-xl min-w-[160px]">
                                {!itemDiscount ? (
                                    <DropdownMenuItem onClick={() => onApplyOffer?.(item)} className="cursor-pointer hover:bg-slate-800 text-emerald-400 font-bold">
                                        <Tag className="w-4 h-4 mr-2" /> Apply Offer
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => onClearOffer?.(item)} className="cursor-pointer hover:bg-slate-800 text-amber-500 font-bold">
                                        <RotateCcw className="w-4 h-4 mr-2" /> Remove Offer
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => onDelete(item.id)} className="cursor-pointer text-red-400 hover:bg-red-500/10 font-bold mt-1">
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete Dish
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MenuItemCard;
