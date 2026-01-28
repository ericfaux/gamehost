'use client';

import type { FeedbackStats } from '@/lib/db/types';
import { Card, CardContent } from '@/components/ui/card';
import { Star, MessageSquare, ThumbsUp, Meh, ThumbsDown, BarChart3, Gamepad2, Heart } from '@/components/icons';

interface FeedbackSummaryHeaderProps {
  stats: FeedbackStats;
  isLoading?: boolean;
}

interface SentimentBarProps {
  positive: number;
  neutral: number;
  negative: number;
}

function SentimentBar({ positive, neutral, negative }: SentimentBarProps) {
  const total = positive + neutral + negative;
  if (total === 0) return null;

  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <div className="flex items-center gap-2">
      {/* Bar */}
      <div className="flex h-2 w-32 overflow-hidden rounded-full bg-[color:var(--color-muted)]">
        {positive > 0 && (
          <div
            className="bg-[color:var(--color-success)]"
            style={{ width: `${pct(positive)}%` }}
            title={`${pct(positive)}% positive`}
          />
        )}
        {neutral > 0 && (
          <div
            className="bg-[color:var(--color-warn)]"
            style={{ width: `${pct(neutral)}%` }}
            title={`${pct(neutral)}% neutral`}
          />
        )}
        {negative > 0 && (
          <div
            className="bg-[color:var(--color-danger)]"
            style={{ width: `${pct(negative)}%` }}
            title={`${pct(negative)}% negative`}
          />
        )}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
        <ThumbsUp className="h-3 w-3 text-[color:var(--color-success)]" />
        <span>{positive}</span>
        <Meh className="h-3 w-3 text-[color:var(--color-warn)]" />
        <span>{neutral}</span>
        <ThumbsDown className="h-3 w-3 text-[color:var(--color-danger)]" />
        <span>{negative}</span>
      </div>
    </div>
  );
}

function SkeletonStat() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-4 w-4 rounded bg-[color:var(--color-muted)] animate-pulse" />
      <div className="h-7 w-10 rounded bg-[color:var(--color-muted)] animate-pulse" />
      <div className="h-4 w-16 rounded bg-[color:var(--color-muted)] animate-pulse" />
    </div>
  );
}

function SkeletonSentimentBar() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-32 rounded-full bg-[color:var(--color-muted)] animate-pulse" />
      <div className="h-3 w-24 rounded bg-[color:var(--color-muted)] animate-pulse" />
    </div>
  );
}

export function FeedbackSummaryHeader({ stats, isLoading }: FeedbackSummaryHeaderProps) {
  if (isLoading) {
    return (
      <Card className="panel-surface">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SkeletonStat />
            <div className="h-8 w-px bg-[color:var(--color-structure)]" />
            <SkeletonStat />
            <div className="h-8 w-px bg-[color:var(--color-structure)]" />
            <SkeletonStat />
            <div className="h-8 w-px bg-[color:var(--color-structure)]" />
            <SkeletonStat />
            <div className="h-8 w-px bg-[color:var(--color-structure)]" />
            <SkeletonSentimentBar />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasNoResponses = stats.totalResponses === 0;

  return (
    <Card className="panel-surface">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Response Count */}
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
            <span className="text-2xl font-bold text-ink-primary">
              {stats.totalResponses}
            </span>
            <span className="text-sm text-ink-secondary">responses</span>
          </div>

          <div className="h-8 w-px bg-[color:var(--color-structure)]" />

          {/* Average Game Rating */}
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-blue-600" />
            <span className="text-2xl font-bold text-ink-primary">
              {stats.avgGameRating !== null ? stats.avgGameRating.toFixed(1) : '—'}
            </span>
            <span className="text-sm text-ink-secondary">game avg</span>
          </div>

          <div className="h-8 w-px bg-[color:var(--color-structure)]" />

          {/* Average Venue Rating */}
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-600" />
            <span className="text-2xl font-bold text-ink-primary">
              {stats.avgVenueRating !== null ? stats.avgVenueRating.toFixed(1) : '—'}
            </span>
            <span className="text-sm text-ink-secondary">venue avg</span>
          </div>

          <div className="h-8 w-px bg-[color:var(--color-structure)]" />

          {/* Comment Count */}
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
            <span className="text-2xl font-bold text-ink-primary">
              {stats.commentCount}
            </span>
            <span className="text-sm text-ink-secondary">with comments</span>
          </div>

          {/* Sentiment Distribution - only show if there are responses */}
          {!hasNoResponses && (
            <>
              <div className="h-8 w-px bg-[color:var(--color-structure)]" />
              <SentimentBar
                positive={stats.positiveCount}
                neutral={stats.neutralCount}
                negative={stats.negativeCount}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
