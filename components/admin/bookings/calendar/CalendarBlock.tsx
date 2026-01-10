'use client';

import * as React from 'react';
import { useState, useCallback, useRef, useMemo } from 'react';
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
} from '@/components/icons';
import type { TimelineBlock as TimelineBlockType } from '@/lib/db/types';
import type { PositionedBlock } from '../hooks/useOverlapLayout';
import type { TableColor } from '../hooks/useTableColors';
import { formatTimeDisplay } from '../utils/calendarUtils';

// =============================================================================
// Types
// =============================================================================

export type BlockAction =
  | 'view'
  | 'arrive'
  | 'seat'
  | 'end'
  | 'reschedule'
  | 'reassign'
  | 'cancel';

interface CalendarBlockProps {
  /** Positioned block with layout info */
  positionedBlock: PositionedBlock;
  /** Table color from the color palette */
  tableColor: TableColor;
  /** Callback when block is clicked */
  onClick: () => void;
  /** Callback when an action is triggered */
  onAction?: (blockId: string, action: BlockAction) => void;
  /** Whether this block is currently selected */
  isSelected?: boolean;
  /** Whether to show conflict styling */
  showConflict?: boolean;
  /** Size variant for different views */
  sizeVariant?: 'compact' | 'standard' | 'large';
}

