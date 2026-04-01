// ============================================================
// FILE: OrderFilters.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Orders ko status ke hisaab se filter karna â€” pending, cooking, ready, etc.
// ============================================================
// ============================================
// ORDER FILTERS COMPONENT
// ============================================

import { Package, Clock, ChefHat, CheckCircle, Ban } from 'lucide-react';

export type OrderStatus = 'all' | 'pending' | 'confirmed' | 'cooking' | 'ready' | 'delivered' | 'cancelled';

interface OrderFiltersProps {
    selected: OrderStatus;
    onChange: (status: OrderStatus) => void;
    counts: {
        all: number;
        pending: number;
        confirmed: number;
        cooking: number;
        ready: number;
        delivered: number;
        cancelled: number;
    };
}

export const OrderFilters = ({ selected, onChange, counts }: OrderFiltersProps) => {
    const filters = [
        { value: 'all' as OrderStatus, label: 'All Orders', icon: Package, color: 'zinc' },
        { value: 'pending' as OrderStatus, label: 'Pending', icon: Clock, color: 'orange' },
        { value: 'cooking' as OrderStatus, label: 'Cooking', icon: ChefHat, color: 'purple' },
        { value: 'ready' as OrderStatus, label: 'Ready', icon: CheckCircle, color: 'green' },
        { value: 'delivered' as OrderStatus, label: 'Delivered', icon: CheckCircle, color: 'blue' },
        { value: 'cancelled' as OrderStatus, label: 'Cancelled', icon: Ban, color: 'red' },
    ];

    return (
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {filters.map(({ value, label }) => {
                const count = counts[value];
                const isSelected = selected === value;

                return (
                    <button
                        key={value}
                        onClick={() => onChange(value)}
                        className={`
                            px-6 py-2 rounded-full order-glass-card text-sm font-semibold whitespace-nowrap transition-all duration-300
                            ${isSelected
                                ? 'text-white bg-[var(--primary)]/40 border-[var(--primary)]/40 shadow-[0_0_15px_rgba(212,17,50,0.3)]'
                                : 'text-slate-400 hover:text-white'
                            }
                        `}
                    >
                        {label} {count > 0 && `(${count})`}
                    </button>
                );
            })}
        </div>
    );
};
