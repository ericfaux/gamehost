'use client';

import * as React from 'react';
import { useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { TimelineBlock, BookingStatus } from '@/lib/db/types';
import type { TimelineTable, TimeRange, TimelineConflict } from '@/lib/data/timeline';

// =============================================================================
// Types
// =============================================================================

interface TimelineRowProps {
  table: TimelineTable;
  timeRange: TimeRange;
  pixelsPerHour: number;
  rowHeight: number;
  onBlockClick: (block: TimelineBlock) => void;
  selectedBlockId?: string;
  conflicts?: TimelineConflict[];
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

interface TimelineBlockProps {
  block: TimelineBlock;
  timeRange: TimeRange;
  pixelsPerHour: number;
  rowHeight: number;
  onClick: () => void;
  isSelected: boolean;
  hasConflict: boolean;
}

interface BlockPosition {
  left: number;
  width: number;
  isClippedStart: boolean;
  isClippedEnd: boolean;
}

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
 * Calculates block position with clamping for blocks extending beyond visible range.
 * Handles:
 * - Blocks that start before the visible range
 * - Blocks that end after the visible range
 * - Minimum width for visibility (40px)
 */
function getBlockPosition(
  block: TimelineBlock,
  timeRange: TimeRange,
  pixelsPerHour: number
): BlockPosition {
  const blockStart = new Date(block.start_time);
  const blockEnd = new Date(block.end_time);

  // Clamp block times to visible range
  const visibleStart = Math.max(blockStart.getTime(), timeRange.start.getTime());
  const visibleEnd = Math.min(blockEnd.getTime(), timeRange.end.getTime());

  // Check if block is clipped at boundaries
  const isClippedStart = blockStart.getTime() < timeRange.start.getTime();
  const isClippedEnd = blockEnd.getTime() > timeRange.end.getTime();

  // Calculate positions in hours from range start
  const startOffset = (visibleStart - timeRange.start.getTime()) / 3600000; // hours
  const duration = (visibleEnd - visibleStart) / 3600000; // hours

  return {
    left: startOffset * pixelsPerHour,
    width: Math.max(duration * pixelsPerHour, 40), // Minimum 40px for visibility
    isClippedStart,
    isClippedEnd,
  };
}

/**
 * Gets status-based styling for timeline blocks.
 */
function getBlockStyles(block: TimelineBlock): {
  bg: string;
  border: string;
  text: string;
} {
  if (block.type === 'session') {
    return {
      bg: 'bg-teal-100',
      border: 'border-teal-400',
      text: 'text-teal-900',
    };
  }

  // Booking blocks - style based on status
  switch (block.booking_status) {
    case 'confirmed':
      return {
        bg: 'bg-blue-100',
        border: 'border-blue-400',
        text: 'text-blue-900',
      };
    case 'arrived':
      return {
        bg: 'bg-amber-100',
        border: 'border-amber-400',
        text: 'text-amber-900',
      };
    case 'seated':
      return {
        bg: 'bg-green-100',
        border: 'border-green-500',
        text: 'text-green-900',
      };
    case 'completed':
      return {
        bg: 'bg-stone-100',
        border: 'border-stone-300',
        text: 'text-stone-500',
      };
    case 'pending':
    default:
      return {
        bg: 'bg-stone-50',
        border: 'border-stone-300 border-dashed',
        text: 'text-stone-600',
      };
  }
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
// TimelineBlockItem Component
// =============================================================================

/**
 * Individual block within a timeline row (booking or session).
 */
function TimelineBlockItem({
  block,
  timeRange,
  pixelsPerHour,
  rowHeight,
  onClick,
  isSelected,
  hasConflict,
}: TimelineBlockProps) {
  const position = useMemo(
    () => getBlockPosition(block, timeRange, pixelsPerHour),
    [block, timeRange, pixelsPerHour]
  );

  const styles = getBlockStyles(block);
  const totalWidth = getTotalWidth(timeRange, pixelsPerHour);

  // Don't render if block is completely outside visible range
  if (position.left >= totalWidth || position.left + position.width <= 0) {
    return null;
  }

  // Format time display
  const startTime = new Date(block.start_time);
  const endTime = new Date(block.end_time);
  const timeDisplay = `${startTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })} - ${endTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;

  return (
    <button
      type="button"
      className={cn(
        'absolute top-1 bottom-1 rounded-md border px-2 py-1',
        'overflow-hidden text-left transition-all duration-150',
        'hover:shadow-md hover:-translate-y-0.5 focus-ring',
        styles.bg,
        styles.border,
        styles.text,
        isSelected && 'ring-2 ring-blue-500 ring-offset-1 shadow-md -translate-y-0.5',
        hasConflict && 'ring-2 ring-red-500 ring-offset-1',
        // Clipped block indicators
        position.isClippedStart && 'rounded-l-none border-l-2 border-l-stone-400',
        position.isClippedEnd && 'rounded-r-none border-r-2 border-r-stone-400'
      )}
      style={{
        left: Math.max(0, position.left),
        width: Math.min(position.width, totalWidth - Math.max(0, position.left)),
      }}
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`${block.type === 'booking' ? block.guest_name : block.game_title || 'Session'} - ${timeDisplay}`}
    >
      <div className="flex flex-col h-full justify-center min-w-0">
        {/* Primary label */}
        <span className="text-xs font-semibold truncate">
          {block.type === 'booking'
            ? block.guest_name
            : block.game_title || 'Session'}
        </span>
        {/* Secondary info - only show if enough width */}
        {position.width > 80 && (
          <span className="text-[10px] opacity-75 truncate font-mono">
            {block.type === 'booking' && block.party_size
              ? `${block.party_size} guests`
              : timeDisplay}
          </span>
        )}
      </div>

      {/* Type indicator dot */}
      <div
        className={cn(
          'absolute top-1 right-1 w-1.5 h-1.5 rounded-full',
          block.type === 'session' ? 'bg-teal-500' : 'bg-blue-500'
        )}
      />
    </button>
  );
}

// =============================================================================
// TimelineRow Component
// =============================================================================

/**
 * Single table row in the timeline Gantt view.
 * Handles block positioning, grid lines, and empty state.
 */
export function TimelineRow({
  table,
  timeRange,
  pixelsPerHour,
  rowHeight,
  onBlockClick,
  selectedBlockId,
  conflicts = [],
}: TimelineRowProps) {
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
    (block: TimelineBlock) => {
      onBlockClick(block);
    },
    [onBlockClick]
  );

  return (
    <div
      className="relative border-b border-stone-200 hover:bg-stone-50/50 transition-colors"
      style={{ height: rowHeight, minWidth: totalWidth }}
      role="row"
      aria-label={`${table.label} - ${table.blocks.length} bookings`}
    >
      {/* Background grid lines (hourly) */}
      <TimelineGridLines timeRange={timeRange} pixelsPerHour={pixelsPerHour} />

      {/* Blocks */}
      {table.blocks.map((block) => (
        <TimelineBlockItem
          key={block.id}
          block={block}
          timeRange={timeRange}
          pixelsPerHour={pixelsPerHour}
          rowHeight={rowHeight}
          onClick={() => handleBlockClick(block)}
          isSelected={block.id === selectedBlockId}
          hasConflict={conflictBlockIds.has(block.id)}
        />
      ))}

      {/* Empty state indicator */}
      {table.blocks.length === 0 && (
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
  headerHeight = 32,
}: TableLabelsProps) {
  return (
    <div className="bg-stone-50 flex-shrink-0">
      {/* Header spacer - aligns with time axis */}
      <div
        className="border-b border-stone-300 bg-stone-100 flex items-center px-3 font-mono text-xs text-stone-500 uppercase tracking-wider"
        style={{ height: headerHeight }}
      >
        Tables
      </div>

      {/* Table labels */}
      {tables.map((table) => (
        <div
          key={table.id}
          className="flex items-center px-3 border-b border-stone-200 gap-2"
          style={{ height: rowHeight }}
          role="rowheader"
        >
          <div className="truncate min-w-0">
            <div className="font-medium text-sm text-stone-900 truncate">
              {table.label}
            </div>
            {table.capacity && (
              <div className="text-xs text-stone-500">
                {table.capacity} {table.capacity === 1 ? 'seat' : 'seats'}
              </div>
            )}
          </div>
          {/* Zone badge if available */}
          {table.zone && (
            <span className="text-[10px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
              {table.zone}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export type { TimelineRowProps, TableLabelsProps, TimelineGridLinesProps };
export { getBlockPosition, getTotalWidth, getHoursBetween };
