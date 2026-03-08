// ============================================================
// FILE: DashboardComponents.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Dashboard ke reusable small UI components â€” stat cards, badges, etc.
// ============================================================
// ============================================
// TIME RANGE FILTER & OTHER UI COMPONENTS
// ============================================

import { Clock3, Clock, Calendar, Utensils, CheckCircle, Star } from 'lucide-react';

export type TimeRange = '3h' | '5h' | '24h' | '7d' | '15d' | '30d';

interface TimeRangeFilterProps {
    selected: TimeRange;
    onChange: (range: TimeRange) => void;
}

export const TimeRangeFilter = ({ selected, onChange }: TimeRangeFilterProps) => {
    const ranges: { value: TimeRange; label: string; icon: any; desc: string }[] = [
        {
            value: '3h',
            label: '3 Hours',
            icon: Clock3,
            desc: 'Real-time'
        },
        {
            value: '5h',
            label: '5 Hours',
            icon: Clock3,
            desc: 'Shift view'
        },
        {
            value: '24h',
            label: '24 Hours',
            icon: Clock,
            desc: "Today's performance"
        },
        {
            value: '7d',
            label: '7 Days',
            icon: Calendar,
            desc: 'Weekly'
        },
        {
            value: '15d',
            label: '15 Days',
            icon: Calendar,
            desc: 'Bi-weekly'
        },
        {
            value: '30d',
            label: '30 Days',
            icon: Calendar,
            desc: 'Monthly trends'
        }
    ];

    return (
        <div className="flex items-center gap-2 p-1 bg-[var(--dash-surface)] rounded-2xl border border-[var(--dash-border)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-md">
            {ranges.map(({ value, label, icon: Icon, desc }) => (
                <button
                    key={value}
                    onClick={() => onChange(value)}
                    className={`
                        flex items-center gap-3 px-5 py-3 rounded-xl font-medium
                        transition-all duration-300 group relative overflow-hidden
                        ${selected === value
                            ? 'bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_15px_rgba(244,175,37,0.15)]'
                            : 'text-slate-400 hover:text-[var(--foreground)] hover:bg-[var(--dash-surface-hover)] border border-transparent'
                        }
                    `}
                >
                    <Icon className={`w-4 h-4 transition-colors duration-300 ${selected === value ? 'text-[var(--primary)]' : 'group-hover:text-[var(--primary)]'}`} />
                    <div className="flex flex-col items-start z-10">
                        <span className={`text-sm ${selected === value ? 'font-bold' : ''}`}>{label}</span>
                        <span className={`text-xs ${selected === value ? 'text-[var(--primary)]/80 font-bold' : 'text-slate-500 font-medium'}`}>
                            {desc}
                        </span>
                    </div>
                </button>
            ))}
        </div>
    );
};


// ============================================
// TOP ITEMS GRID
// ============================================

interface TopItem {
    id: string;
    name: string;
    image: string;
    orders: number;
    revenue: number;
}

interface TopItemsGridProps {
    items: TopItem[];
    formatPrice?: (price: number) => string;
}

