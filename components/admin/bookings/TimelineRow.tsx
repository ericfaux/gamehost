'use client';

import * as React from 'react';
import { useMemo, useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { TimelineBlock } from './TimelineBlock';
import type { TimelineBlock as TimelineBlockType } from '@/lib/db/types';
import type { TimelineTable, TimeRange, TimelineConflict } from '@/lib/data/timeline';
import type { BlockAction } from './TimelineBlock';

// =============================================================================
// Types
// =============================================================================

interface TimelineRowProps {
  table: TimelineTable;
  timeRange: TimeRange;
  pixelsPerHour: number;
  rowHeight: number;
  onBlockClick: (block: TimelineBlockType) => void;
  onBlockAction?: (blockId: string, action: BlockAction) => void;
  onDrop?: (bookingId: string, tableId: string, newTime: Date) => Promise<void>;
  selectedBlockId?: string;
  conflicts?: TimelineConflict[];
  isDragActive?: boolean;
}

interface TimelineGridLinesProps {
  timeRange: TimeRange;
  pixelsPerHour: number;
}

interface TableLabelsProps {
  tables: TimelineTable[];
  rowHeight: number;
  headerHeight?: number;
}

interface DropPreview {
  tableId: string;
  time: Date;
  isValid: boolean;
}

interface DragData {
  blockId: string;
  bookingId: string;
  tableId: string;
  startTime: string;
  endTime: string;
}

// =============================================================================
// Constants
// =============================================================================

const SNAP_INTERVAL_MINUTES = 15;

// =============================================================================
// Utility Functions
// =============================================================================

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
 * Calculates total timeline width in pixels.
 */
function getTotalWidth(timeRange: TimeRange, pixelsPerHour: number): number {
  const hours = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60);
  return hours * pixelsPerHour;
}

/**
 * Converts pixels to time based on timeline range.
 */
function pixelsToTime(
  pixelX: number,
  containerRect: DOMRect,
  timeRange: TimeRange,
  pixelsPerHour: number,
  scrollLeft: number
): Date {
  // Calculate pixel position relative to timeline start (accounting for scroll)
  const relativeX = pixelX - containerRect.left + scrollLeft;

  // Convert pixels to hours
  const hoursFromStart = relativeX / pixelsPerHour;

  // Convert to timestamp
  const timeMs = timeRange.start.getTime() + (hoursFromStart * 3600000);
  return new Date(timeMs);
}

/**
 * Snaps a time to the nearest interval (e.g., 15 minutes).
 */
function snapToInterval(time: Date, intervalMinutes: number): Date {
  const totalMinutes = time.getHours() * 60 + time.getMinutes();
  const snappedMinutes = Math.round(totalMinutes / intervalMinutes) * intervalMinutes;

  const result = new Date(time);
  result.setHours(Math.floor(snappedMinutes / 60));
  result.setMinutes(snappedMinutes % 60);
  result.setSeconds(0);
  result.setMilliseconds(0);

  return result;
}

/**
 * Converts a time to pixel position on the timeline.
 */
function timeToPixels(time: Date, timeRange: TimeRange, pixelsPerHour: number): number {
  const hoursFromStart = (time.getTime() - timeRange.start.getTime()) / 3600000;
  return hoursFromStart * pixelsPerHour;
}

/**
 * Checks if a time falls within the timeline range.
 */
function isTimeInRange(time: Date, timeRange: TimeRange): boolean {
  return time.getTime() >= timeRange.start.getTime() &&
         time.getTime() <= timeRange.end.getTime();
}

/**
 * Formats a time for display (e.g., "2:30 PM").
 */
