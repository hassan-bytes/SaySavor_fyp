/**
 * ============================================================
 * FILE: paymentTypes.ts
 * SECTION: shared > types
 * PURPOSE: Payment status and method enums for type safety
 *          Single source of truth for payment-related constants
 * ============================================================
 */

/**
 * PaymentStatus Enum
 * 
 * Standardized payment status values used throughout the application.
 * Prevents typos and provides type safety for payment state checks.
 * 
 * CRITICAL: Use these enum values instead of string literals
 * to avoid silent bugs from typos like 'PAYED' vs 'PAID'.
 */
export enum PaymentStatus {
  /** Payment not yet confirmed or processed */
  PENDING = 'PENDING',
  
  /** Payment successfully completed */
  PAID = 'PAID',
  
  /** Payment attempt failed */
  FAILED = 'FAILED',
  
  /** Payment was refunded to customer */
  REFUNDED = 'REFUNDED',
}

/**
 * PaymentMethod Enum
 * 
 * Supported payment methods in the system.
 */
export enum PaymentMethod {
  /** Online payment via Stripe/card */
  ONLINE = 'ONLINE',
  
  /** Cash on Delivery */
  COD = 'COD',
  
  /** Cash payment at counter */
  CASH = 'CASH',
  
  /** Card payment at counter */
  CARD = 'CARD',
}

/**
 * Check if payment is pending
 * 
 * Returns true if payment status indicates payment has not been completed.
 * Handles both enum values and string literals for backward compatibility.
 * 
 * @param status - Payment status to check
 * @returns true if payment is pending
 * 
 * @example
 * ```typescript
 * if (isPaymentPending(order.payment_status)) {
 *   console.log('Waiting for payment...');
 * }
 * ```
 */
export function isPaymentPending(status: string | PaymentStatus | null | undefined): boolean {
  if (!status) return true; // Treat null/undefined as pending
  const normalized = status.toUpperCase();
  return normalized === PaymentStatus.PENDING || normalized === 'UNPAID';
}

/**
 * Check if payment is complete
 * 
 * Returns true if payment has been successfully processed.
 * 
 * @param status - Payment status to check
 * @returns true if payment is complete
 * 
 * @example
 * ```typescript
 * if (isPaymentComplete(order.payment_status)) {
 *   console.log('Payment confirmed!');
 * }
 * ```
 */
export function isPaymentComplete(status: string | PaymentStatus | null | undefined): boolean {
  if (!status) return false;
  const normalized = status.toUpperCase();
  return normalized === PaymentStatus.PAID;
}

/**
 * Check if payment failed
 * 
 * Returns true if payment attempt failed.
 * 
 * @param status - Payment status to check
 * @returns true if payment failed
 */
export function isPaymentFailed(status: string | PaymentStatus | null | undefined): boolean {
  if (!status) return false;
  const normalized = status.toUpperCase();
  return normalized === PaymentStatus.FAILED;
}

/**
 * Check if payment was refunded
 * 
 * Returns true if payment was refunded to customer.
 * 
 * @param status - Payment status to check
 * @returns true if payment was refunded
 */
export function isPaymentRefunded(status: string | PaymentStatus | null | undefined): boolean {
  if (!status) return false;
  const normalized = status.toUpperCase();
  return normalized === PaymentStatus.REFUNDED;
}

/**
 * Get payment status display label
 * 
 * Returns a human-readable label for the payment status.
 * 
 * @param status - Payment status
 * @returns Display label
 * 
 * @example
 * ```typescript
 * getPaymentStatusLabel(PaymentStatus.PAID) // "Paid"
 * getPaymentStatusLabel('PENDING') // "Pending"
 * ```
 */
export function getPaymentStatusLabel(status: string | PaymentStatus | null | undefined): string {
  if (!status) return 'Unknown';
  
  const normalized = status.toUpperCase();
  
  switch (normalized) {
    case PaymentStatus.PENDING:
      return 'Pending';
    case PaymentStatus.PAID:
      return 'Paid';
    case PaymentStatus.FAILED:
      return 'Failed';
    case PaymentStatus.REFUNDED:
      return 'Refunded';
    default:
      return status;
  }
}

/**
 * Get payment status color class
 * 
 * Returns Tailwind CSS color classes for visual status indication.
 * 
 * @param status - Payment status
 * @returns Object with color, bg, and border classes
 * 
 * @example
 * ```typescript
 * const { color, bg } = getPaymentStatusColor(PaymentStatus.PAID);
 * // color: 'text-emerald-500', bg: 'bg-emerald-500/10'
 * ```
 */
export function getPaymentStatusColor(status: string | PaymentStatus | null | undefined): {
  color: string;
  bg: string;
  border: string;
} {
  if (!status) {
    return {
      color: 'text-slate-400',
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/30',
    };
  }
  
  const normalized = status.toUpperCase();
  
  switch (normalized) {
    case PaymentStatus.PENDING:
      return {
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
      };
    case PaymentStatus.PAID:
      return {
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
      };
    case PaymentStatus.FAILED:
      return {
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
      };
    case PaymentStatus.REFUNDED:
      return {
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
      };
    default:
      return {
        color: 'text-slate-400',
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/30',
      };
  }
}

/**
 * Get payment method display label
 * 
 * Returns a human-readable label for the payment method.
 * 
 * @param method - Payment method
 * @returns Display label
 */
export function getPaymentMethodLabel(method: string | PaymentMethod | null | undefined): string {
  if (!method) return 'Unknown';
  
  const normalized = method.toUpperCase();
  
  switch (normalized) {
    case PaymentMethod.ONLINE:
      return 'Online Payment';
    case PaymentMethod.COD:
      return 'Cash on Delivery';
    case PaymentMethod.CASH:
      return 'Cash';
    case PaymentMethod.CARD:
      return 'Card';
    default:
      return method;
  }
}

/**
 * MIGRATION GUIDE
 * 
 * Replace string literals with enum values and helper functions:
 * 
 * BEFORE:
 * ```typescript
 * if (order.payment_status !== 'paid' && order.payment_status !== 'PAID') {
 *   // Show payment pending
 * }
 * ```
 * 
 * AFTER:
 * ```typescript
 * import { isPaymentPending } from '@/shared/types/paymentTypes';
 * 
 * if (isPaymentPending(order.payment_status)) {
 *   // Show payment pending
 * }
 * ```
 * 
 * BEFORE:
 * ```typescript
 * payment_status: 'PAID'
 * ```
 * 
 * AFTER:
 * ```typescript
 * import { PaymentStatus } from '@/shared/types/paymentTypes';
 * 
 * payment_status: PaymentStatus.PAID
 * ```
 */
