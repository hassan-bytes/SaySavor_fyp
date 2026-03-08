// ============================================================
// FILE: CheckoutModal.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Order ka checkout/bill settle karna â€” payment complete karna.
// ============================================================
import React, { useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { Order } from './OrderCard';
import { X, Receipt, Banknote, CreditCard, Percent, Minus, ChefHat } from 'lucide-react';
import { toast } from 'sonner';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    onPaymentComplete: () => void;
    formatPrice?: (price: number) => string;
}

export default function CheckoutModal({ isOpen, onClose, order, onPaymentComplete, formatPrice = (p) => `Rs. ${p.toLocaleString()}` }: CheckoutModalProps) {
    const [discountType, setDiscountType] = useState<'NONE' | 'PERCENTAGE' | 'FLAT'>('NONE');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !order) return null;

    // Calculations
    const subtotal = order.total_amount;
    let discountAmount = 0;

    if (discountType === 'PERCENTAGE') {
        discountAmount = (subtotal * discountValue) / 100;
    } else if (discountType === 'FLAT') {
        discountAmount = discountValue;
    }

    const finalTotal = Math.max(0, subtotal - discountAmount);

    const handleCheckout = async () => {
        setIsSubmitting(true);
        try {
            const { error: updateError } = await (supabase as any)
                .from('orders')
                .update({
                    session_status: 'CLOSED',
                    payment_status: 'PAID',
                    payment_method: paymentMethod,
                    discount_amount: discountAmount,
                    status: 'delivered' // Auto-close kitchen status if checking out
                })
                .eq('id', order.id);

            if (updateError) throw updateError;

            toast.success(`Bill Settled! ${order.table_number ? `Table ${order.table_number} is now free.` : 'Order Closed.'}`);
            onPaymentComplete();
            onClose();
        } catch (err: any) {
            console.error("Checkout failed:", err);
            toast.error("Failed to process checkout");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-5 bg-zinc-900 text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <Receipt className="w-5 h-5 text-zinc-300" />
                        <h2 className="font-bold text-lg">
                            Checkout {order.table_number ? `- Table ${order.table_number}` : `- ${order.order_type || 'Takeaway'}`}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">

                    {/* Bill Receipt Preview */}
                    <div className="bg-white p-5 rounded-xl border border-dashed border-zinc-300 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-pattern-zigzag opacity-20"></div>
                        <h3 className="font-bold text-zinc-800 border-b border-zinc-100 pb-3 mb-3 text-center uppercase tracking-widest text-sm">
                            Running Bill
                        </h3>

                        <div className="space-y-3 mb-4">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                    <div className="flex items-start gap-2 max-w-[70%]">
                                        <span className="font-bold text-zinc-700">{item.quantity}x</span>
                                        <div className="flex flex-col">
                                            <span className="text-zinc-800">{item.name}</span>
                                        </div>
                                    </div>
                                    <span className="font-bold text-zinc-700">{formatPrice((item.unit_price || 0) * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-dashed border-zinc-300 pt-3 space-y-2">
                            <div className="flex justify-between text-sm font-medium text-zinc-500">
                                <span>Subtotal</span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>

                            {discountAmount > 0 && (
                                <div className="flex justify-between text-sm font-medium text-green-600">
                                    <span>Discount applied</span>
                                    <span>- {formatPrice(discountAmount)}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-xl font-black text-zinc-900 pt-2 border-t border-zinc-100">
                                <span>Grand Total</span>
                                <span>{formatPrice(finalTotal)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Discount Controls */}
                    <div className="space-y-3">
                        <label className="font-bold text-sm text-zinc-500 uppercase tracking-widest">Apply Discount</label>
                        <div className="flex gap-2">
                            <button onClick={() => { setDiscountType('NONE'); setDiscountValue(0); }} className={`flex-1 py-2 text-sm font-bold rounded-lg border-2 transition-all ${discountType === 'NONE' ? 'border-zinc-800 bg-zinc-800 text-white' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>None</button>
                            <button onClick={() => setDiscountType('PERCENTAGE')} className={`flex-1 py-2 text-sm font-bold rounded-lg border-2 transition-all flex items-center justify-center gap-1 ${discountType === 'PERCENTAGE' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}><Percent className="w-4 h-4" /> % Off</button>
                            <button onClick={() => setDiscountType('FLAT')} className={`flex-1 py-2 text-sm font-bold rounded-lg border-2 transition-all flex items-center justify-center gap-1 ${discountType === 'FLAT' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}><Minus className="w-4 h-4" /> Flat Off</button>
                        </div>

                        {discountType !== 'NONE' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <input
                                    type="number"
                                    min="0"
                                    value={discountValue || ''}
                                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                                    placeholder={discountType === 'PERCENTAGE' ? "Enter percentage (e.g., 10)" : "Enter amount (e.g., 500)"}
                                    className="w-full bg-white border-2 border-orange-200 rounded-lg px-4 py-3 font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-orange-500 transition-colors"
                                />
                            </div>
                        )}
                    </div>

                    {/* Payment Method Controls */}
                    <div className="space-y-3">
                        <label className="font-bold text-sm text-zinc-500 uppercase tracking-widest">Payment Method</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setPaymentMethod('CASH')}
                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'CASH' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-white'}`}
                            >
                                <Banknote className={`w-8 h-8 ${paymentMethod === 'CASH' ? 'text-emerald-500' : 'opacity-50'}`} />
                                <span className="font-bold">Cash</span>
                            </button>

                            <button
                                onClick={() => setPaymentMethod('CARD')}
                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'CARD' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-white'}`}
                            >
                                <CreditCard className={`w-8 h-8 ${paymentMethod === 'CARD' ? 'text-blue-500' : 'opacity-50'}`} />
                                <span className="font-bold">Card / POS</span>
                            </button>
                        </div>
                    </div>

                </div>

                {/* Footer Action */}
                <div className="p-5 bg-white border-t border-zinc-200 shrink-0">
                    <button
                        onClick={handleCheckout}
                        disabled={isSubmitting}
                        className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                        ) : (
                            <Receipt className="w-5 h-5" />
                        )}
                        <span>Settle Bill • {formatPrice(finalTotal)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
