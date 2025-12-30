'use client';

/**
 * FeedbackSheet - Quick feedback modal shown at checkout.
 *
 * A low-friction feedback UI with:
 * - 3-option sentiment controls for game and venue ratings
 * - Optional detail section (complexity, play again, comment)
 * - Skip button for one-tap dismissal
 * - Fast submission target: <= 15 seconds
 */

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Meh, X, ChevronDown, ChevronUp, Loader2 } from '@/components/icons';
import type { FeedbackComplexity, FeedbackReplay } from '@/lib/db/types';

// Sentiment value mapping: 👎 = 1, 😐 = 3, 👍 = 5
type SentimentValue = 1 | 3 | 5 | null;

interface FeedbackSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackData) => Promise<void>;
  onSkip: () => Promise<void>;
  hasGame: boolean; // Whether to show game-specific questions
}

export interface FeedbackData {
  gameRating: SentimentValue;
  venueRating: SentimentValue;
  complexity: FeedbackComplexity | null;
  replay: FeedbackReplay | null;
  comment: string | null;
}

function SentimentButton({
  value,
  selected,
  onClick,
  icon: Icon,
  label,
  color,
}: {
  value: SentimentValue;
  selected: boolean;
  onClick: () => void;
  icon: typeof ThumbsUp;
  label: string;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
        selected
          ? `${color} border-current bg-current/10`
          : 'border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)] hover:border-[color:var(--color-ink-secondary)]'
      }`}
      aria-pressed={selected}
      aria-label={label}
    >
      <Icon className="h-7 w-7" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function ChipButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
        selected
          ? 'bg-[color:var(--color-ink-primary)] text-[color:var(--color-surface)]'
          : 'bg-[color:var(--color-muted)] text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-structure)]'
      }`}
      aria-pressed={selected}
    >
      {children}
    </button>
  );
}

