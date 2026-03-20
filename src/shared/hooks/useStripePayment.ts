// ================================================================
// FILE: src/shared/hooks/useStripePayment.ts
// PURPOSE: Shared Stripe payment logic for:
//   1. Customer delivery checkout (/foodie/checkout)
//   2. QR menu in-restaurant payment
// ================================================================
import { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { supabase } from '@/shared/lib/supabaseClient';

// Load once outside component — never recreated on re-render
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
);

interface UseStripePaymentOptions {
  amount: number;           // Final amount in PKR (e.g. 1200)
  currency?: string;        // Default 'pkr'
  restaurantId: string;
  orderId?: string;         // Pass after order is created
  orderType?: 'delivery' | 'qr_menu';
  enabled: boolean;         // Only create intent when user selects ONLINE
}

interface UseStripePaymentResult {
  clientSecret: string | null;
  stripePromise: Promise<Stripe | null>;
  loading: boolean;
  error: string | null;
}

export const useStripePayment = ({
  amount,
  currency = 'pkr',
  restaurantId,
  orderId,
  orderType = 'delivery',
  enabled,
}: UseStripePaymentOptions): UseStripePaymentResult => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only create PaymentIntent when online payment is selected and amount > 0
    if (!enabled || amount <= 0 || !restaurantId) {
      setClientSecret(null);
      return;
    }

    let cancelled = false;

    const createIntent = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          'create-payment-intent',
          {
            body: {
              amount,
              currency,
              restaurantId,
              orderId: orderId || '',
              orderType,
            },
          }
        );

        if (cancelled) return;

        if (fnError) throw new Error(fnError.message);
        if (!data?.clientSecret) throw new Error('No client secret returned');

        setClientSecret(data.clientSecret);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Could not initialize payment');
          setClientSecret(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    createIntent();

    return () => {
      cancelled = true;
    };
  }, [enabled, amount, restaurantId, orderId, orderType, currency]);

  return { clientSecret, stripePromise, loading, error };
};
