'use client';

/**
 * Client component for the "End Session & Check Out" button.
 * Opens a feedback sheet modal, then handles ending the session.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitFeedbackAndEndSessionAction } from './actions';
import { FeedbackSheet, type FeedbackData } from './FeedbackSheet';

interface EndSessionButtonProps {
  venueSlug: string;
  tableId: string;
  sessionId: string | null;
  hasGame: boolean;
}

type ButtonState = 'idle' | 'success' | 'error';

export function EndSessionButton({ venueSlug, tableId, sessionId, hasGame }: EndSessionButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<ButtonState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showFeedbackSheet, setShowFeedbackSheet] = useState(false);

  const handleClick = () => {
    if (state === 'success') return;
    setShowFeedbackSheet(true);
  };

  const handleSubmitFeedback = async (feedback: FeedbackData) => {
    if (!sessionId) {
      // Fallback: no session ID, just close the sheet
      setShowFeedbackSheet(false);
      return;
    }

    try {
      const result = await submitFeedbackAndEndSessionAction({
        sessionId,
        tableId,
        venueSlug,
        gameRating: feedback.gameRating,
        venueRating: feedback.venueRating,
        complexity: feedback.complexity,
        replay: feedback.replay,
        comment: feedback.comment,
        skipped: false,
      });

      if (result.success) {
        setState('success');
        setShowFeedbackSheet(false);
        // Refresh the page to show the "Start Session" UI state
        router.refresh();
      } else {
        setErrorMessage(result.error ?? 'Something went wrong');
        setState('error');
      }
    } catch (error) {
      console.error('End session error:', error);
      setErrorMessage('Something went wrong. Please try again.');
      setState('error');
    }
  };

  const handleSkipFeedback = async () => {
    if (!sessionId) {
      // Fallback: no session ID, just close the sheet
      setShowFeedbackSheet(false);
      return;
    }

    try {
      const result = await submitFeedbackAndEndSessionAction({
        sessionId,
        tableId,
        venueSlug,
        skipped: true,
      });

      if (result.success) {
        setState('success');
        setShowFeedbackSheet(false);
        // Refresh the page to show the "Start Session" UI state
        router.refresh();
      } else {
        setErrorMessage(result.error ?? 'Something went wrong');
        setState('error');
      }
    } catch (error) {
      console.error('Skip feedback error:', error);
      setErrorMessage('Something went wrong. Please try again.');
      setState('error');
    }
  };

  const getButtonContent = () => {
    switch (state) {
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
      'inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium rounded-xl transition-colors focus-ring';

    switch (state) {
      case 'success':
        return `${baseClasses} text-white bg-[color:var(--color-success)]`;
      case 'error':
        return `${baseClasses} text-white bg-[color:var(--color-danger)] hover:opacity-90`;
      default:
        return `${baseClasses} text-white bg-[color:var(--color-danger)] hover:opacity-90`;
    }
  };

  return (
    <>
      <div className="space-y-2">
        <button
          onClick={handleClick}
          disabled={state === 'success'}
          className={getButtonClasses()}
        >
          {getButtonContent()}
        </button>
        {errorMessage && (
          <p className="text-sm text-[color:var(--color-danger)]">{errorMessage}</p>
        )}
      </div>

      <FeedbackSheet
        isOpen={showFeedbackSheet}
        onClose={() => setShowFeedbackSheet(false)}
        onSubmit={handleSubmitFeedback}
        onSkip={handleSkipFeedback}
        hasGame={hasGame}
      />
    </>
  );
}
