'use client';

/**
 * StartSessionButton - Client component for checking out a game.
 *
 * Displays the "Check Out My Game" button and handles the session
 * creation flow with loading and success/error states.
 */

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startSession, type SelectGameInput } from './actions';

interface StartSessionButtonProps {
  venueSlug: string;
  tableId: string;
  gameId: string;
  gameTitle: string;
  tableLabel: string;
  /** Wizard params from query string, stored with session for analytics */
  wizardParams?: unknown;
  /** Shelf location for finding the game */
  shelfLocation?: string | null;
}

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export function StartSessionButton({
  venueSlug,
  tableId,
  gameId,
  gameTitle,
  tableLabel,
  wizardParams,
  shelfLocation,
}: StartSessionButtonProps) {
  const [state, setState] = useState<ButtonState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (state !== 'success') return;

    const timeout = setTimeout(() => {
      router.push(`/v/${venueSlug}/t/${tableId}`);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [router, state, tableId, venueSlug]);

  const handleClick = () => {
    if (state === 'loading' || state === 'success') {
      return;
    }

    setState('loading');
    setErrorMessage(null);

    const input: SelectGameInput = {
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
        <div className="flex items-center justify-center gap-2 py-4 px-6 bg-[#e8f0e9] border border-[color:var(--color-success)]/20 text-[color:var(--color-success)] rounded-xl">
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
        <p className="text-center text-sm text-[color:var(--color-ink-secondary)]">
          Enjoy <span className="font-medium">{gameTitle}</span> at{' '}
          <span className="font-medium">{tableLabel}</span>. Have fun!
          <br />
          Redirecting you to your table...
        </p>
      </div>
    );
  }

  // Error or idle state
  return (
    <div className="space-y-3">
      {/* Shelf location callout */}
      {shelfLocation && (
        <div className="flex items-center justify-center gap-2 text-sm text-[color:var(--color-ink-secondary)] bg-[color:var(--color-muted)] rounded-lg px-4 py-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>
            Find it at: <strong>{shelfLocation}</strong>
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || state === 'loading'}
        className="w-full px-6 py-4 bg-[color:var(--color-ink-primary)] text-[color:var(--color-surface)] text-lg font-semibold rounded-xl shadow-lg hover:opacity-90 active:opacity-80 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
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
            Checking out...
          </span>
        ) : (
          'Check Out My Game'
        )}
      </button>

      {/* Helper text */}
      <p className="text-xs text-[color:var(--color-ink-tertiary)] text-center">
        This registers the game to your table
      </p>

      {/* Error message */}
      {state === 'error' && errorMessage && (
        <div className="p-3 bg-[#f5e8e8] border border-[color:var(--color-danger)]/30 rounded-xl">
          <p className="text-sm text-[color:var(--color-danger)] text-center">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
