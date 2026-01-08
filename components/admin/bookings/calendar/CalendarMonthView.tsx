'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from '@/components/icons';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getMonthDays, formatDateString, isToday, isSameDay } from '../utils/calendarUtils';
import type { TimelineViewMode } from '@/lib/data/timeline';

// =============================================================================
// Types
// =============================================================================

interface CalendarMonthViewProps {
  venueId: string;
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
  viewMode?: TimelineViewMode;
  onViewModeChange?: (mode: TimelineViewMode) => void;
}

/**
 * Time segment distribution for mini bar chart.
 * Represents booking density in 4 time segments:
 * - morning (9am-12pm)
 * - lunch (12pm-3pm)
 * - afternoon (3pm-6pm)
 * - evening (6pm-close)
 */
interface TimeDistribution {
  morning: number;
  lunch: number;
  afternoon: number;
  evening: number;
}

interface DayData {
  totalBookings: number;
  confirmedCount: number;
  pendingCount: number;
  distribution: TimeDistribution;
}

interface MonthData {
  /** Map of date string (YYYY-MM-DD) to day data */
  days: Record<string, DayData>;
  month: number;
  year: number;
}

// =============================================================================
// Constants
// =============================================================================

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// =============================================================================
// Data Fetching
// =============================================================================

async function fetchMonthData(
  venueId: string,
  year: number,
  month: number
): Promise<MonthData> {
  const response = await fetch(
    `/api/venues/${venueId}/calendar?year=${year}&month=${month}&view=month`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch month data');
  }

  return response.json();
}

// =============================================================================
// MonthHeader Component
// =============================================================================

interface MonthHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: TimelineViewMode;
  onViewModeChange: (mode: TimelineViewMode) => void;
}

