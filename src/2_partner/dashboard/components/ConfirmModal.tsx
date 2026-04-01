// ============================================================
// FILE: ConfirmModal.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Confirmation dialog for delete or other important actions.
// ============================================================
import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    isDestructive?: boolean;
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    isDestructive = true
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div
                className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl transform transition-all scale-100 relative overflow-hidden"
                style={{ animation: 'modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            >
                {/* 3D Depth Decoration */}
                <div className={`absolute -inset-1 rounded-[30px] blur-xl -z-10 mt-4 mx-4 transition-all opacity-50 ${isDestructive ? 'bg-gradient-to-r from-red-400 to-orange-400' : 'bg-gradient-to-r from-amber-400 to-yellow-400'}`}></div>

                {/* Close Button X */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mt-2">
                    <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-inner ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                        {isDestructive ? <Trash2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                    </div>

                    <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-500 font-medium mb-8 leading-relaxed px-2 text-sm">
                        {message}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 py-3 px-4 font-bold rounded-xl text-white transition-all shadow-lg active:scale-95 ${isDestructive ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes modalPop {
                    0% { opacity: 0; transform: scale(0.9) translateY(20px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}
