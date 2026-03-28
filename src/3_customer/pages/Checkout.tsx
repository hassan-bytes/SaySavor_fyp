// ============================================================
// FILE: Checkout.tsx
// SECTION: 3_customer > pages
// PURPOSE: Final payment and order placement.
//          COD + Stripe Online Payment (Test Mode)
//          Full address form, Stripe PaymentElement integration.
// ROUTE: /foodie/checkout
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, CreditCard, Wallet,
    CheckCircle2, Loader2, MapPin,
    Home, Building2, Plus, ChevronDown,
    ShieldCheck, Info, Phone
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { useCart } from '@/3_customer/context/CartContext';
import { useCustomerAuth } from '@/3_customer/context/CustomerAuthContext';
import { customerOrderService } from '@/3_customer/services/customerOrderService';
import { toast } from 'sonner';
import { supabase } from '@/shared/lib/supabaseClient';
import { COUNTRY_CURRENCIES } from '@/shared/lib/currencyUtils';

// ── Stripe setup (outside component so it's not recreated) ──
// Replace with your actual Stripe publishable test key
const stripePromise = loadStripe(
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_KEY_HERE'
);

// ── Stripe appearance matching SaySavor dark theme ──────────
const stripeAppearance = {
    theme: 'night' as const,
    variables: {
        colorPrimary: '#FF6B35',
        colorBackground: '#1a0800',
        colorText: '#ffffff',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '12px',
        colorInputBackground: 'rgba(255,255,255,0.05)',
        colorInputBorder: 'rgba(255,255,255,0.1)',
        colorInputText: '#ffffff',
        colorInputPlaceholder: 'rgba(255,255,255,0.3)',
    },
    rules: {
        '.Input': {
            border: '1px solid rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(255,255,255,0.05)',
        },
        '.Input:focus': {
            border: '1px solid rgba(255,107,53,0.5)',
            boxShadow: '0 0 0 3px rgba(255,107,53,0.1)',
        },
        '.Label': {
            color: 'rgba(255,255,255,0.5)',
            fontSize: '10px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
        },
    },
};

// ── Address type ─────────────────────────────────────────────
interface DeliveryAddress {
    type: 'home' | 'office' | 'other';
    label: string;
    fullAddress: string;
    phone: string;
}

// ── Address validation helper ────────────────────────────────
const validateAddress = (address: DeliveryAddress): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!address.fullAddress?.trim()) {
        errors.push('Address is required');
    } else if (address.fullAddress.trim().length < 10) {
        errors.push('Address must be at least 10 characters');
    }
    
    if (!address.phone?.trim()) {
        errors.push('Phone number is required');
    } else {
        const digits = address.phone.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 15) {
            errors.push('Phone number must be 10-15 digits');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// ── Inner Stripe Form Component ──────────────────────────────
const StripePaymentForm: React.FC<{
    onSuccess: (paymentIntentId: string) => void;
    onError: (msg: string) => void;
    amount: string;
    loading: boolean;
    setLoading: (v: boolean) => void;
}> = ({ onSuccess, onError, amount, loading, setLoading }) => {
    const stripe = useStripe();
    const elements = useElements();

    const handleStripeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setLoading(true);
        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                redirect: 'if_required',
                confirmParams: {
                    return_url: `${window.location.origin}/foodie/payment-success`,
                },
            });

            if (error) {
                onError(error.message || 'Payment failed');
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                onSuccess(paymentIntent.id);
            }
        } catch (err: any) {
            onError(err.message || 'Payment failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleStripeSubmit} id="stripe-form">
            <PaymentElement
                options={{
                    layout: 'tabs',
                    defaultValues: {
                        billingDetails: { address: { country: 'PK' } }
                    }
                }}
            />
            <p className="text-[10px] text-white/20 mt-3 text-center">
                Test cards: 4242 4242 4242 4242 | Any future date | Any CVV
            </p>
        </form>
    );
};

