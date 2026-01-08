'use client';

import * as React from 'react';
import { useMemo, useState, useRef, useCallback } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Users,
  Gamepad2,
  Eye,
  XCircle,
  UserCheck,
  Check,
  CalendarClock,
  TableProperties,
  Trash2,
  GripVertical,
} from '@/components/icons';
import type { TimelineBlock as TimelineBlockType } from '@/lib/db/types';
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
  onAction?: (blockId: string, action: BlockAction) => void;
  onDragStart?: (block: TimelineBlockType, event: React.DragEvent) => void;
  onDragEnd?: () => void;
  isSelected: boolean;
  showConflict?: boolean;
  isDragPreview?: boolean;
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

export type BlockAction =
  | 'view'
  | 'arrive'
  | 'seat'
  | 'end'
  | 'reschedule'
  | 'reassign'
  | 'cancel';

interface QuickAction {
  id: BlockAction;
  label: string;
  icon: React.ReactNode;
}

// =============================================================================
// Constants
// =============================================================================

const MIN_BLOCK_WIDTH = 80;

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
 * Determines if a block can be dragged.
 * Only pending/confirmed bookings can be rescheduled via drag.
 */
function canDragBlock(block: TimelineBlockType): boolean {
  if (block.type !== 'booking') return false;
  const status = block.booking_status;
  return status === 'pending' || status === 'confirmed';
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

/**
 * Gets quick actions available for a block based on its type and status.
 */
function getQuickActions(block: TimelineBlockType): QuickAction[] {
  if (block.type === 'session') {
    return [
      { id: 'view', label: 'View', icon: <Eye className="w-3 h-3" /> },
      { id: 'end', label: 'End', icon: <XCircle className="w-3 h-3" /> },
    ];
  }

  switch (block.booking_status) {
    case 'confirmed':
      return [
        { id: 'arrive', label: 'Arrived', icon: <UserCheck className="w-3 h-3" /> },
        { id: 'seat', label: 'Seat', icon: <Check className="w-3 h-3" /> },
      ];
    case 'arrived':
      return [
        { id: 'seat', label: 'Seat Now', icon: <Check className="w-3 h-3" /> },
      ];
    case 'pending':
      return [
        { id: 'view', label: 'View', icon: <Eye className="w-3 h-3" /> },
      ];
    default:
      return [];
  }
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
  canDrag: boolean;
}

function BlockContent({ block, width, canDrag }: BlockContentProps) {
  const isCompact = width < 100;
  const status = getEffectiveStatus(block);
  const label = block.type === 'booking' ? block.guest_name : (block.game_title || 'Active Session');

  return (
    <div className="h-full px-3 py-2 overflow-hidden relative flex items-center">
      {/* Drag handle indicator */}
      {canDrag && !isCompact && (
        <div className="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center opacity-0 group-hover:opacity-50 transition-opacity">
          <GripVertical className="w-4 h-4 text-stone-400" />
        </div>
      )}

      <div className={cn('flex-1 min-w-0', canDrag && !isCompact && 'pl-3')}>
        {/* Status indicator dot */}
        <div
          className={cn(
            'absolute top-2 right-2 w-2.5 h-2.5 rounded-full',
            block.type === 'session' && status !== 'overtime' && 'bg-emerald-500 animate-pulse',
            block.type === 'session' && status === 'overtime' && 'bg-red-500 animate-pulse',
            block.type === 'booking' && status === 'arrived' && 'bg-amber-500',
          )}
        />

        {/* Main content - larger text */}
        <div className="text-sm font-medium truncate pr-4">
          {label}
        </div>

        {!isCompact && (
          <>
            <div className="text-xs text-stone-500 truncate mt-0.5">
              {formatTimeRange(block.start_time, block.end_time)}
            </div>
            {block.game_title && block.type === 'booking' && (
              <div className="text-xs text-sky-600 truncate flex items-center gap-1 mt-0.5">
                <Gamepad2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{block.game_title}</span>
              </div>
            )}
          </>
        )}

        {/* Game reservation indicator (always visible when compact) */}
        {block.game_title && isCompact && (
          <div className="absolute bottom-2 right-2">
            <Gamepad2 className="w-4 h-4 text-sky-500" />
          </div>
        )}
      </div>
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
          Click to view • Right-click for options
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BlockQuickActions Component
// =============================================================================

interface BlockQuickActionsProps {
  block: TimelineBlockType;
  onAction: (action: BlockAction) => void;
}

function BlockQuickActions({ block, onAction }: BlockQuickActionsProps) {
  const actions = getQuickActions(block);

  if (actions.length === 0) return null;

  return (
    <div className="absolute -top-8 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none group-hover:pointer-events-auto">
      {actions.map(action => (
        <Button
          key={action.id}
          size="sm"
          variant="secondary"
          className="h-6 px-2 text-xs shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onAction(action.id);
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {action.icon}
          <span className="ml-1">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}

// =============================================================================
// BlockContextMenu Component
// =============================================================================

interface BlockContextMenuProps {
  block: TimelineBlockType;
  children: React.ReactNode;
  onAction: (action: BlockAction) => void;
}

function BlockContextMenu({ block, children, onAction }: BlockContextMenuProps) {
  const menuItemClass = 'flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-stone-100 rounded outline-none data-[highlighted]:bg-stone-100';
  const dangerItemClass = 'flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer text-red-600 hover:bg-red-50 rounded outline-none data-[highlighted]:bg-red-50';

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        {children}
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="bg-white rounded-md shadow-lg border border-stone-200 p-1 min-w-[160px] z-50">
          {block.type === 'booking' && (
            <>
              <ContextMenu.Item
                className={menuItemClass}
                onSelect={() => onAction('view')}
              >
                <Eye className="w-4 h-4" />
                View Details
              </ContextMenu.Item>

              {block.booking_status === 'confirmed' && (
                <>
                  <ContextMenu.Item
                    className={menuItemClass}
                    onSelect={() => onAction('arrive')}
                  >
                    <UserCheck className="w-4 h-4" />
                    Mark Arrived
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    className={menuItemClass}
                    onSelect={() => onAction('seat')}
                  >
                    <Check className="w-4 h-4" />
                    Seat Party
                  </ContextMenu.Item>

                  <ContextMenu.Separator className="h-px bg-stone-200 my-1" />

                  <ContextMenu.Item
                    className={menuItemClass}
                    onSelect={() => onAction('reschedule')}
                  >
                    <CalendarClock className="w-4 h-4" />
                    Reschedule...
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    className={menuItemClass}
                    onSelect={() => onAction('reassign')}
                  >
                    <TableProperties className="w-4 h-4" />
                    Change Table...
                  </ContextMenu.Item>

                  <ContextMenu.Separator className="h-px bg-stone-200 my-1" />

                  <ContextMenu.Item
                    className={dangerItemClass}
                    onSelect={() => onAction('cancel')}
                  >
                    <Trash2 className="w-4 h-4" />
                    Cancel Booking
                  </ContextMenu.Item>
                </>
              )}

              {block.booking_status === 'pending' && (
                <>
                  <ContextMenu.Separator className="h-px bg-stone-200 my-1" />

                  <ContextMenu.Item
                    className={menuItemClass}
                    onSelect={() => onAction('reschedule')}
                  >
                    <CalendarClock className="w-4 h-4" />
                    Reschedule...
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    className={menuItemClass}
                    onSelect={() => onAction('reassign')}
                  >
                    <TableProperties className="w-4 h-4" />
                    Change Table...
                  </ContextMenu.Item>

                  <ContextMenu.Separator className="h-px bg-stone-200 my-1" />

                  <ContextMenu.Item
                    className={dangerItemClass}
                    onSelect={() => onAction('cancel')}
                  >
                    <Trash2 className="w-4 h-4" />
                    Cancel Booking
                  </ContextMenu.Item>
                </>
              )}

              {block.booking_status === 'arrived' && (
                <>
                  <ContextMenu.Item
                    className={menuItemClass}
                    onSelect={() => onAction('seat')}
                  >
                    <Check className="w-4 h-4" />
                    Seat Now
                  </ContextMenu.Item>
                </>
              )}
            </>
          )}

          {block.type === 'session' && (
            <>
              <ContextMenu.Item
                className={menuItemClass}
                onSelect={() => onAction('view')}
              >
                <Eye className="w-4 h-4" />
                View Session
              </ContextMenu.Item>
              <ContextMenu.Item
                className={dangerItemClass}
                onSelect={() => onAction('end')}
              >
                <XCircle className="w-4 h-4" />
                End Session
              </ContextMenu.Item>
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
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
 * - Quick actions overlay on hover
 * - Context menu with all relevant actions
 * - Drag-to-reschedule for pending/confirmed bookings
 * - Selected state has clear ring
 * - Conflict state pulses for attention
 */
export function TimelineBlock({
  block,
  timeRange,
  pixelsPerHour,
  rowHeight,
  onClick,
  onAction,
  onDragStart,
  onDragEnd,
  isSelected,
  showConflict,
  isDragPreview,
}: TimelineBlockProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom'>('top');
  const [isDragging, setIsDragging] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
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

  const canDrag = useMemo(() => canDragBlock(block), [block]);

  // All hooks must be called before any early returns
  const handleAction = useCallback((action: BlockAction) => {
    onAction?.(block.id, action);
  }, [block.id, onAction]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!canDrag) {
      e.preventDefault();
      return;
    }

    setIsDragging(true);
    setShowTooltip(false);

    // Set drag data
    e.dataTransfer.setData('application/json', JSON.stringify({
      blockId: block.id,
      bookingId: block.booking_id,
      tableId: block.table_id,
      startTime: block.start_time,
      endTime: block.end_time,
    }));
    e.dataTransfer.effectAllowed = 'move';

    // Create custom drag image if possible
    if (blockRef.current) {
      const rect = blockRef.current.getBoundingClientRect();
      e.dataTransfer.setDragImage(blockRef.current, rect.width / 2, rect.height / 2);
    }

    onDragStart?.(block, e);
  }, [block, canDrag, onDragStart]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    onDragEnd?.();
  }, [onDragEnd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }, [onClick]);

  // Don't render if block is completely outside visible range
  if (position.left >= totalWidth || position.left + position.width <= 0) {
    return null;
  }

  // Calculate if we're near the top of the viewport for tooltip positioning
  const handleMouseEnter = () => {
    if (isDragging) return;

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

  const label = block.type === 'booking' ? block.guest_name : (block.game_title || 'Session');

  const blockElement = (
    <div
      ref={blockRef}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        'absolute top-1 bottom-1 rounded border',
        'transition-all duration-150 group',
        'hover:shadow-md hover:z-10',
        'focus-ring focus:outline-none',
        styles.base,
        isSelected && 'ring-2 ring-teal-500 ring-offset-1 z-20 shadow-md',
        isDragging && 'opacity-50 cursor-grabbing',
        isDragPreview && 'opacity-75 ring-2 ring-teal-400 shadow-lg',
        canDrag && !isDragging && 'cursor-grab',
        !canDrag && 'cursor-pointer',
        // Clipped block indicators
        position.isClippedStart && 'rounded-l-none border-l-2 border-l-stone-400',
        position.isClippedEnd && 'rounded-r-none border-r-2 border-r-stone-400',
      )}
      style={{
        left: Math.max(0, position.left),
        width: Math.min(position.width, totalWidth - Math.max(0, position.left)),
      }}
      aria-pressed={isSelected}
      aria-label={`${label} - ${formatTimeRange(block.start_time, block.end_time)}${canDrag ? ' - drag to reschedule' : ''}`}
    >
      {/* Quick actions overlay */}
      {!isDragging && onAction && (
        <BlockQuickActions block={block} onAction={handleAction} />
      )}

      <BlockContent block={block} width={position.width} canDrag={canDrag} />
    </div>
  );

  return (
    <div className="relative">
      {/* Wrap with context menu if actions are available */}
      {onAction ? (
        <BlockContextMenu block={block} onAction={handleAction}>
          {blockElement}
        </BlockContextMenu>
      ) : (
        blockElement
      )}

      {/* Tooltip */}
      {showTooltip && !isDragging && (
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
export { getBlockPosition, getBlockStyles, formatTimeRange, StatusBadge, canDragBlock };
