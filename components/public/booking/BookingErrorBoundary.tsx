'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from '@/components/icons';

interface Props {
  children: ReactNode;
  venueName?: string;
  venueSlug?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary component for booking wizard and manage booking pages.
 * Catches JavaScript errors and displays a user-friendly fallback UI.
 */
export class BookingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error('Booking Error:', error);
    console.error('Error Info:', errorInfo);

    // In production, you would send this to an error reporting service
    // e.g., Sentry, LogRocket, etc.
  }

  handleRefresh = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  handleStartOver = () => {
    if (this.props.venueSlug) {
      window.location.href = `/v/${this.props.venueSlug}/book`;
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-xl shadow-card border border-[color:var(--color-structure)] p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>

            <h2 className="text-lg font-serif font-semibold text-[color:var(--color-ink-primary)] mb-2">
              Something went wrong
            </h2>

            <p className="text-[color:var(--color-ink-secondary)] mb-6 max-w-sm mx-auto">
              We couldn&apos;t load the booking form. This might be a temporary issue.
              Please try again.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRefresh}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)] font-medium hover:bg-[color:var(--color-muted)] transition-colors touch-manipulation min-h-[44px]"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>

              {this.props.venueSlug && (
                <button
                  onClick={this.handleStartOver}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors touch-manipulation min-h-[44px]"
                >
                  <Home className="w-4 h-4" />
                  Start Over
                </button>
              )}
            </div>

            {/* Debug info in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-[color:var(--color-ink-secondary)]">
                  Error Details (dev only)
                </summary>
                <pre className="mt-2 p-3 bg-stone-100 rounded-lg text-xs overflow-auto max-h-40">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for async error handling with retry support
 */
interface AsyncErrorFallbackProps {
  error: Error | string;
  onRetry?: () => void;
  onBack?: () => void;
}

export function AsyncErrorFallback({ error, onRetry, onBack }: AsyncErrorFallbackProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div className="py-8 flex flex-col items-center gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>

      <div>
        <p className="font-medium text-[color:var(--color-ink-primary)] mb-1">
          Something went wrong
        </p>
        <p className="text-sm text-[color:var(--color-ink-secondary)] max-w-xs">
          {errorMessage || 'An unexpected error occurred. Please try again.'}
        </p>
      </div>

      <div className="flex gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-[color:var(--color-ink-secondary)] hover:text-[color:var(--color-ink-primary)] transition-colors"
          >
            Go back
          </button>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Network error component with retry logic
 */
interface NetworkErrorProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

export function NetworkError({ onRetry, isRetrying }: NetworkErrorProps) {
  return (
    <div className="py-8 flex flex-col items-center gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-amber-500" />
      </div>

      <div>
        <p className="font-medium text-[color:var(--color-ink-primary)] mb-1">
          Connection issue
        </p>
        <p className="text-sm text-[color:var(--color-ink-secondary)] max-w-xs">
          Unable to connect to the server. Please check your internet connection and try again.
        </p>
      </div>

      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
        {isRetrying ? 'Retrying...' : 'Try again'}
      </button>
    </div>
  );
}
