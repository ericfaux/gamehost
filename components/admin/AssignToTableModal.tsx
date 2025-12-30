'use client';

/**
 * AssignToTableModal - Modal for assigning a game to a browsing session.
 *
 * Shows a list of tables with active browsing sessions (no game selected yet).
 * Selecting a table assigns the chosen game to that session.
 */

import { useTransition } from 'react';
import { X, Clock, Users, Check, Search } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { TokenChip, useToast } from '@/components/AppShell';
import { Game } from '@/lib/db/types';
import { assignGameToSessionAction } from '@/app/admin/sessions/actions';
import type { SessionWithTable } from '@/app/admin/library/page';

interface AssignToTableModalProps {
  game: Game;
  browsingSessions: SessionWithTable[];
  isOpen: boolean;
  onClose: () => void;
}

function formatDuration(createdAt: string): string {
  const start = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m ago`;
}

export function AssignToTableModal({
  game,
  browsingSessions,
  isOpen,
  onClose,
}: AssignToTableModalProps) {
  const { push } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleAssign = (sessionId: string, tableLabel: string) => {
    startTransition(async () => {
      const result = await assignGameToSessionAction(sessionId, game.id);
      if (result.ok) {
        push({
          title: 'Game assigned',
          description: `${tableLabel} is now playing ${game.title}`,
          tone: 'success',
        });
        onClose();
      } else {
        push({
          title: 'Error',
          description: result.error ?? 'Failed to assign game',
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
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-[color:var(--color-surface)] shadow-2xl rounded-2xl border border-[color:var(--color-structure)] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-[color:var(--color-structure)] bg-[color:var(--color-elevated)]">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-[color:var(--color-ink-secondary)] mb-1">
              Assign to table
            </p>
            <h2 className="text-lg font-bold text-[color:var(--color-ink-primary)] truncate">
              {game.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-xl hover:bg-[color:var(--color-muted)] transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-[color:var(--color-ink-secondary)]" />
          </button>
        </div>

        {/* Sessions List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
          {browsingSessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto bg-[color:var(--color-muted)] rounded-full flex items-center justify-center mb-3">
                <Search className="h-6 w-6 text-[color:var(--color-ink-secondary)]" />
              </div>
              <p className="text-[color:var(--color-ink-secondary)]">
                No tables are currently browsing
              </p>
              <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
                Guests need to check in first before a game can be assigned
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-[color:var(--color-ink-secondary)] mb-3">
                Select a table to assign <span className="font-semibold">{game.title}</span>:
              </p>
              {browsingSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleAssign(session.id, session.tableLabel)}
                  disabled={isPending}
                  className="w-full panel-surface p-4 text-left hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)]/30 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[color:var(--color-warn)]/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-[color:var(--color-warn)]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[color:var(--color-ink-primary)]">
                          {session.tableLabel}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-[color:var(--color-ink-secondary)]">
                          <Clock className="h-3 w-3" />
                          <span>Checked in {formatDuration(session.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TokenChip tone="warn">Browsing</TokenChip>
                      <div className="w-8 h-8 rounded-full bg-[color:var(--color-accent)] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Check className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[color:var(--color-structure)] bg-[color:var(--color-muted)]">
          <Button
            variant="secondary"
            className="w-full"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </>
  );
}
