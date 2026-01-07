'use client';

import * as React from 'react';
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useMemo,
} from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TimelineRow, TableLabels } from './TimelineRow';
import type { TimelineBlock } from '@/lib/db/types';
import type { TimelineData, TimeRange } from '@/lib/data/timeline';
import { getTimelineData } from '@/lib/data/timeline';
import type { BlockAction } from './TimelineBlock';

// =============================================================================
// Constants
// =============================================================================

const PIXELS_PER_HOUR = 120;
const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 32;

// =============================================================================
// Types
// =============================================================================

interface TimelineProps {
  venueId: string;
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
  onBlockClick?: (block: TimelineBlock) => void;
  onBlockAction?: (blockId: string, action: BlockAction) => void;
  onReschedule?: (bookingId: string, tableId: string, newTime: Date) => Promise<void>;
}

interface TimelineHeaderProps {
  date: Date;
  onDateChange: (date: Date) => void;
  isToday: boolean;
}

interface TimeAxisProps {
  timeRange: TimeRange;
  pixelsPerHour: number;
}

interface NowIndicatorProps {
  timeRange: TimeRange;
  pixelsPerHour: number;
  isToday: boolean;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
}

interface DropFeedbackProps {
  isOpen: boolean;
  message: string;
  isError: boolean;
  onClose: () => void;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Converts a time to pixel position on the timeline.
 */
function timeToPixels(time: Date, range: TimeRange, pixelsPerHour: number): number {
  const minutesFromStart = (time.getTime() - range.start.getTime()) / 60000;
  return (minutesFromStart / 60) * pixelsPerHour;
}

/**
 * Gets the hours between a start and end date.
 */
function getHoursBetween(start: Date, end: Date): number[] {
  const hours: number[] = [];
  let current = start.getHours();
  const endHour = end.getHours();
  while (current <= endHour) {
    hours.push(current);
    current++;
  }
  return hours;
}

/**
 * Formats an hour number to display string (e.g., 9 -> "9am", 14 -> "2pm").
 */
function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

/**
 * Adds days to a date.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Formats a date for display (e.g., "Wednesday, January 7").
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
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
 * Calculates total timeline width in pixels.
 */
function getTimelineWidth(range: TimeRange, pixelsPerHour: number): number {
  const hours = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60);
  return hours * pixelsPerHour;
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Header with date navigation controls.
 */
function TimelineHeader({ date, onDateChange, isToday }: TimelineHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--color-structure)] bg-[color:var(--color-elevated)]">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDateChange(addDays(date, -1))}
          aria-label="Previous day"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="font-serif text-lg font-semibold text-[color:var(--color-ink-primary)] min-w-[220px] text-center">
          {formatDate(date)}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDateChange(addDays(date, 1))}
          aria-label="Next day"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={isToday ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onDateChange(new Date())}
          disabled={isToday}
        >
          <Clock className="w-3.5 h-3.5 mr-1.5" />
          Today
        </Button>
        <Button variant="ghost" size="icon" aria-label="Open calendar">
          <Calendar className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Time axis header showing hour markers.
 */
function TimeAxis({ timeRange, pixelsPerHour }: TimeAxisProps) {
  const hours = useMemo(
    () => getHoursBetween(timeRange.start, timeRange.end),
    [timeRange]
  );

  return (
    <div
      className="sticky top-0 z-10 flex bg-stone-100 border-b border-stone-300"
      style={{ height: HEADER_HEIGHT }}
    >
      {hours.map((hour) => (
        <div
          key={hour}
          className="flex-shrink-0 border-r border-stone-200 px-2 flex items-center font-mono text-xs text-stone-500"
          style={{ width: pixelsPerHour }}
        >
          {formatHour(hour)}
        </div>
      ))}
    </div>
  );
}

/**
 * Red line indicator showing current time.
 */
const NowIndicator = forwardRef<HTMLDivElement, NowIndicatorProps>(
  function NowIndicator({ timeRange, pixelsPerHour, isToday }, ref) {
    const [position, setPosition] = useState<number | null>(null);

    useEffect(() => {
      if (!isToday) {
        setPosition(null);
        return;
      }

      const updatePosition = () => {
        const now = new Date();
        const pos = timeToPixels(now, timeRange, pixelsPerHour);

        // Only show if within time range
        const timelineWidth = getTimelineWidth(timeRange, pixelsPerHour);
        if (pos >= 0 && pos <= timelineWidth) {
          setPosition(pos);
        } else {
          setPosition(null);
        }
      };

      updatePosition();
      const interval = setInterval(updatePosition, 60000); // Update every minute
      return () => clearInterval(interval);
    }, [timeRange, pixelsPerHour, isToday]);

    if (position === null) {
      return null;
    }

    return (
      <div
        ref={ref}
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
        style={{ left: position }}
      >
        {/* Top indicator dot */}
        <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-red-500" />
        {/* Time label */}
        <div className="absolute -top-6 -left-4 bg-red-500 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
          {new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
      </div>
    );
  }
);

/**
 * Confirmation dialog for destructive actions.
 */
function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="font-serif text-lg font-semibold text-[color:var(--color-ink-primary)] mb-2">
          {title}
        </h3>
        <p className="text-sm text-stone-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={confirmVariant} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Drop feedback toast notification.
 */
function DropFeedback({ isOpen, message, isError, onClose }: DropFeedbackProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg',
        isError ? 'bg-red-500 text-white' : 'bg-teal-500 text-white',
      )}
    >
      {isError && <AlertCircle className="w-4 h-4" />}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

