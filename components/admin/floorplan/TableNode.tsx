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
        bg: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/40',
        border: 'border-slate-300/80 dark:border-slate-600/60',
        text: 'text-slate-600 dark:text-slate-400',
        accent: 'bg-slate-400/90 dark:bg-slate-600/90',
        pill: 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-300/50 dark:border-slate-600/50',
      };
  }
}

function getShapeStyles(shape: TableShape): { borderRadius: string; padding: string } {
  switch (shape) {
    case 'round':
      return {
        borderRadius: 'rounded-full',
        padding: 'p-1.5',
      };
    case 'booth':
      return {
        borderRadius: 'rounded-t-3xl rounded-b-lg',
        padding: 'p-1.5 pt-2',
      };
    default:
      return {
        borderRadius: 'rounded-xl',
        padding: 'p-1.5',
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
        ${styles.bg}
        border-2 ${styles.border}
        ${isSelected ? 'ring-2 ring-[color:var(--color-accent)] ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''}
        ${isEditMode ? 'cursor-move' : 'cursor-pointer'}
        transition-all duration-150 ease-out
        hover:shadow-lg hover:scale-[1.02]
        flex flex-col items-center justify-center
        overflow-hidden
        select-none
        backdrop-blur-sm
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
      {/* Table label - always visible, prominent */}
      <div className={`font-bold text-[11px] leading-none ${styles.text} truncate max-w-full tracking-tight`}>
        {table.label}
      </div>

      {/* Capacity badge - subtle, only when there's space */}
      {!isCompact && table.capacity && (
        <div className="flex items-center gap-0.5 mt-0.5 text-[9px] leading-none text-slate-500 dark:text-slate-400 opacity-80">
          <Users className="h-2 w-2" />
          <span>{table.capacity}</span>
        </div>
      )}

      {/* Session status content */}
      {session && (
        <div className="mt-1 flex flex-col items-center gap-0.5 max-w-full">
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
                  <span className="text-[9px] font-medium leading-none">Deciding</span>
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
        <div className="mt-1 text-[8px] leading-none opacity-50 font-medium">
          Available
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
