'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetchWeeklyTimelineData } from '@/app/actions/timeline';
import type { WeeklyTimelineData, WeeklyTable } from '@/lib/data/timeline';

// =============================================================================
// Types
// =============================================================================

interface WeeklyTimelineProps {
  venueId: string;
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
  onDayClick?: (date: Date) => void;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Gets the Monday of the week for a given date.
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Formats a date to YYYY-MM-DD string.
 */
function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if two dates are the same day.
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Formats a week range for display.
 */
function formatWeekRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

// =============================================================================
// Constants
// =============================================================================

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Header with week navigation.
 */
function WeeklyHeader({
  weekStart,
  weekEnd,
  onPrevWeek,
  onNextWeek,
  onThisWeek,
  isCurrentWeek,
}: {
  weekStart: Date;
  weekEnd: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
  isCurrentWeek: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--color-structure)] bg-[color:var(--color-elevated)]">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevWeek}
          aria-label="Previous week"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="font-serif text-lg font-semibold text-[color:var(--color-ink-primary)] min-w-[220px] text-center">
          {formatWeekRange(weekStart, weekEnd)}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNextWeek}
          aria-label="Next week"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <Button
        variant={isCurrentWeek ? 'secondary' : 'ghost'}
        size="sm"
        onClick={onThisWeek}
        disabled={isCurrentWeek}
      >
        This Week
      </Button>
    </div>
  );
}

/**
 * Grid cell for a day's booking count.
 */
function DayCell({
  bookingCount,
  dateStr,
  isToday,
  onClick,
}: {
  bookingCount: number;
  dateStr: string;
  isToday: boolean;
  onClick: () => void;
}) {
  const hasBookings = bookingCount > 0;

  // Color intensity based on booking count
  const getIntensityClass = () => {
    if (bookingCount === 0) return 'bg-stone-50';
    if (bookingCount <= 2) return 'bg-teal-50';
    if (bookingCount <= 5) return 'bg-teal-100';
    if (bookingCount <= 8) return 'bg-teal-200';
    return 'bg-teal-300';
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'h-full w-full flex items-center justify-center p-2',
        'border-r border-stone-200 last:border-r-0',
        'hover:bg-stone-100 transition-colors cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500',
        isToday && 'ring-2 ring-inset ring-teal-500',
        getIntensityClass()
      )}
      aria-label={`${bookingCount} bookings on ${dateStr}`}
    >
      {hasBookings ? (
        <span className={cn(
          'text-sm font-semibold rounded-full px-2.5 py-1 min-w-[28px]',
          'bg-white/80 text-stone-800 shadow-sm'
        )}>
          {bookingCount}
        </span>
      ) : (
        <span className="text-stone-400 text-sm">-</span>
      )}
    </button>
  );
}

/**
 * Table label row.
 */
