'use client';

import { useState } from 'react';
import type { FeedbackHistoryRow } from '@/lib/db/types';
import { ChevronDown, ThumbsUp, Meh, ThumbsDown } from '@/components/icons';
import { TokenChip } from '@/components/AppShell';
import { formatDistanceToNow, format, differenceInMinutes } from 'date-fns';

interface FeedbackRowProps {
  row: FeedbackHistoryRow;
}

function RatingBadge({ rating }: { rating: number | null }) {
  if (rating === null) {
    return <span className="text-sm text-ink-secondary">—</span>;
  }

  const config = {
    5: { icon: ThumbsUp, color: 'text-[color:var(--color-success)]', bg: 'bg-green-50' },
    3: { icon: Meh, color: 'text-[color:var(--color-warn)]', bg: 'bg-amber-50' },
    1: { icon: ThumbsDown, color: 'text-[color:var(--color-danger)]', bg: 'bg-red-50' },
  }[rating] || { icon: Meh, color: 'text-ink-secondary', bg: 'bg-muted' };

  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg}`}>
      <Icon className={`h-3 w-3 ${config.color}`} />
      <span className={`text-xs font-medium ${config.color}`}>{rating}</span>
    </div>
  );
}

function formatDuration(startedAt: string, endedAt: string): string {
  const minutes = differenceInMinutes(new Date(endedAt), new Date(startedAt));
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

export function FeedbackRow({ row }: FeedbackRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <>
      <div
        className="flex items-center gap-4 px-4 py-3 hover:bg-[color:var(--color-muted)] cursor-pointer transition-colors border-b border-[color:var(--color-structure)]"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        {/* Date */}
        <div className="w-[140px] shrink-0">
          <span
            className="text-sm text-ink-primary"
            title={format(new Date(row.submittedAt), 'PPpp')}
          >
            {formatDistanceToNow(new Date(row.submittedAt), { addSuffix: true })}
          </span>
        </div>

        {/* Table */}
        <div className="w-[100px] shrink-0">
          <TokenChip tone="muted">{row.tableLabel || '—'}</TokenChip>
        </div>

        {/* Game */}
        <div className="flex-1 min-w-0">
          <span className="text-sm text-ink-primary truncate block">
            {row.gameTitle || <span className="text-ink-secondary">No game selected</span>}
          </span>
        </div>

        {/* Game Rating */}
        <div className="w-[80px] shrink-0">
          <RatingBadge rating={row.gameRating} />
        </div>

        {/* Venue Rating */}
        <div className="w-[80px] shrink-0">
          <RatingBadge rating={row.venueRating} />
        </div>

        {/* Comment Preview + Chevron */}
        <div className="w-[200px] shrink-0 flex items-center gap-2">
          {row.comment ? (
            <span className="text-sm text-ink-secondary truncate flex-1">
              {row.comment}
            </span>
          ) : (
            <span className="text-sm text-ink-secondary flex-1">—</span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-ink-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Expanded Detail Panel */}
      {isExpanded && (
        <div className="px-4 py-4 bg-[color:var(--color-muted)] border-b border-[color:var(--color-structure)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Session Duration */}
            <div>
              <p className="text-xs uppercase tracking-rulebook text-ink-secondary mb-1">Duration</p>
              <p className="text-sm text-ink-primary">
                {formatDuration(row.startedAt, row.endedAt)}
              </p>
            </div>

            {/* Complexity Felt (if game feedback) */}
            {row.complexity && (
              <div>
                <p className="text-xs uppercase tracking-rulebook text-ink-secondary mb-1">Complexity felt</p>
                <p className="text-sm text-ink-primary capitalize">
                  {row.complexity.replace('_', ' ')}
                </p>
              </div>
            )}

            {/* Would Play Again (if game feedback) */}
            {row.replay && (
              <div>
                <p className="text-xs uppercase tracking-rulebook text-ink-secondary mb-1">Play again?</p>
                <p className="text-sm text-ink-primary capitalize">{row.replay}</p>
              </div>
            )}

            {/* Source */}
            <div>
              <p className="text-xs uppercase tracking-rulebook text-ink-secondary mb-1">Source</p>
              <TokenChip tone="muted">
                {row.source === 'end_sheet' ? 'Guest checkout' :
                  row.source === 'staff_prompt' ? 'Staff prompt' : 'Timer prompt'}
              </TokenChip>
            </div>
          </div>

          {/* Full Comment */}
          {row.comment && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-rulebook text-ink-secondary mb-1">Game Comment</p>
              <p className="text-sm text-ink-primary whitespace-pre-wrap">{row.comment}</p>
            </div>
          )}

          {/* Venue Comment */}
          {row.venueComment && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-rulebook text-ink-secondary mb-1">Venue Comment</p>
              <p className="text-sm text-ink-primary whitespace-pre-wrap">{row.venueComment}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
