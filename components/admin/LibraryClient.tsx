'use client';

import { useMemo, useState, useCallback } from 'react';
import { Plus, Play, AlertCircle } from "@/components/icons";
import { StatusBadge, TokenChip, useToast } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { DataTable, Column } from '@/components/ui/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { GameFormModal } from '@/components/admin/AddGameModal';
import { ImportGamesButton } from '@/components/admin/ImportGamesButton';
import { LibraryCommandBar, LibraryFilter } from '@/components/admin/LibraryCommandBar';
import { GameLiveDrawer } from '@/components/admin/GameLiveDrawer';
import { AssignToTableModal } from '@/components/admin/AssignToTableModal';
import { Game } from '@/lib/db/types';
import type { LibraryAggregatedData, SessionWithTable } from '@/app/admin/library/page';

interface LibraryClientProps {
  data: LibraryAggregatedData;
}

export function LibraryClient({ data }: LibraryClientProps) {
  const { push } = useToast();
  const { games, copiesInUse, activeSessionsByGame, browsingSessions } = data;

  // State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<LibraryFilter>>(new Set());

  // Drawer state
  const [drawerGame, setDrawerGame] = useState<Game | null>(null);
  const [drawerSessions, setDrawerSessions] = useState<SessionWithTable[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Assign modal state
  const [assignGame, setAssignGame] = useState<Game | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Toggle filter
  const handleFilterToggle = useCallback((filter: LibraryFilter) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  }, []);

  // Open drawer for a game
  const handleOpenDrawer = useCallback((game: Game) => {
    const sessions = activeSessionsByGame[game.id] ?? [];
    setDrawerGame(game);
    setDrawerSessions(sessions);
    setDrawerOpen(true);
  }, [activeSessionsByGame]);

  // Close drawer
  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerGame(null);
    setDrawerSessions([]);
  }, []);

  // Open assign modal
  const handleOpenAssignModal = useCallback((game: Game) => {
    setAssignGame(game);
    setAssignModalOpen(true);
    setDrawerOpen(false); // Close drawer if open
  }, []);

  // Close assign modal
  const handleCloseAssignModal = useCallback(() => {
    setAssignModalOpen(false);
    setAssignGame(null);
  }, []);

  // Table columns
  const columns: Column<Game>[] = useMemo(() => [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-[color:var(--color-ink-primary)]">{row.title}</span>
      ),
    },
    {
      key: 'vibes',
      header: 'Vibe',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.vibes.slice(0, 2).map((vibe) => (
            <TokenChip key={vibe}>{vibe}</TokenChip>
          ))}
          {row.vibes.length > 2 && (
            <span className="text-xs text-[color:var(--color-ink-secondary)]">+{row.vibes.length - 2}</span>
          )}
        </div>
      ),
    },
    {
      key: 'min_players',
      header: 'Players',
      sortable: true,
      render: (row) => `${row.min_players}-${row.max_players}`,
    },
    {
      key: 'min_time_minutes',
      header: 'Time',
      sortable: true,
      render: (row) => `${row.min_time_minutes}-${row.max_time_minutes}m`,
    },
    {
      key: 'shelf_location',
      header: 'Location',
      render: (row) => <span className="font-mono text-xs">{row.shelf_location}</span>,
    },
    {
      key: 'copies_in_rotation',
      header: 'Copies',
      render: (row) => <span className="text-center">{row.copies_in_rotation ?? 1}</span>,
    },
    {
      key: 'in_use',
      header: 'In use',
      render: (row) => {
        const inUse = copiesInUse[row.id] ?? 0;
        const copies = row.copies_in_rotation ?? 1;
        const isBottlenecked = copies > 0 && inUse >= copies;

        if (inUse === 0) {
          return (
            <span className="text-[color:var(--color-ink-secondary)]">0</span>
          );
        }

        return (
          <button
            onClick={() => handleOpenDrawer(row)}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-lg
              font-semibold text-sm cursor-pointer
              transition-colors hover:opacity-80
              ${isBottlenecked
                ? 'bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)]'
                : 'bg-[color:var(--color-warn)]/10 text-[color:var(--color-warn)]'
              }
            `}
            title="Click to view active sessions"
          >
            <Play className="h-3 w-3" />
            {inUse}
          </button>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      minWidth: 120,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'condition',
      header: 'Condition',
      minWidth: 100,
      render: (row) => {
        const tone = row.condition === 'problematic' ? 'warn' : 'muted';
        return <TokenChip tone={tone}>{row.condition}</TokenChip>;
      },
    },
    {
      key: 'actions',
      header: '',
      minWidth: 100,
      render: (row) => {
        const copies = row.copies_in_rotation ?? 1;
        const inUse = copiesInUse[row.id] ?? 0;
        const available = copies - inUse;
        const hasAvailableCopies = available > 0;
        const hasBrowsingSessions = browsingSessions.length > 0;

        if (!hasAvailableCopies) {
          return (
            <span
              className="text-xs text-[color:var(--color-ink-secondary)] flex items-center gap-1"
              title="All copies in use"
            >
              <AlertCircle className="h-3 w-3" />
              Full
            </span>
          );
        }

        if (!hasBrowsingSessions) {
          return null;
        }

        return (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => handleOpenAssignModal(row)}
          >
            Assign
          </Button>
        );
      },
    },
  ], [copiesInUse, browsingSessions.length, handleOpenDrawer, handleOpenAssignModal]);

  // Filter games
  const filtered = useMemo(() => {
    return games.filter((game) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!game.title.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Quick filters (OR logic when multiple active)
      if (activeFilters.size > 0) {
        const inUse = copiesInUse[game.id] ?? 0;
        const copies = game.copies_in_rotation ?? 1;
        const isInUse = inUse > 0;
        const isBottlenecked = copies > 0 && inUse >= copies;
        const isOutForRepair = game.status === 'out_for_repair';
        const isProblematic = game.condition === 'problematic';

        let matches = false;

        if (activeFilters.has('in_use') && isInUse) matches = true;
        if (activeFilters.has('bottlenecked') && isBottlenecked) matches = true;
        if (activeFilters.has('out_for_repair') && isOutForRepair) matches = true;
        if (activeFilters.has('problematic') && isProblematic) matches = true;

        if (!matches) return false;
      }

      return true;
    });
  }, [games, searchQuery, activeFilters, copiesInUse]);

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Library</p>
          <h1 className="text-3xl">Game ledger</h1>
        </div>
        <div className="flex items-center gap-2">
          <ImportGamesButton />
          <Button variant="secondary" className="gap-2" onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4" /> Add game
          </Button>
        </div>
      </div>

      {/* Command Bar */}
      <Card className="overflow-visible">
        <CardContent className="pt-4">
          <LibraryCommandBar
            games={games}
            copiesInUse={copiesInUse}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeFilters={activeFilters}
            onFilterToggle={handleFilterToggle}
          />
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable data={filtered} columns={columns} />
        </CardContent>
      </Card>

      {/* Add Game Modal */}
      <GameFormModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={(game) => {
          const minPlayers = game.min_players ?? 2;
          const maxPlayers = game.max_players ?? 4;
          const minTime = game.min_time_minutes ?? 30;
          const maxTime = game.max_time_minutes ?? 45;

          const newGame: Game = {
            id: `game-${Date.now()}`,
            venue_id: data.venueId,
            title: game.title ?? 'Untitled',
            min_players: minPlayers,
            max_players: maxPlayers,
            min_time_minutes: minTime,
            max_time_minutes: maxTime,
            complexity: game.complexity ?? 'medium',
            vibes: game.vibes ?? ['calming'],
            status: 'in_rotation',
            condition: game.condition ?? 'new',
            shelf_location: game.shelf_location ?? 'Wall X',
            pitch: game.pitch ?? null,
            setup_steps: null,
            rules_bullets: null,
            cover_image_url: game.cover_image_url ?? null,
            bgg_rank: game.bgg_rank ?? null,
            bgg_rating: game.bgg_rating ?? null,
            copies_in_rotation: game.copies_in_rotation ?? 1,
            created_at: new Date().toISOString(),
          };
          push({ title: 'Game added', description: `${newGame.title} logged to library`, tone: 'success' });
        }}
      />

      {/* Live Sessions Drawer */}
      {drawerGame && (
        <GameLiveDrawer
          game={drawerGame}
          sessions={drawerSessions}
          copiesInUse={copiesInUse[drawerGame.id] ?? 0}
          isOpen={drawerOpen}
          onClose={handleCloseDrawer}
          onAssignClick={() => handleOpenAssignModal(drawerGame)}
        />
      )}

      {/* Assign to Table Modal */}
      {assignGame && (
        <AssignToTableModal
          game={assignGame}
          browsingSessions={browsingSessions}
          isOpen={assignModalOpen}
          onClose={handleCloseAssignModal}
        />
      )}
    </>
  );
}
