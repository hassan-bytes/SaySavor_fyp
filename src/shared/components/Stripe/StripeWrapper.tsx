import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { supabase } from '@/shared/lib/supabaseClient';
import CheckoutForm from './CheckoutForm';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { DEFAULT_CURRENCY } from '@/shared/lib/currencyUtils';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface StripeWrapperProps {
    amount: number;
    restaurantId: string;
    currencyCode?: string;
    currencySymbol?: string;
    metadata?: any;
    onSuccess: (paymentIntent: any) => void;
    onCancel: () => void;
}

export default function StripeWrapper({ amount, restaurantId, currencyCode = 'PKR', currencySymbol = DEFAULT_CURRENCY.symbol, metadata, onSuccess, onCancel }: StripeWrapperProps) {
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const createPaymentIntent = async () => {
        setLoading(true);
        setError(null);
        try {
            // Log safe, non-PII fields only
            console.log("[StripeWrapper] Creating Payment Intent:", {
                amount,
                currencyCode: 'usd', // Force USD for testing Stripe
                restaurantId,
                // Note: metadata may contain PII, not logged in production
            });
            const { data, error: functionError } = await supabase.functions.invoke('create-payment-intent', {
                body: {
                    amount: amount,
                    currency: 'usd', // Use USD instead of PKR for Stripe compatibility
                    restaurantId: restaurantId,
                    metadata: {
                        ...metadata,
                        restaurant_id: restaurantId,
                    },
                },
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (functionError) throw functionError;
            if (data?.error) throw new Error(data.error);
            if (!data?.clientSecret) throw new Error("No client secret received");

            setClientSecret(data.clientSecret);
        } catch (err: any) {
            console.error('Error creating payment intent:', err);
            setError(err.message || "Could not connect to payment server");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        createPaymentIntent();
    }, [amount, restaurantId, JSON.stringify(metadata)]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-16 gap-6 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200 animate-in fade-in duration-700">
                <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
                    <div className="absolute inset-0 blur-xl bg-amber-500/20 animate-pulse" />
                </div>
                <div className="text-center">
                    <p className="text-slate-900 font-black text-lg tracking-tight">Initializing Secure Payment</p>
                    <p className="text-slate-400 text-sm font-bold mt-1">Connecting to Stripe Safely...</p>
                </div>
            </div>
        );
    }

    if (error || !clientSecret) {
        return (
            <div className="p-10 text-center bg-red-50/50 rounded-[2.5rem] border border-red-100 animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-50">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-red-900 font-black text-xl mb-2">Payment Setup Failed</h3>
                <p className="text-red-600/70 text-sm font-bold mb-8 max-w-[280px] mx-auto">
                    {error || "We encountered an unexpected issue while setting up the payment gateway."}
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={createPaymentIntent}
                        className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Try Again
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const appearance = {
        theme: 'stripe' as const,
        variables: {
            colorPrimary: '#f59e0b',
            colorBackground: '#ffffff',
            colorText: '#1e293b',
        },
    };

    const options = {
        clientSecret,
        appearance,
    };

    return (
        <div className="p-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Elements stripe={stripePromise} options={options}>
                <CheckoutForm amount={amount} currencySymbol={currencySymbol} onSuccess={onSuccess} onCancel={onCancel} />
            </Elements>
        </div>
    );
}
