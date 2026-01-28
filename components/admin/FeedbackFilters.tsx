'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { FeedbackFilters, FeedbackSource } from '@/lib/db/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  ThumbsUp,
  ThumbsDown,
  Meh,
  X,
  Calendar,
  Loader2,
  Gamepad2,
  Heart,
} from '@/components/icons';

// =============================================================================
// TYPES
// =============================================================================

interface FeedbackFiltersProps {
  filters: FeedbackFilters;
  onChange: (filters: FeedbackFilters) => void;
  isLoading?: boolean;
}

type DatePreset = 'today' | '7d' | '30d' | '90d';
type RatingType = 'all' | 'game' | 'venue';
type Sentiment = 'positive' | 'neutral' | 'negative';

// =============================================================================
// CONSTANTS
// =============================================================================

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
];

const RATING_TYPES: { value: RatingType; label: string; icon?: React.ElementType }[] = [
  { value: 'all', label: 'All' },
  { value: 'game', label: 'Game', icon: Gamepad2 },
  { value: 'venue', label: 'Venue', icon: Heart },
];

const SOURCES: { value: FeedbackSource | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'end_sheet', label: 'Guest' },
  { value: 'staff_prompt', label: 'Staff' },
  { value: 'timer_prompt', label: 'Timer' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function FeedbackFiltersCard({
  filters,
  onChange,
  isLoading = false,
}: FeedbackFiltersProps) {
  // Ref for focus management - return focus to first filter after clearing
  const firstFilterRef = useRef<HTMLButtonElement>(null);

  // Local search state for debouncing
  const [searchValue, setSearchValue] = useState(filters.search ?? '');
  // Track if custom date picker is expanded
  const [showCustomDate, setShowCustomDate] = useState(
    Boolean(filters.startDate || filters.endDate)
  );

  // Sync local search when filters change externally
  useEffect(() => {
    setSearchValue(filters.search ?? '');
  }, [filters.search]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchValue.trim();
      if (trimmed !== (filters.search ?? '')) {
        onChange({ ...filters, search: trimmed || undefined });
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]); // Only depend on searchValue to avoid re-triggering

  // Check if any filters are active (dirty state)
  const hasActiveFilters = useMemo(() => {
    return (
      filters.dateRangePreset !== '30d' ||
      filters.startDate != null ||
      filters.endDate != null ||
      filters.sentiment != null ||
      (filters.ratingType != null && filters.ratingType !== 'all') ||
      filters.hasComment === true ||
      filters.source != null ||
      (filters.search && filters.search.length > 0)
    );
  }, [filters]);

  // Handlers
  const handlePresetChange = useCallback(
    (preset: DatePreset) => {
      onChange({
        ...filters,
        dateRangePreset: preset,
        startDate: undefined,
        endDate: undefined,
      });
      setShowCustomDate(false);
    },
    [filters, onChange]
  );

  const handleCustomDateToggle = useCallback(() => {
    if (showCustomDate) {
      // Closing custom date - revert to preset
      onChange({
        ...filters,
        startDate: undefined,
        endDate: undefined,
        dateRangePreset: filters.dateRangePreset ?? '30d',
      });
    }
    setShowCustomDate(!showCustomDate);
  }, [showCustomDate, filters, onChange]);

  const handleStartDateChange = useCallback(
    (value: string) => {
      onChange({
        ...filters,
        startDate: value || undefined,
        dateRangePreset: undefined,
      });
    },
    [filters, onChange]
  );

  const handleEndDateChange = useCallback(
    (value: string) => {
      onChange({
        ...filters,
        endDate: value || undefined,
        dateRangePreset: undefined,
      });
    },
    [filters, onChange]
  );

  const handleRatingTypeChange = useCallback(
    (ratingType: RatingType) => {
      onChange({
        ...filters,
        ratingType: ratingType === 'all' ? undefined : ratingType,
      });
    },
    [filters, onChange]
  );

  const handleSentimentToggle = useCallback(
    (sentiment: Sentiment) => {
      onChange({
        ...filters,
        sentiment: filters.sentiment === sentiment ? null : sentiment,
      });
    },
    [filters, onChange]
  );

  const handleSourceChange = useCallback(
    (source: FeedbackSource | 'all') => {
      onChange({
        ...filters,
        source: source === 'all' ? null : source,
      });
    },
    [filters, onChange]
  );

  const handleHasCommentToggle = useCallback(() => {
    onChange({
      ...filters,
      hasComment: filters.hasComment ? undefined : true,
    });
  }, [filters, onChange]);

  const handleClearFilters = useCallback(() => {
    setSearchValue('');
    setShowCustomDate(false);
    onChange({
      dateRangePreset: '30d',
    });
    // Return focus to first filter control for accessibility
    setTimeout(() => firstFilterRef.current?.focus(), 100);
  }, [onChange]);

  const handleSearchClear = useCallback(() => {
    setSearchValue('');
    onChange({ ...filters, search: undefined });
  }, [filters, onChange]);

  // Determine active preset (none if custom dates are set)
  const activePreset = filters.startDate || filters.endDate
    ? null
    : filters.dateRangePreset ?? '30d';

  return (
    <Card className="panel-surface">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center justify-end gap-2 text-sm text-ink-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </div>
          )}

          {/* Row 1: Date presets + Custom date + Search */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Presets */}
            <div className="flex items-center rounded-lg border border-structure bg-elevated p-1">
              {DATE_PRESETS.map((preset, index) => (
                <button
                  key={preset.value}
                  ref={index === 0 ? firstFilterRef : undefined}
                  type="button"
                  onClick={() => handlePresetChange(preset.value)}
                  disabled={isLoading}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-1 ${
                    activePreset === preset.value
                      ? 'bg-surface shadow-card text-ink-primary'
                      : 'text-ink-secondary hover:text-ink-primary'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  aria-pressed={activePreset === preset.value}
                >
                  {preset.label}
                </button>
              ))}
              {/* Custom date toggle */}
              <button
                type="button"
                onClick={handleCustomDateToggle}
                disabled={isLoading}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                  showCustomDate || (filters.startDate || filters.endDate)
                    ? 'bg-surface shadow-card text-ink-primary'
                    : 'text-ink-secondary hover:text-ink-primary'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-pressed={showCustomDate}
                aria-label="Custom date range"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Custom</span>
              </button>
            </div>

            {/* Custom date inputs (shown when expanded) */}
            {showCustomDate && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filters.startDate ?? ''}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  disabled={isLoading}
                  className="h-8 rounded-md border border-structure bg-elevated px-2 text-xs shadow-card focus-ring disabled:opacity-50"
                  aria-label="Start date"
                />
                <span className="text-xs text-ink-secondary">to</span>
                <input
                  type="date"
                  value={filters.endDate ?? ''}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  disabled={isLoading}
                  className="h-8 rounded-md border border-structure bg-elevated px-2 text-xs shadow-card focus-ring disabled:opacity-50"
                  aria-label="End date"
                />
              </div>
            )}

            {/* Search input */}
            <div className="flex-1 min-w-[200px] relative">
              <Input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search comments, games, tables..."
                className="pl-9 h-9 pr-8"
                disabled={isLoading}
                aria-label="Search feedback"
              />
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-ink-secondary pointer-events-none" />
              {searchValue && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="absolute right-2 top-2 p-0.5 text-ink-secondary hover:text-ink-primary rounded-md"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Rating type + Sentiment + Source + Has comment + Clear */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Rating Type Tabs */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink-secondary mr-1">Rating:</span>
              <div className="flex items-center rounded-lg border border-structure bg-elevated p-1">
                {RATING_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleRatingTypeChange(type.value)}
                      disabled={isLoading}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                        (filters.ratingType ?? 'all') === type.value
                          ? 'bg-surface shadow-card text-ink-primary'
                          : 'text-ink-secondary hover:text-ink-primary'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      aria-pressed={(filters.ratingType ?? 'all') === type.value}
                    >
                      {Icon && <Icon className={`h-3.5 w-3.5 ${type.value === 'game' ? 'text-blue-600' : type.value === 'venue' ? 'text-pink-600' : ''}`} />}
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sentiment Filter Chips */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink-secondary mr-1">Sentiment:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSentimentToggle('positive')}
                  disabled={isLoading}
                  className={`p-1.5 rounded-full border transition-colors ${
                    filters.sentiment === 'positive'
                      ? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600 text-green-700 dark:text-green-400'
                      : 'border-structure text-ink-secondary hover:text-ink-primary hover:border-ink-secondary'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  aria-pressed={filters.sentiment === 'positive'}
                  aria-label="Filter positive feedback"
                  title="Positive"
                >
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSentimentToggle('neutral')}
                  disabled={isLoading}
                  className={`p-1.5 rounded-full border transition-colors ${
                    filters.sentiment === 'neutral'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-500'
                      : 'border-structure text-ink-secondary hover:text-ink-primary hover:border-ink-secondary'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  aria-pressed={filters.sentiment === 'neutral'}
                  aria-label="Filter neutral feedback"
                  title="Neutral"
                >
                  <Meh className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSentimentToggle('negative')}
                  disabled={isLoading}
                  className={`p-1.5 rounded-full border transition-colors ${
                    filters.sentiment === 'negative'
                      ? 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-600 text-red-700 dark:text-red-400'
                      : 'border-structure text-ink-secondary hover:text-ink-primary hover:border-ink-secondary'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  aria-pressed={filters.sentiment === 'negative'}
                  aria-label="Filter negative feedback"
                  title="Negative"
                >
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Source Filter Tabs */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink-secondary mr-1">Source:</span>
              <div className="flex items-center rounded-lg border border-structure bg-elevated p-1">
                {SOURCES.map((source) => (
                  <button
                    key={source.value}
                    type="button"
                    onClick={() => handleSourceChange(source.value)}
                    disabled={isLoading}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      (filters.source ?? 'all') === source.value ||
                      (source.value === 'all' && filters.source == null)
                        ? 'bg-surface shadow-card text-ink-primary'
                        : 'text-ink-secondary hover:text-ink-primary'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    aria-pressed={
                      (filters.source ?? 'all') === source.value ||
                      (source.value === 'all' && filters.source == null)
                    }
                  >
                    {source.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Has Comment Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.hasComment ?? false}
                onChange={handleHasCommentToggle}
                disabled={isLoading}
                className="h-4 w-4 rounded border-structure bg-elevated text-[color:var(--color-accent)] focus-ring disabled:opacity-50"
              />
              <span className="text-xs text-ink-secondary">Has comment</span>
            </label>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                disabled={isLoading}
                className="ml-auto"
              >
                <X className="h-4 w-4" />
                <span className="ml-1">Clear filters</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
