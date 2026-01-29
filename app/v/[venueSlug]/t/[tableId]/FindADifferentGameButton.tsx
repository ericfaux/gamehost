'use client';

/**
 * FindADifferentGameButton - Client component for clearing game and returning to browse options.
 *
 * Clears the game from the active session and navigates back to the table page,
 * showing the browsing options (Option A and B) instead of the game details.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { clearGameFromSessionAction } from './actions';

interface FindADifferentGameButtonProps {
  venueSlug: string;
  tableId: string;
}

type ButtonState = 'idle' | 'loading' | 'error';

export function FindADifferentGameButton({
  venueSlug,
  tableId,
}: FindADifferentGameButtonProps) {
  const [state, setState] = useState<ButtonState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = async () => {
    if (state === 'loading' || isPending) {
      return;
    }

    setState('loading');
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const result = await clearGameFromSessionAction(venueSlug, tableId);

        if (result.success) {
          // Navigate back to table page, which will now show browsing options
          router.push(`/v/${venueSlug}/t/${tableId}`);
        } else {
          setState('error');
          setErrorMessage(result.error || 'Something went wrong. Please try again.');
        }
      } catch (error) {
        setState('error');
        setErrorMessage('Failed to clear game. Please try again.');
      }
    });
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || state === 'loading'}
        className="inline-flex items-center justify-center w-full px-6 py-4 text-lg font-semibold text-[color:var(--color-surface)] bg-[color:var(--color-ink-primary)] hover:opacity-90 active:opacity-80 rounded-xl shadow-[var(--shadow-token)] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
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
            Finding another game...
          </span>
        ) : (
          <>
            Find a different game
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
        )}
      </button>

      {/* Error message */}
      {state === 'error' && errorMessage && (
        <div className="p-3 bg-[#f5e8e8] border border-[color:var(--color-danger)]/30 rounded-xl">
          <p className="text-sm text-[color:var(--color-danger)] text-center">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