export function FeedbackSheet({
  isOpen,
  onClose,
  onSubmit,
  onSkip,
  hasGame,
}: FeedbackSheetProps) {
  // State for ratings
  const [gameRating, setGameRating] = useState<SentimentValue>(null);
  const [venueRating, setVenueRating] = useState<SentimentValue>(null);

  // State for optional details
  const [showDetails, setShowDetails] = useState(false);
  const [complexity, setComplexity] = useState<FeedbackComplexity | null>(null);
  const [replay, setReplay] = useState<FeedbackReplay | null>(null);
  const [comment, setComment] = useState('');

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  // Check if we have at least one rating selected
  const hasAnyRating = (hasGame && gameRating !== null) || venueRating !== null;

  const handleSubmit = async () => {
    if (isSubmitting || isSkipping) return;
    setIsSubmitting(true);

    try {
      await onSubmit({
        gameRating: hasGame ? gameRating : null,
        venueRating,
        complexity: hasGame ? complexity : null,
        replay: hasGame ? replay : null,
        comment: comment.trim() || null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (isSubmitting || isSkipping) return;
    setIsSkipping(true);

    try {
      await onSkip();
    } finally {
      setIsSkipping(false);
    }
  };

  if (!isOpen) return null;

  const isLoading = isSubmitting || isSkipping;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isLoading ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-[color:var(--color-surface)] rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[color:var(--color-structure)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-[color:var(--color-structure)]">
          <h2 className="text-lg font-semibold text-[color:var(--color-ink-primary)]">
            Quick feedback
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-2 rounded-full hover:bg-[color:var(--color-muted)] transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-[color:var(--color-ink-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Game Rating - only shown if there's a game */}
          {hasGame && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-[color:var(--color-ink-primary)]">
                How was the game?
              </label>
              <div className="grid grid-cols-3 gap-3">
                <SentimentButton
                  value={1}
                  selected={gameRating === 1}
                  onClick={() => setGameRating(gameRating === 1 ? null : 1)}
                  icon={ThumbsDown}
                  label="Not great"
                  color="text-[color:var(--color-danger)]"
                />
                <SentimentButton
                  value={3}
                  selected={gameRating === 3}
                  onClick={() => setGameRating(gameRating === 3 ? null : 3)}
                  icon={Meh}
                  label="It's okay"
                  color="text-[color:var(--color-warning)]"
                />
                <SentimentButton
                  value={5}
                  selected={gameRating === 5}
                  onClick={() => setGameRating(gameRating === 5 ? null : 5)}
                  icon={ThumbsUp}
                  label="Loved it!"
                  color="text-[color:var(--color-success)]"
                />
              </div>
            </div>
          )}

          {/* Venue Rating */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[color:var(--color-ink-primary)]">
              How was your experience here?
            </label>
            <div className="grid grid-cols-3 gap-3">
              <SentimentButton
                value={1}
                selected={venueRating === 1}
                onClick={() => setVenueRating(venueRating === 1 ? null : 1)}
                icon={ThumbsDown}
                label="Not great"
                color="text-[color:var(--color-danger)]"
              />
              <SentimentButton
                value={3}
                selected={venueRating === 3}
                onClick={() => setVenueRating(venueRating === 3 ? null : 3)}
                icon={Meh}
                label="It's okay"
                color="text-[color:var(--color-warning)]"
              />
              <SentimentButton
                value={5}
                selected={venueRating === 5}
                onClick={() => setVenueRating(venueRating === 5 ? null : 5)}
                icon={ThumbsUp}
                label="Great!"
                color="text-[color:var(--color-success)]"
              />
            </div>
          </div>

          {/* Add detail toggle - only show if game exists */}
          {hasGame && (
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm font-medium text-[color:var(--color-accent)] hover:underline"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Add detail
                </>
              )}
            </button>
          )}

          {/* Optional details - expanded */}
          {showDetails && hasGame && (
            <div className="space-y-5 pt-2 border-t border-[color:var(--color-structure)]">
              {/* Complexity */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--color-ink-primary)]">
                  Complexity felt
                </label>
                <div className="flex flex-wrap gap-2">
                  <ChipButton
                    selected={complexity === 'too_simple'}
                    onClick={() => setComplexity(complexity === 'too_simple' ? null : 'too_simple')}
                  >
                    Too simple
                  </ChipButton>
                  <ChipButton
                    selected={complexity === 'just_right'}
                    onClick={() => setComplexity(complexity === 'just_right' ? null : 'just_right')}
                  >
                    Just right
                  </ChipButton>
                  <ChipButton
                    selected={complexity === 'too_complex'}
                    onClick={() => setComplexity(complexity === 'too_complex' ? null : 'too_complex')}
                  >
                    Too complex
                  </ChipButton>
                </div>
              </div>

              {/* Play again */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--color-ink-primary)]">
                  Would you play again?
                </label>
                <div className="flex flex-wrap gap-2">
                  <ChipButton
                    selected={replay === 'definitely'}
                    onClick={() => setReplay(replay === 'definitely' ? null : 'definitely')}
                  >
                    Definitely
                  </ChipButton>
                  <ChipButton
                    selected={replay === 'maybe'}
                    onClick={() => setReplay(replay === 'maybe' ? null : 'maybe')}
                  >
                    Maybe
                  </ChipButton>
                  <ChipButton
                    selected={replay === 'no'}
                    onClick={() => setReplay(replay === 'no' ? null : 'no')}
                  >
                    No
                  </ChipButton>
                </div>
              </div>
            </div>
          )}

          {/* Comment - always available */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[color:var(--color-ink-primary)]">
              Anything you want to say? <span className="font-normal text-[color:var(--color-ink-secondary)]">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts..."
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 text-sm border border-[color:var(--color-structure)] rounded-xl bg-[color:var(--color-elevated)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/50 resize-none"
            />
          </div>
        </div>

        {/* Footer - Actions */}
        <div className="px-4 py-4 border-t border-[color:var(--color-structure)] space-y-3 bg-[color:var(--color-elevated)]">
          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full px-6 py-3 text-base font-semibold text-[color:var(--color-surface)] bg-[color:var(--color-ink-primary)] hover:opacity-90 active:opacity-80 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit & Check Out'
            )}
          </button>

          {/* Skip button */}
          <button
            type="button"
            onClick={handleSkip}
            disabled={isLoading}
            className="w-full px-6 py-2 text-sm font-medium text-[color:var(--color-ink-secondary)] hover:text-[color:var(--color-ink-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSkipping ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Skipping...
              </>
            ) : (
              'Skip feedback'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
