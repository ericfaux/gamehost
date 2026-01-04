'use client';

import { cn } from '@/lib/utils';
import { Clock, Star, MessageSquare } from '@/components/icons';
import type { RecentEndedSession, RecentFeedback } from '@/lib/data/dashboard';

export interface ActivityFeedProps {
  recentEnded: RecentEndedSession[];
  recentFeedback: RecentFeedback[];
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'w-3 h-3',
            star <= rating
              ? 'fill-[color:var(--color-warn)] text-[color:var(--color-warn)]'
              : 'text-[color:var(--color-structure)]',
          )}
        />
      ))}
    </span>
  );
}

function isNegativeFeedback(feedback: RecentFeedback): boolean {
  const gameRating = feedback.gameRating ?? 5;
  const venueRating = feedback.venueRating ?? 5;
  return gameRating <= 2 || venueRating <= 2;
}

/**
 * ActivityFeed - Compact feed of recent activity.
 * Shows recently ended sessions and recent feedback with negative highlights.
 */
export function ActivityFeed({ recentEnded, recentFeedback }: ActivityFeedProps) {
  return (
    <div className="flex flex-col">
      {/* Recently Ended Section */}
      <div className="flex flex-col">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-ink-secondary)] px-1 pb-2">
          <Clock className="w-4 h-4" />
          Recently Ended
        </h3>
        <div className="flex flex-col divide-y divide-[color:var(--color-structure)]">
          {recentEnded.length === 0 ? (
            <div className="py-3 text-sm text-[color:var(--color-ink-secondary)]">
              No recent sessions
            </div>
          ) : (
            recentEnded.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between py-2.5 gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-[color:var(--color-ink-secondary)] bg-[color:var(--color-muted)] px-1.5 py-0.5 rounded shrink-0">
                    {session.tableLabel}
                  </span>
                  <span className="text-sm text-[color:var(--color-ink-primary)] truncate">
                    {session.gameTitle || 'No game'}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs text-[color:var(--color-ink-secondary)]">
                  <span>{formatDuration(session.durationMinutes)}</span>
                  <span>{formatTimeAgo(session.endedAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[color:var(--color-structure)] my-4" />

      {/* Recent Feedback Section */}
      <div className="flex flex-col">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-ink-secondary)] px-1 pb-2">
          <MessageSquare className="w-4 h-4" />
          Recent Feedback
        </h3>
        <div className="flex flex-col divide-y divide-[color:var(--color-structure)]">
          {recentFeedback.length === 0 ? (
            <div className="py-3 text-sm text-[color:var(--color-ink-secondary)]">
              No recent feedback
            </div>
          ) : (
            recentFeedback.map((feedback) => {
              const negative = isNegativeFeedback(feedback);
              const displayRating = feedback.gameRating ?? feedback.venueRating ?? 0;

              return (
                <div
                  key={feedback.id}
                  className={cn(
                    'flex flex-col gap-1.5 py-2.5 px-2 -mx-2 rounded-lg',
                    negative && 'bg-[color:var(--color-warn)]/10',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[color:var(--color-ink-secondary)] bg-[color:var(--color-muted)] px-1.5 py-0.5 rounded">
                        {feedback.tableLabel}
                      </span>
                      <StarRating rating={displayRating} />
                    </div>
                    <span className="text-xs text-[color:var(--color-ink-secondary)]">
                      {formatTimeAgo(feedback.submittedAt)}
                    </span>
                  </div>
                  {feedback.comment && (
                    <p
                      className={cn(
                        'text-sm truncate',
                        negative
                          ? 'text-[color:var(--color-warn)]'
                          : 'text-[color:var(--color-ink-secondary)]',
                      )}
                    >
                      {feedback.comment}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
