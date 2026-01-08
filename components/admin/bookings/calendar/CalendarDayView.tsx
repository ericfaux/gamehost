'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from '@/components/icons';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimeColumn, TimeGrid } from './TimeColumn';
import { NowIndicator, useAutoScrollToNow } from './NowIndicator';
import { CalendarBlock, type BlockAction } from './CalendarBlock';
import { useTableColors, type TableForColor } from '../hooks/useTableColors';
import { useOverlapLayout, type PositionedBlock } from '../hooks/useOverlapLayout';
import {
  formatDateDisplay,
  formatDateString,
  isToday,
  parseDateString,
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

interface CalendarDayViewProps {
  /** Venue ID for data fetching */
  venueId: string;
  /** Initial date to display */
  initialDate?: Date;
  /** Callback when date changes */
  onDateChange?: (date: Date) => void;
  /** Callback when a block is clicked */
  onBlockClick?: (block: TimelineBlock) => void;
  /** Current view mode (day/week/month) */
  viewMode?: TimelineViewMode;
  /** Callback when view mode changes */
  onViewModeChange?: (mode: TimelineViewMode) => void;
  /** Pixels per hour (default: 60) */
  pixelsPerHour?: number;
}

interface CalendarData {
  blocks: TimelineBlock[];
  tables: TableForColor[];
  conflicts: TimelineConflict[];
  operatingHours: OperatingHours;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_PIXELS_PER_HOUR = 60;
const TIME_COLUMN_WIDTH = 60;

// =============================================================================
// Data Fetching
// =============================================================================

async function fetchCalendarData(
  venueId: string,
  date: string
): Promise<CalendarData> {
  const response = await fetch(
    `/api/venues/${venueId}/calendar?date=${date}&view=day`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch calendar data');
  }

  return response.json();
}

// =============================================================================
// CalendarHeader Component
// =============================================================================

interface CalendarHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: TimelineViewMode;
  onViewModeChange: (mode: TimelineViewMode) => void;
}

function CalendarHeader({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
}: CalendarHeaderProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const goToPreviousDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    onDateChange(prev);
  };

  const goToNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    onDateChange(next);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
      {/* Date Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousDay}
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
              {formatDateDisplay(currentDate)}
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
          onClick={goToNextDay}
          className="p-1"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* View Mode Toggle & Today Button */}
      <div className="flex items-center gap-3">
        {/* View Mode Toggle */}
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
          disabled={isToday(currentDate)}
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
  );
}

// =============================================================================
// BlocksContainer Component
// =============================================================================

interface BlocksContainerProps {
  positionedBlocks: PositionedBlock[];
  tableColorMap: Record<string, ReturnType<typeof useTableColors>['getTableColor']>;
  getTableColor: (tableId: string) => ReturnType<typeof useTableColors>['TABLE_COLORS'][number];
  conflicts: TimelineConflict[];
  selectedBlockId: string | null;
  onBlockClick: (block: TimelineBlock) => void;
  onBlockAction?: (blockId: string, action: BlockAction) => void;
}

function BlocksContainer({
  positionedBlocks,
  getTableColor,
  conflicts,
  selectedBlockId,
  onBlockClick,
  onBlockAction,
}: BlocksContainerProps) {
  // Create a set of block IDs that have conflicts
  const conflictBlockIds = useMemo(() => {
    const ids = new Set<string>();
    for (const conflict of conflicts) {
      ids.add(conflict.block1Id);
      ids.add(conflict.block2Id);
    }
    return ids;
  }, [conflicts]);

  return (
    <>
      {positionedBlocks.map((pb) => (
        <CalendarBlock
          key={pb.block.id}
          positionedBlock={pb}
          tableColor={getTableColor(pb.block.table_id)}
          onClick={() => onBlockClick(pb.block)}
          onAction={onBlockAction}
          isSelected={selectedBlockId === pb.block.id}
          showConflict={conflictBlockIds.has(pb.block.id)}
        />
      ))}
    </>
  );
}

