'use client';

/**
 * TableNode - Individual table rendering for the floor plan.
 * Displays table shape, label, capacity, and session status overlay.
 *
 * Design Focus:
 * - Tight typography with good legibility at small sizes
 * - Status pills/badges for clear visual hierarchy
 * - Shape-aware content centering
 * - Rich visual distinction between browsing/playing/available states
 */

import { useMemo } from 'react';
import { Clock3, Search, Loader2, Gamepad2, AlertTriangle, Users } from '@/components/icons';
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

function getStatusStyles(status: TableStatus) {
  switch (status) {
    case 'playing':
      return {
        bg: 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950/50 dark:to-green-900/40',
        border: 'border-emerald-400/80 dark:border-emerald-500/60',
        text: 'text-emerald-800 dark:text-emerald-300',
        accent: 'bg-emerald-500/90 dark:bg-emerald-600/90',
        pill: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-300/50 dark:border-emerald-600/50',
      };
    case 'browsing':
      return {
        bg: 'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-950/50 dark:to-yellow-900/40',
        border: 'border-amber-400/80 dark:border-amber-500/60',
        text: 'text-amber-800 dark:text-amber-300',
        accent: 'bg-amber-500/90 dark:bg-amber-600/90',
        pill: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-amber-300/50 dark:border-amber-600/50',
      };
    default:
      return {
        bg: 'bg-white dark:bg-slate-950',
        border: 'border-slate-300 dark:border-slate-700',
        text: 'text-slate-900 dark:text-slate-100',
        accent: 'bg-slate-700 dark:bg-slate-500',
        pill: 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800',
      };
  }
}

function getShapeStyles(shape: TableShape): {
  borderRadius: string;
  padding: string;
  highlightRadius: string;
} {
  switch (shape) {
    case 'round':
      // Round tables: fully circular for small cocktail/round tables
      return {
        borderRadius: 'rounded-full',
        padding: 'p-1.5',
        highlightRadius: 'rounded-full',
      };
    case 'booth':
      // Bar seating: elongated with rounded ends (pill shape)
      return {
        borderRadius: 'rounded-full',
        padding: 'p-1.5 pt-2',
        highlightRadius: 'rounded-full',
      };
    default:
      // Rectangular tables: rounded-lg with appropriate aspect ratio
      return {
        borderRadius: 'rounded-lg',
        padding: 'p-1.5',
        highlightRadius: 'rounded-t-lg',
      };
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
  const styles = getStatusStyles(status);
  const shapeStyles = getShapeStyles(table.layout_shape);

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

  // Determine if we have enough space for detailed content
  const nodeWidth = (table.layout_w ?? 0.12) * containerWidth;
  const nodeHeight = (table.layout_h ?? 0.10) * containerHeight;
  const isCompact = nodeWidth < 70 || nodeHeight < 60;

  return (
    <div
      style={style}
      className={`
        ${shapeStyles.borderRadius}
        ${shapeStyles.padding}
        relative
        bg-white dark:bg-slate-800
        border-2 border-slate-300 dark:border-slate-600
        shadow-md
        transition-all duration-150 ease-out
        hover:scale-105 hover:shadow-lg
        ${isEditMode ? 'cursor-move' : 'cursor-pointer'}
        ${isSelected ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-slate-900 scale-105' : ''}
        flex flex-col items-center justify-center
        overflow-hidden
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
      {/* 3D depth highlight - simulates physical board game token */}
      <div
        className={`absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent ${shapeStyles.highlightRadius} pointer-events-none`}
      />
      {/* Table label - always visible, prominent */}
      <div className="font-bold text-[13px] leading-none text-slate-800 dark:text-slate-100 truncate max-w-full tracking-tight z-10">
        {table.label}
      </div>

      {/* Capacity badge - "4p" style badge */}
      {table.capacity && (
        <div className="mt-0.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-[9px] font-medium leading-none text-slate-600 dark:text-slate-300 z-10">
          {table.capacity}p
        </div>
      )}

      {/* Session status content */}
      {session && (
        <div className="mt-1 flex flex-col items-center gap-0.5 max-w-full z-10">
          {/* Playing state - Game title in pill */}
          {status === 'playing' && session.gameTitle && (
            <div className={`
              inline-flex items-center gap-1
              px-1.5 py-0.5
              ${styles.pill}
              rounded-full
              border
              max-w-full
            `}>
              <Gamepad2 className="h-2 w-2 flex-shrink-0" />
              <span className="text-[9px] font-semibold leading-none truncate">
                {isCompact ? session.gameTitle.slice(0, 8) + (session.gameTitle.length > 8 ? '…' : '') : session.gameTitle}
              </span>
            </div>
          )}

          {/* Browsing state - Deciding badge */}
          {status === 'browsing' && (
            <div className={`
              inline-flex items-center gap-1
              px-1.5 py-0.5
              ${styles.pill}
              rounded-full
              border
            `}>
              {isCompact ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : (
                <>
                  <Search className="h-2 w-2 flex-shrink-0" />
                  <span className="text-[9px] font-semibold leading-none">Deciding</span>
                </>
              )}
            </div>
          )}

          {/* Duration - subtle timer */}
          <div className="flex items-center gap-0.5 text-[8px] leading-none opacity-60">
            <Clock3 className="h-2 w-2" />
            <span className="tabular-nums font-medium">{formatDuration(session.startedAt)}</span>
          </div>
        </div>
      )}

      {/* Available state - minimal */}
      {!session && !isCompact && (
        <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 text-[9px] font-semibold text-slate-800 dark:text-slate-100 shadow-sm z-10">
          <span>Available</span>
        </div>
      )}

      {/* Duplicate warning indicator */}
      {session?.hasDuplicates && (
        <div
          className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-orange-500 dark:bg-orange-600 rounded-full flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-slate-900"
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