function TableLabel({
  table,
  rowHeight,
}: {
  table: WeeklyTable;
  rowHeight: number;
}) {
  return (
    <div
      className="flex items-center px-4 border-b border-stone-200 bg-stone-50"
      style={{ height: rowHeight }}
    >
      <div className="truncate min-w-0 flex-1">
        <div className="font-medium text-sm text-stone-900 truncate">
          {table.label}
        </div>
        {table.capacity && (
          <div className="text-xs text-stone-500">
            {table.capacity} {table.capacity === 1 ? 'seat' : 'seats'}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Loading skeleton.
 */
function WeeklySkeleton() {
  return (
    <div className="flex flex-col h-full bg-stone-50 animate-pulse">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-stone-200 rounded" />
          <div className="w-48 h-6 bg-stone-200 rounded" />
          <div className="w-8 h-8 bg-stone-200 rounded" />
        </div>
        <div className="w-24 h-8 bg-stone-200 rounded" />
      </div>
      <div className="flex-1 p-4">
        <div className="h-full bg-stone-200 rounded-lg" />
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Weekly timeline showing booking counts per table per day.
 */
export function WeeklyTimeline({
  venueId,
  initialDate,
  onDateChange,
  onDayClick,
}: WeeklyTimelineProps) {
  const [date, setDate] = useState<Date>(initialDate ?? new Date());
  const [data, setData] = useState<WeeklyTimelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekStart = useMemo(() => getWeekStart(date), [date]);
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [weekStart]);

  const today = useMemo(() => new Date(), []);
  const isCurrentWeek = useMemo(
    () => isSameDay(getWeekStart(today), weekStart),
    [today, weekStart]
  );

  // Generate week dates
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [weekStart]);

  // Fetch data
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchWeeklyTimelineData(
          venueId,
          formatDateString(weekStart)
        );

        if (!cancelled) {
          if (result.success && result.data) {
            setData(result.data);
          } else {
            setError(result.error ?? 'Failed to load weekly data');
          }
        }
      } catch (err) {
        console.error('Failed to fetch weekly data:', err);
        if (!cancelled) {
          setError('Failed to load weekly data');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [venueId, weekStart]);

  const handlePrevWeek = useCallback(() => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 7);
    setDate(newDate);
    onDateChange?.(newDate);
  }, [date, onDateChange]);

  const handleNextWeek = useCallback(() => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 7);
    setDate(newDate);
    onDateChange?.(newDate);
  }, [date, onDateChange]);

  const handleThisWeek = useCallback(() => {
    const now = new Date();
    setDate(now);
    onDateChange?.(now);
  }, [onDateChange]);

  const handleDayClick = useCallback(
    (dayDate: Date) => {
      onDayClick?.(dayDate);
    },
    [onDayClick]
  );

  const ROW_HEIGHT = 64;

  if (isLoading) {
    return <WeeklySkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-stone-50">
        <WeeklyHeader
          weekStart={weekStart}
          weekEnd={weekEnd}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onThisWeek={handleThisWeek}
          isCurrentWeek={isCurrentWeek}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={handleThisWeek}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.tables.length === 0) {
    return (
      <div className="flex flex-col h-full bg-stone-50">
        <WeeklyHeader
          weekStart={weekStart}
          weekEnd={weekEnd}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onThisWeek={handleThisWeek}
          isCurrentWeek={isCurrentWeek}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto text-stone-300 mb-4" />
            <h3 className="font-serif text-lg font-semibold text-stone-900 mb-1">
              No tables configured
            </h3>
            <p className="text-sm text-stone-500">
              Add tables to your venue to see the weekly view.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[color:var(--color-surface)]">
      <WeeklyHeader
        weekStart={weekStart}
        weekEnd={weekEnd}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onThisWeek={handleThisWeek}
        isCurrentWeek={isCurrentWeek}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Table labels column */}
        <div className="w-40 flex-shrink-0 bg-stone-50 border-r border-stone-200">
          {/* Header spacer */}
          <div className="h-12 border-b border-stone-300 bg-stone-100 flex items-center px-4">
            <span className="font-mono text-xs text-stone-500 uppercase tracking-wider">
              Tables
            </span>
          </div>
          {/* Table labels */}
          {data.tables.map((table) => (
            <TableLabel key={table.id} table={table} rowHeight={ROW_HEIGHT} />
          ))}
        </div>

        {/* Days grid */}
        <div className="flex-1 overflow-auto">
          {/* Day headers */}
          <div className="flex border-b border-stone-300 bg-stone-100 sticky top-0 z-10">
            {weekDates.map((dayDate, i) => {
              const isToday = isSameDay(dayDate, today);
              return (
                <div
                  key={i}
                  className={cn(
                    'flex-1 h-12 flex flex-col items-center justify-center',
                    'border-r border-stone-200 last:border-r-0',
                    isToday && 'bg-teal-50'
                  )}
                >
                  <span className={cn(
                    'text-xs font-medium',
                    isToday ? 'text-teal-700' : 'text-stone-600'
                  )}>
                    {DAY_NAMES[i]}
                  </span>
                  <span className={cn(
                    'text-sm font-semibold',
                    isToday ? 'text-teal-800' : 'text-stone-900'
                  )}>
                    {dayDate.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Table rows */}
          {data.tables.map((table) => (
            <div
              key={table.id}
              className="flex border-b border-stone-200"
              style={{ height: ROW_HEIGHT }}
            >
              {weekDates.map((dayDate, i) => {
                const dateStr = formatDateString(dayDate);
                const dayData = table.days[dateStr];
                const bookingCount = dayData?.bookingCount ?? 0;
                const isToday = isSameDay(dayDate, today);

                return (
                  <div key={i} className="flex-1">
                    <DayCell
                      bookingCount={bookingCount}
                      dateStr={dateStr}
                      isToday={isToday}
                      onClick={() => handleDayClick(dayDate)}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export type { WeeklyTimelineProps };
