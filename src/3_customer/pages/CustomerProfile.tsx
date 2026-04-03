// ============================================================
// FILE: CustomerProfile.tsx
// SECTION: 3_customer > pages
// PURPOSE: User profile & Order History.
// ROUTE: /foodie/profile
// ============================================================
import React, { useCallback, useEffect, useState } from 'react';
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
import { supabase } from '@/shared/lib/supabaseClient';
import { toast } from 'sonner';

interface ProfileOrder {
    id: string;
    restaurant_id?: string | null;
    total_amount?: number;
    status?: string;
    order_type?: string | null;
    payment_method?: string | null;
    customer_address?: string | null;
    created_at?: string;
    restaurants?: {
        name?: string | null;
        logo_url?: string | null;
        currency?: string | null;
    } | null;
    order_items?: Array<{
        id?: string;
        item_name?: string | null;
        quantity?: number | null;
        total_price?: number | null;
    }>;
}

interface ProfileSettings {
    orderAlerts: boolean;
    promoAlerts: boolean;
    defaultInstruction: string;
    defaultAddress: string;
    defaultPhone: string;
    hiddenAddresses: string[];
}

const PROFILE_SETTINGS_KEY = 'ss_customer_profile_settings';

const DEFAULT_SETTINGS: ProfileSettings = {
    orderAlerts: true,
    promoAlerts: true,
    defaultInstruction: '',
    defaultAddress: '',
    defaultPhone: '',
    hiddenAddresses: [],
};