function MonthHeader({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
}: MonthHeaderProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const goToPreviousMonth = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    onDateChange(prev);
  };

  const goToNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    onDateChange(next);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const monthYearText = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousMonth}
          className="p-1"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="text-lg font-semibold hover:bg-stone-100"
            >
              {monthYearText}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => {
                if (date) {
                  onDateChange(date);
                  setCalendarOpen(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
          className="p-1"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-stone-200 p-0.5">
          {(['day', 'week', 'month'] as TimelineViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
                viewMode === mode
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-500 hover:text-stone-700'
              )}
            >
              {mode}
            </button>
          ))}
        </div>

        <Button variant="secondary" size="sm" onClick={goToToday}>
          Today
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm">
              <CalendarIcon className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => date && onDateChange(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// =============================================================================
// MiniTimeChart Component
// =============================================================================

interface MiniTimeChartProps {
  distribution: TimeDistribution;
  maxValue: number;
}

function MiniTimeChart({ distribution, maxValue }: MiniTimeChartProps) {
  const segments = [
    distribution.morning,
    distribution.lunch,
    distribution.afternoon,
    distribution.evening,
  ];

  if (maxValue === 0) {
    return (
      <div className="flex items-end justify-center gap-0.5 h-4">
        {segments.map((_, i) => (
          <div
            key={i}
            className="w-1.5 bg-stone-200 rounded-sm"
            style={{ height: '2px' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-end justify-center gap-0.5 h-4">
      {segments.map((value, i) => {
        const heightPercent = Math.max((value / maxValue) * 100, value > 0 ? 15 : 5);
        return (
          <div
            key={i}
            className={cn(
              'w-1.5 rounded-sm transition-all',
              value > 0 ? 'bg-teal-500' : 'bg-stone-200'
            )}
            style={{ height: `${heightPercent}%` }}
          />
        );
      })}
    </div>
  );
}

// =============================================================================
// DayCell Component
// =============================================================================

interface DayCellProps {
  date: Date;
  dayData?: DayData;
  isCurrentMonth: boolean;
  maxDistributionValue: number;
  onClick: () => void;
}

function DayCell({
  date,
  dayData,
  isCurrentMonth,
  maxDistributionValue,
  onClick,
}: DayCellProps) {
  const today = isToday(date);
  const hasBookings = dayData && dayData.totalBookings > 0;

  // Calculate background intensity based on booking count
  const bgIntensity = useMemo(() => {
    if (!dayData || dayData.totalBookings === 0) return 0;
    if (dayData.totalBookings <= 2) return 1;
    if (dayData.totalBookings <= 5) return 2;
    if (dayData.totalBookings <= 10) return 3;
    return 4;
  }, [dayData]);

  const bgClasses = [
    '',
    'bg-teal-50',
    'bg-teal-100',
    'bg-teal-200',
    'bg-teal-300',
  ];

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative p-2 min-h-[80px] border-b border-r transition-colors',
        'hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500',
        !isCurrentMonth && 'bg-stone-50 opacity-50',
        isCurrentMonth && bgClasses[bgIntensity]
      )}
    >
      {/* Day number */}
      <div
        className={cn(
          'text-sm font-medium mb-1',
          today && 'w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center mx-auto',
          !today && isCurrentMonth && 'text-stone-900',
          !today && !isCurrentMonth && 'text-stone-400'
        )}
      >
        {date.getDate()}
      </div>

      {/* Mini time distribution chart */}
      {hasBookings && dayData && (
        <MiniTimeChart
          distribution={dayData.distribution}
          maxValue={maxDistributionValue}
        />
      )}

      {/* Booking count badge */}
      {hasBookings && dayData && (
        <div className="mt-1 text-center">
          <span
            className={cn(
              'inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full',
              dayData.pendingCount > 0
                ? 'bg-amber-100 text-amber-700'
                : 'bg-teal-100 text-teal-700'
            )}
          >
            {dayData.totalBookings} res
          </span>
        </div>
      )}
    </button>
  );
}

// =============================================================================
// Main CalendarMonthView Component
// =============================================================================

export function CalendarMonthView({
  venueId,
  initialDate = new Date(),
  onDateChange,
  viewMode = 'month',
  onViewModeChange,
}: CalendarMonthViewProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [data, setData] = useState<MonthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Fetch month data
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const monthData = await fetchMonthData(venueId, currentYear, currentMonth);

        if (!cancelled) {
          setData(monthData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [venueId, currentYear, currentMonth]);

  // Get calendar grid days
  const calendarDays = useMemo(() => getMonthDays(currentDate), [currentDate]);

  // Calculate max distribution value for scaling charts
  const maxDistributionValue = useMemo(() => {
    if (!data) return 1;

    let max = 1;
    for (const dayData of Object.values(data.days)) {
      const { distribution } = dayData;
      max = Math.max(
        max,
        distribution.morning,
        distribution.lunch,
        distribution.afternoon,
        distribution.evening
      );
    }
    return max;
  }, [data]);

  // Handle date change
  const handleDateChange = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      onDateChange?.(date);
    },
    [onDateChange]
  );

  // Handle view mode change
  const handleViewModeChange = useCallback(
    (mode: TimelineViewMode) => {
      onViewModeChange?.(mode);
    },
    [onViewModeChange]
  );

  // Handle day click - drill down to day view
  const handleDayClick = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      onDateChange?.(date);
      onViewModeChange?.('day');
    },
    [onDateChange, onViewModeChange]
  );

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col">
        <MonthHeader
          currentDate={currentDate}
          onDateChange={handleDateChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-stone-500">Loading month...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col">
        <MonthHeader
          currentDate={currentDate}
          onDateChange={handleDateChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-2">{error}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setError(null);
                setIsLoading(true);
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <MonthHeader
        currentDate={currentDate}
        onDateChange={handleDateChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="py-2 text-center text-xs font-medium text-stone-500 border-r last:border-r-0"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 min-h-full">
          {calendarDays.map((date, index) => {
            const dateStr = formatDateString(date);
            const dayData = data?.days[dateStr];
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();

            return (
              <DayCell
                key={index}
                date={date}
                dayData={dayData}
                isCurrentMonth={isCurrentMonth}
                maxDistributionValue={maxDistributionValue}
                onClick={() => handleDayClick(date)}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t bg-stone-50 flex items-center justify-center gap-6 text-xs text-stone-500">
        <div className="flex items-center gap-1.5">
          <div className="flex items-end gap-0.5 h-3">
            <div className="w-1 h-1 bg-teal-500 rounded-sm" />
            <div className="w-1 h-2 bg-teal-500 rounded-sm" />
            <div className="w-1 h-1.5 bg-teal-500 rounded-sm" />
            <div className="w-1 h-3 bg-teal-500 rounded-sm" />
          </div>
          <span>Booking distribution (AM to PM)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-teal-100 rounded" />
          <span>Light</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-teal-300 rounded" />
          <span>Busy</span>
        </div>
      </div>
    </div>
  );
}
