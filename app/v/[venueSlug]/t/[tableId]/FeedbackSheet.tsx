'use client';

/**
 * FeedbackSheet - Quick feedback modal shown at checkout.
 *
 * A low-friction feedback UI with:
 * - 5-star rating controls for game and venue ratings
 * - Optional detail section (complexity, play again, comment)
 * - Skip button for one-tap dismissal
 * - Fast submission target: <= 15 seconds
 */

import { useState } from 'react';
import { Star, X, ChevronDown, ChevronUp, Loader2, Gamepad2, Heart } from '@/components/icons';
import type { FeedbackComplexity, FeedbackReplay } from '@/lib/db/types';

// 5-star rating scale: 1=Poor, 2=Fair, 3=Average, 4=Good, 5=Excellent
type StarRating = 1 | 2 | 3 | 4 | 5 | null;

interface FeedbackSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackData) => Promise<void>;
  onSkip: () => Promise<void>;
  hasGame: boolean; // Whether to show game-specific questions
}

export interface FeedbackData {
  gameRating: StarRating;
  venueRating: StarRating;
  complexity: FeedbackComplexity | null;
  replay: FeedbackReplay | null;
  gameComment: string | null;
  venueComment: string | null;
}

// 5-star interactive rating component
function StarRatingPicker({
  value,
  onChange,
  label,
}: {
  value: StarRating;
  onChange: (rating: StarRating) => void;
  label: string;
}) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const getStarColor = (starNum: number, filled: boolean) => {
    const isHovered = hoveredRating !== null && starNum <= hoveredRating;
    const isFilled = value !== null && starNum <= value;
    const isHoveredFilled = isHovered && starNum <= hoveredRating;

    if (isHoveredFilled) {
      if (hoveredRating >= 4) return 'text-amber-400';
      if (hoveredRating === 3) return 'text-yellow-400';
      return 'text-red-400';
    }

    if (isFilled) {
      if (value >= 4) return 'text-amber-500';
      if (value === 3) return 'text-yellow-500';
      return 'text-red-500';
    }

    return 'text-[color:var(--color-structure)]';
  };

  const getRatingLabel = (rating: number | null) => {
    if (rating === null) return label;
    const labels: Record<number, string> = {
      1: 'Poor',
      2: 'Fair',
      3: 'Average',
      4: 'Good',
      5: 'Excellent',
    };
    return labels[rating] || label;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[color:var(--color-ink-primary)]">
          {label}
        </label>
        {(value !== null || hoveredRating !== null) && (
          <span className="text-xs font-medium text-[color:var(--color-accent)]">
            {getRatingLabel(hoveredRating || value)}
          </span>
        )}
      </div>
      <div className="flex gap-2 p-4 rounded-xl bg-[color:var(--color-elevated)] border border-[color:var(--color-structure)] hover:border-[color:var(--color-ink-secondary)] transition-colors">
        {[1, 2, 3, 4, 5].map((starNum) => (
          <button
            key={starNum}
            type="button"
            onClick={() => onChange(value === starNum ? null : (starNum as StarRating))}
            onMouseEnter={() => setHoveredRating(starNum)}
            onMouseLeave={() => setHoveredRating(null)}
            className="flex-1 transition-transform hover:scale-110 active:scale-95"
            aria-label={`Rate ${starNum} star${starNum !== 1 ? 's' : ''}`}
            aria-pressed={value === starNum}
          >
            <Star className={`h-8 w-8 ${getStarColor(starNum, value !== null && starNum <= value)} transition-colors`} />
          </button>
        ))}
      </div>
    </div>
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
  // State for ratings (5-star scale)
  const [gameRating, setGameRating] = useState<StarRating>(null);
  const [venueRating, setVenueRating] = useState<StarRating>(null);

  // State for optional details
  const [showDetails, setShowDetails] = useState(false);
  const [complexity, setComplexity] = useState<FeedbackComplexity | null>(null);
  const [replay, setReplay] = useState<FeedbackReplay | null>(null);
  const [gameComment, setGameComment] = useState('');
  const [venueComment, setVenueComment] = useState('');

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting || isSkipping) return;
    setIsSubmitting(true);

    try {
      await onSubmit({
        gameRating: hasGame ? gameRating : null,
        venueRating,
        complexity: hasGame ? complexity : null,
        replay: hasGame ? replay : null,
        gameComment: hasGame ? (gameComment.trim() || null) : null,
        venueComment: venueComment.trim() || null,
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
            <div className="space-y-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-blue-600" />
                <label className="text-sm font-medium text-[color:var(--color-ink-primary)]">
                  About the Game
                </label>
              </div>
              <StarRatingPicker
                value={gameRating}
                onChange={setGameRating}
                label="How did you enjoy this game?"
              />
            </div>
          )}

          {/* Divider */}
          {hasGame && <div className="border-t border-[color:var(--color-structure)]" />}

          {/* Venue Rating */}
          <div className="space-y-3 p-4 rounded-xl bg-pink-50 border border-pink-100">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-600" />
              <label className="text-sm font-medium text-[color:var(--color-ink-primary)]">
                About Your Visit
              </label>
            </div>
            <StarRatingPicker
              value={venueRating}
              onChange={setVenueRating}
              label="How was your overall experience?"
            />
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

          {/* Game Comment - only if game exists */}
          {hasGame && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[color:var(--color-ink-primary)]">
                Add details about the game <span className="font-normal text-[color:var(--color-ink-secondary)]">(optional)</span>
              </label>
              <textarea
                value={gameComment}
                onChange={(e) => setGameComment(e.target.value)}
                placeholder="What could have been better? What did you love?"
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2 text-sm border border-[color:var(--color-structure)] rounded-xl bg-[color:var(--color-elevated)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/50 resize-none"
              />
            </div>
          )}

          {/* Venue Comment - always available */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[color:var(--color-ink-primary)]">
              Add details about your visit <span className="font-normal text-[color:var(--color-ink-secondary)]">(optional)</span>
            </label>
            <textarea
              value={venueComment}
              onChange={(e) => setVenueComment(e.target.value)}
              placeholder="How was the staff? The atmosphere? The facilities?"
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
