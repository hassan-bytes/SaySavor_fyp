// ============================================================
// FILE: Cart.tsx  (ENHANCED)
// SECTION: 3_customer > pages
// PURPOSE: Checkout review page — item listing + quantity update
//          + promo code + item notes + empty state + UX polish.
// ROUTE: /foodie/cart
// ============================================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Trash2, Plus, Minus,
    ShoppingBag, ChevronRight, MapPin,
    Clock, ShieldCheck, Tag, X,
    ChevronDown, MessageSquare
} from 'lucide-react';
import { useCart } from '@/3_customer/context/CartContext';
import { supabase } from '@/shared/lib/supabaseClient';
import { COUNTRY_CURRENCIES } from '@/shared/lib/currencyUtils';
import { toast } from 'sonner';

// ── Valid promo codes (demo — real ones come from DB) ─────────
const PROMO_CODES: Record<string, { discount: number; type: 'flat' | 'percent'; label: string }> = {
    'SAVOR50': { discount: 50, type: 'percent', label: '50% OFF (First Order)' },
    'FREE50': { discount: 50, type: 'flat', label: 'Rs. 50 OFF' },
    'WELCOME': { discount: 100, type: 'flat', label: 'Rs. 100 Welcome Discount' },
};

const CartPage: React.FC = () => {
    const navigate = useNavigate();
    const {
        cartItems,
        removeFromCart,
        updateQuantity,
        totalAmount,
        totalCount,
        clearCart,
        currentRestaurantId
    } = useCart();

    const [currencySymbol, setCurrencySymbol] = useState('PKR');
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<null | typeof PROMO_CODES[string] & { code: string }>(null);
    const [promoError, setPromoError] = useState('');
    const [showPromo, setShowPromo] = useState(false);
    const [expandedItem, setExpandedItem] = useState<number | null>(null);
    const [itemNotes, setItemNotes] = useState<Record<number, string>>({});

    // Load currency
    React.useEffect(() => {
        const loadCurrency = async () => {
            if (!currentRestaurantId) return;
            const { data } = await supabase
                .from('restaurants').select('currency').eq('id', currentRestaurantId).maybeSingle();
            const savedCurrency = (data as any)?.currency || 'PKR';
            const info = Object.values(COUNTRY_CURRENCIES).find(c => c.code === savedCurrency)
                ?? Object.values(COUNTRY_CURRENCIES).find(c => c.code === 'PKR');
            setCurrencySymbol(info?.symbol ?? 'PKR');
        };
        loadCurrency();
    }, [currentRestaurantId]);

    const formatPrice = (price: number) =>
        `${currencySymbol}\u00A0${price.toLocaleString('en', { maximumFractionDigits: 0 })}`;

    // ── Promo calculation ────────────────────────────────────
    const applyPromo = () => {
        setPromoError('');
        const code = promoCode.trim().toUpperCase();
        const found = PROMO_CODES[code];
        if (!found) {
            setPromoError('Invalid promo code. Try SAVOR50, FREE50, or WELCOME');
            return;
        }
        setAppliedPromo({ ...found, code });
        toast.success(`✅ Promo applied: ${found.label}`);
        setPromoCode('');
        setShowPromo(false);
    };

    const promoDiscount = appliedPromo
        ? appliedPromo.type === 'percent'
            ? Math.round(totalAmount * appliedPromo.discount / 100)
            : Math.min(appliedPromo.discount, totalAmount)
        : 0;

    const deliveryFee = totalAmount > 0 ? 50 : 0;
    const tax = Math.round(totalAmount * 0.05);
    const finalTotal = totalAmount + deliveryFee + tax - promoDiscount;

    // ── Empty cart state ─────────────────────────────────────
    if (totalCount === 0) {
        return (
            <div className="min-h-screen bg-[#0d0500] flex flex-col items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mb-8"
                >
                    <div className="w-28 h-28 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-6 border border-orange-500/20">
                        <ShoppingBag className="w-12 h-12 text-orange-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Cart is Empty!</h2>
                    <p className="text-white/40 max-w-xs mx-auto leading-relaxed">
                        Abhi tak koi item add nahi kiya gaya. Kuch lazeez dishes explore karein!
                    </p>
                </motion.div>
                <button
                    onClick={() => navigate('/foodie/home')}
                    className="px-8 py-4 rounded-2xl bg-orange-500 text-white font-black shadow-xl shadow-orange-500/20 active:scale-95 transition-transform"
                >
                    Explore Restaurants →
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d0500] text-white pb-36">

            {/* Header */}
            <header className="sticky top-0 z-50 p-4 bg-[#0d0500]/90 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-transform"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                        <h1 className="text-lg font-black tracking-tight">Your Cart</h1>
                        <p className="text-[10px] text-white/30 font-bold">{totalCount} item{totalCount > 1 ? 's' : ''}</p>
                    </div>
                    <button
                        onClick={() => {
                            if (window.confirm('Clear entire cart?')) clearCart();
                        }}
                        className="text-xs font-black text-red-500 py-2 px-3 rounded-xl hover:bg-red-500/10 transition-colors"
                    >
                        Clear All
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-4 space-y-6">

                {/* ── ITEMS LIST ──────────────────────────── */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-white/40 text-[10px] font-black uppercase tracking-widest">Order Items</h3>
                        <span className="text-orange-500 text-xs font-bold">{formatPrice(totalAmount)}</span>
                    </div>

                    <AnimatePresence initial={false}>
                        {cartItems.map((item, index) => (
                            <motion.div
                                key={`${item.menuItem.id}-${index}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                                layout
                                className="rounded-2xl overflow-hidden"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                }}
                            >
                                <div className="p-3 flex items-center gap-3">
                                    {/* Photo */}
                                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white/5">
                                        {item.menuItem.image_url ? (
                                            <img
                                                src={item.menuItem.image_url}
                                                alt={item.menuItem.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-2xl">🍲</div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-white text-sm truncate">{item.menuItem.name}</h4>
                                        <p className="text-[10px] text-white/30 font-medium uppercase tracking-wide">
                                            {formatPrice(item.menuItem.price)} each
                                        </p>

                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-sm font-black text-white">
                                                {formatPrice(item.menuItem.price * item.quantity)}
                                            </span>

                                            {/* Quantity Controls */}
                                            <div className="flex items-center gap-2 bg-black/40 rounded-xl p-1 border border-white/5">
                                                <button
                                                    onClick={() => updateQuantity(index, item.quantity - 1)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-red-400 active:scale-90 transition-all"
                                                >
                                                    {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                                </button>
                                                <span className="text-xs font-black min-w-[20px] text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(index, item.quantity + 1)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-orange-500/20 text-orange-500 active:scale-90 transition-all"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Item Notes (expandable) */}
                                <div className="px-3 pb-3">
                                    <button
                                        onClick={() => setExpandedItem(expandedItem === index ? null : index)}
                                        className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors"
                                    >
                                        <MessageSquare className="w-3 h-3" />
                                        {itemNotes[index] ? 'Edit note' : 'Add a note'}
                                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedItem === index ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {expandedItem === index && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <textarea
                                                    value={itemNotes[index] || ''}
                                                    onChange={e => setItemNotes(p => ({ ...p, [index]: e.target.value }))}
                                                    placeholder="e.g. Extra spicy, no onions..."
                                                    rows={2}
                                                    className="mt-2 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 outline-none resize-none focus:border-orange-500/30"
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* ── PROMO CODE ──────────────────────────── */}
                <div>
                    <button
                        onClick={() => setShowPromo(!showPromo)}
                        className="flex items-center gap-2 text-sm font-bold text-orange-500 py-3 px-4 rounded-2xl bg-orange-500/5 border border-orange-500/20 w-full hover:bg-orange-500/10 transition-colors"
                    >
                        <Tag className="w-4 h-4" />
                        {appliedPromo ? `✅ ${appliedPromo.code} applied` : 'Have a promo code?'}
                        {appliedPromo && (
                            <button
                                onClick={e => { e.stopPropagation(); setAppliedPromo(null); toast.info('Promo removed.'); }}
                                className="ml-auto"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </button>

                    <AnimatePresence>
                        {showPromo && !appliedPromo && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-2 flex gap-2">
                                    <input
                                        type="text"
                                        value={promoCode}
                                        onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                                        placeholder="Enter promo code"
                                        onKeyDown={e => e.key === 'Enter' && applyPromo()}
                                        className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 outline-none focus:border-orange-500/40"
                                    />
                                    <button
                                        onClick={applyPromo}
                                        className="px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-black"
                                    >
                                        Apply
                                    </button>
                                </div>
                                {promoError && (
                                    <p className="text-xs text-red-400 mt-1.5 px-1">{promoError}</p>
                                )}
                                <p className="text-[10px] text-white/20 mt-1.5 px-1">Try: SAVOR50 · FREE50 · WELCOME</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── DELIVERY INFO ────────────────────────── */}
                <div className="p-4 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/10">
                            <MapPin className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-white/30 uppercase">Deliver to</p>
                            <p className="text-sm font-bold text-white">Add address at checkout</p>
                        </div>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/10">
                            <Clock className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white/30 uppercase">Estimated Time</p>
                            <p className="text-sm font-bold text-white">25 – 35 Minutes</p>
                        </div>
                    </div>
                </div>

                {/* ── BILL DETAILS ─────────────────────────── */}
                <div className="p-5 rounded-2xl space-y-3" style={{ background: 'rgba(255,107,53,0.03)', border: '1px solid rgba(255,107,53,0.08)' }}>
                    <h3 className="text-white/40 text-[10px] font-black uppercase tracking-widest">Bill Details</h3>

                    <div className="flex justify-between text-sm text-white/60">
                        <span>Items Total</span>
                        <span>{formatPrice(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-white/60">
                        <span>Delivery Fee</span>
                        <span>{formatPrice(deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-white/60">
                        <span>GST (5%)</span>
                        <span>{formatPrice(tax)}</span>
                    </div>

                    {appliedPromo && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-between text-sm text-green-400 pb-2 border-b border-white/5"
                        >
                            <span>Promo ({appliedPromo.code})</span>
                            <span>- {formatPrice(promoDiscount)}</span>
                        </motion.div>
                    )}

                    <div className="pt-2 flex justify-between items-center border-t border-orange-500/10">
                        <span className="text-base font-black text-white">Total Amount</span>
                        <span className="text-2xl font-black text-orange-500">{formatPrice(finalTotal)}</span>
                    </div>
                </div>

                {/* Safety Badge */}
                <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-green-500/5 border border-green-500/10">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Secure Payments & Quality Food Guaranteed</p>
                </div>

            </main>

            {/* ── BOTTOM ACTION BAR ────────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 p-4 z-50 bg-[#0d0500]/95 backdrop-blur-2xl border-t border-white/5">
                <div className="max-w-3xl mx-auto">
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/foodie/checkout')}
                        className="w-full h-16 rounded-2xl bg-orange-500 shadow-2xl shadow-orange-500/30 text-white flex items-center justify-between px-6 font-black active:scale-[0.98] transition-all"
                    >
                        <div className="text-left">
                            <p className="text-[10px] uppercase opacity-70 tracking-widest">Total to Pay</p>
                            <p className="text-xl">{formatPrice(finalTotal)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>Proceed to Checkout</span>
                            <ChevronRight className="w-5 h-5" />
                        </div>
                    </motion.button>
                </div>
            </div>

        </div>
    );
};

export default CartPage;
