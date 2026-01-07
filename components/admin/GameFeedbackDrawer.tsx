'use client';

/**
 * GameFeedbackDrawer - Slide-out drawer showing detailed feedback for a specific game.
 *
 * Features:
 * - Summary header with avg rating and response count
 * - Rating distribution (positive/neutral/negative)
 * - Complexity breakdown (if any)
 * - Play-again breakdown (if any)
 * - Recent comments list
 */

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import {
  X,
  Star,
  ThumbsUp,
  Meh,
  ThumbsDown,
  Repeat,
  MessageSquare,
  Loader2,
  ExternalLink,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/AppShell';
import { Game } from '@/lib/db/types';
import { getGameFeedbackAction } from '@/app/admin/sessions/actions';
import type { GameFeedbackDetail } from '@/lib/data';

interface GameFeedbackDrawerProps {
  game: Game;
  venueId: string;
  isOpen: boolean;
  onClose: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } else if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else if (diffMins > 0) {
    return `${diffMins}m ago`;
  }
  return 'Just now';
}

function DistributionBar({
  positive,
  neutral,
  negative,
}: {
  positive: number;
  neutral: number;
  negative: number;
}) {
  const total = positive + neutral + negative;
  if (total === 0) return null;

  const positivePercent = Math.round((positive / total) * 100);
  const neutralPercent = Math.round((neutral / total) * 100);
  const negativePercent = Math.round((negative / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden bg-[color:var(--color-muted)]">
        {positivePercent > 0 && (
          <div
            className="bg-green-500"
            style={{ width: `${positivePercent}%` }}
            title={`Positive: ${positivePercent}%`}
          />
        )}
        {neutralPercent > 0 && (
          <div
            className="bg-yellow-500"
            style={{ width: `${neutralPercent}%` }}
            title={`Neutral: ${neutralPercent}%`}
          />
        )}
        {negativePercent > 0 && (
          <div
            className="bg-red-500"
            style={{ width: `${negativePercent}%` }}
            title={`Negative: ${negativePercent}%`}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-[color:var(--color-ink-secondary)]">
        <div className="flex items-center gap-1">
          <ThumbsUp className="h-3 w-3 text-green-500" />
          <span>{positive}</span>
        </div>
        <div className="flex items-center gap-1">
          <Meh className="h-3 w-3 text-yellow-500" />
          <span>{neutral}</span>
        </div>
        <div className="flex items-center gap-1">
          <ThumbsDown className="h-3 w-3 text-red-500" />
          <span>{negative}</span>
        </div>
      </div>
    </div>
  );
}

export function GameFeedbackDrawer({
  game,
  venueId,
  isOpen,
  onClose,
}: GameFeedbackDrawerProps) {
  const { push } = useToast();
  const [isPending, startTransition] = useTransition();
  const [detail, setDetail] = useState<GameFeedbackDetail | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Fetch details when drawer opens
  useEffect(() => {
    if (isOpen && !hasLoaded) {
      startTransition(async () => {
        const result = await getGameFeedbackAction({ venueId, gameId: game.id });
        if (result.ok) {
          setDetail(result.detail);
        } else {
          push({
            title: 'Error',
            description: result.error ?? 'Failed to load feedback',
            tone: 'danger',
          });
        }
        setHasLoaded(true);
      });
    }
  }, [isOpen, hasLoaded, venueId, game.id, push]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setDetail(null);
      setHasLoaded(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-[color:var(--color-surface)] shadow-2xl border-l border-[color:var(--color-structure)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-[color:var(--color-structure)] bg-[color:var(--color-elevated)]">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-[color:var(--color-ink-secondary)] mb-1">
              Feedback for
            </p>
            <h2 className="text-xl font-bold text-[color:var(--color-ink-primary)] truncate">
              {game.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-xl hover:bg-[color:var(--color-muted)] transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5 text-[color:var(--color-ink-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isPending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--color-ink-secondary)]" />
            </div>
          ) : !detail ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto bg-[color:var(--color-muted)] rounded-full flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6 text-[color:var(--color-ink-secondary)]" />
              </div>
              <p className="text-[color:var(--color-ink-secondary)]">
                No feedback yet for this game
              </p>
              <p className="text-xs text-[color:var(--color-ink-secondary)] mt-1">
                Feedback from the last 90 days will appear here
              </p>
            </div>
          ) : (
            <>
              {/* Summary Header */}
              <div className="panel-surface p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    <span className="text-2xl font-bold text-[color:var(--color-ink-primary)]">
                      {detail.avgRating !== null ? detail.avgRating.toFixed(1) : '—'}
                    </span>
                  </div>
                  <span className="text-sm text-[color:var(--color-ink-secondary)]">
                    {detail.responseCount} {detail.responseCount === 1 ? 'response' : 'responses'}
                  </span>
                </div>

                {/* Rating Distribution */}
                <DistributionBar
                  positive={detail.positiveCount}
                  neutral={detail.neutralCount}
                  negative={detail.negativeCount}
                />
              </div>

              {/* Play Again Breakdown */}
              {(detail.playAgainYes + detail.playAgainMaybe + detail.playAgainNo) > 0 && (
                <div className="panel-surface p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Repeat className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
                    <span className="text-sm font-medium text-[color:var(--color-ink-primary)]">
                      Would play again?
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="panel-surface p-2">
                      <div className="text-lg font-semibold text-green-600">
                        {detail.playAgainYes}
                      </div>
                      <div className="text-xs text-[color:var(--color-ink-secondary)]">
                        Definitely
                      </div>
                    </div>
                    <div className="panel-surface p-2">
                      <div className="text-lg font-semibold text-yellow-600">
                        {detail.playAgainMaybe}
                      </div>
                      <div className="text-xs text-[color:var(--color-ink-secondary)]">
                        Maybe
                      </div>
                    </div>
                    <div className="panel-surface p-2">
                      <div className="text-lg font-semibold text-red-600">
                        {detail.playAgainNo}
                      </div>
                      <div className="text-xs text-[color:var(--color-ink-secondary)]">
                        No
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Complexity Breakdown */}
              {(detail.complexityTooSimple + detail.complexityJustRight + detail.complexityTooComplex) > 0 && (
                <div className="panel-surface p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-[color:var(--color-ink-primary)]">
                      Complexity felt
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="panel-surface p-2">
                      <div className="text-lg font-semibold text-blue-600">
                        {detail.complexityTooSimple}
                      </div>
                      <div className="text-xs text-[color:var(--color-ink-secondary)]">
                        Too simple
                      </div>
                    </div>
                    <div className="panel-surface p-2">
                      <div className="text-lg font-semibold text-green-600">
                        {detail.complexityJustRight}
                      </div>
                      <div className="text-xs text-[color:var(--color-ink-secondary)]">
                        Just right
                      </div>
                    </div>
                    <div className="panel-surface p-2">
                      <div className="text-lg font-semibold text-orange-600">
                        {detail.complexityTooComplex}
                      </div>
                      <div className="text-xs text-[color:var(--color-ink-secondary)]">
                        Too complex
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Comments */}
              {detail.recentComments.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-[color:var(--color-ink-primary)] mb-3">
                    Recent comments
                  </h3>
                  <div className="space-y-3">
                    {detail.recentComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="panel-surface p-3"
                      >
                        {/* Rating + Timestamp row */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            {comment.rating !== null && (
                              <>
                                <Star className="h-3 w-3 text-amber-500" />
                                <span className="text-xs font-medium text-[color:var(--color-ink-primary)]">
                                  {comment.rating}
                                </span>
                              </>
                            )}
                          </div>
                          <span className="text-xs text-[color:var(--color-ink-secondary)]">
                            {formatRelativeTime(comment.submittedAt)}
                          </span>
                        </div>
                        {/* Comment text */}
                        <p className="text-sm text-[color:var(--color-ink-primary)]">
                          &ldquo;{comment.comment}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] space-y-3">
          <Link
            href={`/admin/feedback?q=${encodeURIComponent(game.title)}&range=90d`}
            className="text-sm text-[color:var(--color-accent)] hover:underline flex items-center justify-center gap-1"
          >
            View full history
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Button
            variant="secondary"
            className="w-full"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </>
  );
}
