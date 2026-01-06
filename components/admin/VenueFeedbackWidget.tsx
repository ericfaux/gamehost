'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Star, ThumbsUp, Meh, ThumbsDown, MessageSquare } from '@/components/icons';
import type { DashboardData } from '@/lib/data';

interface VenueFeedbackWidgetProps {
  feedback: DashboardData['venueFeedback'];
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

export function VenueFeedbackWidget({ feedback }: VenueFeedbackWidgetProps) {
  const { avgRating, responseCount, positiveCount, neutralCount, negativeCount, recentComments } = feedback;

  if (responseCount === 0) {
    return (
      <Card className="panel-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Venue Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[color:var(--color-ink-secondary)]">
            No feedback collected yet. Feedback will appear here once guests start leaving reviews.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="panel-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-500" />
          Venue Feedback
          <span className="text-sm font-normal text-[color:var(--color-ink-secondary)]">
            (Last 30 days)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Row */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Average Rating */}
          <div className="flex items-center gap-1.5">
            <Star className="h-5 w-5 text-amber-500" />
            <span className="text-2xl font-bold text-[color:var(--color-ink-primary)]">
              {avgRating !== null ? avgRating.toFixed(1) : '—'}
            </span>
            <span className="text-sm text-[color:var(--color-ink-secondary)]">
              ({responseCount} ratings)
            </span>
          </div>

          <div className="h-6 w-px bg-[color:var(--color-structure)]" />

          {/* Sentiment Breakdown */}
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <ThumbsUp className="h-4 w-4" />
              {positiveCount}
            </span>
            <span className="flex items-center gap-1 text-yellow-600">
              <Meh className="h-4 w-4" />
              {neutralCount}
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <ThumbsDown className="h-4 w-4" />
              {negativeCount}
            </span>
          </div>
        </div>

        {/* Recent Comments */}
        {recentComments.length > 0 && (
          <div className="border-t border-[color:var(--color-structure)] pt-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
              <span className="text-sm font-medium text-[color:var(--color-ink-primary)]">
                Recent Comments
              </span>
            </div>
            <div className="space-y-3">
              {recentComments.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="bg-[color:var(--color-elevated)] rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500" />
                      <span className="text-xs font-medium">{c.rating}</span>
                    </div>
                    <span className="text-xs text-[color:var(--color-ink-secondary)]">
                      {formatRelativeTime(c.submittedAt)}
                    </span>
                  </div>
                  <p className="text-sm text-[color:var(--color-ink-primary)]">
                    {c.comment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
