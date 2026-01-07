'use client';

import type { FeedbackHistoryRow } from '@/lib/db/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Loader2 } from '@/components/icons';
import { FeedbackRow } from './FeedbackRow';

interface FeedbackTableProps {
  rows: FeedbackHistoryRow[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-[color:var(--color-structure)]">
      {/* Date */}
      <div className="w-[140px] shrink-0">
        <div className="h-4 w-20 bg-[color:var(--color-muted)] rounded animate-pulse" />
      </div>
      {/* Table */}
      <div className="w-[100px] shrink-0">
        <div className="h-6 w-16 bg-[color:var(--color-muted)] rounded-full animate-pulse" />
      </div>
      {/* Game */}
      <div className="flex-1 min-w-0">
        <div className="h-4 w-32 bg-[color:var(--color-muted)] rounded animate-pulse" />
      </div>
      {/* Game Rating */}
      <div className="w-[80px] shrink-0">
        <div className="h-5 w-12 bg-[color:var(--color-muted)] rounded-full animate-pulse" />
      </div>
      {/* Venue Rating */}
      <div className="w-[80px] shrink-0">
        <div className="h-5 w-12 bg-[color:var(--color-muted)] rounded-full animate-pulse" />
      </div>
      {/* Comment Preview */}
      <div className="w-[200px] shrink-0 flex items-center gap-2">
        <div className="h-4 flex-1 bg-[color:var(--color-muted)] rounded animate-pulse" />
        <div className="h-4 w-4 bg-[color:var(--color-muted)] rounded animate-pulse" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="w-12 h-12 mx-auto bg-[color:var(--color-muted)] rounded-full flex items-center justify-center mb-3">
        <MessageSquare className="h-6 w-6 text-ink-secondary" />
      </div>
      <p className="text-ink-secondary">No feedback matches your filters</p>
      <p className="text-xs text-ink-secondary mt-1">Try adjusting your date range or filters</p>
    </div>
  );
}

export function FeedbackTable({ rows, isLoading, hasMore, onLoadMore }: FeedbackTableProps) {
  const showSkeleton = isLoading && rows.length === 0;
  const showEmpty = !isLoading && rows.length === 0;

  return (
    <Card className="panel-surface">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-ink-secondary" />
          <CardTitle>Feedback History</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Table Header */}
        <div className="hidden md:flex items-center gap-4 px-4 py-2 border-b border-[color:var(--color-structure)] bg-[color:var(--color-muted)]">
          <div className="w-[140px] shrink-0">
            <span className="text-xs font-medium uppercase tracking-rulebook text-ink-secondary">Date</span>
          </div>
          <div className="w-[100px] shrink-0">
            <span className="text-xs font-medium uppercase tracking-rulebook text-ink-secondary">Table</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium uppercase tracking-rulebook text-ink-secondary">Game</span>
          </div>
          <div className="w-[80px] shrink-0">
            <span className="text-xs font-medium uppercase tracking-rulebook text-ink-secondary">Game</span>
          </div>
          <div className="w-[80px] shrink-0">
            <span className="text-xs font-medium uppercase tracking-rulebook text-ink-secondary">Venue</span>
          </div>
          <div className="w-[200px] shrink-0">
            <span className="text-xs font-medium uppercase tracking-rulebook text-ink-secondary">Comment</span>
          </div>
        </div>

        {/* Loading Skeleton */}
        {showSkeleton && (
          <>
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </>
        )}

        {/* Empty State */}
        {showEmpty && <EmptyState />}

        {/* Data Rows */}
        {!showSkeleton && rows.map((row) => (
          <FeedbackRow key={row.id} row={row} />
        ))}

        {/* Load More / End of Results */}
        {rows.length > 0 && (
          <div className="px-4 py-4 border-t border-[color:var(--color-structure)] text-center">
            {hasMore ? (
              <button
                onClick={onLoadMore}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[color:var(--color-accent)] hover:bg-[color:var(--color-muted)] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </button>
            ) : (
              <span className="text-sm text-ink-secondary">End of results</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
