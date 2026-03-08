// ============================================================
// FILE: MenuItemCard.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Ek menu item ka card â€” name, price, image, edit/delete buttons.
//          MenuManager mein use hota hai.
// ============================================================
import React from 'react';
import { Edit2, MoreVertical, Trash2, GripVertical, Clock, Tag, Check, Sparkles, RotateCcw, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Switch } from '@/shared/ui/switch';
import { Label } from '@/shared/ui/label';
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
    formatPrice = (p) => `Rs. ${p.toLocaleString()}` // Default fallback
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

    const stockStatus = !isStockManaged
        ? 'Unlimited'
        : currentStock === null
            ? 'Unlimited'
            : currentStock <= 0
                ? 'Out of Stock'
                : `${currentStock} left`;

    // Time Formatting
    const formatTime = (timeStr: string | null | undefined) => {
        if (!timeStr) return '';
        // Input: "14:00:00" or "08:30"
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const hasTimeRestriction = item.available_start_time && item.available_end_time;

    // --- SMART DISCOUNT LOGIC ---
    // Calculate the best discount available (either from item or its variants)
    const itemDiscount = item.discount_percentage || 0;
    const variantDiscounts = (item.variants || []).map(v =>
        v.original_price && v.original_price > v.price
            ? ((v.original_price - v.price) / v.original_price) * 100
            : 0
    );
    const maxDiscount = Math.max(itemDiscount, ...variantDiscounts);
    const roundedMaxDiscount = Math.round(maxDiscount);

    return (
        <div
            onClick={() => isSelectionMode && onSelect?.(item.id)}
            data-item-id={item.id}
            className={`glass-card rounded-xl overflow-hidden group relative flex flex-col h-full cursor-pointer ${isSelected ? 'ring-2 ring-primary/80 shadow-[0_0_20px_rgba(212,17,50,0.4)]' : ''}`}
        >
            {/* Selection Overlay */}
            {isSelectionMode && (
                <div className={`absolute inset-0 z-20 flex items-start justify-end p-4 transition-colors ${isSelected ? 'bg-primary/10' : 'bg-transparent'}`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary shadow-lg shadow-primary/40 scale-110' : 'bg-black/50 border-white/40 backdrop-blur-md'}`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                </div>
            )}

            {/* Image Header */}
            <div id={`menu-item-img-container-${item.id}`} className="h-32 w-full bg-[#18080a] relative overflow-hidden shrink-0">
                {item.item_type === 'deal' && !item.image_url ? (
                    <DealMosaicImage divId={`deal-mosaic-${item.id}`} items={item.deal_items || []} className="w-full h-full" allMenuItems={allMenuItems} />
                ) : (
                    <DynamicFoodImage
                        cuisine={item.cuisine || undefined}
                        category={item.category || undefined}
                        name={item.name}
                        manualImage={item.image_url}
                        className="w-full h-full object-cover transition-transform duration-500"
                    />
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#18080a] via-transparent to-transparent opacity-90"></div>

                {/* Status Badges Container */}
            </div>

            {/* Content  - Action buttons moved to footer */}

            {/* Content */}
            <div className="p-3 relative flex-1 flex flex-col gap-2">
                <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                        <div className="flex justify-between items-start gap-2">
                            <h4 className="text-base font-extrabold text-slate-100 transition-colors leading-tight line-clamp-2 mt-0.5" title={item.name}>
                                {item.name}
                            </h4>
                            <div className="flex flex-col items-end shrink-0 pt-0.5">
                                {(() => {
                                    const vs = item.variants?.filter(v => v.price > 0) || [];
                                    if (vs.length > 0) {
                                        const minP = Math.min(...vs.map(v => v.price));
                                        const maxP = Math.max(...vs.map(v => v.price));
                                        const minVar = vs.find(v => v.price === minP);
                                        const hasOffer = (item.original_price && item.original_price > minP) || (minVar?.original_price && minVar.original_price > minVar.price);
                                        const strikethroughPrice = (item.original_price && item.original_price > minP)
                                            ? item.original_price
                                            : minVar?.original_price;

                                        return (
                                            <div className="flex flex-col items-end">
                                                {hasOffer && (
                                                    <span className="text-[10px] text-slate-500 line-through">
                                                        {formatPrice(strikethroughPrice || 0)}
                                                    </span>
                                                )}
                                                <span className="text-xl font-black text-primary leading-none">
                                                    {minP === maxP
                                                        ? formatPrice(minP)
                                                        : `${formatPrice(minP)}+`}
                                                </span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="flex flex-col items-end">
                                            {item.original_price && item.original_price > item.price && (
                                                <span className="text-[10px] text-slate-500 line-through">
                                                    {formatPrice(item.original_price)}
                                                </span>
                                            )}
                                            <span className="text-xl font-black text-primary leading-none">
                                                {formatPrice(item.price)}
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            {item.item_type === 'deal' && (
                                <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 text-[9px] px-1.5 py-0 rounded uppercase tracking-widest font-black">
                                    Meal Deal
                                </Badge>
                            )}
                            {item.category && (
                                <span className="text-[9px] text-primary uppercase font-bold tracking-widest px-2 py-0.5 bg-primary/10 rounded-full truncate max-w-[140px] border border-primary/20">
                                    {item.category}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {item.item_type === 'deal' && item.deal_items && item.deal_items.length > 0 && (
                    <div className="mb-2">
                        <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mb-1">Includes:</p>
                        <ul className="space-y-1">
                            {item.deal_items.map((di: any, idx: number) => (
                                <li key={idx} className="text-[10px] text-slate-300 flex justify-between items-center bg-white/5 border border-white/5 px-1.5 py-1 rounded">
                                    <span className="font-medium truncate mr-2">{di.item_name}</span>
                                    <span className="text-primary font-bold shrink-0 bg-primary/20 px-1 py-0.5 rounded">x{di.quantity}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {item.item_type !== 'deal' && (
                    <p className="text-xs text-slate-400 line-clamp-2 min-h-[2rem] leading-snug">
                        {item.description || "No description provided."}
                    </p>
                )}

                {/* Add-ons / Modifiers Section */}
                {item.modifier_groups && item.modifier_groups.length > 0 && (
                    <div className="mb-2">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Available Add-ons
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {item.modifier_groups.map((group, gIdx) => (
                                <div key={gIdx} className="flex flex-wrap gap-1">
                                    {group.modifiers.map((mod, mIdx) => (
                                        <Badge
                                            key={mIdx}
                                            variant="outline"
                                            className="text-[9px] h-5 bg-white/5 border-white/10 text-slate-300 font-medium px-2"
                                        >
                                            {mod.name} {mod.price > 0 && <span className="text-primary ml-1">(+{mod.price})</span>}
                                        </Badge>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Content & Actions */}
                <div className="mt-auto flex flex-col pt-1 gap-2">
                    {item.offer_name && (
                        <div className="flex items-center gap-1 self-end bg-emerald-500/10 w-fit px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{item.offer_name}</span>
                        </div>
                    )}

                    {/* Action Footer */}
                    <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Switch
                                id={`availability-${item.id}`}
                                checked={!isSoldOut}
                                onCheckedChange={() => onToggleAvailability(item)}
                                className="data-[state=checked]:bg-primary shadow-lg"
                                aria-label="Toggle availability"
                            />
                            <Label
                                htmlFor={`availability-${item.id}`}
                                className={`text-[10px] font-bold uppercase tracking-wider cursor-pointer ${!isSoldOut ? 'text-primary' : 'text-slate-500'}`}
                            >
                                {!isSoldOut ? 'Available' : 'Sold Out'}
                            </Label>
                        </div>

                        <div onClick={(e) => e.stopPropagation()} className="flex">
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        type="button"
                                        size="sm"
                                        className="h-8 gap-1.5 text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-md rounded-lg border border-white/10"
                                    >
                                        <span className="text-xs font-bold">Actions</span>
                                        <MoreVertical className="w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    side="bottom"
                                    sideOffset={4}
                                    className="bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 text-slate-100 rounded-xl overflow-hidden min-w-[180px] z-50 p-1"
                                    onCloseAutoFocus={(e) => e.preventDefault()}
                                >
                                    <DropdownMenuItem
                                        onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                                        className="gap-2 cursor-pointer focus:bg-white/10 transition-colors py-2.5 px-3 font-bold rounded-lg"
                                    >
                                        <Edit2 className="w-4 h-4 text-amber-500" /> Edit Details
                                    </DropdownMenuItem>
                                    {!item.discount_percentage && (
                                        <DropdownMenuItem
                                            onClick={(e) => { e.stopPropagation(); onApplyOffer?.(item); }}
                                            className="gap-2 cursor-pointer text-emerald-400 focus:bg-emerald-500/10 transition-colors py-2.5 px-3 font-bold rounded-lg"
                                        >
                                            <Tag className="w-4 h-4" /> Apply Offer
                                        </DropdownMenuItem>
                                    )}
                                    {item.discount_percentage && (
                                        <DropdownMenuItem
                                            onClick={(e) => { e.stopPropagation(); onClearOffer?.(item); }}
                                            className="gap-2 cursor-pointer text-amber-500 focus:bg-amber-500/10 transition-colors py-2.5 px-3 font-bold rounded-lg"
                                        >
                                            <RotateCcw className="w-4 h-4" /> Remove Offer
                                        </DropdownMenuItem>
                                    )}
                                    <div className="h-px bg-white/10 my-1 mx-2" />
                                    <DropdownMenuItem
                                        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                                        className="text-red-400 gap-2 cursor-pointer focus:bg-red-500/10 transition-colors py-2.5 px-3 font-bold rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete Dish
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MenuItemCard;