const CustomerProfile: React.FC = () => {
    const navigate = useNavigate();
    const { customer, logout, userId, isGuest, isLoading: authLoading } = useCustomerAuth();
    const [orders, setOrders] = useState<ProfileOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRoles, setUserRoles] = useState<string[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [showAddresses, setShowAddresses] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [profileName, setProfileName] = useState('');
    const [profileSettings, setProfileSettings] = useState<ProfileSettings>(DEFAULT_SETTINGS);

    // Fetch user roles from Supabase
    const fetchUserRoles = useCallback(async () => {
        if (!userId) return;
        const { data, error } = await supabase
            .from('user_roles')
            .select('roles(name)')
            .eq('user_id', userId);
        if (!error && data) {
            setUserRoles(data.map((r: any) => r.roles?.name).filter(Boolean));
        }
    }, [userId]);

    const loadProfileData = useCallback(async (options?: { silent?: boolean }) => {
        if (!options?.silent) {
            setLoading(true);
        }

        try {
            const [ordersData] = await Promise.all([
                customerOrderService.getMyOrders(),
                fetchUserRoles(),
            ]);

            setOrders(Array.isArray(ordersData) ? (ordersData as ProfileOrder[]) : []);
        } catch (error) {
            console.error('Customer profile data load failed:', error);
            setOrders([]);
        } finally {
            if (!options?.silent) {
                setLoading(false);
            }
        }
    }, [fetchUserRoles]);

    useEffect(() => {
        if (authLoading) return;
        if (!userId) return;
        void loadProfileData();
    }, [authLoading, userId, loadProfileData]);

    useEffect(() => {
        if (authLoading) return;
        if (!userId) {
            navigate('/foodie/auth', { replace: true });
        }
    }, [authLoading, userId, navigate]);

    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`customer-profile-live-${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `customer_id=eq.${userId}`,
            }, () => {
                void loadProfileData({ silent: true });
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'user_roles',
                filter: `user_id=eq.${userId}`,
            }, () => {
                void fetchUserRoles();
            })
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [userId, loadProfileData, fetchUserRoles]);

    useEffect(() => {
        setProfileName(customer?.full_name || '');
    }, [customer?.full_name]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(PROFILE_SETTINGS_KEY);
            if (!saved) return;

            const parsed = JSON.parse(saved) as Partial<ProfileSettings>;
            setProfileSettings({
                orderAlerts: typeof parsed.orderAlerts === 'boolean' ? parsed.orderAlerts : DEFAULT_SETTINGS.orderAlerts,
                promoAlerts: typeof parsed.promoAlerts === 'boolean' ? parsed.promoAlerts : DEFAULT_SETTINGS.promoAlerts,
                defaultInstruction: typeof parsed.defaultInstruction === 'string' ? parsed.defaultInstruction : DEFAULT_SETTINGS.defaultInstruction,
                defaultAddress: typeof parsed.defaultAddress === 'string' ? parsed.defaultAddress : DEFAULT_SETTINGS.defaultAddress,
                defaultPhone: typeof parsed.defaultPhone === 'string' ? parsed.defaultPhone : DEFAULT_SETTINGS.defaultPhone,
                hiddenAddresses: Array.isArray(parsed.hiddenAddresses)
                    ? parsed.hiddenAddresses.filter((address): address is string => typeof address === 'string')
                    : DEFAULT_SETTINGS.hiddenAddresses,
            });
        } catch {
            setProfileSettings(DEFAULT_SETTINGS);
        }
    }, []);

    useEffect(() => {
        if (customer?.phone && !profileSettings.defaultPhone.trim()) {
            setProfileSettings((prev) => ({
                ...prev,
                defaultPhone: customer.phone || '',
            }));
        }
    }, [customer?.phone, profileSettings.defaultPhone]);

    const handleSignOut = async () => {
        if (signingOut) return;

        setSigningOut(true);
        try {
            await logout();
            navigate('/foodie/auth', { replace: true });
        } finally {
            setSigningOut(false);
        }
    };

    const persistProfileSettings = (nextSettings: ProfileSettings) => {
        setProfileSettings(nextSettings);
        localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(nextSettings));
    };

    const syncProfileName = async (nextName: string) => {
        if (!userId || isGuest || !nextName) return;

        const timeoutPromise = new Promise((_, reject) => {
            window.setTimeout(() => reject(new Error('Profile sync timeout')), 5000);
        });

        await Promise.race([
            (supabase.from('profiles') as any)
                .update({ full_name: nextName })
                .eq('id', userId),
            timeoutPromise,
        ]);
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            const normalizedAddress = profileSettings.defaultAddress.trim();
            const normalizedPhone = profileSettings.defaultPhone.trim();
            const digits = normalizedPhone.replace(/\D/g, '');
            const normalizedInstruction = profileSettings.defaultInstruction.trim();

            if (normalizedAddress && normalizedAddress.length < 10) {
                toast.error('Default address should be at least 10 characters.');
                return;
            }

            if (normalizedAddress && !normalizedPhone) {
                toast.error('Add default phone too when using default address.');
                return;
            }

            if (normalizedPhone && (digits.length < 10 || digits.length > 15)) {
                toast.error('Default phone must be 10-15 digits.');
                return;
            }

            const nextSettings: ProfileSettings = {
                ...profileSettings,
                defaultInstruction: normalizedInstruction,
                defaultAddress: normalizedAddress,
                defaultPhone: normalizedPhone,
                hiddenAddresses: profileSettings.hiddenAddresses,
            };

            persistProfileSettings(nextSettings);

            toast.success('Profile settings saved.');

            const nextName = profileName.trim();
            void syncProfileName(nextName).catch((error) => {
                console.warn('Profile name sync skipped:', error);
            });
        } catch (error: any) {
            toast.error(error?.message || 'Unable to save settings.');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleDeleteSavedAddress = (address: string) => {
        const isDefault = profileSettings.defaultAddress.trim() === address;
        const confirmed = window.confirm(
            isDefault
                ? 'This is your default address. Delete it from saved addresses and clear default?'
                : 'Delete this address from saved addresses?'
        );

        if (!confirmed) return;

        const nextHidden = Array.from(new Set([...profileSettings.hiddenAddresses, address]));
        const nextSettings: ProfileSettings = {
            ...profileSettings,
            hiddenAddresses: nextHidden,
            defaultAddress: isDefault ? '' : profileSettings.defaultAddress,
        };

        persistProfileSettings(nextSettings);
        toast.success('Address removed from saved list.');
    };

    const handleResetHiddenAddresses = () => {
        const nextSettings: ProfileSettings = {
            ...profileSettings,
            hiddenAddresses: [],
        };
        persistProfileSettings(nextSettings);
        toast.success('Saved addresses restored.');
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

    const formatOrderDateTime = (value?: string): string => {
        if (!value) return 'Unknown date';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Unknown date';
        return `${date.toLocaleDateString('en-GB')} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    const uniqueRestaurants = new Set(
        orders.map((order) => order.restaurant_id).filter(Boolean)
    );

    const deliveredOrders = orders.filter((order) => String(order.status || '').toLowerCase() === 'delivered');
    const activeOrders = orders.filter((order) => {
        const status = String(order.status || '').toLowerCase();
        return status && status !== 'delivered' && status !== 'cancelled';
    });
    const totalSpend = deliveredOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
    const defaultAddress = profileSettings.defaultAddress.trim();
    const savedAddresses = Array.from(
        new Set(
            [
                ...(defaultAddress ? [defaultAddress] : []),
                ...orders
                    .map((order) => (order.customer_address || '').trim())
                    .filter(Boolean),
            ]
        )
    );
    const visibleSavedAddresses = savedAddresses.filter(
        (address) => !profileSettings.hiddenAddresses.includes(address)
    );

    const displayName = profileName.trim() || customer?.full_name || (customer ? 'Customer' : 'Guest');
    const profileContact = customer ? (customer.phone || customer.email || 'No contact added yet') : 'Guest Mode';

    return (
        <div className="min-h-screen bg-[#0d0500] text-white pb-32">
            
            {/* Header */}
            <header className="p-6 flex items-center justify-between sticky top-0 z-50 bg-[#0d0500]/80 backdrop-blur-xl">
                 <button
                    onClick={() => {
                        if (!signingOut) navigate(-1);
                    }}
                    disabled={signingOut}
                    className="p-2 bg-white/5 rounded-xl disabled:opacity-50"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-black uppercase tracking-tight">Profile</h1>
                <button
                    onClick={() => setShowSettings((prev) => !prev)}
                    className="p-2 bg-white/5 rounded-xl"
                >
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
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{profileContact}</p>
                    
                    {/* Abstract circle decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-10 -mt-10" />
                </div>

                {showSettings && (
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/70">Profile Settings</h3>

                        <div className="space-y-2">
                            <label className="text-[10px] text-white/50 uppercase font-black tracking-widest">Full Name</label>
                            <input
                                value={profileName}
                                onChange={(event) => setProfileName(event.target.value)}
                                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-orange-500/40"
                                placeholder="Enter your name"
                                disabled={isGuest}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-white/50 uppercase font-black tracking-widest">Default Instructions</label>
                            <textarea
                                value={profileSettings.defaultInstruction}
                                onChange={(event) => setProfileSettings((prev) => ({ ...prev, defaultInstruction: event.target.value }))}
                                rows={3}
                                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-orange-500/40 resize-none"
                                placeholder="e.g. Ring bell once, leave at gate"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-white/50 uppercase font-black tracking-widest">Default Delivery Address</label>
                            <textarea
                                value={profileSettings.defaultAddress}
                                onChange={(event) => setProfileSettings((prev) => ({ ...prev, defaultAddress: event.target.value }))}
                                rows={2}
                                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-orange-500/40 resize-none"
                                placeholder="House/Flat, Street, Area, City"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-white/50 uppercase font-black tracking-widest">Default Phone</label>
                            <input
                                value={profileSettings.defaultPhone}
                                onChange={(event) => setProfileSettings((prev) => ({ ...prev, defaultPhone: event.target.value }))}
                                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-orange-500/40"
                                placeholder="+923001234567"
                                type="tel"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={() => setProfileSettings((prev) => ({ ...prev, orderAlerts: !prev.orderAlerts }))}
                                className="p-3 rounded-2xl border text-left"
                                style={{
                                    borderColor: profileSettings.orderAlerts ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.12)',
                                    background: profileSettings.orderAlerts ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                                }}
                            >
                                <p className="text-xs font-black uppercase tracking-widest">Order Alerts</p>
                                <p className="text-[11px] mt-1 text-white/60">{profileSettings.orderAlerts ? 'Enabled' : 'Disabled'}</p>
                            </button>

                            <button
                                onClick={() => setProfileSettings((prev) => ({ ...prev, promoAlerts: !prev.promoAlerts }))}
                                className="p-3 rounded-2xl border text-left"
                                style={{
                                    borderColor: profileSettings.promoAlerts ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.12)',
                                    background: profileSettings.promoAlerts ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                                }}
                            >
                                <p className="text-xs font-black uppercase tracking-widest">Promo Alerts</p>
                                <p className="text-[11px] mt-1 text-white/60">{profileSettings.promoAlerts ? 'Enabled' : 'Disabled'}</p>
                            </button>
                        </div>

                        <button
                            onClick={handleSaveSettings}
                            disabled={savingSettings}
                            className="w-full py-3 rounded-2xl text-sm font-black text-white disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #FF6B35, #E85A24)' }}
                        >
                            {savingSettings ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                )}

                {/* Loyalty / Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center gap-1">
                        <Star className="w-5 h-5 text-yellow-500 mb-1" />
                        <span className="text-lg font-black">{uniqueRestaurants.size}</span>
                        <span className="text-[10px] text-white/40 uppercase font-black">Restaurants</span>
                    </div>
                    <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center gap-1">
                        <Heart className="w-5 h-5 text-red-500 mb-1" />
                        <span className="text-lg font-black">{activeOrders.length}</span>
                        <span className="text-[10px] text-white/40 uppercase font-black">Active Orders</span>
                    </div>
                    <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center gap-1">
                        <Package className="w-5 h-5 text-orange-400 mb-1" />
                        <span className="text-lg font-black">{formatOrderPrice(totalSpend, orders[0]?.restaurants?.currency)}</span>
                        <span className="text-[10px] text-white/40 uppercase font-black">Total Spent</span>
                    </div>
                </div>

                {deliveredOrders.length > 0 && (
                    <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Delivered Orders</p>
                        <p className="text-xl font-black mt-2">{deliveredOrders.length}</p>
                    </div>
                )}

                {/* Order History */}
                <div className="space-y-4">
                    <h3 className="text-white/40 text-[10px] font-black uppercase tracking-widest px-1">Order History</h3>
                    
                    {loading ? (
                        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
                    ) : orders.length === 0 ? (
                        <div className="py-12 p-8 rounded-3xl bg-white/5 border border-white/5 text-center">
                            <Package className="w-10 h-10 text-white/10 mx-auto mb-4" />
                            <p className="text-sm text-white/40 font-bold">No previous orders yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map((o) => (
                                (() => {
                                    const orderItems = Array.isArray(o.order_items) ? o.order_items : [];
                                    const visibleItems = orderItems.slice(0, 2);
                                    const remainingItemsCount = Math.max(orderItems.length - visibleItems.length, 0);

                                    return (
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
                                            <h4 className="font-black text-sm">{o.restaurants?.name || 'Restaurant'}</h4>
                                            <p className="text-[10px] text-white/40 font-bold uppercase">{formatOrderDateTime(o.created_at)}</p>
                                            <p className="text-[10px] text-white/30 font-bold uppercase mt-0.5">Order #{o.id.slice(-6).toUpperCase()}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase ${
                                                    String(o.status).toLowerCase() === 'delivered' ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'
                                                }`}>
                                                    {o.status || 'pending'}
                                                </span>
                                                <span className="text-[10px] font-black text-orange-400">{formatOrderPrice(o.total_amount, o.restaurants?.currency)}</span>
                                            </div>
                                            {(o.order_type || o.payment_method) && (
                                                <p className="text-[10px] text-white/40 font-bold uppercase mt-1">
                                                    {[o.order_type, o.payment_method].filter(Boolean).join(' • ')}
                                                </p>
                                            )}

                                            {visibleItems.length > 0 && (
                                                <p className="text-[10px] text-white/55 font-semibold mt-1">
                                                    {visibleItems.map((item) => `${item.quantity || 1}x ${item.item_name || 'Item'}`).join(', ')}
                                                    {remainingItemsCount > 0 ? ` +${remainingItemsCount} more` : ''}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
                                </motion.div>
                                    );
                                })()
                            ))}
                        </div>
                    )}
                </div>

                {/* Additional Options */}
                <div className="space-y-3">
                    <button
                        onClick={() => setShowAddresses((prev) => !prev)}
                        className="w-full p-5 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4">
                            <MapPin className="w-5 h-5 text-blue-400" />
                            <span className="text-sm font-bold">Saved Addresses</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/20" />
                    </button>

                    {showAddresses && (
                        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                            {visibleSavedAddresses.length === 0 ? (
                                <p className="text-xs text-white/50">No saved addresses yet. Place a delivery order to build your address list.</p>
                            ) : (
                                visibleSavedAddresses.map((address) => (
                                    <div key={address} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm text-white/85">{address}</p>
                                            {defaultAddress && address === defaultAddress && (
                                                <p className="text-[10px] mt-1 text-orange-400 font-black uppercase tracking-widest">Default</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteSavedAddress(address)}
                                            className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))
                            )}

                            {profileSettings.hiddenAddresses.length > 0 && (
                                <button
                                    onClick={handleResetHiddenAddresses}
                                    className="text-[10px] font-black uppercase tracking-widest text-orange-400"
                                >
                                    Restore Deleted Addresses
                                </button>
                            )}
                        </div>
                    )}

                    {customer && (
                        <button 
                            onClick={handleSignOut}
                            disabled={signingOut}
                            className="w-full p-5 rounded-3xl bg-red-500/5 border border-red-500/20 flex items-center gap-4 text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="text-sm font-black uppercase tracking-widest">{signingOut ? 'Signing Out...' : 'Sign Out'}</span>
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
