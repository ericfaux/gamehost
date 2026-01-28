'use client';

import { useState } from 'react';
import type { FeedbackHistoryRow } from '@/lib/db/types';
import { ChevronDown, ThumbsUp, Meh, ThumbsDown, Gamepad2, Heart } from '@/components/icons';
import { TokenChip } from '@/components/AppShell';
import { formatDistanceToNow, format, differenceInMinutes } from 'date-fns';

interface FeedbackRowProps {
  row: FeedbackHistoryRow;
}

function RatingBadge({ rating, type }: { rating: number | null; type?: 'game' | 'venue' }) {
  if (rating === null) {
    return <span className="text-sm text-ink-secondary">—</span>;
  }

  const config = {
    5: { icon: ThumbsUp, color: 'text-[color:var(--color-success)]', bg: 'bg-green-50' },
    3: { icon: Meh, color: 'text-[color:var(--color-warn)]', bg: 'bg-amber-50' },
    1: { icon: ThumbsDown, color: 'text-[color:var(--color-danger)]', bg: 'bg-red-50' },
  }[rating] || { icon: Meh, color: 'text-ink-secondary', bg: 'bg-muted' };

  const Icon = config.icon;
  const typeIcon = type === 'game' ? Gamepad2 : type === 'venue' ? Heart : null;
  const TypeIcon = typeIcon;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg}`}>
      {TypeIcon && <TypeIcon className={`h-3 w-3 ${type === 'game' ? 'text-blue-600' : 'text-pink-600'}`} />}
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
        className="flex items-center gap-4 px-4 py-3 hover:bg-[color:var(--color-muted)] cursor-pointer transition-colors border-b border-[color:var(--color-structure)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-accent)]"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`Feedback from ${row.tableLabel || 'unknown table'} on ${format(new Date(row.submittedAt), 'PPP')}${row.gameTitle ? ` for ${row.gameTitle}` : ''}`}
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
          <RatingBadge rating={row.gameRating} type="game" />
        </div>

        {/* Venue Rating */}
        <div className="w-[80px] shrink-0">
          <RatingBadge rating={row.venueRating} type="venue" />
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

      {/* Expanded Detail Panel - uses CSS grid for smooth height animation */}
      <div
        className={`
          grid transition-all duration-200 ease-out motion-reduce:transition-none
          ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}
        `}
      >
        <div className="overflow-hidden">
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

            {/* Feedback Sections */}
            <div className="mt-4 space-y-4">
              {/* Game Comment Section */}
              {row.comment && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Gamepad2 className="h-4 w-4 text-blue-600" />
                    <p className="text-xs uppercase tracking-rulebook text-blue-700 font-medium">Game Feedback</p>
                  </div>
                  <p className="text-sm text-ink-primary whitespace-pre-wrap">{row.comment}</p>
                </div>
              )}

              {/* Venue Comment Section */}
              {row.venueComment && (
                <div className="p-3 rounded-lg bg-pink-50 border border-pink-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-4 w-4 text-pink-600" />
                    <p className="text-xs uppercase tracking-rulebook text-pink-700 font-medium">Venue Feedback</p>
                  </div>
                  <p className="text-sm text-ink-primary whitespace-pre-wrap">{row.venueComment}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