// ── Main Checkout Component ───────────────────────────────────
const CheckoutPage: React.FC = () => {
    const navigate = useNavigate();
    const { cartItems, totalAmount, clearCart, currentRestaurantId, tableNumber } = useCart();
    const { customer } = useCustomerAuth();

    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [fetchingIntent, setFetchingIntent] = useState(false);

    const [currencySymbol, setCurrencySymbol] = useState('PKR');
    const [currency, setCurrency] = useState('PKR');

    // Address state
    const [selectedAddressIdx, setSelectedAddressIdx] = useState(0);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [addresses, setAddresses] = useState<DeliveryAddress[]>([
        { type: 'home', label: 'Home', fullAddress: '', phone: customer?.phone || '' }
    ]);
    const [newAddress, setNewAddress] = useState<DeliveryAddress>({
        type: 'home', label: 'Home', fullAddress: '', phone: ''
    });

    // Sync address phone when customer loads
    useEffect(() => {
        if (customer?.phone && addresses[0]?.phone === '') {
            setAddresses(prev => prev.map((addr, idx) => 
                idx === 0 ? { ...addr, phone: customer.phone || '' } : addr
            ));
        }
    }, [customer]);

    const deliveryFee = totalAmount > 0 ? 50 : 0;
    const tax = Math.round(totalAmount * 0.05);
    const finalTotal = totalAmount + deliveryFee + tax;

    // ── Load currency ────────────────────────────────────────
    useEffect(() => {
        const loadCurrency = async () => {
            if (!currentRestaurantId) return;
            const { data } = await supabase
                .from('restaurants')
                .select('currency')
                .eq('id', currentRestaurantId)
                .maybeSingle();

            const savedCurrency = (data as any)?.currency || 'PKR';
            const currencyInfo = Object.values(COUNTRY_CURRENCIES).find(
                c => c.code === savedCurrency
            ) ?? Object.values(COUNTRY_CURRENCIES).find(c => c.code === 'PKR');

            setCurrencySymbol(currencyInfo?.symbol ?? 'PKR');
            setCurrency(savedCurrency);
        };
        loadCurrency();
    }, [currentRestaurantId]);

    // ── Create PaymentIntent when ONLINE is selected ─────────
    useEffect(() => {
        if (paymentMethod !== 'ONLINE' || !finalTotal) return;

        const createIntent = async () => {
            setFetchingIntent(true);
            try {
                const { data, error } = await supabase.functions.invoke(
                    'create-payment-intent',
                    {
                        body: {
                            amount: finalTotal,
                            currency: currency.toLowerCase(),
                            restaurantId: currentRestaurantId,
                        }
                    }
                );

                if (error) throw error;
                if (data?.clientSecret) {
                    setClientSecret(data.clientSecret);
                }
            } catch (err: any) {
                console.error('PaymentIntent error:', err);
                toast.error('Could not initialize payment. Please try COD.');
                setPaymentMethod('COD');
            } finally {
                setFetchingIntent(false);
            }
        };

        createIntent();
    }, [paymentMethod, finalTotal, currency, currentRestaurantId]);

    const formatPrice = (price: number): string =>
        `${currencySymbol}\u00A0${price.toLocaleString('en', { maximumFractionDigits: 0 })}`;

    const selectedAddress = addresses[selectedAddressIdx];

    // ── Validate address ─────────────────────────────────────
    const validateBeforeOrder = (): boolean => {
        // If it's a Dine-in order (table number exists), address is less critical but still good to have.
        // However, the current UI requires it. I'll keep it required for now or make it optional for dine-in.
        if (!tableNumber) {
            if (!selectedAddress?.fullAddress?.trim()) {
                toast.error('Please add a delivery address before placing order.');
                setShowAddressForm(true);
                return false;
            }
        }
        
        if (!selectedAddress?.phone?.trim()) {
            toast.error('Please add your phone number for contact.');
            setShowAddressForm(true);
            return false;
        }
        return true;
    };

    // ── COD Order ────────────────────────────────────────────
    const handleCODOrder = async () => {
        if (!validateBeforeOrder()) return;
        if (!currentRestaurantId) return;

        setLoading(true);
        try {
            let identifier = customer?.id;
            let isGuest = !customer;

            if (!identifier) {
                let gId = localStorage.getItem('ss_guest_id');
                if (!gId) {
                    gId = `guest_${Math.random().toString(36).substr(2, 9)}`;
                    localStorage.setItem('ss_guest_id', gId);
                }
                identifier = gId;
            }

            const order = await (customerOrderService as any).createOrder({
                customer_id: identifier,
                restaurant_id: currentRestaurantId,
                total_amount: finalTotal,
                delivery_fee: deliveryFee,
                tax_amount: tax,
                items: cartItems,
                payment_method: 'COD',
                delivery_address: selectedAddress.fullAddress ? `${selectedAddress.fullAddress} | ${selectedAddress.phone}` : `Dine-in Order | ${selectedAddress.phone}`,
                is_guest: isGuest,
                table_number: tableNumber,
            });

            toast.success('Order placed! 🎉', {
                description: 'Aapka order mil gaya hai. Jald hi deliver hoga!'
            });
            clearCart();
            navigate(`/foodie/track/${order.id}`);
        } catch (err: any) {
            toast.error(err.message || 'Order failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── After Stripe payment success ─────────────────────────
    const handleStripeSuccess = async (paymentIntentId: string) => {
        if (!validateBeforeOrder()) return;
        if (!currentRestaurantId) return;

        setLoading(true);
        try {
            let identifier = customer?.id;
            let isGuest = !customer;

            if (!identifier) {
                let gId = localStorage.getItem('ss_guest_id');
                if (!gId) {
                    gId = `guest_${Math.random().toString(36).substr(2, 9)}`;
                    localStorage.setItem('ss_guest_id', gId);
                }
                identifier = gId;
            }

            const order = await (customerOrderService as any).createOrder({
                customer_id: identifier,
                restaurant_id: currentRestaurantId,
                total_amount: finalTotal,
                delivery_fee: deliveryFee,
                tax_amount: tax,
                items: cartItems,
                payment_method: 'ONLINE',
                delivery_address: selectedAddress.fullAddress ? `${selectedAddress.fullAddress} | ${selectedAddress.phone}` : `Dine-in Order | ${selectedAddress.phone}`,
                is_guest: isGuest,
                stripe_payment_intent_id: paymentIntentId,
                table_number: tableNumber,
            });

            toast.success('Payment successful! 🎉');
            clearCart();
            navigate(`/foodie/track/${order.id}`);
        } catch (err: any) {
            console.error('[Checkout] ❌ Order creation failed after Stripe payment:', {
                message: err.message,
                code: err.code,
                details: err.details,
                hint: err.hint,
                cartLength: cartItems.length,
                restaurantId: currentRestaurantId,
                total: finalTotal
            });
            toast.error(`Order failed: ${err.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleStripeError = (msg: string) => {
        toast.error(msg || 'Payment failed. Please try again.');
    };

    return (
        <div className="min-h-screen bg-[#0d0500] text-white pb-10">
            {/* Header */}
            <header className="p-4 border-b border-white/5 flex items-center gap-4 sticky top-0 z-50 bg-[#0d0500]/90 backdrop-blur-xl">
                <button onClick={() => navigate(-1)} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-transform">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-lg font-black uppercase tracking-widest">Final Checkout</h1>
                    <p className="text-[10px] text-white/30 font-bold">{cartItems.length} item{cartItems.length > 1 ? 's' : ''} from restaurant</p>
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-4 space-y-6">

                {/* ── 1. DELIVERY ADDRESS ──────────────────── */}
                <section>
                    <h2 className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Delivery Address</h2>

                    {addresses.map((addr, idx) => (
                        addr.fullAddress ? (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => setSelectedAddressIdx(idx)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all mb-3 ${selectedAddressIdx === idx
                                    ? 'border-orange-500 bg-orange-500/5'
                                    : 'border-white/10 bg-white/5'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedAddressIdx === idx ? 'bg-orange-500' : 'bg-white/10'
                                        }`}>
                                        {addr.type === 'home' ? <Home className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black uppercase tracking-wide text-white/60">{addr.label}</p>
                                        <p className="text-sm font-bold text-white mt-0.5">{addr.fullAddress}</p>
                                        {addr.phone && (
                                            <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {addr.phone}
                                            </p>
                                        )}
                                    </div>
                                    {selectedAddressIdx === idx && (
                                        <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0" />
                                    )}
                                </div>
                            </motion.div>
                        ) : null
                    ))}

                    {/* Add address prompt if no address */}
                    {!addresses[0]?.fullAddress && (
                        <div
                            className="p-4 rounded-2xl border border-dashed border-white/20 flex items-center gap-3 text-white/40"
                        >
                            <MapPin className="w-5 h-5 text-orange-500/50" />
                            <div>
                                <p className="text-sm font-bold text-white/60">No address added</p>
                                <p className="text-xs">Please add your delivery address below</p>
                            </div>
                        </div>
                    )}

                    {/* Add / Edit Address Button */}
                    <button
                        onClick={() => setShowAddressForm(!showAddressForm)}
                        className="mt-2 flex items-center gap-2 text-xs font-bold text-orange-500 py-2 px-3 rounded-xl hover:bg-orange-500/10 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {addresses[0]?.fullAddress ? 'Edit / Add New Address' : 'Add Delivery Address'}
                        <ChevronDown className={`w-4 h-4 transition-transform ${showAddressForm ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Address Form */}
                    <AnimatePresence>
                        {showAddressForm && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mt-3 space-y-3">
                                    <h3 className="text-xs font-black text-white/50 uppercase tracking-widest">Add Address</h3>

                                    {/* Address Type */}
                                    <div className="flex gap-2">
                                        {(['home', 'office', 'other'] as const).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setNewAddress(p => ({ ...p, type: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${newAddress.type === t
                                                    ? 'bg-orange-500 text-white'
                                                    : 'bg-white/5 text-white/50 border border-white/10'
                                                    }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Full Address */}
                                    <div>
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-1">
                                            Full Address *
                                        </label>
                                        <textarea
                                            value={newAddress.fullAddress}
                                            onChange={e => setNewAddress(p => ({ ...p, fullAddress: e.target.value }))}
                                            placeholder="House/Flat No., Street, Area, City"
                                            rows={2}
                                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-orange-500/50 outline-none text-sm text-white placeholder:text-white/20 resize-none"
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-1">
                                            Phone for Rider *
                                        </label>
                                        <input
                                            type="tel"
                                            value={newAddress.phone}
                                            onChange={e => setNewAddress(p => ({ ...p, phone: e.target.value }))}
                                            placeholder="+923001234567"
                                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-orange-500/50 outline-none text-sm text-white placeholder:text-white/20"
                                        />
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (!newAddress.fullAddress.trim()) {
                                                toast.error('Please enter full address');
                                                return;
                                            }
                                            if (!newAddress.phone.trim()) {
                                                toast.error('Please enter phone number');
                                                return;
                                            }
                                            setAddresses([newAddress]);
                                            setSelectedAddressIdx(0);
                                            setShowAddressForm(false);
                                            toast.success('Address saved!');
                                        }}
                                        className="w-full py-3 rounded-xl bg-orange-500 text-white font-black text-sm"
                                    >
                                        Save Address ✓
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* ── 2. PAYMENT METHOD ────────────────────── */}
                <section>
                    <h2 className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Payment Method</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setPaymentMethod('COD')}
                            className={`p-4 rounded-2xl flex flex-col items-center gap-2.5 border transition-all ${paymentMethod === 'COD'
                                ? 'bg-orange-500/10 border-orange-500 text-orange-500'
                                : 'bg-white/5 border-white/10 text-white/40'
                                }`}
                        >
                            <Wallet className="w-6 h-6" />
                            <div className="text-center">
                                <p className="text-xs font-black uppercase tracking-widest">Cash on Delivery</p>
                                <p className="text-[9px] opacity-60 mt-0.5">Pay when delivered</p>
                            </div>
                        </button>
                        <button
                            onClick={() => setPaymentMethod('ONLINE')}
                            className={`p-4 rounded-2xl flex flex-col items-center gap-2.5 border transition-all ${paymentMethod === 'ONLINE'
                                ? 'bg-orange-500/10 border-orange-500 text-orange-500'
                                : 'bg-white/5 border-white/10 text-white/40'
                                }`}
                        >
                            <CreditCard className="w-6 h-6" />
                            <div className="text-center">
                                <p className="text-xs font-black uppercase tracking-widest">Card / Online</p>
                                <p className="text-[9px] opacity-60 mt-0.5">Stripe secured</p>
                            </div>
                        </button>
                    </div>
                </section>

                {/* ── 3. STRIPE PAYMENT FORM ───────────────── */}
                <AnimatePresence>
                    {paymentMethod === 'ONLINE' && (
                        <motion.section
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 rounded-2xl bg-white/5 border border-orange-500/20">
                                <div className="flex items-center gap-2 mb-4">
                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                    <p className="text-xs font-bold text-green-500">Secured by Stripe</p>
                                    <span className="ml-auto text-[9px] text-white/20 uppercase font-bold tracking-widest">
                                        Test Mode
                                    </span>
                                </div>

                                {fetchingIntent ? (
                                    <div className="py-8 flex flex-col items-center gap-3">
                                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                                        <p className="text-xs text-white/40">Initializing payment...</p>
                                    </div>
                                ) : clientSecret ? (
                                    <Elements
                                        stripe={stripePromise}
                                        options={{
                                            clientSecret,
                                            appearance: stripeAppearance,
                                        }}
                                    >
                                        <StripePaymentForm
                                            onSuccess={handleStripeSuccess}
                                            onError={handleStripeError}
                                            amount={formatPrice(finalTotal)}
                                            loading={loading}
                                            setLoading={setLoading}
                                        />
                                    </Elements>
                                ) : (
                                    <div className="py-6 text-center">
                                        <Info className="w-5 h-5 text-white/20 mx-auto mb-2" />
                                        <p className="text-xs text-white/30">Payment form unavailable. Please use COD.</p>
                                    </div>
                                )}
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>

                {/* ── 4. BILL SUMMARY ──────────────────────── */}
                <section className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <h2 className="text-white/40 text-[10px] font-black uppercase tracking-widest">Bill Summary</h2>
                    <div className="flex justify-between text-white/60 text-sm">
                        <span>Items Total</span>
                        <span>{formatPrice(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-white/60 text-sm">
                        <span>Delivery Fee</span>
                        <span>{formatPrice(deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between text-white/60 text-sm pb-3 border-b border-white/5">
                        <span>GST (5%)</span>
                        <span>{formatPrice(tax)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-black text-white">Total Payable</span>
                        <span className="text-xl font-black text-orange-500">{formatPrice(finalTotal)}</span>
                    </div>
                </section>

                {/* ── 5. PLACE ORDER BUTTON ────────────────── */}
                {paymentMethod === 'COD' ? (
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                        onClick={handleCODOrder}
                        className="w-full h-16 rounded-2xl bg-orange-500 text-white font-black text-lg shadow-2xl shadow-orange-500/30 flex items-center justify-center gap-3 disabled:opacity-60"
                    >
                        {loading ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order...</>
                        ) : (
                            <><CheckCircle2 className="w-6 h-6" /> Place Order (COD)</>
                        )}
                    </motion.button>
                ) : (
                    clientSecret && (
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            disabled={loading || fetchingIntent}
                            onClick={() => {
                                if (!validateBeforeOrder()) return;
                                const form = document.getElementById('stripe-form') as HTMLFormElement;
                                form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                            }}
                            className="w-full h-16 rounded-2xl bg-orange-500 text-white font-black text-lg shadow-2xl shadow-orange-500/30 flex items-center justify-center gap-3 disabled:opacity-60"
                        >
                            {loading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Processing Payment...</>
                            ) : (
                                <><CreditCard className="w-6 h-6" /> Pay {formatPrice(finalTotal)}</>
                            )}
                        </motion.button>
                    )
                )}

                <p className="text-center text-[10px] text-white/20 font-medium uppercase tracking-[0.2em]">
                    By placing this order you agree to our Terms of Service
                </p>
            </main>
        </div>
    );
};

export default CheckoutPage;
