// ================================================================
// FILE: src/3_customer/components/QRPaymentModal.tsx
// PURPOSE: Payment modal for QR menu orders (in-restaurant).
//          Customer scans QR → orders food → pays here.
//          Supports: Cash (pay at counter) + Stripe online.
// ================================================================
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Wallet, CreditCard, CheckCircle2,
  Loader2, ShieldCheck, ArrowLeft
} from 'lucide-react';
import StripePaymentForm from '@/shared/components/StripePaymentForm';
import { customerOrderService } from '@/3_customer/services/customerOrderService';
import { toast } from 'sonner';
import type { CartItem } from '@/3_customer/types/customer';

interface QRPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced: (orderId: string) => void;
  restaurantId: string;
  tableNumber?: string;       // from QR code URL param
  cartItems: CartItem[];
  totalAmount: number;
  deliveryFee?: number;
  taxAmount?: number;
  discountAmount?: number;
  currency?: string;
  currencySymbol?: string;
}

type PaymentMethod = 'CASH' | 'ONLINE';

const QRPaymentModal: React.FC<QRPaymentModalProps> = ({
  isOpen,
  onClose,
  onOrderPlaced,
  restaurantId,
  tableNumber,
  cartItems,
  totalAmount,
  deliveryFee = 0,
  taxAmount = 0,
  discountAmount = 0,
  currency = 'PKR',
  currencySymbol = 'Rs.',
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [step, setStep] = useState<'details' | 'payment'>('details');

  const finalTotal = totalAmount + deliveryFee + taxAmount - discountAmount;
  const formatPrice = (n: number) =>
    `${currencySymbol} ${n.toLocaleString('en', { maximumFractionDigits: 0 })}`;

  // ── Place CASH order ─────────────────────────────────────
  const handleCashOrder = async () => {
    setLoading(true);
    try {
      const order = await customerOrderService.createOrder({
        restaurant_id: restaurantId,
        total_amount: finalTotal,
        delivery_fee: deliveryFee,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        items: cartItems,
        payment_method: 'COD',
        delivery_address: tableNumber ? `Table ${tableNumber}` : 'Dine-in',
        delivery_phone: customerPhone,
        customer_name: customerName || 'Walk-in Customer',
        orderType: 'qr_menu',
      } as any);

      toast.success('Order placed! Pay at the counter 💵');
      onOrderPlaced(order.id);
    } catch (err: any) {
      toast.error(err.message || 'Order failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── After Stripe payment success ─────────────────────────
  const handleStripeSuccess = async (paymentIntentId: string) => {
    setLoading(true);
    try {
      const order = await customerOrderService.createOrder({
        restaurant_id: restaurantId,
        total_amount: finalTotal,
        delivery_fee: deliveryFee,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        items: cartItems,
        payment_method: 'ONLINE',
        delivery_address: tableNumber ? `Table ${tableNumber}` : 'Dine-in',
        delivery_phone: customerPhone,
        customer_name: customerName || 'Guest',
        stripe_payment_intent_id: paymentIntentId,
        orderType: 'qr_menu',
      } as any);

      toast.success('Payment successful! 🎉 Order placed!');
      onOrderPlaced(order.id);
    } catch (err: any) {
      toast.error('Payment done but order failed. Show receipt to staff.');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeError = (msg: string) => {
    toast.error(msg || 'Payment failed. Try cash instead.');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md rounded-3xl overflow-hidden"
            style={{ background: '#0d0500', border: '1px solid rgba(255,107,53,0.2)' }}
          >
            {/* Header */}
            <div className="p-5 flex items-center justify-between border-b border-white/5">
              {step === 'payment' && paymentMethod === 'ONLINE' ? (
                <button onClick={() => setStep('details')} className="p-2 rounded-xl bg-white/5">
                  <ArrowLeft className="w-4 h-4 text-white/60" />
                </button>
              ) : (
                <div className="w-8" />
              )}
              <div className="text-center">
                <h2 className="text-white font-black text-base uppercase tracking-widest">
                  {step === 'details' ? 'Place Order' : 'Pay Online'}
                </h2>
                {tableNumber && (
                  <p className="text-orange-500 text-[10px] font-bold">Table {tableNumber}</p>
                )}
              </div>
              <button onClick={onClose} className="p-2 rounded-xl bg-white/5 active:scale-90 transition-transform">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">

              {step === 'details' ? (
                <>
                  {/* Order Summary */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Order Summary</p>
                    {cartItems.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-white/70">{item.quantity}× {item.menuItem.name}</span>
                        <span className="text-white/50">{formatPrice(item.menuItem.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="border-t border-white/5 pt-2 flex justify-between font-black text-white">
                      <span>Total</span>
                      <span className="text-orange-500">{formatPrice(finalTotal)}</span>
                    </div>
                  </div>

                  {/* Customer Details (optional) */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Your Details (optional)</p>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                        focus:border-orange-500/40 outline-none text-sm text-white placeholder:text-white/20"
                    />
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                        focus:border-orange-500/40 outline-none text-sm text-white placeholder:text-white/20"
                    />
                  </div>

                  {/* Payment Method Selection */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">How to Pay</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentMethod('CASH')}
                        className={`p-4 rounded-2xl flex flex-col items-center gap-2 border transition-all ${
                          paymentMethod === 'CASH'
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <Wallet className={`w-6 h-6 ${paymentMethod === 'CASH' ? 'text-orange-500' : 'text-white/40'}`} />
                        <span className={`text-xs font-black uppercase tracking-wider ${paymentMethod === 'CASH' ? 'text-orange-500' : 'text-white/40'}`}>
                          Cash
                        </span>
                        <span className="text-[9px] text-white/30">Pay at counter</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('ONLINE')}
                        className={`p-4 rounded-2xl flex flex-col items-center gap-2 border transition-all ${
                          paymentMethod === 'ONLINE'
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <CreditCard className={`w-6 h-6 ${paymentMethod === 'ONLINE' ? 'text-orange-500' : 'text-white/40'}`} />
                        <span className={`text-xs font-black uppercase tracking-wider ${paymentMethod === 'ONLINE' ? 'text-orange-500' : 'text-white/40'}`}>
                          Card / Online
                        </span>
                        <span className="text-[9px] text-white/30">Pay now</span>
                      </button>
                    </div>
                  </div>

                  {/* Action Button */}
                  {paymentMethod === 'CASH' ? (
                    <button
                      onClick={handleCashOrder}
                      disabled={loading}
                      className="w-full h-14 rounded-2xl bg-orange-500 text-white font-black text-base
                        shadow-xl shadow-orange-500/25 flex items-center justify-center gap-3
                        disabled:opacity-60 active:scale-[0.98] transition-all"
                    >
                      {loading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order...</>
                      ) : (
                        <><CheckCircle2 className="w-5 h-5" /> Place Order (Pay at Counter)</>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => setStep('payment')}
                      className="w-full h-14 rounded-2xl bg-orange-500 text-white font-black text-base
                        shadow-xl shadow-orange-500/25 flex items-center justify-center gap-3
                        active:scale-[0.98] transition-all"
                    >
                      <CreditCard className="w-5 h-5" />
                      Continue to Payment · {formatPrice(finalTotal)}
                    </button>
                  )}
                </>
              ) : (
                /* Stripe Payment Step */
                <StripePaymentForm
                  amount={finalTotal}
                  formattedAmount={formatPrice(finalTotal)}
                  restaurantId={restaurantId}
                  orderType="qr_menu"
                  onSuccess={handleStripeSuccess}
                  onError={handleStripeError}
                  submitLabel="Pay Now"
                  disabled={loading}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QRPaymentModal;
