'use client';

import { useMemo, useState, useCallback, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Play, Pencil, Star, Eye, Gamepad2, Download, Loader2 } from "@/components/icons";
import { TokenChip, useToast } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { DataTable, Column } from '@/components/ui/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { GameFormModal } from '@/components/admin/AddGameModal';
import { ImportGamesButton } from '@/components/admin/ImportGamesButton';
import { LibraryCommandBar, LibraryFilter } from '@/components/admin/LibraryCommandBar';
import { GameLiveDrawer } from '@/components/admin/GameLiveDrawer';
import { GameFeedbackDrawer } from '@/components/admin/GameFeedbackDrawer';
import { AssignToTableModal } from '@/components/admin/AssignToTableModal';
import {
  StatusSelect,
  ConditionSelect,
  CopiesStepper,
  LocationInput,
  FullChip,
} from '@/components/admin/InlineEditors';
import { Game } from '@/lib/db/types';
import type { LibraryAggregatedData, SessionWithTable } from '@/app/admin/library/page';
import { fetchCoverFromBgg } from '@/app/admin/library/actions';

/**
 * FetchCoverButton - Inline button to fetch cover image from BGG
 */
function FetchCoverButton({ gameId, title }: { gameId: string; title: string }) {
  const { push } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleFetch = () => {
    startTransition(async () => {
      const result = await fetchCoverFromBgg(gameId, title);
      if (result.success) {
        push({ title: 'Cover fetched', description: `Found cover for "${title}"`, tone: 'success' });
      } else {
        push({ title: 'Could not fetch cover', description: result.error, tone: 'danger' });
      }
    });
  };

  return (
    <button
      onClick={handleFetch}
      disabled={isPending}
      className="
        w-10 h-10 rounded bg-[color:var(--color-muted)]
        flex items-center justify-center
        hover:bg-[color:var(--color-structure)] hover:ring-2 hover:ring-[color:var(--color-accent)]/20
        transition-all cursor-pointer
        disabled:cursor-not-allowed disabled:opacity-50
      "
      title="Fetch cover from BoardGameGeek"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 text-[color:var(--color-accent)] animate-spin" />
      ) : (
        <Download className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
      )}
    </button>
  );
}

interface LibraryClientProps {
  data: LibraryAggregatedData;
  /** Game ID to highlight (from URL param) */
  initialHighlight?: string;
  /** Initial filter to apply (from URL param) */
  initialFilter?: LibraryFilter;
}

