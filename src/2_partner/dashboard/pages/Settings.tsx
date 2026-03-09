// ============================================================
// FILE: Settings.tsx
// SECTION: 2_partner > dashboard > pages
// PURPOSE: Advanced 3D Command Center for Restaurant Configuration.
//          Features high-perspective mobile mirror and secure "Fortress" styling.
// ROUTE: /dashboard/settings
// ============================================================
import React, { useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Save, Store, Upload, Phone, Clock, Mail, Lock,
    Utensils, Plus, ArrowRight, Languages, Coins, Globe,
    Shield, AlertTriangle, ChevronDown, MapPin, Search, Maximize2, Zap
} from 'lucide-react';
import { useLanguage, Language, languageLabels } from '@/shared/contexts/LanguageContext';
import { MenuItem } from '@/shared/types/menu';
import { COUNTRY_CURRENCIES, getCurrencyFromPhone, CurrencyInfo } from '@/shared/lib/currencyUtils';

interface Restaurant {
    id: string;
    owner_id: string;
    name: string | null;
    phone: string | null;
    address: string | null;
    opens_at: string | null;
    closes_at: string | null;
    logo_url: string | null;
    currency: string | null;
}

// Build currency options for the dropdown
const CURRENCY_OPTIONS = Object.entries(COUNTRY_CURRENCIES).map(([country, info]) => ({
    code: info.code,
    symbol: info.symbol,
    label: `${info.code} (${info.symbol}) - ${country}`
}));
// Remove duplicates by code
const uniqueCurrencyOptions = CURRENCY_OPTIONS.filter(
    (opt, idx, arr) => arr.findIndex(o => o.code === opt.code) === idx
);