/**
 * Loading skeleton for the timeline.
 */
function TimelineSkeleton() {
  return (
    <div className="flex flex-col h-full bg-stone-50 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-stone-200 rounded" />
          <div className="w-48 h-6 bg-stone-200 rounded" />
          <div className="w-8 h-8 bg-stone-200 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-8 bg-stone-200 rounded" />
          <div className="w-8 h-8 bg-stone-200 rounded" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex flex-1 overflow-hidden">
        {/* Table labels */}
        <div className="w-36 flex-shrink-0 border-r border-stone-200 bg-white">
          <div className="h-8 bg-stone-100 border-b border-stone-300" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 border-b border-stone-200 flex items-center px-3"
            >
              <div className="w-20 h-4 bg-stone-200 rounded" />
            </div>
          ))}
        </div>

        {/* Timeline area */}
        <div className="flex-1">
          <div className="h-8 bg-stone-100 border-b border-stone-300" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 border-b border-stone-200 relative"
            >
              <div
                className="absolute top-2 h-8 bg-stone-200 rounded"
                style={{
                  left: `${10 + i * 5}%`,
                  width: `${15 + (i % 3) * 5}%`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state when no tables exist.
 */
function TimelineEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-stone-100 flex items-center justify-center">
        <Calendar className="w-8 h-8 text-stone-400" />
      </div>
      <h3 className="font-serif text-lg font-semibold text-[color:var(--color-ink-primary)] mb-1">
        No tables configured
      </h3>
      <p className="text-sm text-stone-500 max-w-xs">
        Add tables to your venue to see the booking timeline.
      </p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Timeline component for visualizing bookings and sessions on a Gantt-style view.
 *
 * Features:
 * - Horizontal scrolling for time (tables fixed on left)
 * - "Now" indicator line that moves in real-time
 * - Auto-scroll to current time on load
 * - Date navigation (prev/next/today)
 * - Drag-to-reschedule bookings
 * - Quick actions and context menus
 * - Responsive on tablet (1024px+)
 */
export function Timeline({
  venueId,
  initialDate,
  onDateChange,
  onBlockClick,
  onBlockAction,
  onReschedule,
}: TimelineProps) {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [date, setDate] = useState<Date>(initialDate ?? new Date());
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'cancel' | 'end';
    blockId: string;
    bookingId?: string;
  } | null>(null);

  // Drop feedback state
  const [dropFeedback, setDropFeedback] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const nowLineRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------
  const isToday = useMemo(() => isSameDay(date, new Date()), [date]);

  const timelineWidth = useMemo(() => {
    if (!timelineData) return 0;
    return getTimelineWidth(timelineData.timeRange, PIXELS_PER_HOUR);
  }, [timelineData]);

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------
  const handleDateChange = useCallback(
    (newDate: Date) => {
      setDate(newDate);
      onDateChange?.(newDate);
    },
    [onDateChange]
  );

  const handleBlockClick = useCallback(
    (block: TimelineBlock) => {
      setSelectedBlockId(block.id);
      onBlockClick?.(block);
    },
    [onBlockClick]
  );

  const handleBlockAction = useCallback(
    (blockId: string, action: BlockAction) => {
      // Find the block
      const block = timelineData?.tables
        .flatMap((t) => t.blocks)
        .find((b) => b.id === blockId);

      if (!block) return;

      // Handle confirmation-required actions
      if (action === 'cancel') {
        setConfirmDialog({
          type: 'cancel',
          blockId,
          bookingId: block.booking_id ?? undefined,
        });
        return;
      }

      if (action === 'end' && block.type === 'session') {
        setConfirmDialog({
          type: 'end',
          blockId,
        });
        return;
      }

      // Forward to parent handler
      onBlockAction?.(blockId, action);
    },
    [timelineData, onBlockAction]
  );

  const handleConfirmAction = useCallback(async () => {
    if (!confirmDialog) return;

    if (confirmDialog.type === 'cancel' && confirmDialog.bookingId) {
      // Call parent handler for cancel
      onBlockAction?.(confirmDialog.blockId, 'cancel');
    } else if (confirmDialog.type === 'end') {
      // Call parent handler for end session
      onBlockAction?.(confirmDialog.blockId, 'end');
    }

    setConfirmDialog(null);
  }, [confirmDialog, onBlockAction]);

  const handleDrop = useCallback(
    async (bookingId: string, tableId: string, newTime: Date) => {
      if (!onReschedule) {
        setDropFeedback({
          message: 'Rescheduling is not enabled',
          isError: true,
        });
        return;
      }

      try {
        await onReschedule(bookingId, tableId, newTime);
        setDropFeedback({
          message: `Booking rescheduled to ${newTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}`,
          isError: false,
        });
        // Refetch data
        refreshTimeline();
      } catch (err) {
        console.error('Failed to reschedule:', err);
        setDropFeedback({
          message: 'Failed to reschedule booking. Please try again.',
          isError: true,
        });
      }
    },
    [onReschedule]
  );

  const refreshTimeline = useCallback(async () => {
    try {
      const dateString = formatDateString(date);
      const data = await getTimelineData(venueId, dateString, {
        startHour: 9,
        endHour: 23,
      });
      setTimelineData(data);
    } catch (err) {
      console.error('Failed to refresh timeline:', err);
    }
  }, [venueId, date]);

  // Global drag state tracking
  useEffect(() => {
    const handleDragStart = () => setIsDragActive(true);
    const handleDragEnd = () => setIsDragActive(false);

    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const dateString = formatDateString(date);
        const data = await getTimelineData(venueId, dateString, {
          startHour: 9,
          endHour: 23,
        });

        if (!cancelled) {
          setTimelineData(data);
        }
      } catch (err) {
        console.error('Failed to fetch timeline data:', err);
        if (!cancelled) {
          setError('Failed to load timeline data');
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
  }, [venueId, date]);

  // ---------------------------------------------------------------------------
  // Auto-scroll to "now" on load
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!scrollContainerRef.current || !timelineData || !isToday) return;

    const now = new Date();
    const scrollPosition = timeToPixels(now, timelineData.timeRange, PIXELS_PER_HOUR);

    // Scroll to now, centered in view
    const containerWidth = scrollContainerRef.current.clientWidth;
    scrollContainerRef.current.scrollLeft = Math.max(
      0,
      scrollPosition - containerWidth / 3
    );
  }, [timelineData, isToday]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-stone-50">
        <TimelineHeader
          date={date}
          onDateChange={handleDateChange}
          isToday={isToday}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setDate(new Date(date))} // Trigger refetch
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!timelineData || timelineData.tables.length === 0) {
    return (
      <div className="flex flex-col h-full bg-stone-50">
        <TimelineHeader
          date={date}
          onDateChange={handleDateChange}
          isToday={isToday}
        />
        <div className="flex-1 flex items-center justify-center">
          <TimelineEmpty />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[color:var(--color-surface)]">
      {/* Header with date navigation */}
      <TimelineHeader
        date={date}
        onDateChange={handleDateChange}
        isToday={isToday}
      />

      {/* Main timeline area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed table labels column */}
        <TableLabels tables={timelineData.tables} rowHeight={ROW_HEIGHT} />

        {/* Scrollable timeline area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto"
        >
          <div style={{ width: timelineWidth, minWidth: '100%' }}>
            {/* Time axis header (sticky) */}
            <TimeAxis
              timeRange={timelineData.timeRange}
              pixelsPerHour={PIXELS_PER_HOUR}
            />

            {/* Table rows */}
            <div className="relative">
              {timelineData.tables.map((table) => (
                <TimelineRow
                  key={table.id}
                  table={table}
                  timeRange={timelineData.timeRange}
                  pixelsPerHour={PIXELS_PER_HOUR}
                  rowHeight={ROW_HEIGHT}
                  onBlockClick={handleBlockClick}
                  onBlockAction={handleBlockAction}
                  onDrop={onReschedule ? handleDrop : undefined}
                  selectedBlockId={selectedBlockId ?? undefined}
                  conflicts={timelineData.conflicts}
                  isDragActive={isDragActive}
                />
              ))}

              {/* Now indicator line */}
              <NowIndicator
                ref={nowLineRef}
                timeRange={timelineData.timeRange}
                pixelsPerHour={PIXELS_PER_HOUR}
                isToday={isToday}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Conflict indicator */}
      {timelineData.conflicts.length > 0 && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-medium text-red-700">
            {timelineData.conflicts.length} scheduling{' '}
            {timelineData.conflicts.length === 1 ? 'conflict' : 'conflicts'}{' '}
            detected
          </span>
        </div>
      )}

      {/* Confirmation dialog */}
      <ConfirmDialog
        isOpen={confirmDialog !== null}
        title={
          confirmDialog?.type === 'cancel'
            ? 'Cancel Booking'
            : 'End Session'
        }
        message={
          confirmDialog?.type === 'cancel'
            ? 'Are you sure you want to cancel this booking? This action cannot be undone.'
            : 'Are you sure you want to end this session? The session will be marked as completed.'
        }
        confirmLabel={confirmDialog?.type === 'cancel' ? 'Cancel Booking' : 'End Session'}
        confirmVariant="destructive"
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Drop feedback toast */}
      <DropFeedback
        isOpen={dropFeedback !== null}
        message={dropFeedback?.message ?? ''}
        isError={dropFeedback?.isError ?? false}
        onClose={() => setDropFeedback(null)}
      />
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export type { TimelineProps };
export { PIXELS_PER_HOUR, ROW_HEIGHT, HEADER_HEIGHT, timeToPixels };