export function LibraryClient({
  data,
  initialHighlight,
  initialFilter,
}: LibraryClientProps) {
  const router = useRouter();
  const { push } = useToast();
  const { games, copiesInUse, activeSessionsByGame, browsingSessions, feedbackSummaries, venueId, trendingGameIds } = data;

  // Create a Set for efficient trending lookup
  const trendingSet = useMemo(() => new Set(trendingGameIds), [trendingGameIds]);

  // State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<LibraryFilter>>(() => {
    // Initialize with filter from URL param if provided
    if (initialFilter) {
      return new Set([initialFilter]);
    }
    return new Set();
  });

  // Highlight state - tracks which game to highlight and when to clear
  const [highlightedGameId, setHighlightedGameId] = useState<string | null>(initialHighlight ?? null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear highlight after a few seconds and clean up URL
  useEffect(() => {
    if (highlightedGameId) {
      // Scroll to the highlighted row after a short delay (to allow render and page navigation)
      const scrollTimeout = setTimeout(() => {
        const highlightedRow = document.querySelector(`[data-row-id="${highlightedGameId}"]`);
        if (highlightedRow) {
          highlightedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);

      // Clear highlight after 4 seconds
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedGameId(null);
        // Clean up URL params
        router.replace('/admin/library', { scroll: false });
      }, 4000);

      return () => {
        clearTimeout(scrollTimeout);
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
      };
    }
  }, [highlightedGameId, router]);

  // Drawer state
  const [drawerGame, setDrawerGame] = useState<Game | null>(null);
  const [drawerSessions, setDrawerSessions] = useState<SessionWithTable[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Assign modal state
  const [assignGame, setAssignGame] = useState<Game | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Edit modal state
  const [editGame, setEditGame] = useState<Game | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Feedback drawer state
  const [feedbackGame, setFeedbackGame] = useState<Game | null>(null);
  const [feedbackDrawerOpen, setFeedbackDrawerOpen] = useState(false);

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

  // Open edit modal
  const handleOpenEditModal = useCallback((game: Game) => {
    setEditGame(game);
    setEditModalOpen(true);
  }, []);

  // Close edit modal
  const handleCloseEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditGame(null);
  }, []);

  // Open feedback drawer
  const handleOpenFeedbackDrawer = useCallback((game: Game) => {
    setFeedbackGame(game);
    setFeedbackDrawerOpen(true);
  }, []);

  // Close feedback drawer
  const handleCloseFeedbackDrawer = useCallback(() => {
    setFeedbackDrawerOpen(false);
    setFeedbackGame(null);
  }, []);

  // Table columns
  const columns: Column<Game>[] = useMemo(() => [
    {
      key: 'cover',
      header: '',
      minWidth: 56,
      render: (row) => (
        <div className="flex items-center justify-center w-10 h-10">
          {row.cover_image_url ? (
            <Image
              src={row.cover_image_url}
              alt={row.title}
              width={40}
              height={40}
              className="rounded object-cover"
              unoptimized
            />
          ) : (
            <FetchCoverButton gameId={row.id} title={row.title} />
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      minWidth: 180,
      render: (row) => {
        const feedback = feedbackSummaries[row.id];
        const isTrending = trendingSet.has(row.id);
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-[color:var(--color-ink-primary)]">{row.title}</span>
              {isTrending && (
                <span
                  className="text-orange-500"
                  title="Trending on BoardGameGeek"
                >
                  🔥
                </span>
              )}
            </div>
            {feedback && feedback.responseCount > 0 && (
              <Link
                href={`/admin/feedback?q=${encodeURIComponent(row.title)}&range=90d`}
                className="flex items-center gap-1.5 text-xs hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Star className="h-3 w-3 text-amber-500" />
                <span className="font-medium text-[color:var(--color-ink-primary)]">
                  {feedback.avgRating !== null ? feedback.avgRating.toFixed(1) : '—'}
                </span>
                <span className="text-[color:var(--color-ink-secondary)]">
                  ({feedback.responseCount})
                </span>
              </Link>
            )}
          </div>
        );
      },
    },
    {
      key: 'vibes',
      header: 'Vibe',
      minWidth: 120,
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
      minWidth: 70,
      render: (row) => `${row.min_players}-${row.max_players}`,
    },
    {
      key: 'min_time_minutes',
      header: 'Time',
      sortable: true,
      minWidth: 80,
      render: (row) => `${row.min_time_minutes}-${row.max_time_minutes}m`,
    },
    {
      key: 'shelf_location',
      header: 'Location',
      minWidth: 90,
      render: (row) => (
        <LocationInput
          gameId={row.id}
          currentValue={row.shelf_location}
        />
      ),
    },
    {
      key: 'copies_in_rotation',
      header: 'Copies',
      minWidth: 90,
      render: (row) => (
        <CopiesStepper
          gameId={row.id}
          currentValue={row.copies_in_rotation ?? 1}
        />
      ),
    },
    {
      key: 'in_use',
      header: 'In use',
      minWidth: 80,
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
          <div className="flex items-center gap-2">
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
            {isBottlenecked && (
              <FullChip copiesInUse={inUse} copiesInRotation={copies} />
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      minWidth: 140,
      render: (row) => (
        <StatusSelect
          gameId={row.id}
          currentValue={row.status}
        />
      ),
    },
    {
      key: 'condition',
      header: 'Condition',
      minWidth: 120,
      render: (row) => (
        <ConditionSelect
          gameId={row.id}
          currentValue={row.condition}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Feedback',
      minWidth: 130,
      render: (row) => {
        const copies = row.copies_in_rotation ?? 1;
        const inUse = copiesInUse[row.id] ?? 0;
        const available = copies - inUse;
        const hasAvailableCopies = available > 0;
        const hasBrowsingSessions = browsingSessions.length > 0;
        const hasFeedback = feedbackSummaries[row.id]?.responseCount > 0;

        return (
          <div className="flex items-center gap-1">
            {/* View feedback button - only if has feedback */}
            {hasFeedback && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleOpenFeedbackDrawer(row)}
                title="View feedback"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}

            {/* Edit button - always visible */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleOpenEditModal(row)}
              title="Edit game"
            >
              <Pencil className="h-4 w-4" />
            </Button>

            {/* Assign button - only if copies available and browsing sessions exist */}
            {hasAvailableCopies && hasBrowsingSessions && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => handleOpenAssignModal(row)}
              >
                Assign
              </Button>
            )}
          </div>
        );
      },
    },
  ], [copiesInUse, browsingSessions.length, feedbackSummaries, trendingSet, handleOpenDrawer, handleOpenAssignModal, handleOpenEditModal, handleOpenFeedbackDrawer]);

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
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(game) => game.id}
            highlightedRowId={highlightedGameId}
          />
        </CardContent>
      </Card>

      {/* Add Game Modal */}
      <GameFormModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={(game) => {
          push({ title: 'Game added', description: `${game.title} logged to library`, tone: 'success' });
        }}
      />

      {/* Edit Game Modal */}
      <GameFormModal
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        initialData={editGame}
        onSave={(game) => {
          push({ title: 'Game updated', description: `${game.title} has been updated`, tone: 'success' });
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

      {/* Feedback Drawer */}
      {feedbackGame && (
        <GameFeedbackDrawer
          game={feedbackGame}
          venueId={venueId}
          isOpen={feedbackDrawerOpen}
          onClose={handleCloseFeedbackDrawer}
        />
      )}
    </>
  );
}
