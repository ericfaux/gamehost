'use client';

/**
 * GameLiveDrawer - Slide-out drawer showing active sessions for a specific game.
 *
 * Features:
 * - Shows game info (copies in rotation, copies in use)
 * - Lists all tables currently playing this game
 * - End session action for each table
 * - Assign to table action if copies are available
 */

import { useTransition } from 'react';
import { X, Clock, Users, AlertCircle, Play } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { TokenChip, useToast } from '@/components/AppShell';
import { Game } from '@/lib/db/types';
import { endSessionAction } from '@/app/admin/sessions/actions';
import type { SessionWithTable } from '@/app/admin/library/page';

interface GameLiveDrawerProps {
  game: Game;
  sessions: SessionWithTable[];
  copiesInUse: number;
  isOpen: boolean;
  onClose: () => void;
  onAssignClick: () => void;
}

function formatDuration(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins}m`;
  }

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}

export function GameLiveDrawer({
  game,
  sessions,
  copiesInUse,
  isOpen,
  onClose,
  onAssignClick,
}: GameLiveDrawerProps) {
  const { push } = useToast();
  const [isPending, startTransition] = useTransition();

  const copies = game.copies_in_rotation ?? 1;
  const available = copies - copiesInUse;
  const isBottlenecked = copies > 0 && available <= 0;

  const handleEndSession = (sessionId: string, tableLabel: string) => {
    startTransition(async () => {
      const result = await endSessionAction(sessionId);
      if (result.success) {
        push({
          title: 'Session ended',
          description: `${tableLabel} is now available`,
          tone: 'success',
        });
        // Page will revalidate automatically
      } else {
        push({
          title: 'Error',
          description: result.error ?? 'Failed to end session',
          tone: 'danger',
        });
      }
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-[color:var(--color-surface)] shadow-2xl border-l border-[color:var(--color-structure)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-[color:var(--color-structure)] bg-[color:var(--color-elevated)]">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-[color:var(--color-ink-secondary)] mb-1">
              Live tables using
            </p>
            <h2 className="text-xl font-bold text-[color:var(--color-ink-primary)] truncate">
              {game.title}
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

        {/* Stats Banner */}
        <div className="flex items-center gap-4 px-4 py-3 bg-[color:var(--color-muted)] border-b border-[color:var(--color-structure)]">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[color:var(--color-ink-secondary)]">Copies:</span>
            <span className="font-semibold text-[color:var(--color-ink-primary)]">{copies}</span>
          </div>
          <div className="h-4 w-px bg-[color:var(--color-structure-strong)]" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-[color:var(--color-ink-secondary)]">In use:</span>
            <span className={`font-semibold ${isBottlenecked ? 'text-[color:var(--color-danger)]' : 'text-[color:var(--color-warn)]'}`}>
              {copiesInUse}
            </span>
          </div>
          <div className="h-4 w-px bg-[color:var(--color-structure-strong)]" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-[color:var(--color-ink-secondary)]">Available:</span>
            <span className={`font-semibold ${available > 0 ? 'text-[color:var(--color-success)]' : 'text-[color:var(--color-danger)]'}`}>
              {available}
            </span>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto bg-[color:var(--color-accent-soft)] rounded-full flex items-center justify-center mb-3">
                <Play className="h-6 w-6 text-[color:var(--color-accent)]" />
              </div>
              <p className="text-[color:var(--color-ink-secondary)]">
                No tables are currently playing this game
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="panel-surface p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
                    <span className="font-semibold text-[color:var(--color-ink-primary)]">
                      {session.tableLabel}
                    </span>
                  </div>
                  <TokenChip tone="accent">Playing</TokenChip>
                </div>

                <div className="flex items-center gap-4 text-sm text-[color:var(--color-ink-secondary)]">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDuration(session.started_at)}</span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled={isPending}
                  onClick={() => handleEndSession(session.id, session.tableLabel)}
                >
                  End session
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-[color:var(--color-structure)] bg-[color:var(--color-elevated)]">
          {available > 0 ? (
            <Button
              variant="primary"
              className="w-full gap-2"
              onClick={onAssignClick}
            >
              <Play className="h-4 w-4" />
              Assign to browsing table
            </Button>
          ) : (
            <div className="flex items-center gap-2 justify-center py-2 text-sm text-[color:var(--color-danger)]">
              <AlertCircle className="h-4 w-4" />
              All copies in use
            </div>
          )}
        </div>
      </div>
    </>
  );
}