const convertTo24Hour = (timeStr: string) => {
    if (!timeStr || !timeStr.match(/am|pm/i)) return timeStr;
    const [time, modifier] = timeStr.trim().split(/\s+/);
    let [hours, minutes] = time.split(':');
    let h = parseInt(hours, 10);
    if (modifier.toUpperCase() === 'PM' && h < 12) h += 12;
    if (modifier.toUpperCase() === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minutes || '00'}`;
};

const convertTo12Hour = (time24h: string) => {
    if (!time24h || !time24h.includes(':')) return time24h;
    const [hours, minutes] = time24h.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

export default function Settings() {
    const { refreshProfile } = useOutletContext<any>() || {};

    // Core States
    const [themeColor, setThemeColor] = useState('crimson');
    const [restaurantName, setRestaurantName] = useState('');
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Context & Localization
    const { language, setLanguage, t } = useLanguage();

    // DB tracking
    const [restaurantId, setRestaurantId] = useState('');
    const [ownerId, setOwnerId] = useState('');

    // Form States
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [openTime, setOpenTime] = useState('');
    const [closeTime, setCloseTime] = useState('');
    const [currency, setCurrency] = useState<CurrencyInfo>(COUNTRY_CURRENCIES.PK);

    // Security States
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // Menu preview state
    const [previewItem, setPreviewItem] = useState<any>(null);

    const themeStyles: Record<string, any> = {
        crimson: { bg: 'bg-[#d41132]', text: 'text-[#d41132]', glow: 'shadow-[#d41132]/20', border: 'border-[#d41132]/30' },
        gold: { bg: 'bg-[#f4af25]', text: 'text-[#f4af25]', glow: 'shadow-[#f4af25]/20', border: 'border-[#f4af25]/30' },
        indigo: { bg: 'bg-indigo-500', text: 'text-indigo-500', glow: 'shadow-indigo-500/20', border: 'border-indigo-500/30' },
    };

    useEffect(() => {
        const fetchSettingsData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                setOwnerId(user.id);
                if (user.email) setEmail(user.email);

                // Meta Settings
                if (user.user_metadata) {
                    if (user.user_metadata.themeColor) setThemeColor(user.user_metadata.themeColor);
                    // Currency from user_metadata is legacy (string), we'll prefer restaurant.currency
                    if (user.user_metadata.dashboardLang) setLanguage(user.user_metadata.dashboardLang as Language);
                }

                // Restaurant Data
                const { data: restaurant } = await supabase
                    .from('restaurants')
                    .select('*')
                    .eq('owner_id', user.id)
                    .single() as { data: Restaurant | null };

                if (restaurant) {
                    setRestaurantId(restaurant.id);
                    setRestaurantName(restaurant.name || '');
                    setPhone(restaurant.phone || '');
                    setAddress(restaurant.address || '');
                    setOpenTime(convertTo24Hour(restaurant.opens_at || ''));
                    setCloseTime(convertTo24Hour(restaurant.closes_at || ''));
                    if (restaurant.logo_url) setLogoPreview(restaurant.logo_url);

                    // Load currency from restaurant table, fallback to phone-derived
                    if (restaurant.currency) {
                        const found = uniqueCurrencyOptions.find(c => c.code === restaurant.currency);
                        if (found) {
                            const countryEntry = Object.entries(COUNTRY_CURRENCIES).find(([_, info]) => info.code === restaurant.currency);
                            setCurrency(countryEntry ? countryEntry[1] : COUNTRY_CURRENCIES.PK);
                        }
                    } else if (restaurant.phone) {
                        const derived = getCurrencyFromPhone(restaurant.phone);
                        if (derived) setCurrency(derived);
                    }

                    const { data: items } = await supabase
                        .from('menu_items')
                        .select('name, price, image_url')
                        .eq('restaurant_id', restaurant.id)
                        .limit(1) as { data: Partial<MenuItem>[] | null };

                    if (items?.[0]) setPreviewItem(items[0]);
                }
            } catch (error) { console.error('Fetch error:', error); }
            finally { setLoading(false); }
        };
        fetchSettingsData();
    }, []);

    const handleSave = async () => {
        if (!restaurantId) return;

        // Final file size check before saving
        if (logoFile && logoFile.size > 1024 * 1024) {
            toast.error("Logo file persists as too large. Please select an image under 1MB.");
            return;
        }

        setSaving(true);
        try {
            let finalLogoUrl = logoPreview;
            if (logoFile) {
                const fileName = `${ownerId}/${uuidv4()}.${logoFile.name.split('.').pop()}`;

                const { data, error: uploadError } = await supabase.storage
                    .from('restaurant-logos')
                    .upload(fileName, logoFile, { upsert: true });

                if (uploadError) {
                    if (uploadError.message.includes("exceeded the maximum allowed size")) {
                        throw new Error("File is too large for the cloud vault. Please use an image under 1MB.");
                    }
                    throw uploadError;
                }

                finalLogoUrl = supabase.storage.from('restaurant-logos').getPublicUrl(fileName).data.publicUrl;
            }

            await (supabase.from('restaurants') as any).update({
                name: restaurantName,
                phone: phone,
                address: address,
                opens_at: convertTo12Hour(openTime),
                closes_at: convertTo12Hour(closeTime),
                logo_url: finalLogoUrl,
                currency: currency.code
            }).eq('id', restaurantId);

            // Update Auth Credentials if changed
            const authUpdates: any = {};
            if (email && email !== (await supabase.auth.getUser()).data.user?.email) {
                authUpdates.email = email;
            }
            if (newPassword) {
                authUpdates.password = newPassword;
            }

            if (Object.keys(authUpdates).length > 0) {
                const { error: authError } = await supabase.auth.updateUser(authUpdates);
                if (authError) throw authError;

                if (authUpdates.email) {
                    toast.info("Email update initiated. Please check both old and new addresses for confirmation links.");
                } else if (authUpdates.password) {
                    toast.success("Security key updated successfully.");
                    setNewPassword('');
                }
            }

            toast.success("Settings saved to the Command Center!");
            if (refreshProfile) refreshProfile();
        } catch (error: any) {
            console.error('Save error:', error);
            toast.error(error.message || "Failed to sync settings.");
        }
        finally { setSaving(false); }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];

            // 1MB Limit
            if (file.size > 1024 * 1024) {
                toast.error("File is too large! Maximum limit is 1MB for Neural Assets.");
                return;
            }

            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteRestaurant = async () => {
        if (!restaurantId) return;

        const confirmText = "WARNING: This action is irreversible. All menu items, settings, and restaurant data will be PERMANENTLY DELETED. Do you want to proceed?";
        if (!window.confirm(confirmText)) return;

        setSaving(true);
        try {
            // 1. Delete all menu items (Database should handle this with CASCADE, but we execute for safety if needed)
            const { error: itemsError } = await supabase
                .from('menu_items')
                .delete()
                .eq('restaurant_id', restaurantId);

            if (itemsError) throw itemsError;

            // 2. Delete the restaurant record
            const { error: restError } = await supabase
                .from('restaurants')
                .delete()
                .eq('id', restaurantId);

            if (restError) throw restError;

            toast.success("Identity erased. Server node decommissioned.");

            // 3. Sign Out and Redirect
            await supabase.auth.signOut();
            window.location.href = '/';
        } catch (error: any) {
            console.error('Deletion error:', error);
            toast.error(error.message || "Failed to erase identity.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-black text-white tracking-[0.5em] animate-pulse">SYNCING NEURAL CENTER...</div>;

    const currentStyles = themeStyles[themeColor] || themeStyles.crimson;

    return (
        <div className="text-slate-900 dark:text-slate-100 font-display min-h-screen relative overflow-x-hidden selection:bg-[var(--primary)]/30">
            {/* Ambient Background Glows - Matches Overview/Orders exactly */}
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] ambient-glow-red pointer-events-none z-0 hidden dark:block"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] ambient-glow-gold pointer-events-none z-0 hidden dark:block"></div>
            <div className="fixed top-[20%] right-[10%] w-[40%] h-[40%] ambient-glow-red opacity-50 pointer-events-none z-0 hidden dark:block"></div>

            <div className="max-w-[1600px] mx-auto pt-10 px-6 lg:px-12">

                {/* Header: Unified Command Center Bar */}
                <header className="flex flex-col md:flex-row justify-between items-center mb-12 sticky top-6 z-[60] order-glass-panel px-10 py-6 rounded-full border border-white/5 shadow-2xl backdrop-blur-3xl">
                    <div className="flex items-center gap-6">
                        <div className={`p-4 rounded-2xl shadow-lg ${currentStyles.bg} ${currentStyles.glow} transition-colors duration-500`}>
                            <Zap className="text-white" size={28} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 lowercase first-letter:uppercase">
                                {t('settings.title')}
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`w-2 h-2 rounded-full ${saving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                                <p className="text-xs font-medium text-slate-400">System Status: {saving ? 'Syncing...' : 'Optimal'}</p>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className={`mt-4 md:mt-0 ${currentStyles.bg} hover:opacity-90 text-white font-black px-12 py-7 rounded-2xl shadow-xl transition-all active:scale-95 text-sm uppercase tracking-widest border-t border-white/20`}
                    >
                        {saving ? "SYNCING..." : <><Save className="mr-2" size={18} /> {t('settings.saveChanges')}</>}
                    </Button>
                </header>

                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-12">

                    {/* LEFT AREA: Advanced Control Panels (7/12) */}
                    <div className="lg:col-span-7 space-y-10">

                        {/* 01. RESTAURANT IDENTITY */}
                        <section className="order-glass-panel p-10 rounded-[2.5rem] border border-white/5 group relative overflow-hidden transition-all hover:border-[var(--primary)]/20 shadow-2xl">
                            <h2 className="text-xl font-bold flex items-center gap-3 mb-10 text-white tracking-tight">
                                <span className="bg-white/5 p-3 rounded-2xl text-slate-400 group-hover:text-[var(--primary)] transition-colors"><Store size={22} /></span>
                                Restaurant Identity
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <div className="relative group/logo w-40 h-40">
                                        <div className="w-full h-full perspective-2000 cursor-pointer">
                                            <div className="absolute inset-0 bg-white/[0.03] rounded-3xl border border-white/10 flex items-center justify-center transition-all group-hover/logo:bg-white/[0.07] group-hover/logo:border-[var(--primary)]/30 overflow-hidden shadow-2xl rotate-3d-mirror">
                                                {logoPreview ? (
                                                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover p-2 rounded-3xl" />
                                                ) : (
                                                    <Upload className="text-white/20" size={32} />
                                                )}
                                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-50" onChange={handleLogoUpload} accept="image/*" />
                                                <div className="absolute inset-0 mirror-reflection opacity-30"></div>
                                            </div>
                                        </div>
                                        <Label className="mt-6 block text-xs font-bold text-slate-500 group-hover/logo:text-white transition-colors text-center lowercase first-letter:uppercase">Update Logo</Label>
                                    </div>

                                    <div>
                                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Entity Name</Label>
                                        <Input
                                            value={restaurantName}
                                            onChange={(e) => setRestaurantName(e.target.value)}
                                            className="h-14 input-glass rounded-2xl font-black text-lg px-6"
                                            placeholder="Enter Brand"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Hotline Number</Label>
                                        <Input
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="h-14 input-glass rounded-2xl font-bold px-6"
                                            placeholder="+92 XXX XXXXXXX"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">HQ Coordinates</Label>
                                        <Input
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            className="h-14 input-glass rounded-2xl font-medium px-6"
                                            placeholder="Street & City"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Active Open</Label>
                                            <Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="h-14 input-glass rounded-2xl font-black text-center" />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Active Close</Label>
                                            <Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="h-14 input-glass rounded-2xl font-black text-center" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 02. UNIFIED LOCALIZATION */}
                        <section className="order-glass-panel p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden group transition-all hover:border-blue-500/20 shadow-2xl">
                            <h2 className="text-xl font-bold flex items-center gap-3 mb-10 text-white tracking-tight">
                                <span className="bg-blue-500/10 p-3 rounded-2xl text-blue-400 group-hover:text-blue-300 transition-colors"><Globe size={22} /></span>
                                Global Localization
                            </h2>
                            <div className="relative group/lang">
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value as Language)}
                                    className="w-full h-16 input-glass rounded-2xl px-8 font-bold text-lg appearance-none cursor-pointer transition-all hover:border-blue-500/30"
                                >
                                    {(Object.keys(languageLabels) as Language[]).map((langKey) => (
                                        <option key={langKey} value={langKey} className="bg-slate-900 text-white">
                                            {languageLabels[langKey].flag} {languageLabels[langKey].name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-3">
                                    <div className="w-[1px] h-6 bg-white/10"></div>
                                    <ChevronDown className="text-slate-500 group-hover/lang:text-blue-400 transition-colors" size={20} />
                                </div>
                            </div>
                        </section>

                        {/* 03. FINANCIAL OPERATIONS */}
                        <section className="order-glass-panel p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden group transition-all hover:border-amber-500/20 shadow-2xl">
                            <h2 className="text-xl font-bold flex items-center gap-3 mb-10 text-white tracking-tight">
                                <span className="bg-amber-500/10 p-3 rounded-2xl text-amber-400 group-hover:text-amber-300 transition-colors"><Coins size={22} /></span>
                                Localized Operations
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Neural Currency</Label>
                                    <div className="relative">
                                        <select
                                            value={currency.code}
                                            onChange={(e) => {
                                                const selected = uniqueCurrencyOptions.find(c => c.code === e.target.value);
                                                if (selected) {
                                                    const countryEntry = Object.entries(COUNTRY_CURRENCIES).find(([_, info]) => info.code === selected.code);
                                                    setCurrency(countryEntry ? countryEntry[1] : COUNTRY_CURRENCIES.PK);
                                                }
                                            }}
                                            className="w-full h-16 input-glass rounded-2xl px-8 font-black text-lg appearance-none cursor-pointer"
                                        >
                                            {uniqueCurrencyOptions.map(opt => (
                                                <option key={opt.code} value={opt.code}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={20} />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 04. THE FORTRESS */}
                        <section className="order-glass-panel p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden group transition-all hover:border-crimson/20 shadow-2xl">
                            <h2 className="text-xl font-bold flex items-center gap-3 mb-10 text-white tracking-tight">
                                <span className="bg-crimson/10 p-3 rounded-2xl text-crimson group-hover:text-crimson/80 transition-colors"><Shield size={22} /></span>
                                Security Center
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Sync Identity (Primary)</Label>
                                    <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 input-glass rounded-2xl font-bold px-6 focus:ring-2 focus:ring-blue-500/40" />
                                </div>
                                <div>
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Neural Key Access</Label>
                                    <Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-14 input-glass rounded-2xl font-black px-6 focus:ring-2 focus:ring-crimson/40" />
                                </div>
                            </div>
                            <div className="mt-10 p-8 border border-crimson/20 bg-crimson/5 rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div>
                                    <p className="text-white font-black text-sm uppercase tracking-tighter">Strategic Danger Zone</p>
                                    <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase max-w-sm">Permanent decommissioning of this server node and erasure of all 3D assets.</p>
                                </div>
                                <Button
                                    onClick={handleDeleteRestaurant}
                                    disabled={saving}
                                    className="bg-crimson/10 hover:bg-crimson/20 text-crimson font-black px-8 py-4 rounded-xl border border-crimson/20 transition-all uppercase text-[10px] tracking-widest"
                                >
                                    {saving ? "ERASING..." : "ERASE IDENTITY"}
                                </Button>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT AREA: 3D Mirror Fixed Perspective (5/12) */}
                    <aside className="lg:col-span-5 relative">
                        <div className="sticky top-36 flex flex-col items-center">

                            <div className="mb-6 bg-white/[0.03] border border-white/10 px-6 py-2 rounded-full text-xs font-bold tracking-tight text-slate-400 shadow-xl backdrop-blur-xl transition-all hover:text-white group">
                                <span className="text-[var(--primary)] group-hover:animate-pulse mr-2">●</span> Live Mirror Preview
                            </div>

                            {/* 3D Phone Chassis */}
                            <div className="relative w-[340px] h-[720px] bg-slate-950 rounded-[3.5rem] p-3 shadow-[0_60px_120px_-20px_rgba(0,0,0,0.8)] ring-4 ring-white/5 rotate-3d-mirror transition-all duration-1000 hover:rotate-y-0 hover:rotate-x-0 hover:scale-[1.02]">

                                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none"></div>

                                {/* Inner Screen Surface */}
                                <div className="w-full h-full bg-[#f8fafc] rounded-[2.8rem] overflow-hidden relative flex flex-col shadow-inner">

                                    {/* Phone Header - Dynamic Theme */}
                                    <div className={`h-48 w-full transition-all duration-700 flex flex-col items-center justify-center relative ${currentStyles.bg}`}>
                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 skew-x-[-20deg] animate-shimmer"></div>

                                        {/* Notch */}
                                        <div className="absolute top-0 w-32 h-6 bg-slate-950 rounded-b-2xl z-20 flex items-center justify-center">
                                            <div className="w-8 h-1 bg-white/10 rounded-full"></div>
                                        </div>

                                        <div className="z-10 w-24 h-24 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center overflow-hidden border border-white/50 transform rotate-[-4deg]">
                                            {logoPreview ? <img src={logoPreview} className="w-full h-full object-cover" alt="Logo" /> : <Store className={currentStyles.text} size={32} />}
                                        </div>
                                        <h3 className="mt-4 text-white font-bold text-xl px-4 truncate tracking-tight drop-shadow-lg lowercase first-letter:uppercase">{restaurantName || 'Luxury Eatery'}</h3>
                                    </div>

                                    {/* App Menu Mockup */}
                                    <div className="flex-1 bg-slate-50 p-6 space-y-5 overflow-hidden">
                                        <div className="flex gap-2 overflow-hidden">
                                            <div className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-tight text-white ${currentStyles.bg}`}>Signature</div>
                                            <div className="px-4 py-2 rounded-xl text-[10px] font-bold tracking-tight text-slate-400 bg-white border border-slate-100">Specials</div>
                                        </div>

                                        <div className="bg-white p-4 rounded-2xl flex gap-4 shadow-sm border border-slate-100">
                                            <div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0">
                                                {previewItem?.image_url ? <img src={previewItem.image_url} alt="Item" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Utensils className="text-slate-300" size={20} /></div>}
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center">
                                                <h4 className="font-bold text-sm text-slate-800 leading-none truncate lowercase first-letter:uppercase">{previewItem ? previewItem.name : 'Angus Truffle Bliss'}</h4>
                                                <p className={`font-bold text-base ${currentStyles.text} mt-2`}>{currency} {previewItem ? previewItem.price : '1,250'}</p>
                                            </div>
                                            <div className={`w-8 h-8 rounded-xl ${currentStyles.bg} flex items-center justify-center text-white`}><Plus size={16} /></div>
                                        </div>

                                        <div className="bg-white p-4 rounded-2xl flex gap-4 shadow-sm border border-slate-100 opacity-30 translate-x-1">
                                            <div className="w-16 h-16 bg-slate-100 rounded-xl"></div>
                                            <div className="flex-1 space-y-2 py-2"><div className="w-full h-2 bg-slate-100 rounded-full"></div><div className="w-2/3 h-2 bg-slate-50 rounded-full"></div></div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[85%]">
                                        <div className={`h-14 ${currentStyles.bg} rounded-2xl shadow-xl flex items-center justify-center text-white font-bold text-xs tracking-tight lowercase first-letter:uppercase`}>
                                            View Menu
                                        </div>
                                    </div>

                                    <div className="absolute inset-0 mirror-reflection pointer-events-none opacity-40"></div>
                                </div>
                            </div>
                        </div>
                    </aside>

                </div>
            </div>
        </div>
    );
}
