'use client';

/**
 * Client component for the "Start Session" check-in button.
 * Handles the check-in flow (creating a session without a game) and refreshes the page.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// FIX: Correctly import startCheckIn from the local actions file
import { startCheckIn } from './actions';

interface StartSessionButtonProps {
  venueSlug: string;
  tableId: string;
}

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export function StartSessionButton({ venueSlug, tableId }: StartSessionButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<ButtonState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = async () => {
    if (state === 'loading') return;

    setState('loading');
    setErrorMessage(null);

    try {
      // FIX: Call the correct action for this page
      const result = await startCheckIn(venueSlug, tableId);

      if (result.success) {
        setState('success');
        // Refresh the page to show the "Active Session" UI state
        router.refresh();
      } else {
        setState('error');
        setErrorMessage(result.error ?? 'Something went wrong');
      }
    } catch (error) {
      console.error('Check-in error:', error);
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
            Starting...
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
            Session Started!
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
            Start Session
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </>
        );
    }
  };

  const getButtonClasses = () => {
    const baseClasses =
      'inline-flex items-center justify-center w-full px-6 py-4 text-lg font-semibold rounded-xl shadow-lg transition-colors';

    switch (state) {
      case 'success':
        return `${baseClasses} text-white bg-green-600 shadow-green-600/25`;
      case 'error':
        return `${baseClasses} text-white bg-red-600 hover:bg-red-700 shadow-red-600/25`;
      default:
        return `${baseClasses} text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-600/25`;
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
