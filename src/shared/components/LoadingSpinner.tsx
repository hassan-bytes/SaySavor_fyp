/**
 * ============================================================
 * FILE: LoadingSpinner.tsx
 * SECTION: shared > components
 * PURPOSE: Full-screen loading spinner for initial auth restoration
 * ============================================================
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  /** Optional message to display below spinner */
  message?: string;
}

/**
 * LoadingSpinner Component
 * 
 * Full-screen centered spinner shown during:
 * - Initial session restoration
 * - Critical async operations
 * 
 * Prevents flash of unauthenticated content.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <div className="min-h-screen bg-[#060606] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 
          className="w-12 h-12 text-orange-500 animate-spin" 
          strokeWidth={2.5}
        />
        <p className="text-slate-400 text-sm font-medium tracking-wide">
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
