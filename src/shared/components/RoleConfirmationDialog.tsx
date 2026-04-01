// ============================================================
// FILE: RoleConfirmationDialog.tsx
// PURPOSE: Confirmation dialog for cross-panel role detection
//          Shows when user tries to login with wrong panel
// ============================================================

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, CheckCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';

interface RoleConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  warningType: 'partner_in_customer' | 'customer_in_partner' | null;
  message: string;
  loading?: boolean;
}

export const RoleConfirmationDialog: React.FC<RoleConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  warningType,
  message,
  loading = false,
}) => {
  if (!isOpen || !warningType) return null;

  const isPartnerInCustomer = warningType === 'partner_in_customer';
  const isCustomerInPartner = warningType === 'customer_in_partner';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200"
            >
              {/* Header */}
              <div className={`p-6 ${isPartnerInCustomer ? 'bg-gradient-to-br from-orange-50 to-amber-50' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full ${isPartnerInCustomer ? 'bg-orange-100' : 'bg-blue-100'}`}>
                      <AlertTriangle className={`w-6 h-6 ${isPartnerInCustomer ? 'text-orange-600' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {isPartnerInCustomer ? 'Partner Account Detected' : 'Customer Account Detected'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {isPartnerInCustomer ? 'Using Customer Panel' : 'Using Partner Panel'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  {message}
                </p>

                {isPartnerInCustomer && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-amber-800">
                        <p className="font-semibold mb-1">You can still proceed:</p>
                        <p>You'll be able to order food as a customer. Your partner account will remain active.</p>
                      </div>
                    </div>
                  </div>
                )}

                {isCustomerInPartner && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Become a Partner:</p>
                        <p>You'll get access to the Partner Dashboard to manage your restaurant. Your customer account will remain active.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
                <Button
                  onClick={onClose}
                  disabled={loading}
                  variant="outline"
                  className="flex-1 h-11 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onConfirm}
                  disabled={loading}
                  className={`flex-1 h-11 ${
                    isPartnerInCustomer
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  } text-white shadow-lg`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    isPartnerInCustomer ? 'Continue as Customer' : 'Become a Partner'
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