// =============================================================================
// Main CalendarDayView Component
// =============================================================================

export function CalendarDayView({
  venueId,
  initialDate = new Date(),
  onDateChange,
  onBlockClick,
  viewMode = 'day',
  onViewModeChange,
  pixelsPerHour = DEFAULT_PIXELS_PER_HOUR,
}: CalendarDayViewProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [data, setData] = useState<CalendarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch calendar data when date changes
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const dateString = formatDateString(currentDate);
        const calendarData = await fetchCalendarData(venueId, dateString);

        if (!cancelled) {
          setData(calendarData);
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
  }, [venueId, currentDate]);

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
      // Actions are handled by parent via onBlockClick which opens the drawer
      // For now, just select the block
      const block = data?.blocks.find((b) => b.id === blockId);
      if (block) {
        onBlockClick?.(block);
      }
    },
    [data, onBlockClick]
  );

  // Get operating hours from data or use defaults
  const operatingHours = data?.operatingHours ?? { startHour: 9, endHour: 23 };
  const { startHour, endHour } = operatingHours;

  // Get table colors
  const { getTableColor, colorMap } = useTableColors(data?.tables ?? []);

  // Calculate overlap layout for blocks
  const positionedBlocks = useOverlapLayout(data?.blocks ?? [], {
    startHour,
    pixelsPerHour,
  });

  // Auto-scroll to current time on initial load
  const scrollOffset = useAutoScrollToNow(startHour, endHour, pixelsPerHour);

  useEffect(() => {
    if (scrollOffset !== null && scrollContainerRef.current && isToday(currentDate)) {
      // Scroll to show current time in the middle of the viewport
      const containerHeight = scrollContainerRef.current.clientHeight;
      const scrollTo = Math.max(0, scrollOffset - containerHeight / 3);
      scrollContainerRef.current.scrollTop = scrollTo;
    }
  }, [scrollOffset, currentDate, isLoading]);

  // Calculate total height
  const totalHeight = (endHour - startHour + 1) * pixelsPerHour;

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col">
        <CalendarHeader
          currentDate={currentDate}
          onDateChange={handleDateChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-stone-500">Loading calendar...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col">
        <CalendarHeader
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
      <CalendarHeader
        currentDate={currentDate}
        onDateChange={handleDateChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {/* Calendar Grid */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto"
      >
        <div className="flex min-h-full">
          {/* Time Column */}
          <TimeColumn
            startHour={startHour}
            endHour={endHour}
            pixelsPerHour={pixelsPerHour}
            width={TIME_COLUMN_WIDTH}
            className="sticky left-0 z-10"
          />

          {/* Grid with blocks */}
          <div className="flex-1 relative">
            <TimeGrid
              startHour={startHour}
              endHour={endHour}
              pixelsPerHour={pixelsPerHour}
            >
              {/* Booking blocks */}
              <div className="absolute inset-0 px-2">
                <BlocksContainer
                  positionedBlocks={positionedBlocks}
                  tableColorMap={colorMap}
                  getTableColor={getTableColor}
                  conflicts={data?.conflicts ?? []}
                  selectedBlockId={selectedBlockId}
                  onBlockClick={handleBlockClick}
                  onBlockAction={handleBlockAction}
                />
              </div>

              {/* Now indicator */}
              {isToday(currentDate) && (
                <NowIndicator
                  startHour={startHour}
                  endHour={endHour}
                  pixelsPerHour={pixelsPerHour}
                  className="left-0"
                />
              )}
            </TimeGrid>
          </div>
        </div>
      </div>

      {/* Conflict indicator */}
      {data && data.conflicts.length > 0 && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-700">
            <span className="font-medium">{data.conflicts.length} conflict{data.conflicts.length > 1 ? 's' : ''}</span>
            {' '}detected - overlapping bookings on the same table
          </p>
        </div>
      )}
    </div>
  );
}
