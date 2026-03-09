import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { supabase } from '@/shared/lib/supabaseClient';
import CheckoutForm from './CheckoutForm';
import { Loader2 } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface StripeWrapperProps {
    amount: number;
    restaurantId: string;
    metadata?: any;
    onSuccess: (paymentIntent: any) => void;
    onCancel: () => void;
}

export default function StripeWrapper({ amount, restaurantId, metadata, onSuccess, onCancel }: StripeWrapperProps) {
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const createPaymentIntent = async () => {
            try {
                const { data, error } = await supabase.functions.invoke('create-payment-intent', {
                    body: {
                        amount: amount, // The edge function will handle cent conversion
                        currency: 'pkr',
                        restaurantId: restaurantId,
                        metadata: {
                            ...metadata,
                            restaurant_id: restaurantId,
                        },
                    },
                });

                if (error) throw error;
                setClientSecret(data.clientSecret);
            } catch (err) {
                console.error('Error creating payment intent:', err);
            } finally {
                setLoading(false);
            }
        };

        createPaymentIntent();
    }, [amount, restaurantId, metadata]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                <p className="text-slate-500 font-medium">Initializing secure payment...</p>
            </div>
        );
    }

    if (!clientSecret) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 font-bold">Failed to initialize payment.</p>
                <button
                    onClick={onCancel}
                    className="mt-4 text-slate-600 font-bold hover:underline"
                >
                    Go Back
                </button>
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
                <CheckoutForm amount={amount} onSuccess={onSuccess} onCancel={onCancel} />
            </Elements>
        </div>
    );
}
