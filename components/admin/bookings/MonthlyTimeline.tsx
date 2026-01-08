'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetchMonthlyTimelineData } from '@/app/actions/timeline';
import type { MonthlyTimelineData, MonthlyDayData } from '@/lib/data/timeline';

// =============================================================================
// Types
// =============================================================================

interface MonthlyTimelineProps {
  venueId: string;
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
  onDayClick?: (date: Date) => void;
}

// =============================================================================
// Utility Functions
// =============================================================================

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
 * Gets calendar grid for a month (includes days from prev/next months).
 */
function getCalendarGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  let startDayOfWeek = firstDay.getDay();
  // Convert to Monday-first (0 = Monday, 6 = Sunday)
  startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const grid: Date[] = [];

  // Add days from previous month
  const prevMonth = new Date(year, month, 0);
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(prevMonth);
    d.setDate(prevMonth.getDate() - i);
    grid.push(d);
  }

  // Add days from current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    grid.push(new Date(year, month, i));
  }

  // Add days from next month to complete the grid (6 rows)
  const remaining = 42 - grid.length; // 6 rows * 7 days
  for (let i = 1; i <= remaining; i++) {
    grid.push(new Date(year, month + 1, i));
  }

  return grid;
}

// =============================================================================
// Constants
// =============================================================================

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Header with month navigation.
 */
function MonthlyHeader({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onThisMonth,
  isCurrentMonth,
}: {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onThisMonth: () => void;
  isCurrentMonth: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--color-structure)] bg-[color:var(--color-elevated)]">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevMonth}
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="font-serif text-lg font-semibold text-[color:var(--color-ink-primary)] min-w-[200px] text-center">
          {MONTH_NAMES[month]} {year}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNextMonth}
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <Button
        variant={isCurrentMonth ? 'secondary' : 'ghost'}
        size="sm"
        onClick={onThisMonth}
        disabled={isCurrentMonth}
      >
        This Month
      </Button>
    </div>
  );
}

/**
 * Day cell in the calendar grid.
 */
function MonthDayCell({
  date,
  dayData,
  isCurrentMonth,
  isToday,
  onClick,
}: {
  date: Date;
  dayData?: MonthlyDayData;
  isCurrentMonth: boolean;
  isToday: boolean;
  onClick: () => void;
}) {
  const totalBookings = dayData?.totalBookings ?? 0;
  const hasBookings = totalBookings > 0;

  // Color intensity based on booking count
  const getIntensityClass = () => {
    if (!isCurrentMonth) return 'bg-stone-50';
    if (totalBookings === 0) return 'bg-white';
    if (totalBookings <= 3) return 'bg-teal-50';
    if (totalBookings <= 6) return 'bg-teal-100';
    if (totalBookings <= 10) return 'bg-teal-200';
    return 'bg-teal-300';
  };

  return (
    <button
      onClick={onClick}
      disabled={!isCurrentMonth}
      className={cn(
        'h-full w-full p-2 flex flex-col items-center',
        'border-b border-r border-stone-200',
        'transition-colors',
        isCurrentMonth && 'hover:bg-stone-100 cursor-pointer',
        !isCurrentMonth && 'cursor-default',
        'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500',
        getIntensityClass()
      )}
      aria-label={`${totalBookings} bookings on ${formatDateString(date)}`}
    >
      {/* Day number */}
      <span
        className={cn(
          'text-sm font-medium mb-1',
          isCurrentMonth ? 'text-stone-900' : 'text-stone-400',
          isToday && 'bg-teal-600 text-white rounded-full w-7 h-7 flex items-center justify-center'
        )}
      >
        {date.getDate()}
      </span>

      {/* Booking count badge */}
      {isCurrentMonth && hasBookings && (
        <span className={cn(
          'text-xs font-semibold rounded-full px-2 py-0.5',
          'bg-white/90 text-stone-700 shadow-sm'
        )}>
          {totalBookings}
        </span>
      )}
    </button>
  );
}

/**
 * Loading skeleton.
 */
function MonthlySkeleton() {
  return (
    <div className="flex flex-col h-full bg-stone-50 animate-pulse">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-stone-200 rounded" />
          <div className="w-40 h-6 bg-stone-200 rounded" />
          <div className="w-8 h-8 bg-stone-200 rounded" />
        </div>
        <div className="w-28 h-8 bg-stone-200 rounded" />
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
 * Monthly calendar view showing booking counts per day.
 */
export function MonthlyTimeline({
  venueId,
  initialDate,
  onDateChange,
  onDayClick,
}: MonthlyTimelineProps) {
  const [date, setDate] = useState<Date>(initialDate ?? new Date());
  const [data, setData] = useState<MonthlyTimelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = date.getFullYear();
  const month = date.getMonth();

  const today = useMemo(() => new Date(), []);
  const isCurrentMonth = useMemo(
    () => today.getFullYear() === year && today.getMonth() === month,
    [today, year, month]
  );

  // Get calendar grid
  const calendarGrid = useMemo(
    () => getCalendarGrid(year, month),
    [year, month]
  );

  // Fetch data
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchMonthlyTimelineData(
          venueId,
          year,
          month + 1 // API expects 1-12
        );

        if (!cancelled) {
          if (result.success && result.data) {
            setData(result.data);
          } else {
            setError(result.error ?? 'Failed to load monthly data');
          }
        }
      } catch (err) {
        console.error('Failed to fetch monthly data:', err);
        if (!cancelled) {
          setError('Failed to load monthly data');
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
  }, [venueId, year, month]);

  const handlePrevMonth = useCallback(() => {
    const newDate = new Date(year, month - 1, 1);
    setDate(newDate);
    onDateChange?.(newDate);
  }, [year, month, onDateChange]);

  const handleNextMonth = useCallback(() => {
    const newDate = new Date(year, month + 1, 1);
    setDate(newDate);
    onDateChange?.(newDate);
  }, [year, month, onDateChange]);

  const handleThisMonth = useCallback(() => {
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

  if (isLoading) {
    return <MonthlySkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-stone-50">
        <MonthlyHeader
          year={year}
          month={month}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onThisMonth={handleThisMonth}
          isCurrentMonth={isCurrentMonth}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={handleThisMonth}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[color:var(--color-surface)]">
      <MonthlyHeader
        year={year}
        month={month}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onThisMonth={handleThisMonth}
        isCurrentMonth={isCurrentMonth}
      />

      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-l border-t border-stone-200">
            {DAY_NAMES.map((day) => (
              <div
                key={day}
                className="h-10 flex items-center justify-center bg-stone-100 border-r border-b border-stone-200"
              >
                <span className="text-xs font-semibold text-stone-600 uppercase">
                  {day}
                </span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 border-l border-stone-200">
            {calendarGrid.map((dayDate, i) => {
              const dateStr = formatDateString(dayDate);
              const dayData = data?.days[dateStr];
              const isCurrentMonthDay = dayDate.getMonth() === month;
              const isDayToday = isSameDay(dayDate, today);

              return (
                <div key={i} className="h-20">
                  <MonthDayCell
                    date={dayDate}
                    dayData={dayData}
                    isCurrentMonth={isCurrentMonthDay}
                    isToday={isDayToday}
                    onClick={() => isCurrentMonthDay && handleDayClick(dayDate)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export type { MonthlyTimelineProps };
