'use client';

/**
 * Skeleton loaders for the Feedback History page
 * Uses consistent patterns: animate-pulse with bg-[color:var(--color-muted)]
 */

export function FeedbackSummarySkeleton() {
  return (
    <div className="panel-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Response count skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-[color:var(--color-muted)] animate-pulse" />
          <div className="h-8 w-16 rounded bg-[color:var(--color-muted)] animate-pulse" />
          <div className="h-4 w-20 rounded bg-[color:var(--color-muted)] animate-pulse" />
        </div>
        <div className="h-8 w-px bg-[color:var(--color-structure)]" />
        {/* Rating skeletons */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-[color:var(--color-muted)] animate-pulse" />
          <div className="h-6 w-10 rounded bg-[color:var(--color-muted)] animate-pulse" />
        </div>
        <div className="h-8 w-px bg-[color:var(--color-structure)]" />
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-[color:var(--color-muted)] animate-pulse" />
          <div className="h-6 w-10 rounded bg-[color:var(--color-muted)] animate-pulse" />
        </div>
        <div className="h-8 w-px bg-[color:var(--color-structure)]" />
        {/* Sentiment bar skeleton */}
        <div className="h-4 w-32 rounded-full bg-[color:var(--color-muted)] animate-pulse" />
      </div>
    </div>
  );
}

export function FeedbackRowSkeleton() {
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
      {/* Comment Preview + Chevron */}
      <div className="w-[200px] shrink-0 flex items-center gap-2">
        <div className="h-4 flex-1 bg-[color:var(--color-muted)] rounded animate-pulse" />
        <div className="h-4 w-4 bg-[color:var(--color-muted)] rounded animate-pulse" />
      </div>
    </div>
  );
}

export function FeedbackTableSkeleton({ rowCount = 5 }: { rowCount?: number }) {
  return (
    <div className="panel-surface overflow-hidden">
      {/* Header skeleton */}
      <div className="hidden md:flex items-center gap-4 px-4 py-2 border-b border-[color:var(--color-structure)] bg-[color:var(--color-muted)]/50">
        <div className="w-[140px] shrink-0">
          <div className="h-3 w-10 rounded bg-[color:var(--color-structure)] animate-pulse" />
        </div>
        <div className="w-[100px] shrink-0">
          <div className="h-3 w-12 rounded bg-[color:var(--color-structure)] animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-3 w-10 rounded bg-[color:var(--color-structure)] animate-pulse" />
        </div>
        <div className="w-[80px] shrink-0">
          <div className="h-3 w-10 rounded bg-[color:var(--color-structure)] animate-pulse" />
        </div>
        <div className="w-[80px] shrink-0">
          <div className="h-3 w-12 rounded bg-[color:var(--color-structure)] animate-pulse" />
        </div>
        <div className="w-[200px] shrink-0">
          <div className="h-3 w-16 rounded bg-[color:var(--color-structure)] animate-pulse" />
        </div>
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rowCount }).map((_, i) => (
        <FeedbackRowSkeleton key={i} />
      ))}
    </div>
  );
}
