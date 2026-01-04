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
  const hasNoActivity = recentEnded.length === 0 && recentFeedback.length === 0;

  return (
    <div className="flex flex-col" role="region" aria-label="Recent activity">
      {/* Recently Ended Section */}
      <section className="flex flex-col" aria-labelledby="recently-ended-heading">
        <h3
          id="recently-ended-heading"
          className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-ink-secondary)] px-1 pb-2"
        >
          <Clock className="w-4 h-4" aria-hidden="true" />
          Recently Ended
        </h3>
        <div className="flex flex-col divide-y divide-[color:var(--color-structure)]">
          {recentEnded.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-[color:var(--color-ink-secondary)]">
                No sessions yet today
              </p>
              <p className="text-xs text-[color:var(--color-ink-secondary)]/70 mt-1">
                Sessions will appear here as tables check out
              </p>
            </div>
          ) : (
            recentEnded.map((session) => (
              <article
                key={session.id}
                className="flex items-center justify-between py-2.5 gap-3 transition-colors duration-150 hover:bg-[color:var(--color-muted)]/30"
                aria-label={`${session.tableLabel}: ${session.gameTitle || 'No game'}, ${formatDuration(session.durationMinutes)}, ${formatTimeAgo(session.endedAt)}`}
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
                  <span aria-label={`Duration: ${formatDuration(session.durationMinutes)}`}>
                    {formatDuration(session.durationMinutes)}
                  </span>
                  <time dateTime={session.endedAt} aria-label={`Ended ${formatTimeAgo(session.endedAt)}`}>
                    {formatTimeAgo(session.endedAt)}
                  </time>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-[color:var(--color-structure)] my-4" role="separator" />

      {/* Recent Feedback Section */}
      <section className="flex flex-col" aria-labelledby="recent-feedback-heading">
        <h3
          id="recent-feedback-heading"
          className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-ink-secondary)] px-1 pb-2"
        >
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          Recent Feedback
        </h3>
        <div className="flex flex-col divide-y divide-[color:var(--color-structure)]">
          {recentFeedback.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-[color:var(--color-ink-secondary)]">
                No feedback yet
              </p>
              <p className="text-xs text-[color:var(--color-ink-secondary)]/70 mt-1">
                Feedback from guests will appear here
              </p>
            </div>
          ) : (
            recentFeedback.map((feedback) => {
              const negative = isNegativeFeedback(feedback);
              const displayRating = feedback.gameRating ?? feedback.venueRating ?? 0;

              return (
                <article
                  key={feedback.id}
                  className={cn(
                    'flex flex-col gap-1.5 py-2.5 px-2 -mx-2 rounded-lg transition-colors duration-150',
                    negative ? 'bg-[color:var(--color-warn)]/10' : 'hover:bg-[color:var(--color-muted)]/30',
                  )}
                  aria-label={`${feedback.tableLabel}: ${displayRating} star${displayRating !== 1 ? 's' : ''}, ${formatTimeAgo(feedback.submittedAt)}${feedback.comment ? `, "${feedback.comment}"` : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[color:var(--color-ink-secondary)] bg-[color:var(--color-muted)] px-1.5 py-0.5 rounded">
                        {feedback.tableLabel}
                      </span>
                      <StarRating rating={displayRating} />
                    </div>
                    <time
                      dateTime={feedback.submittedAt}
                      className="text-xs text-[color:var(--color-ink-secondary)]"
                    >
                      {formatTimeAgo(feedback.submittedAt)}
                    </time>
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
                      "{feedback.comment}"
                    </p>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
