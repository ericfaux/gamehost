'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from '@/components/icons';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimeColumn } from './TimeColumn';
import { NowIndicatorLine, useAutoScrollToNow } from './NowIndicator';
import { CalendarBlock, type BlockAction } from './CalendarBlock';
import { useTableColors, type TableForColor } from '../hooks/useTableColors';
import { calculateOverlapLayout, type PositionedBlock } from '../hooks/useOverlapLayout';
import {
  formatDateString,
  getWeekDays,
  getWeekStart,
  isToday,
  isSameDay,
  timeToPixels,
} from '../utils/calendarUtils';
import type { TimelineBlock } from '@/lib/db/types';
import type { TimelineViewMode, TimelineConflict } from '@/lib/data/timeline';

// =============================================================================
// Types
// =============================================================================

interface OperatingHours {
  startHour: number;
  endHour: number;
}

interface CalendarWeekViewProps {
  venueId: string;
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
  onBlockClick?: (block: TimelineBlock) => void;
  viewMode?: TimelineViewMode;
  onViewModeChange?: (mode: TimelineViewMode) => void;
  pixelsPerHour?: number;
}

interface WeekData {
  /** Map of date string (YYYY-MM-DD) to blocks for that day */
  blocksByDate: Record<string, TimelineBlock[]>;
  tables: TableForColor[];
  conflicts: TimelineConflict[];
  operatingHours: OperatingHours;
  weekStart: string;
  weekEnd: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_PIXELS_PER_HOUR = 48; // Slightly compressed for week view
const TIME_COLUMN_WIDTH = 50;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// =============================================================================
// Data Fetching
// =============================================================================

async function fetchWeekData(
  venueId: string,
  weekStartDate: string
): Promise<WeekData> {
  const response = await fetch(
    `/api/venues/${venueId}/calendar?date=${weekStartDate}&view=week`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch week data');
  }

  return response.json();
}

// =============================================================================
// WeekHeader Component
// =============================================================================

interface WeekHeaderProps {
  currentDate: Date;
  weekDays: Date[];
  onDateChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
  viewMode: TimelineViewMode;
  onViewModeChange: (mode: TimelineViewMode) => void;
}

function WeekHeader({
  currentDate,
  weekDays,
  onDateChange,
  onDayClick,
  viewMode,
  onViewModeChange,
}: WeekHeaderProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const goToPreviousWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    onDateChange(prev);
  };

  const goToNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    onDateChange(next);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  // Format week range for display
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const weekRangeText = useMemo(() => {
    const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
    const year = weekEnd.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${year}`;
    }
    return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${year}`;
  }, [weekStart, weekEnd]);

