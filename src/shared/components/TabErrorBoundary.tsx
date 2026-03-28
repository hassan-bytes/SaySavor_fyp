/**
 * ============================================================
 * FILE: TabErrorBoundary.tsx
 * SECTION: shared > components
 * PURPOSE: Lightweight error boundary for individual tabs/sections
 *          Prevents one tab's error from crashing entire dashboard
 * ============================================================
 */

import React, { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallbackTitle?: string;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * TabErrorBoundary
 * 
 * Lightweight error boundary for wrapping individual dashboard tabs.
 * When a tab crashes, it shows a minimal error UI while keeping
 * other tabs functional.
 * 
 * USAGE:
 * ```tsx
 * <TabErrorBoundary fallbackTitle="Kitchen Tab">
 *   <KitchenTab {...props} />
 * </TabErrorBoundary>
 * ```
 * 
 * BENEFITS:
 * - Isolates errors to specific tabs
 * - Other tabs remain functional
 * - User can retry without full page reload
 * - Logs errors for debugging
 */
export class TabErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        const tabName = this.props.fallbackTitle || 'Tab';
        console.error(`[TabErrorBoundary] ${tabName} crashed:`, error, errorInfo);
        
        // Log to error tracking service
        // Sentry.captureException(error, {
        //   tags: { component: tabName },
        //   contexts: { react: errorInfo }
        // });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
        });
        
        // Call custom reset handler if provided
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            const tabName = this.props.fallbackTitle || 'This section';
            
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/5">
                    <div className="text-center max-w-md">
                        {/* Error Icon */}
                        <div className="mb-6 flex justify-center">
                            <div className="p-4 rounded-full bg-red-500/10 border border-red-500/30">
                                <AlertTriangle className="w-12 h-12 text-red-400" />
                            </div>
                        </div>
                        
                        {/* Error Message */}
                        <h3 className="text-xl font-bold text-white mb-2">
                            {tabName} encountered an error
                        </h3>
                        <p className="text-slate-400 mb-6 text-sm">
                            Don't worry, other tabs are still working. Try refreshing this section.
                        </p>
                        
                        {/* Development Error Details */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
                                <p className="text-xs font-mono text-red-400 mb-2 font-bold">
                                    Error Details (dev only):
                                </p>
                                <p className="text-xs text-red-300 break-words font-mono">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}
                        
                        {/* Retry Button */}
                        <button
                            onClick={this.handleReset}
                            className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors mx-auto"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Retry {tabName}
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * USAGE EXAMPLES
 * 
 * 1. Wrap individual tabs:
 * ```tsx
 * <TabErrorBoundary fallbackTitle="Kitchen Tab">
 *   <KitchenTab orders={orders} onUpdate={handleUpdate} />
 * </TabErrorBoundary>
 * ```
 * 
 * 2. Wrap with custom reset handler:
 * ```tsx
 * <TabErrorBoundary 
 *   fallbackTitle="POS Tab"
 *   onReset={() => {
 *     console.log('POS Tab reset');
 *     fetchOrders();
 *   }}
 * >
 *   <POSTab {...props} />
 * </TabErrorBoundary>
 * ```
 * 
 * 3. Wrap critical sections:
 * ```tsx
 * <TabErrorBoundary fallbackTitle="Order List">
 *   {orders.map(order => <OrderCard key={order.id} order={order} />)}
 * </TabErrorBoundary>
 * ```
 * 
 * TESTING
 * 
 * To test error boundary, add this to a component:
 * ```tsx
 * if (someCondition) {
 *   throw new Error('Test error boundary');
 * }
 * ```
 */
