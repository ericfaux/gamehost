'use client';

import * as React from 'react';
import { useMemo, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Clock, Users, Gamepad2 } from '@/components/icons';
import type { TimelineBlock as TimelineBlockType, BookingStatus } from '@/lib/db/types';
import type { TimeRange } from '@/lib/data/timeline';

// =============================================================================
// Types
// =============================================================================

interface TimelineBlockProps {
  block: TimelineBlockType;
  timeRange: TimeRange;
  pixelsPerHour: number;
  rowHeight: number;
  onClick: () => void;
  isSelected: boolean;
  showConflict?: boolean;
}

interface BlockPosition {
  left: number;
  width: number;
  isClippedStart: boolean;
  isClippedEnd: boolean;
}

interface BlockStyles {
  base: string;
}

// =============================================================================
// Constants
// =============================================================================

const MIN_BLOCK_WIDTH = 40;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculates block position with clamping for blocks extending beyond visible range.
 */
function getBlockPosition(
  block: TimelineBlockType,
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
  const startOffset = (visibleStart - timeRange.start.getTime()) / 3600000;
  const duration = (visibleEnd - visibleStart) / 3600000;

  return {
    left: startOffset * pixelsPerHour,
    width: Math.max(duration * pixelsPerHour, MIN_BLOCK_WIDTH),
    isClippedStart,
    isClippedEnd,
  };
}

/**
 * Calculates total timeline width in pixels.
 */
function getTotalWidth(timeRange: TimeRange, pixelsPerHour: number): number {
  const hours = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60);
  return hours * pixelsPerHour;
}

/**
 * Formats a time range for display.
 */
function formatTimeRange(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return `${formatTime(start)} - ${formatTime(end)}`;
}

/**
 * Determines if a session is overtime based on current time vs estimated end.
 */
function isSessionOvertime(block: TimelineBlockType): boolean {
  if (block.type !== 'session') return false;
  const now = new Date();
  const endTime = new Date(block.end_time);
  return now > endTime;
}

/**
 * Gets the effective status for display, including overtime detection.
 */
function getEffectiveStatus(block: TimelineBlockType): string {
  if (block.type === 'session') {
    return isSessionOvertime(block) ? 'overtime' : 'active';
  }
  return block.booking_status ?? 'pending';
}

/**
 * Gets status-based styling for timeline blocks.
 */
function getBlockStyles(block: TimelineBlockType, showConflict?: boolean): BlockStyles {
  const base: string[] = [];
  const status = getEffectiveStatus(block);

  if (block.type === 'booking') {
    switch (status) {
      case 'pending':
        base.push('bg-stone-200 border-stone-400');
        break;
      case 'confirmed':
        base.push('bg-white border-stone-300');
        break;
      case 'arrived':
        base.push('bg-amber-50 border-amber-400 bg-stripes-amber');
        break;
      case 'seated':
        base.push('bg-emerald-50 border-emerald-400');
        break;
      case 'completed':
        base.push('bg-stone-100 border-stone-300 opacity-60');
        break;
      default:
        base.push('bg-stone-50 border-stone-300');
    }

    // Game reservation indicator - left border accent
    if (block.game_title) {
      base.push('border-l-4 border-l-sky-400');
    }
  } else if (block.type === 'session') {
    if (status === 'overtime') {
      base.push('bg-red-50 border-red-400');
    } else {
      base.push('bg-emerald-50 border-emerald-400');
    }
  }

  // Conflict highlighting
  if (showConflict) {
    base.push('ring-2 ring-red-500 ring-offset-1 animate-pulse');
  }

  return { base: base.join(' ') };
}

// =============================================================================
// StatusBadge Component
// =============================================================================

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-stone-200 text-stone-700' },
    confirmed: { label: 'Confirmed', className: 'bg-stone-100 text-stone-700' },
    arrived: { label: 'Arrived', className: 'bg-amber-100 text-amber-700' },
    seated: { label: 'Seated', className: 'bg-emerald-100 text-emerald-700' },
    active: { label: 'Playing', className: 'bg-emerald-100 text-emerald-700' },
    overtime: { label: 'Overtime', className: 'bg-red-100 text-red-700' },
    completed: { label: 'Completed', className: 'bg-stone-100 text-stone-500' },
  };

  const { label, className } = config[status] ?? { label: status, className: 'bg-stone-100 text-stone-600' };

  return (
    <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap', className)}>
      {label}
    </span>
  );
}

// =============================================================================
// BlockContent Component
// =============================================================================

interface BlockContentProps {
  block: TimelineBlockType;
  width: number;
}

