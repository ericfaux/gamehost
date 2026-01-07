'use client';

import { useState, useCallback, useTransition, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { FeedbackFilters, FeedbackHistoryResult } from '@/lib/db/types';
import { fetchFeedback } from '@/app/admin/feedback/actions';
import { FeedbackSummaryHeader } from './FeedbackSummaryHeader';
import { FeedbackFiltersCard } from './FeedbackFilters';
import { FeedbackTable } from './FeedbackTable';

// =============================================================================
// URL SYNC HELPERS
// =============================================================================

/** Parse URL search params into FeedbackFilters */
function parseFiltersFromURL(searchParams: URLSearchParams): FeedbackFilters {
  const filters: FeedbackFilters = {};

  // Date range preset
  const range = searchParams.get('range');
  if (range && ['today', '7d', '30d', '90d'].includes(range)) {
    filters.dateRangePreset = range as FeedbackFilters['dateRangePreset'];
  }

  // Custom date range (overrides preset)
  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end');
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  // Sentiment filter
  const sentiment = searchParams.get('sentiment');
  if (sentiment && ['positive', 'neutral', 'negative'].includes(sentiment)) {
    filters.sentiment = sentiment as FeedbackFilters['sentiment'];
  }

  // Rating type
  const ratingType = searchParams.get('ratingType');
  if (ratingType && ['game', 'venue', 'all'].includes(ratingType)) {
    filters.ratingType = ratingType as FeedbackFilters['ratingType'];
  }

  // Has comment
  if (searchParams.get('hasComment') === 'true') {
    filters.hasComment = true;
  }

  // Feedback source
  const source = searchParams.get('source');
  if (source && ['end_sheet', 'staff_prompt', 'timer_prompt'].includes(source)) {
    filters.source = source as FeedbackFilters['source'];
  }

  // Search query
  const search = searchParams.get('q');
  if (search) filters.search = search;

  // Default to 30d if no date filter specified
  if (!filters.dateRangePreset && !filters.startDate) {
    filters.dateRangePreset = '30d';
  }

  return filters;
}

/** Serialize FeedbackFilters to URL search params (omits defaults to keep URL clean) */
function filtersToURLParams(filters: FeedbackFilters): URLSearchParams {
  const params = new URLSearchParams();

  // Only add date range preset if not default (30d)
  if (filters.dateRangePreset && filters.dateRangePreset !== '30d') {
    params.set('range', filters.dateRangePreset);
  }

  // Custom dates
  if (filters.startDate) params.set('start', filters.startDate);
  if (filters.endDate) params.set('end', filters.endDate);

  // Sentiment
  if (filters.sentiment) params.set('sentiment', filters.sentiment);

  // Rating type (omit 'all' as it's the default)
  if (filters.ratingType && filters.ratingType !== 'all') {
    params.set('ratingType', filters.ratingType);
  }

  // Has comment
  if (filters.hasComment) params.set('hasComment', 'true');

  // Source
  if (filters.source) params.set('source', filters.source);

  // Search query
  if (filters.search) params.set('q', filters.search);

  return params;
}

// =============================================================================
// COMPONENT
// =============================================================================

interface FeedbackPageClientProps {
  venueId: string;
  initialData: FeedbackHistoryResult;
}

export function FeedbackPageClient({ venueId: _venueId, initialData }: FeedbackPageClientProps) {
  // URL navigation hooks
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize filters from URL
  const [filters, setFilters] = useState<FeedbackFilters>(() =>
    parseFiltersFromURL(searchParams)
  );
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Check if any filters are active (for contextual empty state)
  const hasActiveFilters = useMemo(() => {
    return (
      filters.dateRangePreset !== '30d' ||
      filters.startDate != null ||
      filters.endDate != null ||
      filters.sentiment != null ||
      (filters.ratingType != null && filters.ratingType !== 'all') ||
      filters.hasComment === true ||
      filters.source != null ||
      (filters.search != null && filters.search.length > 0)
    );
  }, [filters]);


  // Sync URL → State when URL changes externally (back/forward navigation)
  useEffect(() => {
    const urlFilters = parseFiltersFromURL(searchParams);
    // Only update if filters actually changed (compare JSON to handle object equality)
    if (JSON.stringify(urlFilters) !== JSON.stringify(filters)) {
      setFilters(urlFilters);
      // Refetch data for new filters
      startTransition(async () => {
        const result = await fetchFeedback(urlFilters);
        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.error);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only depend on searchParams to detect external URL changes

  // Handle filter changes - update URL and fetch data
  const handleFiltersChange = useCallback((newFilters: FeedbackFilters) => {
    setFilters(newFilters);
    setError(null);

    // Sync state → URL (replace to avoid polluting history with every filter change)
    const params = filtersToURLParams(newFilters);
    const newURL = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(newURL, { scroll: false });

    // Fetch data with new filters
    startTransition(async () => {
      const result = await fetchFeedback(newFilters);

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    });
  }, [pathname, router]);

  // Handler to clear all filters
  const handleClearFilters = useCallback(() => {
    handleFiltersChange({ dateRangePreset: '30d' });
  }, [handleFiltersChange]);

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
      {/* Screen reader announcement for filter changes */}
      <div aria-live="polite" className="sr-only">
        {isPending
          ? 'Loading feedback...'
          : `Showing ${data.rows.length} of ${data.totalCount} feedback responses`
        }
      </div>

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

      {/* Results table - fade transition when data updates */}
      <div
        className={`
          transition-opacity duration-150 motion-reduce:transition-none
          ${isPending ? 'opacity-60' : 'opacity-100'}
        `}
      >
        <FeedbackTable
          rows={data.rows}
          isLoading={isPending}
          hasMore={!!data.nextCursor}
          onLoadMore={handleLoadMore}
          hasFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
        />
      </div>
    </div>
  );
}
