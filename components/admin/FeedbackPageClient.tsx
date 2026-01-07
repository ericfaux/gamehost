'use client';

import { useState, useCallback } from 'react';
import type { FeedbackFilters, FeedbackHistoryResult } from '@/lib/db/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from '@/components/icons';
import { FeedbackSummaryHeader } from './FeedbackSummaryHeader';
import { FeedbackFiltersCard } from './FeedbackFilters';

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

      {/* Placeholder - will be built out in subsequent prompts */}
      <Card className="panel-surface">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-ink-secondary" />
            <CardTitle>Feedback History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-ink-secondary">
            {data.totalCount} feedback responses loaded.
            Full UI coming in next prompts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
