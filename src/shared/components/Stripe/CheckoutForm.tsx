import React, { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { DEFAULT_CURRENCY } from '@/shared/lib/currencyUtils';

interface CheckoutFormProps {
    amount: number;
    currencySymbol?: string;
    onSuccess: (paymentIntent: any) => void;
    onCancel: () => void;
}

export default function CheckoutForm({ amount, currencySymbol = DEFAULT_CURRENCY.symbol, onSuccess, onCancel }: CheckoutFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsProcessing(true);
        setErrorMessage(null);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            redirect: 'if_required',
        });

        if (error) {
            setErrorMessage(error.message || 'An error occurred during payment.');
            toast.error(error.message || 'Payment failed');
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            toast.success('Payment successful!');
            onSuccess(paymentIntent);
        } else {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement />
            {errorMessage && (
                <div className="text-red-500 text-sm font-medium">{errorMessage}</div>
            )}
            <div className="flex flex-col gap-3">
                <button
                    type="submit"
                    disabled={isProcessing || !stripe || !elements}
                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:bg-slate-800"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        `Pay ${currencySymbol}\u00A0${amount.toLocaleString('en', { maximumFractionDigits: 0 })}`
                    )}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isProcessing}
                    className="w-full bg-white text-slate-600 font-bold py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