function BlockContent({ block, width }: BlockContentProps) {
  const isCompact = width < 80;
  const status = getEffectiveStatus(block);
  const label = block.type === 'booking' ? block.guest_name : (block.game_title || 'Active Session');

  return (
    <div className="h-full px-2 py-1 overflow-hidden relative">
      {/* Status indicator dot */}
      <div
        className={cn(
          'absolute top-1 right-1 w-2 h-2 rounded-full',
          block.type === 'session' && status !== 'overtime' && 'bg-emerald-500 animate-pulse',
          block.type === 'session' && status === 'overtime' && 'bg-red-500 animate-pulse',
          block.type === 'booking' && status === 'arrived' && 'bg-amber-500',
        )}
      />

      {/* Main content */}
      <div className="text-xs font-medium truncate pr-3">
        {label}
      </div>

      {!isCompact && (
        <>
          <div className="text-xs text-stone-500 truncate">
            {formatTimeRange(block.start_time, block.end_time)}
          </div>
          {block.game_title && block.type === 'booking' && (
            <div className="text-xs text-sky-600 truncate flex items-center gap-1">
              <Gamepad2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{block.game_title}</span>
            </div>
          )}
        </>
      )}

      {/* Game reservation indicator (always visible when compact) */}
      {block.game_title && isCompact && (
        <div className="absolute bottom-1 right-1">
          <Gamepad2 className="w-3 h-3 text-sky-500" />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BlockTooltip Component
// =============================================================================

interface BlockTooltipProps {
  block: TimelineBlockType;
}

function BlockTooltip({ block }: BlockTooltipProps) {
  const status = getEffectiveStatus(block);
  const label = block.type === 'booking' ? block.guest_name : (block.game_title || 'Active Session');

  return (
    <div className="space-y-2 p-1">
      <div className="flex items-center justify-between gap-4">
        <span className="font-medium text-sm">{label}</span>
        <StatusBadge status={status} />
      </div>

      <div className="text-sm text-stone-600 space-y-1">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>{formatTimeRange(block.start_time, block.end_time)}</span>
        </div>

        {block.party_size && (
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 flex-shrink-0" />
            <span>Party of {block.party_size}</span>
          </div>
        )}

        {block.game_title && (
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-3 h-3 text-sky-500 flex-shrink-0" />
            <span>{block.game_title}</span>
          </div>
        )}
      </div>

      {block.type === 'booking' && block.booking_id && (
        <div className="text-xs text-stone-400 pt-1 border-t border-stone-100">
          Click to view details
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main TimelineBlock Component
// =============================================================================

/**
 * Interactive timeline block representing a booking or session.
 *
 * Features:
 * - Status-based styling (pending, confirmed, arrived, active, overtime)
 * - Game reservation indicator (blue left border + icon)
 * - Arrived state shows striped pattern
 * - Overtime shows red/warning colors
 * - Hover tooltip with all relevant info
 * - Selected state has clear ring
 * - Conflict state pulses for attention
 */
export function TimelineBlock({
  block,
  timeRange,
  pixelsPerHour,
  rowHeight,
  onClick,
  isSelected,
  showConflict,
}: TimelineBlockProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom'>('top');
  const blockRef = useRef<HTMLButtonElement>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const position = useMemo(
    () => getBlockPosition(block, timeRange, pixelsPerHour),
    [block, timeRange, pixelsPerHour]
  );

  const styles = useMemo(
    () => getBlockStyles(block, showConflict),
    [block, showConflict]
  );

  const totalWidth = useMemo(
    () => getTotalWidth(timeRange, pixelsPerHour),
    [timeRange, pixelsPerHour]
  );

  // Don't render if block is completely outside visible range
  if (position.left >= totalWidth || position.left + position.width <= 0) {
    return null;
  }

  // Calculate if we're near the top of the viewport for tooltip positioning
  const handleMouseEnter = () => {
    if (blockRef.current) {
      const rect = blockRef.current.getBoundingClientRect();
      // If block is in top 150px of viewport, show tooltip below
      setTooltipPosition(rect.top < 150 ? 'bottom' : 'top');
    }
    // Delay showing tooltip slightly to avoid flicker on quick mouse movements
    tooltipTimeout.current = setTimeout(() => {
      setShowTooltip(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
    }
    setShowTooltip(false);
  };

  const status = getEffectiveStatus(block);
  const label = block.type === 'booking' ? block.guest_name : (block.game_title || 'Session');

  return (
    <div className="relative">
      <button
        ref={blockRef}
        type="button"
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'absolute top-1 bottom-1 rounded border cursor-pointer',
          'transition-all duration-150',
          'hover:shadow-md hover:z-10',
          'focus-ring',
          styles.base,
          isSelected && 'ring-2 ring-teal-500 ring-offset-1 z-20 shadow-md',
          // Clipped block indicators
          position.isClippedStart && 'rounded-l-none border-l-2 border-l-stone-400',
          position.isClippedEnd && 'rounded-r-none border-r-2 border-r-stone-400',
        )}
        style={{
          left: Math.max(0, position.left),
          width: Math.min(position.width, totalWidth - Math.max(0, position.left)),
        }}
        aria-pressed={isSelected}
        aria-label={`${label} - ${formatTimeRange(block.start_time, block.end_time)}`}
      >
        <BlockContent block={block} width={position.width} />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className={cn(
            'absolute z-50 pointer-events-none',
            'bg-white border border-stone-200 rounded-lg shadow-lg',
            'min-w-[200px] max-w-xs',
            tooltipPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
          style={{
            left: Math.max(0, position.left),
          }}
        >
          <BlockTooltip block={block} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export type { TimelineBlockProps };
export { getBlockPosition, getBlockStyles, formatTimeRange, StatusBadge };