interface QuickAction {
  id: BlockAction;
  label: string;
  icon: React.ReactNode;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Formats a time range for display.
 */
function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTimeDisplay(startTime)} - ${formatTimeDisplay(endTime)}`;
}

/**
 * Determines if a session is overtime.
 */
function isSessionOvertime(block: TimelineBlockType): boolean {
  if (block.type !== 'session') return false;
  const now = new Date();
  const endTime = new Date(block.end_time);
  return now > endTime;
}

/**
 * Gets the effective status for display.
 */
function getEffectiveStatus(block: TimelineBlockType): string {
  if (block.type === 'session') {
    return isSessionOvertime(block) ? 'overtime' : 'active';
  }
  return block.booking_status ?? 'pending';
}

/**
 * Gets quick actions available for a block.
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

/**
 * Determines size variant based on block height.
 */
function getSizeVariant(height: number): 'compact' | 'standard' | 'large' {
  if (height < 40) return 'compact';
  if (height < 80) return 'standard';
  return 'large';
}

// =============================================================================
// StatusBadge Component
// =============================================================================

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = React.memo(function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-stone-200 text-stone-700' },
    confirmed: { label: 'Confirmed', className: 'bg-white/80 text-stone-700' },
    arrived: { label: 'Arrived', className: 'bg-amber-100 text-amber-700' },
    seated: { label: 'Seated', className: 'bg-emerald-100 text-emerald-700' },
    active: { label: 'Playing', className: 'bg-emerald-100 text-emerald-700' },
    overtime: { label: 'Overtime', className: 'bg-red-100 text-red-700' },
    completed: { label: 'Done', className: 'bg-stone-100 text-stone-500' },
  };

  const { label, className } = config[status] ?? { label: status, className: 'bg-stone-100 text-stone-600' };

  return (
    <span className={cn('text-[10px] px-1 py-0.5 rounded font-medium whitespace-nowrap', className)}>
      {label}
    </span>
  );
});

// =============================================================================
// BlockContent Component
// =============================================================================

interface BlockContentProps {
  block: TimelineBlockType;
  tableColor: TableColor;
  sizeVariant: 'compact' | 'standard' | 'large';
  status: string;
}

const BlockContent = React.memo(function BlockContent({ block, tableColor, sizeVariant, status }: BlockContentProps) {
  const tableName = block.table_label;
  const guestName = block.type === 'booking' ? block.guest_name : null;
  const partySize = block.party_size;

  // Determine text color based on background
  const textColorClass = status === 'completed' ? 'text-stone-500' : 'text-white';
  const mutedTextClass = status === 'completed' ? 'text-stone-400' : 'text-white/80';

  if (sizeVariant === 'compact') {
    return (
      <div className={cn('h-full px-1.5 py-0.5 overflow-hidden', textColorClass)}>
        <div className="text-xs font-semibold truncate">{tableName}</div>
      </div>
    );
  }

  if (sizeVariant === 'standard') {
    return (
      <div className={cn('h-full px-2 py-1 overflow-hidden', textColorClass)}>
        <div className="text-sm font-semibold truncate">{tableName}</div>
        {partySize && (
          <div className={cn('text-xs flex items-center gap-1', mutedTextClass)}>
            <Users className="w-3 h-3" />
            <span>{partySize}</span>
          </div>
        )}
      </div>
    );
  }

  // Large variant
  return (
    <div className={cn('h-full px-2 py-1.5 overflow-hidden', textColorClass)}>
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <div className="text-sm font-semibold truncate">{tableName}</div>
        {block.game_title && (
          <Gamepad2 className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
        )}
      </div>
      {guestName && (
        <div className="text-xs truncate opacity-90">{guestName}</div>
      )}
      <div className={cn('text-xs flex items-center gap-2 mt-0.5', mutedTextClass)}>
        {partySize && (
          <span className="flex items-center gap-0.5">
            <Users className="w-3 h-3" />
            {partySize}
          </span>
        )}
        <span className="truncate">
          {formatTimeRange(block.start_time, block.end_time)}
        </span>
      </div>
      {block.game_title && (
        <div className={cn('text-xs truncate mt-0.5', mutedTextClass)}>
          {block.game_title}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// BlockTooltip Component
// =============================================================================

interface BlockTooltipProps {
  block: TimelineBlockType;
  status: string;
}

const BlockTooltip = React.memo(function BlockTooltip({ block, status }: BlockTooltipProps) {
  const label = block.type === 'booking' ? block.guest_name : (block.game_title || 'Active Session');

  return (
    <div className="space-y-2 p-2">
      <div className="flex items-center justify-between gap-4">
        <span className="font-semibold text-sm">{block.table_label}</span>
        <StatusBadge status={status} />
      </div>

      {label && (
        <div className="text-sm font-medium text-stone-800">{label}</div>
      )}

      <div className="text-sm text-stone-600 space-y-1">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{formatTimeRange(block.start_time, block.end_time)}</span>
        </div>

        {block.party_size && (
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Party of {block.party_size}</span>
          </div>
        )}

        {block.game_title && (
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
            <span>{block.game_title}</span>
          </div>
        )}
      </div>

      <div className="text-xs text-stone-400 pt-1 border-t border-stone-100">
        Click to view details
      </div>
    </div>
  );
});

// =============================================================================
// BlockQuickActions Component
// =============================================================================

interface BlockQuickActionsProps {
  block: TimelineBlockType;
  onAction: (action: BlockAction) => void;
}

const BlockQuickActions = React.memo(function BlockQuickActions({ block, onAction }: BlockQuickActionsProps) {
  const actions = getQuickActions(block);

  if (actions.length === 0) return null;

  return (
    <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none group-hover:pointer-events-auto">
      {actions.map(action => (
        <Button
          key={action.id}
          size="sm"
          variant="secondary"
          className="h-5 px-1.5 text-[10px] shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onAction(action.id);
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {action.icon}
          <span className="ml-0.5">{action.label}</span>
        </Button>
      ))}
    </div>
  );
});

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
              <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('view')}>
                <Eye className="w-4 h-4" />
                View Details
              </ContextMenu.Item>

              {(block.booking_status === 'confirmed' || block.booking_status === 'pending') && (
                <>
                  {block.booking_status === 'confirmed' && (
                    <>
                      <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('arrive')}>
                        <UserCheck className="w-4 h-4" />
                        Mark Arrived
                      </ContextMenu.Item>
                      <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('seat')}>
                        <Check className="w-4 h-4" />
                        Seat Party
                      </ContextMenu.Item>
                    </>
                  )}

                  <ContextMenu.Separator className="h-px bg-stone-200 my-1" />

                  <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('reschedule')}>
                    <CalendarClock className="w-4 h-4" />
                    Reschedule...
                  </ContextMenu.Item>
                  <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('reassign')}>
                    <TableProperties className="w-4 h-4" />
                    Change Table...
                  </ContextMenu.Item>

                  <ContextMenu.Separator className="h-px bg-stone-200 my-1" />

                  <ContextMenu.Item className={dangerItemClass} onSelect={() => onAction('cancel')}>
                    <Trash2 className="w-4 h-4" />
                    Cancel Booking
                  </ContextMenu.Item>
                </>
              )}

              {block.booking_status === 'arrived' && (
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('seat')}>
                  <Check className="w-4 h-4" />
                  Seat Now
                </ContextMenu.Item>
              )}
            </>
          )}

          {block.type === 'session' && (
            <>
              <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('view')}>
                <Eye className="w-4 h-4" />
                View Session
              </ContextMenu.Item>
              <ContextMenu.Item className={dangerItemClass} onSelect={() => onAction('end')}>
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
// Main CalendarBlock Component
// =============================================================================

/**
 * CalendarBlock Component
 *
 * Renders a booking or session block on the calendar with:
 * - Table-based color coding
 * - Status-aware styling
 * - Responsive content based on block size
 * - Hover tooltip with details
 * - Quick actions and context menu
 * - Selection and conflict states
 *
 * Memoized to prevent unnecessary re-renders when parent updates.
 */
export const CalendarBlock = React.memo(function CalendarBlock({
  positionedBlock,
  tableColor,
  onClick,
  onAction,
  isSelected = false,
  showConflict = false,
  sizeVariant: sizeVariantProp,
}: CalendarBlockProps) {
  const { block, top, height, leftPercent, widthPercent } = positionedBlock;

  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockRef = useRef<HTMLDivElement>(null);

  const status = getEffectiveStatus(block);
  const sizeVariant = sizeVariantProp ?? getSizeVariant(height);

  // Determine background color based on status
  const backgroundColor = useMemo(() => {
    if (status === 'completed') return '#E5E7EB'; // gray-200
    if (status === 'pending') return tableColor.light;
    return tableColor.main;
  }, [status, tableColor]);

  const borderColor = useMemo(() => {
    if (status === 'completed') return '#9CA3AF'; // gray-400
    if (status === 'seated') return '#059669'; // green border for seated
    return tableColor.border;
  }, [status, tableColor]);

  const handleAction = useCallback((action: BlockAction) => {
    onAction?.(block.id, action);
  }, [block.id, onAction]);

  const handleMouseEnter = () => {
    tooltipTimeout.current = setTimeout(() => {
      setShowTooltip(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
    }
    setShowTooltip(false);
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }, [onClick]);

  const blockElement = (
    <div
      ref={blockRef}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'absolute rounded-sm border-l-4 shadow-sm overflow-hidden',
        'transition-all duration-150 group cursor-pointer',
        'hover:shadow-md hover:z-10',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
        isSelected && 'ring-2 ring-teal-500 z-20 shadow-md',
        showConflict && 'ring-2 ring-red-500 animate-pulse',
        status === 'arrived' && 'bg-stripes',
      )}
      style={{
        top,
        height: Math.max(height, 20),
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        backgroundColor,
        borderLeftColor: borderColor,
      }}
      aria-pressed={isSelected}
      aria-label={`${block.table_label} - ${block.guest_name ?? 'Session'}`}
    >
      {/* Quick actions */}
      {onAction && height >= 40 && (
        <BlockQuickActions block={block} onAction={handleAction} />
      )}

      <BlockContent
        block={block}
        tableColor={tableColor}
        sizeVariant={sizeVariant}
        status={status}
      />
    </div>
  );

  return (
    <>
      {onAction ? (
        <BlockContextMenu block={block} onAction={handleAction}>
          {blockElement}
        </BlockContextMenu>
      ) : (
        blockElement
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-white border border-stone-200 rounded-lg shadow-lg min-w-[200px]"
          style={{
            top: blockRef.current?.getBoundingClientRect().top ?? 0,
            left: (blockRef.current?.getBoundingClientRect().right ?? 0) + 8,
          }}
        >
          <BlockTooltip block={block} status={status} />
        </div>
      )}
    </>
  );
});

// =============================================================================
// Exports
// =============================================================================

export { StatusBadge, formatTimeRange };