  return (
    <div className="border-b bg-white">
      {/* Navigation Row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousWeek}
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
                {weekRangeText}
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
            onClick={goToNextWeek}
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

          <Button
            variant="secondary"
            size="sm"
            onClick={goToToday}
          >
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

      {/* Day Headers Row */}
      <div className="flex border-t">
        {/* Empty space for time column */}
        <div style={{ width: TIME_COLUMN_WIDTH }} className="flex-shrink-0" />

        {/* Day headers */}
        {weekDays.map((day, index) => {
          const today = isToday(day);
          return (
            <div
              key={index}
              className={cn(
                'flex-1 py-2 text-center border-l cursor-pointer hover:bg-stone-50 transition-colors',
                today && 'bg-teal-50'
              )}
              onClick={() => onDayClick(day)}
            >
              <div className="text-xs font-medium text-stone-500">
                {DAY_NAMES[index]}
              </div>
              <div
                className={cn(
                  'text-lg font-semibold',
                  today ? 'text-teal-700' : 'text-stone-900'
                )}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// DayColumn Component
// =============================================================================

interface DayColumnProps {
  date: Date;
  blocks: TimelineBlock[];
  startHour: number;
  endHour: number;
  pixelsPerHour: number;
  getTableColor: (tableId: string) => ReturnType<typeof useTableColors>['TABLE_COLORS'][number];
  conflicts: TimelineConflict[];
  onBlockClick: (block: TimelineBlock) => void;
  onBlockAction?: (blockId: string, action: BlockAction) => void;
  selectedBlockId: string | null;
  isToday: boolean;
}

function DayColumn({
  date,
  blocks,
  startHour,
  endHour,
  pixelsPerHour,
  getTableColor,
  conflicts,
  onBlockClick,
  onBlockAction,
  selectedBlockId,
  isToday: isTodayColumn,
}: DayColumnProps) {
  // Calculate positioned blocks for this day
  const positionedBlocks = useMemo(
    () =>
      calculateOverlapLayout(blocks, {
        startHour,
        pixelsPerHour,
        columnGapPercent: 2,
      }),
    [blocks, startHour, pixelsPerHour]
  );

  // Create conflict set
  const conflictBlockIds = useMemo(() => {
    const ids = new Set<string>();
    for (const conflict of conflicts) {
      ids.add(conflict.block1Id);
      ids.add(conflict.block2Id);
    }
    return ids;
  }, [conflicts]);

  const totalHeight = (endHour - startHour + 1) * pixelsPerHour;

  return (
    <div
      className={cn(
        'flex-1 relative border-l',
        isTodayColumn && 'bg-teal-50/30'
      )}
      style={{ height: totalHeight }}
    >
      {/* Hour grid lines */}
      {Array.from({ length: endHour - startHour + 1 }, (_, i) => (
        <React.Fragment key={i}>
          <div
            className="absolute left-0 right-0 border-t border-stone-200"
            style={{ top: i * pixelsPerHour }}
          />
          {i < endHour - startHour && (
            <div
              className="absolute left-0 right-0 border-t border-stone-100 border-dashed"
              style={{ top: i * pixelsPerHour + pixelsPerHour / 2 }}
            />
          )}
        </React.Fragment>
      ))}

      {/* Blocks */}
      <div className="absolute inset-0 px-0.5">
        {positionedBlocks.map((pb) => (
          <CalendarBlock
            key={pb.block.id}
            positionedBlock={pb}
            tableColor={getTableColor(pb.block.table_id)}
            onClick={() => onBlockClick(pb.block)}
            onAction={onBlockAction}
            isSelected={selectedBlockId === pb.block.id}
            showConflict={conflictBlockIds.has(pb.block.id)}
            sizeVariant="compact"
          />
        ))}
      </div>

      {/* Now indicator for today column */}
      {isTodayColumn && (
        <NowIndicatorLine
          startHour={startHour}
          pixelsPerHour={pixelsPerHour}
        />
      )}
    </div>
  );
}

// =============================================================================
// Main CalendarWeekView Component
// =============================================================================

export function CalendarWeekView({
  venueId,
  initialDate = new Date(),
  onDateChange,
  onBlockClick,
  viewMode = 'week',
  onViewModeChange,
  pixelsPerHour = DEFAULT_PIXELS_PER_HOUR,
}: CalendarWeekViewProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [data, setData] = useState<WeekData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calculate week days (Sunday to Saturday)
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const weekStartStr = formatDateString(weekDays[0]);

  // Fetch week data
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const weekData = await fetchWeekData(venueId, weekStartStr);

        if (!cancelled) {
          setData(weekData);
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
  }, [venueId, weekStartStr]);

  // Handle date change
  const handleDateChange = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      onDateChange?.(date);
    },
    [onDateChange]
  );

  // Handle clicking a day header to drill down to day view
  const handleDayClick = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      onDateChange?.(date);
      onViewModeChange?.('day');
    },
    [onDateChange, onViewModeChange]
  );

  // Handle view mode change
  const handleViewModeChange = useCallback(
    (mode: TimelineViewMode) => {
      onViewModeChange?.(mode);
    },
    [onViewModeChange]
  );

  // Handle block click
  const handleBlockClick = useCallback(
    (block: TimelineBlock) => {
      setSelectedBlockId(block.id);
      onBlockClick?.(block);
    },
    [onBlockClick]
  );

  // Handle block action
  const handleBlockAction = useCallback(
    (blockId: string, action: BlockAction) => {
      // Find block and trigger click
      for (const dateKey of Object.keys(data?.blocksByDate ?? {})) {
        const block = data?.blocksByDate[dateKey]?.find((b) => b.id === blockId);
        if (block) {
          onBlockClick?.(block);
          break;
        }
      }
    },
    [data, onBlockClick]
  );

  // Get operating hours
  const operatingHours = data?.operatingHours ?? { startHour: 9, endHour: 23 };
  const { startHour, endHour } = operatingHours;

  // Get table colors
  const { getTableColor } = useTableColors(data?.tables ?? []);

  // Auto-scroll to current time
  const scrollOffset = useAutoScrollToNow(startHour, endHour, pixelsPerHour);

  useEffect(() => {
    if (scrollOffset !== null && scrollContainerRef.current) {
      const containerHeight = scrollContainerRef.current.clientHeight;
      const scrollTo = Math.max(0, scrollOffset - containerHeight / 3);
      scrollContainerRef.current.scrollTop = scrollTo;
    }
  }, [scrollOffset, isLoading]);

  // Calculate total height
  const totalHeight = (endHour - startHour + 1) * pixelsPerHour;

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col">
        <WeekHeader
          currentDate={currentDate}
          weekDays={weekDays}
          onDateChange={handleDateChange}
          onDayClick={handleDayClick}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-stone-500">Loading week...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col">
        <WeekHeader
          currentDate={currentDate}
          weekDays={weekDays}
          onDateChange={handleDateChange}
          onDayClick={handleDayClick}
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
      <WeekHeader
        currentDate={currentDate}
        weekDays={weekDays}
        onDateChange={handleDateChange}
        onDayClick={handleDayClick}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {/* Week Grid */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto"
      >
        <div className="flex" style={{ minHeight: totalHeight }}>
          {/* Time Column */}
          <TimeColumn
            startHour={startHour}
            endHour={endHour}
            pixelsPerHour={pixelsPerHour}
            width={TIME_COLUMN_WIDTH}
            className="sticky left-0 z-10 bg-white"
          />

          {/* Day Columns */}
          {weekDays.map((day, index) => {
            const dateStr = formatDateString(day);
            const dayBlocks = data?.blocksByDate[dateStr] ?? [];

            return (
              <DayColumn
                key={dateStr}
                date={day}
                blocks={dayBlocks}
                startHour={startHour}
                endHour={endHour}
                pixelsPerHour={pixelsPerHour}
                getTableColor={getTableColor}
                conflicts={data?.conflicts ?? []}
                onBlockClick={handleBlockClick}
                onBlockAction={handleBlockAction}
                selectedBlockId={selectedBlockId}
                isToday={isToday(day)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