export const TopItemsGrid = ({ items, formatPrice = (p) => `Rs. ${p.toLocaleString()}` }: TopItemsGridProps) => {
    return (
        <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className="dash-glass-panel rounded-2xl p-4 transition-all duration-300 group hover:scale-[1.03] hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)]"
                    >
                        {/* Rank & Trend */}
                        <div className="flex justify-between items-center mb-4">
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border
                                ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white border-yellow-300/50 shadow-[0_0_15px_rgba(244,175,37,0.3)]' : 'bg-[var(--surface-dark-hover)] text-slate-400 border-[var(--border-dark)]'}
                            `}>
                                #{index + 1}
                            </div>
                            {index === 0 && (
                                <div className="flex items-center gap-1 bg-red-900/40 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    <span className="w-1 h-1 rounded-full bg-red-400 animate-ping"></span>
                                    Top Seller
                                </div>
                            )}
                        </div>

                        {/* Image Container */}
                        <div className="relative aspect-video rounded-xl overflow-hidden mb-4 border border-[var(--border-dark)] shadow-inner">
                            <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>

                        {/* Details */}
                        <h4 className="text-white font-bold text-lg mb-3 tracking-tight truncate group-hover:text-[var(--primary)] transition-colors">
                            {item.name}
                        </h4>

                        <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--surface-dark-hover)] rounded-xl border border-[var(--border-dark)] shadow-inner">
                            <div>
                                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-1">Orders</p>
                                <p className="text-white font-bold text-xl leading-none">{item.orders}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-1">Revenue</p>
                                <p className="text-emerald-400 font-bold text-xl leading-none">{formatPrice(item.revenue)}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {items.length === 0 && (
                <div className="dash-glass-panel rounded-2xl p-12 text-center text-slate-500">
                    <p className="font-medium">No sales data available for this period.</p>
                </div>
            )}
        </div>
    );
};


// ============================================
// SUMMARY CARDS WITH EXPLANATIONS
// ============================================

interface SummaryCardProps {
    status: 'pending' | 'cooking' | 'delivered';
    count: number;
    percentage?: number;
}

export const StatusSummaryCard = ({ status, count, percentage }: SummaryCardProps) => {
    const config = {
        pending: {
            label: 'Pending',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/30',
            text: 'text-orange-400',
            glow: 'shadow-[0_0_15px_rgba(249,115,22,0.1)]',
            icon: Clock
        },
        cooking: {
            label: 'Cooking',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/30',
            text: 'text-blue-400',
            glow: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]',
            icon: Utensils
        },
        delivered: {
            label: 'Delivered',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/30',
            text: 'text-emerald-400',
            glow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]',
            icon: CheckCircle
        }
    };

    const { label, bg, border, text, glow, icon: Icon } = config[status];

    return (
        <div className={`p-4 rounded-xl border ${border} ${bg} ${glow} flex items-center justify-between group hover:scale-[1.02] transition-all cursor-pointer`}>
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg} border ${border} ${text} shadow-inner`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{label}</p>
                    <p className={`text-2xl font-bold ${text} tracking-tight`}>{count}</p>
                </div>
            </div>
            {percentage !== undefined && (
                <div className="bg-white/5 px-2 py-1 rounded-md text-[10px] font-bold text-slate-300 border border-white/10">
                    {percentage}%
                </div>
            )}
        </div>
    );
};


export const RatingCard = ({ avgRating, reviewCount }: { avgRating: number; reviewCount: number }) => {
    return (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-transparent border border-[var(--primary)]/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--primary)]/10 rounded-full blur-2xl -mr-8 -mt-8"></div>

            <div className="relative z-10 flex items-center gap-6 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-[var(--surface-dark-hover)] border border-[var(--border-dark)] flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <Star className="w-8 h-8 text-[var(--primary)] drop-shadow-[0_0_10px_rgba(244,175,37,0.5)]" />
                </div>
                <div>
                    <h3 className="text-4xl font-bold text-white tracking-tighter neon-text-primary">{avgRating.toFixed(1)}</h3>
                    <p className="text-[var(--primary)] text-xs font-bold uppercase tracking-widest mt-1 opacity-80">Avg. Rating</p>
                </div>
            </div>

            <div className="relative z-10 bg-[var(--surface-dark-hover)] border border-[var(--border-dark)] rounded-xl p-4 text-center shadow-inner">
                <p className="text-slate-400 text-sm font-medium">
                    Based on <span className="text-white font-bold">{reviewCount}</span> verified reviews
                </p>
                <div className={`mt-2 text-[10px] font-black uppercase tracking-[0.2em] ${avgRating >= 4.5 ? "text-emerald-400" : "text-[var(--primary)]"}`}>
                    {avgRating >= 4.5 ? "Top Rated Restaurant" : "Growing Excellence"}
                </div>
            </div>
        </div>
    );
};
