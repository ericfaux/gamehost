'use client';

/**
 * StartSessionButton - Client component for starting a game session.
 *
 * Displays the "Got it – we're playing this" button and handles
 * the session creation flow with loading and success/error states.
 */

import { useState, useTransition } from 'react';
import { startSession, type StartSessionInput } from './actions';

interface StartSessionButtonProps {
  venueSlug: string;
  tableId: string;
  gameId: string;
  gameTitle: string;
  tableLabel: string;
  /** Wizard params from query string, stored with session for analytics */
  wizardParams?: unknown;
}

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export function StartSessionButton({
  venueSlug,
  tableId,
  gameId,
  gameTitle,
  tableLabel,
  wizardParams,
}: StartSessionButtonProps) {
  const [state, setState] = useState<ButtonState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (state === 'loading' || state === 'success') {
      return;
    }

    setState('loading');
    setErrorMessage(null);

    const input: StartSessionInput = {
      venueSlug,
      tableId,
      gameId,
      wizardParams,
    };

    startTransition(async () => {
      const result = await startSession(input);

      if (result.success) {
        setState('success');
      } else {
        setState('error');
        setErrorMessage(result.error || 'Something went wrong. Please try again.');
      }
    });
  };

  // Success state
  if (state === 'success') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 py-4 px-6 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="font-medium">Session started!</span>
        </div>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Enjoy <span className="font-medium">{gameTitle}</span> at{' '}
          <span className="font-medium">{tableLabel}</span>. Have fun!
        </p>
      </div>
    );
  }

  // Error or idle state
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || state === 'loading'}
        className="w-full py-4 text-lg font-semibold text-white bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-green-400 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-green-600/25 transition-colors"
      >
        {isPending || state === 'loading' ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Starting session...
          </span>
        ) : (
          "Got it – we're playing this"
        )}
      </button>

      {/* Error message */}
      {state === 'error' && errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400 text-center">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
