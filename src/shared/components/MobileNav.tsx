import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ShoppingBag, Utensils, Settings } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export const MobileNav = () => {
    const navItems = [
        { icon: Home, label: 'Home', path: '/dashboard' },
        { icon: ShoppingBag, label: 'Orders', path: '/dashboard/orders' },
        { icon: Utensils, label: 'Menu', path: '/dashboard/menu' },
        { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
    ];

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 pb-safe">
            <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            cn(
                                "flex flex-col items-center justify-center gap-1 transition-all duration-300 w-16",
                                isActive ? "text-amber-500 scale-110" : "text-slate-500 hover:text-slate-300"
                            )
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};
