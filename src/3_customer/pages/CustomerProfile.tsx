// ============================================================
// FILE: CustomerProfile.tsx
// SECTION: 3_customer > pages
// PURPOSE: User profile & Order History.
// ROUTE: /foodie/profile
// ============================================================
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    User, Package, Settings, LogOut, 
    ChevronRight, Star, Heart, MapPin,
    ArrowLeft, Loader2
} from 'lucide-react';
import { useCustomerAuth } from '@/3_customer/context/CustomerAuthContext';
import { customerOrderService } from '@/3_customer/services/customerOrderService';
import { COUNTRY_CURRENCIES } from '@/shared/lib/currencyUtils';
import { BecomePartnerButton } from '@/3_customer/components/BecomePartnerButton';

const CustomerProfile: React.FC = () => {
    const navigate = useNavigate();
    const { customer, logout, userId } = useCustomerAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRoles, setUserRoles] = useState<string[]>([]);

    // Fetch user roles from Supabase
    const fetchUserRoles = async () => {
        if (!userId) return;
        const { data, error } = await supabase
            .from('user_roles')
            .select('roles(name)')
            .eq('user_id', userId);
        if (!error && data) {
            setUserRoles(data.map((r: any) => r.roles?.name).filter(Boolean));
        }
    };

    useEffect(() => {
        fetchUserRoles();
    }, [userId]);

    const handleSignOut = async () => {
        await logout();
        navigate('/foodie/home');
    };

    const formatOrderPrice = (amount: number, currencyCode?: string | null): string => {
        const savedCurrency = currencyCode || 'PKR';
        const currencyInfo = Object.values(COUNTRY_CURRENCIES).find(
            c => c.code === savedCurrency
        ) ?? Object.values(COUNTRY_CURRENCIES).find(
            c => c.code === 'PKR'
        );
        const symbol = currencyInfo?.symbol ?? 'PKR';
        return `${symbol}\u00A0${amount.toLocaleString('en', { maximumFractionDigits: 0 })}`;
    };

    const uniqueRestaurants = new Set(
        orders.map((order) => order.restaurant_id).filter(Boolean)
    );
    const displayName = customer?.full_name || (customer ? 'Customer' : 'Guest');

    return (
        <div className="min-h-screen bg-[#0d0500] text-white pb-32">
            
            {/* Header */}
            <header className="p-6 flex items-center justify-between sticky top-0 z-50 bg-[#0d0500]/80 backdrop-blur-xl">
                 <button onClick={() => navigate(-1)} className="p-2 bg-white/5 rounded-xl">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-black uppercase tracking-tight">Profile</h1>
                <button className="p-2 bg-white/5 rounded-xl">
                    <Settings className="w-5 h-5" />
                </button>
            </header>

            <main className="max-w-2xl mx-auto px-6 space-y-8">
                
                {/* User Info Card */}
                <div className="p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col items-center text-center" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="w-24 h-24 rounded-full bg-orange-500/10 flex items-center justify-center mb-4 border border-orange-500/20">
                         {customer?.avatar_url ? (
                             <img src={customer.avatar_url} className="w-full h-full rounded-full object-cover" alt="p" />
                         ) : (
                             <User className="w-10 h-10 text-orange-500" />
                         )}
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">{displayName}</h2>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{customer ? (customer.phone || customer.email) : 'Guest Mode'}</p>
                    
                    {/* Abstract circle decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-10 -mt-10" />
                </div>

                {/* Loyalty / Stats Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center gap-1">
                        <Star className="w-5 h-5 text-yellow-500 mb-1" />
                        <span className="text-lg font-black">{uniqueRestaurants.size}</span>
                        <span className="text-[10px] text-white/40 uppercase font-black">Restaurants Tried</span>
                    </div>
                    <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center gap-1">
                        <Heart className="w-5 h-5 text-red-500 mb-1" />
                        <span className="text-lg font-black">{orders.length}</span>
                        <span className="text-[10px] text-white/40 uppercase font-black">Foodie Trips</span>
                    </div>
                </div>

                {/* Order History */}
                <div className="space-y-4">
                    <h3 className="text-white/40 text-[10px] font-black uppercase tracking-widest px-1">Order History</h3>
                    
                    {loading ? (
                        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
                    ) : orders.length === 0 ? (
                        <div className="py-12 p-8 rounded-3xl bg-white/5 border border-white/5 text-center">
                            <Package className="w-10 h-10 text-white/10 mx-auto mb-4" />
                            <p className="text-sm text-white/40 font-bold">Koi previous orders nahi hain.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map((o: any) => (
                                <motion.div 
                                    key={o.id}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate(`/foodie/track/${o.id}`)}
                                    className="p-5 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between group transition-all hover:bg-white/[0.08]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-orange-500/5 overflow-hidden border border-white/10 flex items-center justify-center">
                                            {o.restaurants?.logo_url ? (
                                                <img src={o.restaurants.logo_url} className="w-full h-full object-cover" alt="r" />
                                            ) : (
                                                <Package className="w-6 h-6 text-orange-500/60" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-sm">{o.restaurants?.name}</h4>
                                            <p className="text-[10px] text-white/40 font-bold uppercase">{new Date(o.created_at).toLocaleDateString('en-GB')}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase ${
                                                    o.status === 'delivered' ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'
                                                }`}>
                                                    {o.status}
                                                </span>
                                                <span className="text-[10px] font-black text-orange-400">{formatOrderPrice(o.total_amount, o.restaurants?.currency)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Additional Options */}
                <div className="space-y-3">
                    <button className="w-full p-5 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <MapPin className="w-5 h-5 text-blue-400" />
                            <span className="text-sm font-bold">Saved Addresses</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/20" />
                    </button>
                    {customer && (
                        <button 
                            onClick={handleSignOut}
                            className="w-full p-5 rounded-3xl bg-red-500/5 border border-red-500/20 flex items-center gap-4 text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="text-sm font-black uppercase tracking-widest">Sign Out</span>
                        </button>
                    )}
                </div>

                {/* Become a Partner Button */}
                {userId && (
                  <BecomePartnerButton
                    userId={userId}
                    userRoles={userRoles}
                    refreshUserRoles={fetchUserRoles}
                  />
                )}
            </main>
        </div>
    );
};

export default CustomerProfile;
