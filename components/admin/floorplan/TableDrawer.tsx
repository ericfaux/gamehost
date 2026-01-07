'use client';

/**
 * TableDrawer - Slide-out drawer for table details and actions.
 * Shows table info, current session, and quick actions.
 */

import { useState } from 'react';
import {
  X,
  Clock3,
  Users,
  Gamepad2,
  StopCircle,
  AlertTriangle,
  Loader2,
  CalendarPlus,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import type { VenueTableWithLayout } from '@/lib/db/types';
import type { TableSessionInfo, TableStatus } from './TableNode';

interface TableDrawerProps {
  table: VenueTableWithLayout | null;
  session: TableSessionInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onEndSession?: (sessionId: string) => Promise<void>;
  onAssignGame?: (sessionId: string) => void;
  onBookTable?: (tableId: string) => void;
}

function formatDuration(started: string): string {
  const diff = Date.now() - new Date(started).getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

function getStatusLabel(status: TableStatus): string {
  switch (status) {
    case 'playing':
      return 'Playing';
    case 'browsing':
      return 'Browsing';
    default:
      return 'Available';
  }
}

function getStatusColor(status: TableStatus): string {
  switch (status) {
    case 'playing':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-400';
    case 'browsing':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-400';
    default:
      return 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-accent)]';
  }
}

export function TableDrawer({
  table,
  session,
  isOpen,
  onClose,
  onEndSession,
  onAssignGame,
  onBookTable,
}: TableDrawerProps) {
  const [isEnding, setIsEnding] = useState(false);

  const status = session?.status ?? 'available';

  const handleBookTable = () => {
    if (!table || !onBookTable) return;
    onBookTable(table.id);
    onClose();
  };

  const handleEndSession = async () => {
    if (!session || isEnding || !onEndSession) return;
    setIsEnding(true);
    try {
      await onEndSession(session.sessionId);
      onClose();
    } finally {
      setIsEnding(false);
    }
  };

  const handleAssignGame = () => {
    if (!session || !onAssignGame) return;
    onAssignGame(session.sessionId);
    onClose();
  };

  if (!isOpen || !table) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-[color:var(--color-surface)] shadow-2xl border-l border-[color:var(--color-structure)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-[color:var(--color-structure)] bg-[color:var(--color-elevated)]">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-[color:var(--color-ink-secondary)] mb-1">
              Table details
            </p>
            <h2 className="text-xl font-bold text-[color:var(--color-ink-primary)]">
              {table.label}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-xl hover:bg-[color:var(--color-muted)] transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5 text-[color:var(--color-ink-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Table info */}
          <div className="panel-surface p-4">
            <h3 className="text-sm font-semibold text-[color:var(--color-ink-primary)] mb-3">
              Table Info
            </h3>
            <div className="space-y-2">
              {table.capacity && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
                  <span className="text-[color:var(--color-ink-secondary)]">Capacity:</span>
                  <span className="font-medium">{table.capacity} seats</span>
                </div>
              )}
              {table.description && (
                <p className="text-sm text-[color:var(--color-ink-secondary)]">
                  {table.description}
                </p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="panel-surface p-4">
            <h3 className="text-sm font-semibold text-[color:var(--color-ink-primary)] mb-3">
              Current Status
            </h3>
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${getStatusColor(status)}`}>
              <span className="font-medium">{getStatusLabel(status)}</span>
            </div>

            {/* Duplicate warning */}
            {session?.hasDuplicates && (
              <div className="mt-3 flex items-start gap-2 p-2 bg-orange-100 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  Multiple active sessions detected for this table. The floor plan shows the most relevant one.
                </p>
              </div>
            )}
          </div>

          {/* Session info */}
          {session && (
            <div className="panel-surface p-4">
              <h3 className="text-sm font-semibold text-[color:var(--color-ink-primary)] mb-3">
                Active Session
              </h3>
              <div className="space-y-3">
                {status === 'playing' && session.gameTitle && (
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      {session.gameTitle}
                    </span>
                  </div>
                )}
                {status === 'browsing' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-yellow-700 dark:text-yellow-400">
                      Guest is deciding on a game
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-[color:var(--color-ink-secondary)]">
                  <Clock3 className="h-4 w-4" />
                  <span>Duration: {formatDuration(session.startedAt)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] space-y-2">
          {/* Book This Table - shown for active tables */}
          {table.is_active && onBookTable && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleBookTable}
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Book This Table
            </Button>
          )}

          {session && status === 'browsing' && onAssignGame && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleAssignGame}
            >
              <Gamepad2 className="h-4 w-4 mr-2" />
              Assign Game
            </Button>
          )}

          {session && onEndSession && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleEndSession}
              disabled={isEnding}
            >
              {isEnding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ending...
                </>
              ) : (
                <>
                  <StopCircle className="h-4 w-4 mr-2" />
                  End Session
                </>
              )}
            </Button>
          )}

          {!session && !table.is_active && (
            <div className="text-center text-sm text-[color:var(--color-ink-secondary)] py-2">
              Table is inactive
            </div>
          )}

          {!session && table.is_active && !onBookTable && (
            <div className="text-center text-sm text-[color:var(--color-ink-secondary)] py-2">
              Table is available for check-in
            </div>
          )}

          <Button variant="ghost" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </>
  );
}
