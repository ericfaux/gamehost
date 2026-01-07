'use client';

import { useState, useCallback, useTransition } from 'react';
import type { FeedbackFilters, FeedbackHistoryResult } from '@/lib/db/types';
import { fetchFeedback } from '@/app/admin/feedback/actions';
import { FeedbackSummaryHeader } from './FeedbackSummaryHeader';
import { FeedbackFiltersCard } from './FeedbackFilters';
import { FeedbackTable } from './FeedbackTable';

interface FeedbackPageClientProps {
  venueId: string;
  initialData: FeedbackHistoryResult;
}

export function FeedbackPageClient({ venueId, initialData }: FeedbackPageClientProps) {
  // State
  const [filters, setFilters] = useState<FeedbackFilters>({ dateRangePreset: '30d' });
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Handle filter changes - refetch data
  const handleFiltersChange = useCallback((newFilters: FeedbackFilters) => {
    setFilters(newFilters);
    setError(null);

    startTransition(async () => {
      const result = await fetchFeedback(newFilters);

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    });
  }, []);

  // Handle pagination - append more rows
  const handleLoadMore = useCallback(() => {
    if (!data.nextCursor || isPending) return;

    startTransition(async () => {
      const result = await fetchFeedback(filters, data.nextCursor!);

      if (result.success) {
        setData(prev => ({
          ...result.data,
          rows: [...prev.rows, ...result.data.rows],
          // Keep the new cursor and stats
        }));
      } else {
        setError(result.error);
      }
    });
  }, [filters, data.nextCursor, isPending]);

  return (
    <div className="grid gap-4">
      {/* Error banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Summary stats */}
      <FeedbackSummaryHeader
        stats={data.stats}
        isLoading={isPending}
      />

      {/* Filters */}
      <FeedbackFiltersCard
        filters={filters}
        onChange={handleFiltersChange}
        isLoading={isPending}
      />

      {/* Results table */}
      <FeedbackTable
        rows={data.rows}
        isLoading={isPending}
        hasMore={!!data.nextCursor}
        onLoadMore={handleLoadMore}
      />
    </div>
  );
}
