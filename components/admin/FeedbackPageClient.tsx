'use client';

import { useState, useCallback } from 'react';
import type { FeedbackFilters, FeedbackHistoryResult } from '@/lib/db/types';
import { FeedbackSummaryHeader } from './FeedbackSummaryHeader';
import { FeedbackFiltersCard } from './FeedbackFilters';
import { FeedbackTable } from './FeedbackTable';

interface FeedbackPageClientProps {
  venueId: string;
  initialData: FeedbackHistoryResult;
}

export function FeedbackPageClient({ venueId, initialData }: FeedbackPageClientProps) {
  const [filters, setFilters] = useState<FeedbackFilters>({ dateRangePreset: '30d' });
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const handleFiltersChange = useCallback(async (newFilters: FeedbackFilters) => {
    setFilters(newFilters);
    setIsLoading(true);

    // TODO: Call server action to refetch with new filters
    // For now, just update filters state

    setIsLoading(false);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!data.nextCursor || isLoading) return;

    setIsLoading(true);

    // TODO: Call server action to fetch next page
    // For now, just clear loading state

    setIsLoading(false);
  }, [data.nextCursor, isLoading]);

  return (
    <div className="grid gap-4">
      {/* Summary Header */}
      <FeedbackSummaryHeader stats={data.stats} isLoading={isLoading} />

      {/* Filters Card */}
      <FeedbackFiltersCard
        filters={filters}
        onChange={handleFiltersChange}
        isLoading={isLoading}
      />

      {/* Feedback Table */}
      <FeedbackTable
        rows={data.rows}
        isLoading={isLoading}
        hasMore={!!data.nextCursor}
        onLoadMore={handleLoadMore}
      />
    </div>
  );
}
