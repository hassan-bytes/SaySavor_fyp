// ============================================================
// FILE: ErrorBoundary.tsx
// SECTION: shared > components
// PURPOSE: Global error boundary to catch React component errors
//          and display user-friendly error UI instead of crashing
// ============================================================
import React, { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });

        // Log to error tracking service (e.g., Sentry)
        // Sentry.captureException(error, { contexts: { react: errorInfo } });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0d0500] flex flex-col items-center justify-center p-6 text-center">
                    <div className="max-w-md">
                        <div className="text-6xl mb-6">💥</div>
                        <h1 className="text-3xl font-bold text-white mb-3">Oops! Something went wrong</h1>
                        <p className="text-white/60 mb-6 leading-relaxed">
                            We encountered an unexpected error. Please try refreshing the page or going back home.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-left">
                                <p className="text-xs font-mono text-red-400 mb-2 font-bold">Error Details:</p>
                                <p className="text-xs text-red-300 mb-3 break-words">
                                    {this.state.error.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <p className="text-xs text-red-300 break-words max-h-32 overflow-y-auto">
                                        {this.state.errorInfo.componentStack}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-colors"
                            >
                                <Home className="w-4 h-4" />
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
