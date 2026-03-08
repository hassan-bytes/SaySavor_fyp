// ============================================================
// FILE: Charts.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Dashboard ke analytics charts â€” bar, line, pie graphs.
//          Revenue, orders aur popular items ke trends dikhata hai.
// ============================================================
// ============================================
// DASHBOARD CHART COMPONENTS
// ============================================
// Reusable chart components for Partner Dashboard analytics

import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { Info } from 'lucide-react';
import {
    Tooltip as UITooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/shared/ui/tooltip";

// ============================================
// REVENUE TREND CHART
// ============================================
interface RevenueData {
    time: string;
    revenue: number;
}

export const RevenueChart = ({ 
    data, 
    timeRange, 
    formatPrice = (v: number) => `Rs. ${v.toLocaleString()}` 
}: { 
    data: RevenueData[], 
    timeRange: string,
    formatPrice?: (value: number) => string 
}) => {
    const formatXAxis = (value: string) => {
        if (timeRange === '3h' || timeRange === '24h') {
            return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric' });
        }
        return new Date(value).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    };

    return (
        <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="revenueTrendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f4af25" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#f4af25" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                    <XAxis
                        dataKey="time"
                        tickFormatter={formatXAxis}
                        stroke="#94a3b866"
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                        style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                    />
                    <YAxis
                        stroke="#94a3b866"
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => formatPrice(value)}
                        style={{ fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#111827',
                            border: '1px solid #ffffff14',
                            borderRadius: '12px',
                            color: '#fff',
                            backdropFilter: 'blur(8px)'
                        }}
                        itemStyle={{ color: '#f4af25' }}
                        cursor={{ stroke: '#f4af25', strokeWidth: 1, strokeDasharray: '4 4' }}
                        formatter={(value: number) => [formatPrice(value), 'Revenue']}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                    />
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#f4af25"
                        strokeWidth={3}
                        fill="url(#revenueTrendGrad)"
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};


// ============================================
// ORDER VOLUME CHART
// ============================================
interface OrderData {
    time: string;
    pending: number;
    cooking: number;
    delivered: number;
}

export const OrderVolumeChart = ({ data, timeRange }: { data: OrderData[], timeRange: string }) => {
    const formatXAxis = (value: string) => {
        if (timeRange === '3h' || timeRange === '24h') {
            return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric' });
        }
        return new Date(value).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    };

    return (
        <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                    <XAxis
                        dataKey="time"
                        tickFormatter={formatXAxis}
                        stroke="#94a3b866"
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                        style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                    />
                    <YAxis stroke="#94a3b866" axisLine={false} tickLine={false} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#111827',
                            border: '1px solid #ffffff14',
                            borderRadius: '12px',
                            color: '#fff',
                            backdropFilter: 'blur(8px)'
                        }}
                        cursor={{ fill: '#ffffff05' }}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold' }} />
                    <Bar dataKey="pending" fill="#f4af25" name="Pending" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cooking" fill="#3b82f6" name="Cooking" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="delivered" fill="#10b981" name="Delivered" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};


// ============================================
// PEAK HOURS CHART
// ============================================
interface PeakHourData {
    hour: number;
    orders: number;
}

export const PeakHoursChart = ({ data }: { data: PeakHourData[] }) => {
    const formatHour = (hour: number) => {
        const suffix = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}${suffix}`;
    };

    return (
        <div className="w-full h-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <defs>
                        <linearGradient id="peakHoursGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f4af25" stopOpacity={0.9} />
                            <stop offset="95%" stopColor="#f4af25" stopOpacity={0.2} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                    <XAxis
                        dataKey="hour"
                        tickFormatter={formatHour}
                        stroke="#94a3b866"
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                        style={{ fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <YAxis stroke="#94a3b866" axisLine={false} tickLine={false} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#111827',
                            border: '1px solid #ffffff14',
                            borderRadius: '12px',
                            color: '#fff',
                            backdropFilter: 'blur(8px)'
                        }}
                        formatter={(value: number) => [value.toFixed(1), 'Avg Orders']}
                        labelFormatter={(label) => formatHour(label as number)}
                    />
                    <Bar dataKey="orders" fill="url(#peakHoursGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
