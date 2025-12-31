'use client';

/**
 * TableNode - Individual table rendering for the floor plan.
 * Displays table shape, label, capacity, and session status overlay.
 */

import { useMemo } from 'react';
import { Clock3, AlertTriangle, Users } from '@/components/icons';
import type { VenueTableWithLayout, TableShape } from '@/lib/db/types';

export type TableStatus = 'available' | 'browsing' | 'playing';

export interface TableSessionInfo {
  sessionId: string;
  status: TableStatus;
  gameTitle?: string;
  startedAt: string;
  hasDuplicates?: boolean;
}

interface TableNodeProps {
  table: VenueTableWithLayout;
  session: TableSessionInfo | null;
  isSelected?: boolean;
  isEditMode?: boolean;
  onClick?: () => void;
  containerWidth: number;
  containerHeight: number;
}

function formatDuration(started: string): string {
  const diff = Date.now() - new Date(started).getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function getStatusColor(status: TableStatus): { bg: string; border: string; text: string } {
  switch (status) {
    case 'playing':
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        border: 'border-green-400 dark:border-green-600',
        text: 'text-green-700 dark:text-green-400',
      };
    case 'browsing':
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        border: 'border-yellow-400 dark:border-yellow-600',
        text: 'text-yellow-700 dark:text-yellow-400',
      };
    default:
      return {
        bg: 'bg-[color:var(--color-accent-soft)]',
        border: 'border-[color:var(--color-accent)]/40',
        text: 'text-[color:var(--color-accent)]',
      };
  }
}

function getShapeClass(shape: TableShape): string {
  switch (shape) {
    case 'round':
      return 'rounded-full';
    case 'booth':
      return 'rounded-t-2xl rounded-b-md';
    default:
      return 'rounded-xl';
  }
}

export function TableNode({
  table,
  session,
  isSelected,
  isEditMode,
  onClick,
  containerWidth,
  containerHeight,
}: TableNodeProps) {
  const status = session?.status ?? 'available';
  const colors = getStatusColor(status);
  const shapeClass = getShapeClass(table.layout_shape);

  // Calculate pixel dimensions from normalized layout values
  const style = useMemo(() => {
    const x = (table.layout_x ?? 0) * containerWidth;
    const y = (table.layout_y ?? 0) * containerHeight;
    const w = (table.layout_w ?? 0.12) * containerWidth;
    const h = (table.layout_h ?? 0.10) * containerHeight;

    return {
      position: 'absolute' as const,
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`,
      transform: `rotate(${table.rotation_deg}deg)`,
    };
  }, [table, containerWidth, containerHeight]);

  return (
    <div
      style={style}
      className={`
        ${shapeClass}
        ${colors.bg}
        border-2 ${colors.border}
        ${isSelected ? 'ring-2 ring-[color:var(--color-accent)] ring-offset-2' : ''}
        ${isEditMode ? 'cursor-move' : 'cursor-pointer'}
        transition-shadow duration-150
        hover:shadow-lg
        flex flex-col items-center justify-center
        p-1 overflow-hidden
        select-none
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Table ${table.label}, ${status}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Table label */}
      <div className={`font-bold text-xs ${colors.text} truncate max-w-full`}>
        {table.label}
      </div>

      {/* Capacity */}
      {table.capacity && (
        <div className="flex items-center gap-0.5 text-[10px] text-[color:var(--color-ink-secondary)]">
          <Users className="h-2.5 w-2.5" />
          <span>{table.capacity}</span>
        </div>
      )}

      {/* Session status */}
      {session && (
        <div className="mt-0.5 text-center max-w-full">
          {status === 'playing' && session.gameTitle && (
            <div className={`text-[10px] font-medium ${colors.text} truncate`}>
              {session.gameTitle}
            </div>
          )}
          {status === 'browsing' && (
            <div className={`text-[10px] font-medium ${colors.text}`}>
              Deciding
            </div>
          )}
          <div className="flex items-center justify-center gap-0.5 text-[9px] text-[color:var(--color-ink-secondary)]">
            <Clock3 className="h-2.5 w-2.5" />
            <span>{formatDuration(session.startedAt)}</span>
          </div>
        </div>
      )}

      {/* Duplicate warning */}
      {session?.hasDuplicates && (
        <div
          className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 rounded-full flex items-center justify-center"
          title="Duplicate active sessions detected"
        >
          <AlertTriangle className="h-2.5 w-2.5 text-white" />
        </div>
      )}
    </div>
  );
}

/**
 * Get default layout dimensions based on table capacity.
 */
export function getDefaultLayoutForCapacity(capacity: number | null): {
  w: number;
  h: number;
  shape: TableShape;
} {
  const cap = capacity ?? 4;

  if (cap <= 2) {
    return { w: 0.10, h: 0.08, shape: 'round' };
  } else if (cap <= 4) {
    return { w: 0.12, h: 0.10, shape: 'rect' };
  } else if (cap <= 6) {
    return { w: 0.16, h: 0.12, shape: 'rect' };
  } else {
    return { w: 0.20, h: 0.14, shape: 'booth' };
  }
}