function formatTime(time: Date): string {
  return time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// =============================================================================
// TimelineGridLines Component
// =============================================================================

/**
 * Subtle hour grid lines for visual alignment with time axis.
 */
function TimelineGridLines({ timeRange, pixelsPerHour }: TimelineGridLinesProps) {
  const hours = useMemo(
    () => getHoursBetween(timeRange.start, timeRange.end),
    [timeRange]
  );

  return (
    <div className="absolute inset-0 pointer-events-none">
      {hours.map((hour, i) => (
        <div
          key={hour}
          className="absolute top-0 bottom-0 border-l border-stone-100"
          style={{ left: i * pixelsPerHour }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// DropIndicator Component
// =============================================================================

interface DropIndicatorProps {
  dropPreview: DropPreview;
  timeRange: TimeRange;
  pixelsPerHour: number;
}

function DropIndicator({ dropPreview, timeRange, pixelsPerHour }: DropIndicatorProps) {
  const left = timeToPixels(dropPreview.time, timeRange, pixelsPerHour);

  return (
    <>
      {/* Drop line indicator */}
      <div
        className={cn(
          'absolute top-1 bottom-1 w-1 rounded transition-all duration-75',
          dropPreview.isValid ? 'bg-teal-500' : 'bg-red-400',
        )}
        style={{ left: Math.max(0, left - 2) }}
      />

      {/* Time label */}
      <div
        className={cn(
          'absolute -top-6 px-2 py-0.5 text-xs font-mono rounded shadow-sm whitespace-nowrap',
          dropPreview.isValid
            ? 'bg-teal-500 text-white'
            : 'bg-red-400 text-white',
        )}
        style={{ left: Math.max(0, left - 24) }}
      >
        {formatTime(dropPreview.time)}
      </div>

      {/* Drop zone highlight */}
      <div
        className={cn(
          'absolute top-0 bottom-0 pointer-events-none transition-opacity',
          dropPreview.isValid ? 'bg-teal-500/10' : 'bg-red-400/10',
        )}
        style={{
          left: Math.max(0, left - 2),
          width: 80, // Approximate block width
        }}
      />
    </>
  );
}

// =============================================================================
// TimelineRow Component
// =============================================================================

/**
 * Single table row in the timeline Gantt view.
 * Handles block positioning, grid lines, empty state, and drag-drop.
 */
export function TimelineRow({
  table,
  timeRange,
  pixelsPerHour,
  rowHeight,
  onBlockClick,
  onBlockAction,
  onDrop,
  selectedBlockId,
  conflicts = [],
  isDragActive = false,
}: TimelineRowProps) {
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const totalWidth = useMemo(
    () => getTotalWidth(timeRange, pixelsPerHour),
    [timeRange, pixelsPerHour]
  );

  // Get conflict block IDs for this table
  const conflictBlockIds = useMemo(() => {
    const ids = new Set<string>();
    conflicts
      .filter((c) => c.tableId === table.id)
      .forEach((c) => {
        ids.add(c.block1Id);
        ids.add(c.block2Id);
      });
    return ids;
  }, [conflicts, table.id]);

  const handleBlockClick = useCallback(
    (block: TimelineBlockType) => {
      onBlockClick(block);
    },
    [onBlockClick]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!rowRef.current || !onDrop) return;

    const containerRect = rowRef.current.getBoundingClientRect();
    const scrollContainer = rowRef.current.closest('.overflow-x-auto');
    const scrollLeft = scrollContainer?.scrollLeft ?? 0;

    // Calculate time from pixel position
    const time = pixelsToTime(e.clientX, containerRect, timeRange, pixelsPerHour, scrollLeft);
    const snappedTime = snapToInterval(time, SNAP_INTERVAL_MINUTES);

    // Validate the drop position
    const isValid = isTimeInRange(snappedTime, timeRange);

    setDropPreview({
      tableId: table.id,
      time: snappedTime,
      isValid,
    });

    e.dataTransfer.dropEffect = isValid ? 'move' : 'none';
  }, [table.id, timeRange, pixelsPerHour, onDrop]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if actually leaving the row (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!rowRef.current?.contains(relatedTarget)) {
      setDropPreview(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!dropPreview || !dropPreview.isValid || !onDrop) {
      setDropPreview(null);
      return;
    }

    // Get drag data
    const dataString = e.dataTransfer.getData('application/json');
    if (!dataString) {
      setDropPreview(null);
      return;
    }

    try {
      const dragData: DragData = JSON.parse(dataString);

      if (!dragData.bookingId) {
        setDropPreview(null);
        return;
      }

      setIsDropping(true);

      // Execute the drop
      await onDrop(dragData.bookingId, dropPreview.tableId, dropPreview.time);
    } catch (err) {
      console.error('Failed to handle drop:', err);
    } finally {
      setDropPreview(null);
      setIsDropping(false);
    }
  }, [dropPreview, onDrop]);

  return (
    <div
      ref={rowRef}
      className={cn(
        'relative border-b border-stone-200 transition-colors',
        isDragActive && 'hover:bg-teal-50/30',
        isDropping && 'bg-teal-50/50',
      )}
      style={{ height: rowHeight, minWidth: totalWidth }}
      role="row"
      aria-label={`${table.label} - ${table.blocks.length} bookings`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Background grid lines (hourly) */}
      <TimelineGridLines timeRange={timeRange} pixelsPerHour={pixelsPerHour} />

      {/* Drop preview indicator */}
      {dropPreview && (
        <DropIndicator
          dropPreview={dropPreview}
          timeRange={timeRange}
          pixelsPerHour={pixelsPerHour}
        />
      )}

      {/* Blocks */}
      {table.blocks.map((block) => (
        <TimelineBlock
          key={block.id}
          block={block}
          timeRange={timeRange}
          pixelsPerHour={pixelsPerHour}
          rowHeight={rowHeight}
          onClick={() => handleBlockClick(block)}
          onAction={onBlockAction}
          isSelected={block.id === selectedBlockId}
          showConflict={conflictBlockIds.has(block.id)}
        />
      ))}

      {/* Empty state indicator */}
      {table.blocks.length === 0 && !dropPreview && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs text-stone-400 font-medium">Available</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TableLabels Component
// =============================================================================

/**
 * Fixed column showing table labels with name and capacity.
 * Positioned outside the scrollable timeline area.
 */
export function TableLabels({
  tables,
  rowHeight,
  headerHeight = 40,
}: TableLabelsProps) {
  return (
    <div className="bg-stone-50 flex-shrink-0 w-40">
      {/* Header spacer - aligns with time axis */}
      <div
        className="border-b border-stone-300 bg-stone-100 flex items-center px-4 font-mono text-xs text-stone-500 uppercase tracking-wider"
        style={{ height: headerHeight }}
      >
        Tables
      </div>

      {/* Table labels */}
      {tables.map((table) => (
        <div
          key={table.id}
          className="flex items-center px-4 border-b border-stone-200 gap-2"
          style={{ height: rowHeight }}
          role="rowheader"
        >
          <div className="truncate min-w-0 flex-1">
            <div className="font-medium text-sm text-stone-900 truncate">
              {table.label}
            </div>
            {table.capacity && (
              <div className="text-xs text-stone-500 mt-0.5">
                {table.capacity} {table.capacity === 1 ? 'seat' : 'seats'}
              </div>
            )}
            {/* Zone badge if available */}
            {table.zone && (
              <span className="inline-block mt-1 text-[10px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded font-mono">
                {table.zone}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export type { TimelineRowProps, TableLabelsProps, TimelineGridLinesProps };
export { getTotalWidth, getHoursBetween, timeToPixels, snapToInterval, pixelsToTime };
