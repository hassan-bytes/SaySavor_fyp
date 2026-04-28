// ============================================================
// FILE: Checkout.tsx
// SECTION: 3_customer > pages
// PURPOSE: Final payment and order placement.
//          COD + Stripe Online Payment (Test Mode)
//          Full address form, Stripe PaymentElement integration.
// ROUTE: /foodie/checkout
// ============================================================
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, CreditCard, Wallet,
    CheckCircle2, Loader2, MapPin,
    Home, Building2, ShoppingCart, Plus, ChevronDown,
    ShieldCheck, Info, Phone
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { useCart } from '@/3_customer/context/CartContext';
import { useCustomerAuth } from '@/3_customer/context/CustomerAuthContext';
import { customerOrderService } from '@/3_customer/services/customerOrderService';
import { toast } from 'sonner';
import { supabase } from '@/shared/lib/supabaseClient';
import { COUNTRY_CURRENCIES } from '@/shared/lib/currencyUtils';
import StripePaymentForm from '@/shared/components/StripePaymentForm';

// ── Stripe setup (outside component so it's not recreated) ──
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

// ── Address type ─────────────────────────────────────────────
interface DeliveryAddress {
    type: 'home' | 'office' | 'other';
    label: string;
    fullAddress: string;
    phone: string;
}

interface CustomerProfileSettings {
    defaultInstruction?: string;
    defaultAddress?: string;
    defaultPhone?: string;
}

interface PromotionCandidate {
    id: string;
    code: string;
    discount_type: 'percent' | 'flat';
    discount_value: number;
    max_discount: number | null;
    min_order: number | null;
    starts_at: string | null;
    ends_at: string | null;
}

const PROFILE_SETTINGS_KEY = 'ss_customer_profile_settings';

