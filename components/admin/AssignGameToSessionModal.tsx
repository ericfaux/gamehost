'use client';

/**
 * AssignGameToSessionModal - Modal for assigning a game to a specific browsing session.
 *
 * Used from the dashboard when handling table_browsing_stale alerts.
 * Shows a list of available games that can be assigned to the selected table.
 */

import { useState, useTransition, useMemo } from 'react';
import { X, Search, Users, Clock, Gamepad2, Check } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { TokenChip, useToast } from '@/components/AppShell';
import { assignGameToSessionAction } from '@/app/admin/sessions/actions';
import type { Game, Session } from '@/lib/db/types';

export interface BrowsingSession extends Session {
  tableLabel: string;
}

interface AssignGameToSessionModalProps {
  session: BrowsingSession;
  availableGames: Game[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function formatDuration(createdAt: string): string {
  const start = new Date(createdAt);
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

export function AssignGameToSessionModal({
  session,
  availableGames,
  isOpen,
  onClose,
  onSuccess,
}: AssignGameToSessionModalProps) {
  const { push } = useToast();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter games by search query
  const filteredGames = useMemo(() => {
    if (!searchQuery.trim()) return availableGames;
    const query = searchQuery.toLowerCase();
    return availableGames.filter((game) =>
      game.title.toLowerCase().includes(query)
    );
  }, [availableGames, searchQuery]);

  const handleAssign = (game: Game) => {
    startTransition(async () => {
      const result = await assignGameToSessionAction(session.id, game.id);
      if (result.ok) {
        push({
          title: 'Game assigned',
          description: `${session.tableLabel} is now playing ${game.title}`,
          tone: 'success',
        });
        onClose();
        onSuccess?.();
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
              Assign game to
            </p>
            <h2 className="text-lg font-bold text-[color:var(--color-ink-primary)] truncate">
              {session.tableLabel}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-[color:var(--color-ink-secondary)]">
              <Clock className="h-3.5 w-3.5" />
              <span>Browsing for {formatDuration(session.created_at)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-xl hover:bg-[color:var(--color-muted)] transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-[color:var(--color-ink-secondary)]" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[color:var(--color-structure)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--color-ink-secondary)]" />
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[color:var(--color-structure)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-primary)] placeholder:text-[color:var(--color-ink-secondary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]"
            />
          </div>
        </div>

        {/* Games List */}
        <div className="max-h-[50vh] overflow-y-auto p-4 space-y-2">
          {filteredGames.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto bg-[color:var(--color-muted)] rounded-full flex items-center justify-center mb-3">
                <Gamepad2 className="h-6 w-6 text-[color:var(--color-ink-secondary)]" />
              </div>
              <p className="text-[color:var(--color-ink-secondary)]">
                {searchQuery ? 'No games match your search' : 'No games available'}
              </p>
              <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
                {searchQuery ? 'Try a different search term' : 'All copies may be in use'}
              </p>
            </div>
          ) : (
            filteredGames.map((game) => (
              <button
                key={game.id}
                onClick={() => handleAssign(game)}
                disabled={isPending}
                className="w-full panel-surface p-4 text-left hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)]/30 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-[color:var(--color-accent)]/10 flex items-center justify-center flex-shrink-0">
                      <Gamepad2 className="h-5 w-5 text-[color:var(--color-accent)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[color:var(--color-ink-primary)] truncate">
                        {game.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[color:var(--color-ink-secondary)]">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {game.min_players}-{game.max_players}
                        </span>
                        <span>{game.min_time_minutes}-{game.max_time_minutes}m</span>
                        {game.shelf_location && (
                          <TokenChip>{game.shelf_location}</TokenChip>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[color:var(--color-accent)] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Check className="h-4 w-4" />
                  </div>
                </div>
              </button>
            ))
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
