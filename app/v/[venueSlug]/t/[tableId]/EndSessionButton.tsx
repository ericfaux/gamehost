'use client';

/**
 * Client component for the "End Session & Check Out" button.
 * Handles ending the current session and refreshing the page.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { endSession } from './actions';

interface EndSessionButtonProps {
  venueSlug: string;
  tableId: string;
}

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export function EndSessionButton({ venueSlug, tableId }: EndSessionButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<ButtonState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = async () => {
    if (state === 'loading') return;

    setState('loading');
    setErrorMessage(null);

    try {
      const result = await endSession(venueSlug, tableId);

      if (result.success) {
        setState('success');
        // Refresh the page to show the "Start Session" UI state
        router.refresh();
      } else {
        setState('error');
        setErrorMessage(result.error ?? 'Something went wrong');
      }
    } catch (error) {
      console.error('End session error:', error);
      setState('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  };

  const getButtonContent = () => {
    switch (state) {
      case 'loading':
        return (
          <>
            <svg
              className="w-5 h-5 mr-2 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Ending...
          </>
        );
      case 'success':
        return (
          <>
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Session Ended!
          </>
        );
      case 'error':
        return (
          <>
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Try Again
          </>
        );
      default:
        return (
          <>
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            End Session &amp; Check Out
          </>
        );
    }
  };

  const getButtonClasses = () => {
    const baseClasses =
      'inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium rounded-xl transition-colors';

    switch (state) {
      case 'success':
        return `${baseClasses} text-white bg-green-600`;
      case 'error':
        return `${baseClasses} text-white bg-red-600 hover:bg-red-700`;
      default:
        return `${baseClasses} text-gray-700 bg-gray-200 hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700`;
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={state === 'loading' || state === 'success'}
        className={getButtonClasses()}
      >
        {getButtonContent()}
      </button>
      {errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}
    </div>
  );
}
