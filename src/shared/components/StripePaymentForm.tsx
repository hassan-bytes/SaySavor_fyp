// ================================================================
// FILE: src/shared/components/StripePaymentForm.tsx
// PURPOSE: Reusable Stripe PaymentElement wrapper.
//          Used in both:
//   - Customer delivery Checkout page
//   - QR Menu in-restaurant payment modal
// ================================================================
import React, { useState } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Loader2, ShieldCheck, CreditCard } from 'lucide-react';
import { useStripePayment } from '@/shared/hooks/useStripePayment';

// ── Dark theme matching SaySavor ─────────────────────────────
const STRIPE_APPEARANCE = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#FF6B35',
    colorBackground: '#1a0800',
    colorText: '#ffffff',
    colorDanger: '#ef4444',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    borderRadius: '10px',
    colorInputBackground: 'rgba(255,255,255,0.06)',
    colorInputBorder: 'rgba(255,255,255,0.12)',
    colorInputText: '#ffffff',
    colorInputPlaceholder: 'rgba(255,255,255,0.35)',
  },
  rules: {
    '.Input': {
      border: '1px solid rgba(255,255,255,0.12)',
      backgroundColor: 'rgba(255,255,255,0.06)',
      padding: '12px',
    },
    '.Input:focus': {
      border: '1px solid rgba(255,107,53,0.6)',
      boxShadow: '0 0 0 2px rgba(255,107,53,0.12)',
    },
    '.Label': {
      color: 'rgba(255,255,255,0.45)',
      fontSize: '10px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: '6px',
    },
    '.Tab': {
      border: '1px solid rgba(255,255,255,0.1)',
      backgroundColor: 'rgba(255,255,255,0.04)',
    },
    '.Tab--selected': {
      border: '1px solid rgba(255,107,53,0.5)',
      backgroundColor: 'rgba(255,107,53,0.08)',
    },
    '.Error': {
      color: '#ef4444',
      fontSize: '12px',
    },
  },
};

// ── Inner form (needs to be inside <Elements>) ────────────────
interface InnerFormProps {
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
  submitLabel?: string;
  amount: string;        // formatted price string for display
  disabled?: boolean;
  formId?: string;
  hideSubmitButton?: boolean;
}

export const StripeInnerForm: React.FC<InnerFormProps> = ({
  onSuccess,
  onError,
  submitLabel = 'Pay Now',
  amount,
  disabled = false,
  formId,
  hideSubmitButton = false,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || submitting || disabled) return;

    setSubmitting(true);
    setLocalError(null);

    try {
      // First validate the form fields
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setLocalError(submitError.message || 'Please check your card details');
        return;
      }

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/foodie/payment-success`,
        },
      });

      if (error) {
        const msg = error.message || 'Payment failed';
        setLocalError(msg);
        onError(msg);
      } else if (paymentIntent?.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      } else {
        setLocalError('Payment incomplete. Please try again.');
        onError('Payment incomplete');
      }
    } catch (err: any) {
      const msg = err.message || 'Unexpected error';
      setLocalError(msg);
      onError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          defaultValues: {
            billingDetails: { address: { country: 'PK' } },
          },
        }}
      />

      {localError && (
        <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          ⚠️ {localError}
        </p>
      )}

      <div className="flex items-center gap-2 text-[10px] text-white/30">
        <ShieldCheck className="w-3 h-3 text-green-500" />
        <span>Secured by Stripe · 256-bit SSL encryption</span>
      </div>

      {/* Test mode notice */}
      <p className="text-[10px] text-white/20 text-center">
        🧪 Test mode: use card <span className="font-mono text-white/40">4242 4242 4242 4242</span>
        , any future date, any CVV
      </p>

      {!hideSubmitButton && (
        <button
          type="submit"
          disabled={!stripe || !elements || submitting || disabled}
          className="w-full h-14 rounded-2xl bg-orange-500 text-white font-black text-base
            shadow-xl shadow-orange-500/25 flex items-center justify-center gap-3
            disabled:opacity-50 disabled:cursor-not-allowed
            active:scale-[0.98] transition-all"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              {submitLabel} · {amount}
            </>
          )}
        </button>
      )}
    </form>
  );
};

// ── Main wrapper that handles Elements setup ──────────────────
interface StripePaymentFormProps {
  amount: number;            // PKR amount (e.g. 1200)
  formattedAmount: string;   // display string (e.g. "Rs. 1,200")
  restaurantId: string;
  orderId?: string;
  orderType?: 'delivery' | 'qr_menu';
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
  submitLabel?: string;
  disabled?: boolean;
  clientSecret?: string | null;
  loadingExternal?: boolean;
  errorExternal?: string | null;
  formId?: string;
  hideSubmitButton?: boolean;
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  amount,
  formattedAmount,
  restaurantId,
  orderId,
  orderType = 'delivery',
  onSuccess,
  onError,
  submitLabel,
  disabled = false,
  clientSecret,
  loadingExternal,
  errorExternal,
  formId,
  hideSubmitButton = false,
}) => {
  const useInternalIntent = clientSecret === undefined;

  const {
    clientSecret: internalClientSecret,
    stripePromise,
    loading,
    error,
  } = useStripePayment({
    amount,
    currency: 'pkr',
    restaurantId,
    orderId,
    orderType,
    enabled: useInternalIntent,
  });

  const resolvedClientSecret = useInternalIntent ? internalClientSecret : clientSecret;
  const resolvedLoading = useInternalIntent ? loading : (loadingExternal ?? false);
  const resolvedError = useInternalIntent ? error : errorExternal;

  if (resolvedLoading) {
    return (
      <div className="py-8 flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        <p className="text-xs text-white/40">Initializing secure payment...</p>
      </div>
    );
  }

  if (resolvedError) {
    return (
      <div className="py-6 text-center space-y-3">
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          ⚠️ {resolvedError}
        </p>
        <p className="text-[10px] text-white/30">Please use Cash on Delivery instead</p>
      </div>
    );
  }

  if (!resolvedClientSecret) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: resolvedClientSecret,
        appearance: STRIPE_APPEARANCE,
      }}
    >
      <StripeInnerForm
        onSuccess={onSuccess}
        onError={onError}
        submitLabel={submitLabel}
        amount={formattedAmount}
        disabled={disabled}
        formId={formId}
        hideSubmitButton={hideSubmitButton}
      />
    </Elements>
  );
};

export default StripePaymentForm;
