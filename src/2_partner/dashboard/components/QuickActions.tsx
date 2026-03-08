// ============================================================
// FILE: QuickActions.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Dashboard par quick action buttons â€” new order, add item, etc.
// ============================================================
// ============================================
// QUICK ACTIONS FLOATING BAR
// ============================================

import { Bell, Edit, QrCode, Menu as MenuIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/shared/ui/badge';

interface QuickActionsBarProps {
    newOrdersCount?: number;
    onMenuEdit?: () => void;
    onQRGenerate?: () => void;
}

export const QuickActionsBar = ({
    newOrdersCount = 0,
    onMenuEdit,
    onQRGenerate
}: QuickActionsBarProps) => {
    const hasNewOrders = newOrdersCount > 0;

    return (
        <>
            {/* CSS for shake animation */}
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                
                @keyframes pulse-glow {
                    0%, 100% { 
                        box-shadow: 0 0 20px rgba(249, 115, 22, 0.4),
                                   0 0 40px rgba(249, 115, 22, 0.2);
                    }
                    50% { 
                        box-shadow: 0 0 30px rgba(249, 115, 22, 0.6),
                                   0 0 60px rgba(249, 115, 22, 0.3);
                    }
                }
                
                .shake-animation {
                    animation: shake 0.5s ease-in-out infinite;
                }
                
                .pulse-glow {
                    animation: pulse-glow 2s ease-in-out infinite;
                }
            `}</style>

            <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
                {/* New Orders Button */}
                <Link
                    to="/dashboard/orders"
                    className="relative group"
                >
                    <button
                        className={`w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-red-500 shadow-lg transition-all flex items-center justify-center hover:scale-110 ${hasNewOrders ? 'shake-animation pulse-glow' : 'shadow-orange-500/50 hover:shadow-xl hover:shadow-orange-500/70'
                            }`}
                    >
                        <Bell className={`w-6 h-6 text-white ${hasNewOrders ? 'animate-pulse' : ''}`} />
                        {newOrdersCount > 0 && (
                            <Badge className="absolute -top-2 -right-2 bg-red-600 text-white px-2 py-0.5 text-xs font-bold animate-bounce border-2 border-white">
                                {newOrdersCount}
                            </Badge>
                        )}
                    </button>
                    <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-zinc-900 text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                        {hasNewOrders ? `${newOrdersCount} New Order${newOrdersCount > 1 ? 's' : ''}! 🔔` : 'Orders'}
                    </span>
                </Link>

                {/* Quick Menu Edit */}
                <button
                    onClick={onMenuEdit || (() => window.location.href = '/dashboard/menu')}
                    className="relative group w-14 h-14 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 shadow-lg shadow-amber-500/50 hover:shadow-xl hover:shadow-amber-500/70 transition-all flex items-center justify-center hover:scale-110"
                >
                    <Edit className="w-6 h-6 text-white" />
                    <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-zinc-900 text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                        Quick Menu Edit
                    </span>
                </button>

                {/* QR Code Generator */}
                <button
                    onClick={onQRGenerate || (() => window.location.href = '/dashboard/qr')}
                    className="relative group w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/70 transition-all flex items-center justify-center hover:scale-110"
                >
                    <QrCode className="w-6 h-6 text-white" />
                    <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-zinc-900 text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                        Generate QR Code
                    </span>
                </button>

                {/* All Actions Menu */}
                <button className="relative group w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/70 transition-all flex items-center justify-center hover:scale-110">
                    <MenuIcon className="w-6 h-6 text-white" />
                    <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-zinc-900 text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                        More Actions
                    </span>
                </button>
            </div>
        </>
    );
};
