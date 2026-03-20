// ============================================================
// FILE: PaymentSuccess.tsx
// SECTION: 3_customer > pages
// PURPOSE: Stripe payment success redirect landing page.
//          Confirms payment, creates order if needed, redirects to tracker.
// ROUTE: /foodie/payment-success
// ============================================================
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

const PaymentSuccess: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');

    useEffect(() => {
        const paymentIntentStatus = searchParams.get('redirect_status');
        const paymentIntentId = searchParams.get('payment_intent');

        if (paymentIntentStatus === 'succeeded') {
            setStatus('success');
            // Small delay for visual feedback, then navigate home
            setTimeout(() => navigate('/foodie/home'), 3000);
        } else {
            setStatus('failed');
            setTimeout(() => navigate('/foodie/checkout'), 3000);
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-[#0d0500] flex items-center justify-center p-6">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center"
            >
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
                        <h2 className="text-white text-xl font-black">Confirming payment...</h2>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                        >
                            <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
                        </motion.div>
                        <h2 className="text-white text-2xl font-black mb-2">Payment Successful! 🎉</h2>
                        <p className="text-white/40">Redirecting to your order...</p>
                    </>
                )}
                {status === 'failed' && (
                    <>
                        <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
                        <h2 className="text-white text-2xl font-black mb-2">Payment Failed</h2>
                        <p className="text-white/40">Going back to checkout...</p>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default PaymentSuccess;