const readProfileSettings = (): CustomerProfileSettings => {
    try {
        const raw = localStorage.getItem(PROFILE_SETTINGS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as CustomerProfileSettings;
        return {
            defaultInstruction: typeof parsed.defaultInstruction === 'string' ? parsed.defaultInstruction : '',
            defaultAddress: typeof parsed.defaultAddress === 'string' ? parsed.defaultAddress : '',
            defaultPhone: typeof parsed.defaultPhone === 'string' ? parsed.defaultPhone : '',
        };
    } catch {
        return {};
    }
};

type OrderMode = 'DELIVERY' | 'TAKEAWAY' | 'DINE_IN';

interface RestaurantRules {
    name: string;
    minOrder: number | null;
    isDeliveryEnabled: boolean;
    operatingDays: string[];
    opensAt: string | null;
    closesAt: string | null;
    isOpenNow: boolean;
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const parseTimeToMinutes = (value?: string | null): number | null => {
    if (!value || typeof value !== 'string') return null;
    const raw = value.trim();
    if (!raw) return null;

    const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampm) {
        let h = Number(ampm[1]);
        const m = Number(ampm[2]);
        const p = ampm[3].toUpperCase();
        if (p === 'PM' && h < 12) h += 12;
        if (p === 'AM' && h === 12) h = 0;
        if (Number.isNaN(h) || Number.isNaN(m)) return null;
        return h * 60 + m;
    }

    const parts = raw.split(':');
    if (parts.length !== 2) return null;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
};

const isRestaurantOpenNow = (
    opensAt: string | null,
    closesAt: string | null,
    operatingDays: string[]
): boolean => {
    const now = new Date();
    const today = WEEK_DAYS[now.getDay()];

    if (operatingDays.length > 0 && !operatingDays.includes(today)) {
        return false;
    }

    const openMins = parseTimeToMinutes(opensAt);
    const closeMins = parseTimeToMinutes(closesAt);
    if (openMins === null || closeMins === null) {
        return true;
    }

    const currentMins = now.getHours() * 60 + now.getMinutes();
    if (openMins === closeMins) return true;
    if (closeMins > openMins) {
        return currentMins >= openMins && currentMins <= closeMins;
    }
    return currentMins >= openMins || currentMins <= closeMins;
};

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

// ── Main Checkout Component ───────────────────────────────────
const CheckoutPage: React.FC = () => {
    const navigate = useNavigate();
    const { cartItems, totalAmount, clearCart, currentRestaurantId, tableNumber, setTableNumber } = useCart();
    const { customer } = useCustomerAuth();

    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [fetchingIntent, setFetchingIntent] = useState(false);

    const [currencySymbol, setCurrencySymbol] = useState('PKR');
    const [currency, setCurrency] = useState('PKR');
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [taxPercent, setTaxPercent] = useState(0);
    const [orderMode, setOrderMode] = useState<OrderMode>(tableNumber ? 'DINE_IN' : 'DELIVERY');
    const [profileDefaults, setProfileDefaults] = useState<CustomerProfileSettings>(() => readProfileSettings());
    const defaultDeliveryAddress = (profileDefaults.defaultAddress || '').trim();
    const defaultDeliveryPhone = (profileDefaults.defaultPhone || '').trim();
    const [tableInput, setTableInput] = useState<string>(tableNumber || '');
    const [restaurantRules, setRestaurantRules] = useState<RestaurantRules>({
        name: 'Restaurant',
        minOrder: null,
        isDeliveryEnabled: true,
        operatingDays: [],
        opensAt: null,
        closesAt: null,
        isOpenNow: true,
    });
    const realtimeRefreshTimeoutRef = useRef<number | null>(null);
    const applyPromoTimeoutRef = useRef<number | null>(null);
    const hasHydratedRulesRef = useRef(false);
    const lastVisibleRulesSignatureRef = useRef<string>('');

    // Address state
    const [selectedAddressIdx, setSelectedAddressIdx] = useState(0);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [saveAsDefault, setSaveAsDefault] = useState(false);
    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [appliedPromotion, setAppliedPromotion] = useState<PromotionCandidate | null>(null);
    const [applyingPromo, setApplyingPromo] = useState(false);
    const [addresses, setAddresses] = useState<DeliveryAddress[]>([
        {
            type: 'home',
            label: 'Home',
            fullAddress: defaultDeliveryAddress,
            phone: defaultDeliveryPhone || customer?.phone || '',
        }
    ]);
    const [newAddress, setNewAddress] = useState<DeliveryAddress>({
        type: 'home',
        label: 'Home',
        fullAddress: defaultDeliveryAddress,
        phone: defaultDeliveryPhone || customer?.phone || '',
    });

    const persistCheckoutDefaults = (address: string, phone: string) => {
        const nextDefaults: CustomerProfileSettings = {
            ...profileDefaults,
            defaultAddress: address.trim(),
            defaultPhone: phone.trim(),
        };

        localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(nextDefaults));
        setProfileDefaults(nextDefaults);
    };

    // Sync address phone when customer loads
    useEffect(() => {
        if (customer?.phone && addresses[0]?.phone === '') {
            setAddresses(prev => prev.map((addr, idx) => 
                idx === 0 ? { ...addr, phone: customer.phone || '' } : addr
            ));
        }
    }, [customer]);

    useEffect(() => {
        if (tableNumber) {
            setOrderMode('DINE_IN');
            setTableInput(tableNumber);
        }
    }, [tableNumber]);

    useEffect(() => {
        setAppliedPromotion(null);
        setPromoCodeInput('');
    }, [currentRestaurantId]);

    const effectiveDeliveryFee = orderMode === 'DELIVERY' ? deliveryFee : 0;
    const tax = Math.round(totalAmount * (taxPercent / 100));
    const promotionDiscount = useMemo(() => {
        if (!appliedPromotion) return 0;

        if (typeof appliedPromotion.min_order === 'number' && totalAmount < appliedPromotion.min_order) {
            return 0;
        }

        let discountValue = 0;
        if (appliedPromotion.discount_type === 'percent') {
            discountValue = Math.round((totalAmount * appliedPromotion.discount_value) / 100);
        } else {
            discountValue = Math.round(appliedPromotion.discount_value);
        }

        if (typeof appliedPromotion.max_discount === 'number') {
            discountValue = Math.min(discountValue, Math.max(0, appliedPromotion.max_discount));
        }

        return Math.max(0, Math.min(discountValue, totalAmount));
    }, [appliedPromotion, totalAmount]);

    const finalTotal = Math.max(0, totalAmount + effectiveDeliveryFee + tax - promotionDiscount);

    const handleApplyPromo = async () => {
        const normalizedCode = promoCodeInput.trim().toUpperCase();

        if (!currentRestaurantId) {
            toast.error('Restaurant context missing. Please go back and try again.');
            return;
        }

        if (!normalizedCode) {
            toast.error('Please enter a promo code.');
            return;
        }

        if (appliedPromotion?.code?.toUpperCase() === normalizedCode) {
            toast.message('This promo code is already applied.');
            return;
        }

        setApplyingPromo(true);
        try {
            const abortController = new AbortController();
            if (applyPromoTimeoutRef.current !== null) {
                window.clearTimeout(applyPromoTimeoutRef.current);
            }
            applyPromoTimeoutRef.current = window.setTimeout(() => {
                abortController.abort();
            }, 10000);

            const promotionsTable = supabase.from('promotions') as any;
            const { data, error } = await promotionsTable
                .select('id, code, discount_type, discount_value, max_discount, min_order, starts_at, ends_at')
                .eq('restaurant_id', currentRestaurantId)
                .eq('is_active', true)
                .ilike('code', normalizedCode)
                .limit(1)
                .abortSignal(abortController.signal)
                .maybeSingle();

            if (error) throw error;
            if (!data) {
                toast.error('Promo code not found for this restaurant.');
                return;
            }

            const normalizedPromo: PromotionCandidate = {
                ...(data as PromotionCandidate),
                code: String(data.code || normalizedCode).toUpperCase(),
                discount_value: Number(data.discount_value || 0),
                max_discount: data.max_discount === null ? null : Number(data.max_discount),
                min_order: data.min_order === null ? null : Number(data.min_order),
            };

            const nowMs = Date.now();
            if (normalizedPromo.starts_at && nowMs < new Date(normalizedPromo.starts_at).getTime()) {
                toast.error('This promo is not active yet.');
                return;
            }

            if (normalizedPromo.ends_at && nowMs > new Date(normalizedPromo.ends_at).getTime()) {
                toast.error('This promo has expired.');
                return;
            }

            if (typeof normalizedPromo.min_order === 'number' && totalAmount < normalizedPromo.min_order) {
                toast.error(`Minimum order for this promo is ${formatPrice(normalizedPromo.min_order)}.`);
                return;
            }

            setAppliedPromotion(normalizedPromo);
            setPromoCodeInput(normalizedPromo.code);
            toast.success('Promo code applied successfully!');
        } catch (err: any) {
            console.error('Promo apply failed:', err);
            if (err?.name === 'AbortError') {
                toast.error('Promo validation timed out. Please check your connection and try again.');
            } else {
                toast.error(err.message || 'Could not apply promo code.');
            }
        } finally {
            if (applyPromoTimeoutRef.current !== null) {
                window.clearTimeout(applyPromoTimeoutRef.current);
                applyPromoTimeoutRef.current = null;
            }
            setApplyingPromo(false);
        }
    };

    const handleRemovePromo = () => {
        setAppliedPromotion(null);
        setPromoCodeInput('');
        toast.success('Promo code removed.');
    };

    const loadRestaurantPricingAndRules = useCallback(async () => {
        if (!currentRestaurantId) return;

        const { data } = await supabase
            .from('restaurants')
            .select('name, currency, delivery_fee, tax_percent, min_order, min_order_price, is_delivery, operating_days, opens_at, closes_at')
            .eq('id', currentRestaurantId)
            .maybeSingle();

        const savedCurrency = (data as any)?.currency || 'PKR';
        const currencyInfo = Object.values(COUNTRY_CURRENCIES).find(
            c => c.code === savedCurrency
        ) ?? Object.values(COUNTRY_CURRENCIES).find(c => c.code === 'PKR');

        setCurrencySymbol(currencyInfo?.symbol ?? 'PKR');
        setCurrency(savedCurrency);
        setDeliveryFee(typeof (data as any)?.delivery_fee === 'number' ? (data as any).delivery_fee : 0);
        setTaxPercent(typeof (data as any)?.tax_percent === 'number' ? (data as any).tax_percent : 0);

        const minOrderValue = typeof (data as any)?.min_order === 'number'
            ? (data as any).min_order
            : (typeof (data as any)?.min_order_price === 'number' ? (data as any).min_order_price : null);
        const opDays = Array.isArray((data as any)?.operating_days)
            ? (data as any).operating_days.filter((d: unknown) => typeof d === 'string')
            : [];
        const isDeliveryEnabled = typeof (data as any)?.is_delivery === 'boolean' ? (data as any).is_delivery : true;
        const opensAt = typeof (data as any)?.opens_at === 'string' ? (data as any).opens_at : null;
        const closesAt = typeof (data as any)?.closes_at === 'string' ? (data as any).closes_at : null;

        const nextVisibleRulesSignature = JSON.stringify({
            currency: savedCurrency,
            deliveryFee: typeof (data as any)?.delivery_fee === 'number' ? (data as any).delivery_fee : 0,
            taxPercent: typeof (data as any)?.tax_percent === 'number' ? (data as any).tax_percent : 0,
            minOrder: minOrderValue,
            isDeliveryEnabled,
            opensAt,
            closesAt,
            operatingDays: opDays,
        });

        if (
            hasHydratedRulesRef.current
            && lastVisibleRulesSignatureRef.current
            && lastVisibleRulesSignatureRef.current !== nextVisibleRulesSignature
        ) {
            toast.message('Prices or rules updated', {
                description: 'Latest values have been applied to your checkout.',
                duration: 2200,
                id: 'checkout-rules-updated',
            });
        }

        lastVisibleRulesSignatureRef.current = nextVisibleRulesSignature;
        hasHydratedRulesRef.current = true;

        setRestaurantRules({
            name: (data as any)?.name || 'Restaurant',
            minOrder: minOrderValue,
            isDeliveryEnabled,
            operatingDays: opDays,
            opensAt,
            closesAt,
            isOpenNow: isRestaurantOpenNow(opensAt, closesAt, opDays),
        });

        if (!isDeliveryEnabled) {
            setOrderMode(prev => (prev === 'DELIVERY' ? (tableNumber ? 'DINE_IN' : 'TAKEAWAY') : prev));
        }
    }, [currentRestaurantId, tableNumber]);

    // ── Load restaurant pricing ─────────────────────────────
    useEffect(() => {
        void loadRestaurantPricingAndRules();
    }, [loadRestaurantPricingAndRules]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setRestaurantRules((prev) => ({
                ...prev,
                isOpenNow: isRestaurantOpenNow(prev.opensAt, prev.closesAt, prev.operatingDays),
            }));
        }, 60_000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        if (!currentRestaurantId) return;

        const trackedFields = [
            'name',
            'currency',
            'delivery_fee',
            'tax_percent',
            'min_order',
            'min_order_price',
            'is_delivery',
            'operating_days',
            'opens_at',
            'closes_at',
        ];

        const channel = supabase
            .channel(`checkout-restaurant-live-${currentRestaurantId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'restaurants',
                filter: `id=eq.${currentRestaurantId}`,
            }, (payload) => {
                const nextRow = payload.new as any;
                const prevRow = payload.old as any;
                const changed = trackedFields.some((field) => (
                    JSON.stringify(nextRow?.[field]) !== JSON.stringify(prevRow?.[field])
                ));

                if (!changed) return;

                if (realtimeRefreshTimeoutRef.current !== null) {
                    window.clearTimeout(realtimeRefreshTimeoutRef.current);
                }

                realtimeRefreshTimeoutRef.current = window.setTimeout(() => {
                    void loadRestaurantPricingAndRules();
                }, 250);
            })
            .subscribe();

        return () => {
            if (realtimeRefreshTimeoutRef.current !== null) {
                window.clearTimeout(realtimeRefreshTimeoutRef.current);
            }
            void supabase.removeChannel(channel);
        };
    }, [currentRestaurantId, loadRestaurantPricingAndRules]);

    // ── Create PaymentIntent when ONLINE is selected ─────────
    useEffect(() => {
        if (!stripePromise || paymentMethod !== 'ONLINE' || !finalTotal) return;

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
                            metadata: {
                                order_type: orderMode,
                                order_mode: orderMode,
                                source: 'checkout_page',
                                promo_code: appliedPromotion?.code || '',
                            },
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
    }, [paymentMethod, finalTotal, currency, currentRestaurantId, orderMode, appliedPromotion?.code]);

    const formatPrice = (price: number): string =>
        `${currencySymbol}\u00A0${price.toLocaleString('en', { maximumFractionDigits: 0 })}`;

    const selectedAddress = addresses[selectedAddressIdx];

    // ── Validate address ─────────────────────────────────────
    const validateBeforeOrder = (): boolean => {
        if (!restaurantRules.isOpenNow) {
            toast.error(`${restaurantRules.name} is currently closed.`);
            return false;
        }

        if (typeof restaurantRules.minOrder === 'number' && totalAmount < restaurantRules.minOrder) {
            toast.error(`Minimum order is ${formatPrice(restaurantRules.minOrder)}.`);
            return false;
        }

        if (orderMode === 'DELIVERY' && !restaurantRules.isDeliveryEnabled) {
            toast.error('Delivery is currently unavailable for this restaurant.');
            return false;
        }

        if (orderMode === 'DINE_IN') {
            const resolvedTable = (tableInput || tableNumber || '').trim();
            if (!resolvedTable) {
                toast.error('Please enter table number for dine-in order.');
                return false;
            }
            setTableNumber(resolvedTable);
        } else if (tableNumber) {
            setTableNumber(null);
        }

        if (orderMode === 'DELIVERY') {
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
                delivery_fee: effectiveDeliveryFee,
                tax_amount: tax,
                discount_amount: promotionDiscount,
                items: cartItems,
                payment_method: 'COD',
                delivery_address: orderMode === 'DELIVERY'
                    ? `${selectedAddress.fullAddress} | ${selectedAddress.phone}`
                    : orderMode === 'TAKEAWAY'
                        ? `Pickup Order | ${selectedAddress.phone}`
                        : `Dine-in | Table ${(tableInput || tableNumber || '').trim()} | ${selectedAddress.phone}`,
                delivery_phone: selectedAddress.phone,
                is_guest: isGuest,
                table_number: orderMode === 'DINE_IN' ? (tableInput || tableNumber || null) : null,
                order_type: orderMode,
            });

            toast.success('Order placed! 🎉', {
                description: 'Your order has been received and will be delivered soon!'
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
                delivery_fee: effectiveDeliveryFee,
                tax_amount: tax,
                discount_amount: promotionDiscount,
                items: cartItems,
                payment_method: 'ONLINE',
                delivery_address: orderMode === 'DELIVERY'
                    ? `${selectedAddress.fullAddress} | ${selectedAddress.phone}`
                    : orderMode === 'TAKEAWAY'
                        ? `Pickup Order | ${selectedAddress.phone}`
                        : `Dine-in | Table ${(tableInput || tableNumber || '').trim()} | ${selectedAddress.phone}`,
                delivery_phone: selectedAddress.phone,
                is_guest: isGuest,
                stripe_payment_intent_id: paymentIntentId,
                table_number: orderMode === 'DINE_IN' ? (tableInput || tableNumber || null) : null,
                order_type: orderMode,
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

            const { data: recoveredOrder } = await (supabase
                .from('orders') as any)
                .select('id')
                .eq('stripe_payment_intent_id', paymentIntentId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (recoveredOrder?.id) {
                toast.success('Payment already received. Redirecting to your order...');
                clearCart();
                navigate(`/foodie/track/${recoveredOrder.id}`);
                return;
            }

            toast.error(`Payment done but order sync failed. Reference: ${paymentIntentId.slice(-8).toUpperCase()}`);
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

                {/* ── 1. ORDER MODE ───────────────────────── */}
                <section>
                    <h2 className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Order Mode</h2>
                    <div className="grid grid-cols-3 gap-2">
                        {([
                            { key: 'DELIVERY', label: 'Delivery', icon: MapPin, disabled: !restaurantRules.isDeliveryEnabled },
                            { key: 'TAKEAWAY', label: 'Pickup', icon: ShoppingCart, disabled: false },
                            { key: 'DINE_IN', label: 'Dine-in', icon: Building2, disabled: false },
                        ] as const).map((mode) => {
                            const Icon = mode.icon;
                            const active = orderMode === mode.key;
                            return (
                                <button
                                    key={mode.key}
                                    onClick={() => {
                                        if (mode.disabled) return;
                                        setOrderMode(mode.key);
                                    }}
                                    disabled={mode.disabled}
                                    className={`p-3 rounded-2xl border transition-all ${active
                                        ? 'bg-orange-500/10 border-orange-500 text-orange-500'
                                        : 'bg-white/5 border-white/10 text-white/50'} disabled:opacity-40 disabled:cursor-not-allowed`}
                                >
                                    <div className="flex flex-col items-center gap-1.5">
                                        <Icon className="w-5 h-5" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">{mode.label}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {orderMode === 'DINE_IN' && (
                        <div className="mt-3">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-1">
                                Table Number *
                            </label>
                            <input
                                type="text"
                                value={tableInput}
                                onChange={(event) => setTableInput(event.target.value)}
                                placeholder="e.g. T12"
                                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-orange-500/50 outline-none text-sm text-white placeholder:text-white/20"
                            />
                        </div>
                    )}

                    {!restaurantRules.isOpenNow && (
                        <p className="mt-3 text-xs text-red-400 font-semibold">
                            {restaurantRules.name} appears closed right now. Ordering may fail until it opens.
                        </p>
                    )}
                </section>

                {/* ── 2. ADDRESS / CONTACT ─────────────────── */}
                <section>
                    <h2 className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">
                        {orderMode === 'DELIVERY' ? 'Delivery Address' : 'Contact Details'}
                    </h2>

                    {(defaultDeliveryAddress || defaultDeliveryPhone) && (
                        <p className="text-[11px] mb-2 text-white/45">
                            Default contact loaded from profile settings. You can edit it below for this order.
                        </p>
                    )}

                    {addresses.map((addr, idx) => (
                        (orderMode === 'DELIVERY' ? addr.fullAddress : addr.phone) ? (
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
                                        {orderMode === 'DELIVERY' && (
                                            <p className="text-sm font-bold text-white mt-0.5">{addr.fullAddress}</p>
                                        )}
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
                    {orderMode === 'DELIVERY' && !addresses[0]?.fullAddress && (
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
                        {orderMode === 'DELIVERY'
                            ? (addresses[0]?.fullAddress ? 'Edit / Add New Address' : 'Add Delivery Address')
                            : 'Edit Contact'}
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

                                    {(defaultDeliveryAddress || defaultDeliveryPhone) && (
                                        <button
                                            onClick={() => setNewAddress((prev) => ({
                                                ...prev,
                                                fullAddress: defaultDeliveryAddress,
                                                phone: defaultDeliveryPhone || prev.phone,
                                            }))}
                                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/70 w-full"
                                        >
                                            Use Default Address
                                        </button>
                                    )}

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
                                            const normalizedAddress: DeliveryAddress = {
                                                ...newAddress,
                                                fullAddress: newAddress.fullAddress.trim(),
                                                phone: newAddress.phone.trim(),
                                            };

                                            if (orderMode === 'DELIVERY' && !normalizedAddress.fullAddress) {
                                                toast.error('Please enter full address');
                                                return;
                                            }

                                            if (!normalizedAddress.phone) {
                                                toast.error('Please enter phone number');
                                                return;
                                            }

                                            setAddresses([normalizedAddress]);
                                            setSelectedAddressIdx(0);
                                            setShowAddressForm(false);

                                            if (saveAsDefault) {
                                                const defaultAddressToSave = orderMode === 'DELIVERY'
                                                    ? normalizedAddress.fullAddress
                                                    : (defaultDeliveryAddress || normalizedAddress.fullAddress);

                                                persistCheckoutDefaults(defaultAddressToSave, normalizedAddress.phone);
                                                setSaveAsDefault(false);
                                                toast.success('Address saved and set as default!');
                                            } else {
                                                toast.success('Address saved!');
                                            }
                                        }}
                                        className="w-full py-3 rounded-xl bg-orange-500 text-white font-black text-sm"
                                    >
                                        Save Address ✓
                                    </button>

                                    <label className="flex items-center gap-2 mt-2 text-xs text-white/60 font-semibold">
                                        <input
                                            type="checkbox"
                                            checked={saveAsDefault}
                                            onChange={(event) => setSaveAsDefault(event.target.checked)}
                                            className="w-4 h-4 rounded border border-white/20 bg-white/5"
                                        />
                                        Use this as default for next checkout
                                    </label>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* ── 3. PAYMENT METHOD ────────────────────── */}
                <section>
                    <h2 className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Payment Method</h2>
                    <div className={`grid gap-3 ${stripePromise ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
                        {stripePromise && (
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
                        )}
                    </div>
                </section>

                {/* ── 4. STRIPE PAYMENT FORM ───────────────── */}
                <AnimatePresence>
                    {stripePromise && paymentMethod === 'ONLINE' && (
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
                                </div>

                                {fetchingIntent ? (
                                    <div className="py-8 flex flex-col items-center gap-3">
                                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                                        <p className="text-xs text-white/40">Initializing payment...</p>
                                    </div>
                                ) : clientSecret ? (
                                    <StripePaymentForm
                                        amount={finalTotal}
                                        formattedAmount={formatPrice(finalTotal)}
                                        restaurantId={currentRestaurantId || ''}
                                        orderType="delivery"
                                        onSuccess={handleStripeSuccess}
                                        onError={handleStripeError}
                                        disabled={loading}
                                        submitLabel="Pay"
                                        clientSecret={clientSecret}
                                        loadingExternal={fetchingIntent}
                                        errorExternal={null}
                                        formId="stripe-form"
                                        hideSubmitButton
                                    />
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

                {/* ── 5. BILL SUMMARY ──────────────────────── */}
                <section className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <h2 className="text-white/40 text-[10px] font-black uppercase tracking-widest">Bill Summary</h2>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Promo Code</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={promoCodeInput}
                                onChange={(event) => setPromoCodeInput(event.target.value.toUpperCase())}
                                placeholder="Enter code"
                                className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-white/10 focus:border-orange-500/50 outline-none text-sm text-white placeholder:text-white/30 uppercase"
                            />
                            <button
                                onClick={handleApplyPromo}
                                disabled={applyingPromo || !promoCodeInput.trim()}
                                className="h-10 px-4 rounded-xl bg-orange-500 text-white text-xs font-black uppercase tracking-wider disabled:opacity-50"
                            >
                                {applyingPromo ? 'Applying...' : 'Apply'}
                            </button>
                        </div>

                        {appliedPromotion && (
                            <div className="flex items-center justify-between gap-3 text-xs text-green-400">
                                <span className="font-bold">
                                    Applied: {appliedPromotion.code}
                                    {typeof appliedPromotion.min_order === 'number' && totalAmount < appliedPromotion.min_order
                                        ? ` (Min ${formatPrice(appliedPromotion.min_order)} not met)`
                                        : ''}
                                </span>
                                <button
                                    onClick={handleRemovePromo}
                                    className="text-red-400 font-bold hover:text-red-300"
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between text-white/60 text-sm">
                        <span>Items Total</span>
                        <span>{formatPrice(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-white/60 text-sm">
                        <span>{orderMode === 'DELIVERY' ? 'Delivery Fee' : 'Delivery Fee (Not Applied)'}</span>
                        <span>{formatPrice(effectiveDeliveryFee)}</span>
                    </div>
                    <div className="flex justify-between text-white/60 text-sm">
                        <span>{taxPercent > 0 ? `Tax (${taxPercent}%)` : 'Tax'}</span>
                        <span>{formatPrice(tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm pb-3 border-b border-white/5 text-green-400">
                        <span>Promo Discount</span>
                        <span>-{formatPrice(promotionDiscount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-black text-white">Total Payable</span>
                        <span className="text-xl font-black text-orange-500">{formatPrice(finalTotal)}</span>
                    </div>
                </section>

                {/* ── 6. PLACE ORDER BUTTON ────────────────── */}
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
