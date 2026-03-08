// ============================================================
// FILE: DealMosaicImage.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Deal ka mosaic image â€” multiple item images ek tile mein combine karta hai.
// ============================================================
import React, { memo } from 'react';
import { DynamicFoodImage } from '@/2_partner/setup/pages/RestaurantSetup';
import { Package } from 'lucide-react';
import { DealItem } from '@/shared/types/menu';

interface DealMosaicImageProps {
    items: DealItem[];
    className?: string;
    allMenuItems?: any[]; // For on-the-fly metadata enrichment
    divId?: string; // New prop for export targeting
}

const DealMosaicImage: React.FC<DealMosaicImageProps> = ({ items, className, allMenuItems, divId }) => {
    if (!items || items.length === 0) {
        return (
            <div className={`flex flex-col items-center justify-center bg-slate-100 text-slate-400 ${className}`}>
                <Package className="w-12 h-12 mb-2 opacity-20" />
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-40">Empty Deal</span>
            </div>
        );
    }

    // Determine mosaic layout based on item count
    // We only show up to 4 images
    const displayItems = items.slice(0, 4);
    const count = displayItems.length;

    return (
        <div id={divId} className={`relative grid gap-0.5 bg-white ${className} ${count === 1 ? 'grid-cols-1' :
            count === 2 ? 'grid-cols-2' :
                count === 3 ? 'grid-cols-2' : 'grid-cols-2'
            }`}>
            {displayItems.map((item, idx) => {
                // For 3 items, make the first one span full height/width depending on design
                // Let's do: 1 tall on left, 2 small on right
                const isThreeLayout = count === 3;
                const gridSpan = isThreeLayout && idx === 0 ? 'row-span-2' : '';

                // On-the-fly enrichment if metadata missing
                // Strategy: if no category is provided, use findBestPresetImage's internal folder inference
                const enrichedCuisine = item.cuisine || allMenuItems?.find(i => i.id === item.item_id)?.cuisine || undefined;
                const enrichedCategory = item.category || allMenuItems?.find(i => i.id === item.item_id)?.category || undefined;

                return (
                    <div key={idx} className={`relative overflow-hidden bg-slate-50 ${gridSpan}`}>
                        <DynamicFoodImage
                            cuisine={enrichedCuisine}
                            category={enrichedCategory}
                            name={item.item_name}
                            manualImage={item.image_url}
                            className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all"
                        />
                        {/* Quantity Badge on each mosaic piece */}
                        {item.quantity > 1 && (
                            <div className="absolute bottom-1 right-1 bg-amber-600/90 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                                x{item.quantity}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default memo(DealMosaicImage);
