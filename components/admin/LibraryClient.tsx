'use client';

import { useMemo, useState } from 'react';
import { Filter, Plus } from "@/components/icons";
import { StatusBadge, TokenChip, useToast } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { DataTable, Column } from '@/components/ui/data-table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { GameFormModal } from '@/components/admin/AddGameModal';
import { ImportGamesButton } from '@/components/admin/ImportGamesButton';
import { Game, GameStatus } from '@/lib/db/types';

const vibeFilters = ['calming', 'pattern', 'nature', 'drafting', 'asymmetric', 'conflict', 'engine', 'serene', 'racing'];
const statusOptions: GameStatus[] = ['in_rotation', 'out_for_repair', 'retired', 'for_sale'];

interface LibraryClientProps {
  initialGames: Game[];
  copiesInUse: Record<string, number>;
}

export function LibraryClient({ initialGames, copiesInUse }: LibraryClientProps) {
  const { push } = useToast();
  const [selectedVibe, setSelectedVibe] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<GameStatus | ''>('');
  const [players, setPlayers] = useState('all');
  const [time, setTime] = useState('all');
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Game[]>(initialGames);

  const columns: Column<Game>[] = [
    { key: 'title', header: 'Title', sortable: true },
    {
      key: 'vibes',
      header: 'Vibe',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.vibes.map((vibe) => (
            <TokenChip key={vibe}>{vibe}</TokenChip>
          ))}
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
    { key: 'shelf_location', header: 'Location', render: (row) => <span className="font-mono text-xs">{row.shelf_location}</span> },
    {
      key: 'copies_in_rotation',
      header: 'Copies',
      render: (row) => <span className="text-center">{row.copies_in_rotation ?? 1}</span>,
    },
    {
      key: 'in_use',
      header: 'In use',
      render: (row) => <span className="text-center">{copiesInUse[row.id] ?? 0}</span>,
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
      render: (row) => <TokenChip tone="muted">{row.condition}</TokenChip>,
    },
  ];

  const filtered = useMemo(() => {
    return rows.filter((game) => {
      if (selectedVibe && !game.vibes.includes(selectedVibe)) return false;
      if (selectedStatus && game.status !== selectedStatus) return false;
      if (players !== 'all') {
        const threshold = Number(players);
        if (game.max_players < threshold) return false;
      }
      if (time !== 'all') {
        const [min, max] = time.split('-').map(Number);
        if (game.min_time_minutes < min || game.max_time_minutes > max) return false;
      }
      return true;
    });
  }, [players, rows, selectedStatus, selectedVibe, time]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Library</p>
          <h1 className="text-3xl">Game ledger</h1>
        </div>
        <div className="flex items-center gap-2">
          <ImportGamesButton />
          <Button variant="secondary" className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add game
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Filter className="h-4 w-4" /> Filters
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <select
              value={selectedVibe}
              onChange={(e) => setSelectedVibe(e.target.value)}
              className="rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2"
            >
              <option value="">All vibes</option>
              {vibeFilters.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={players}
              onChange={(e) => setPlayers(e.target.value)}
              className="rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2"
            >
              <option value="all">Any players</option>
              <option value="2">2+</option>
              <option value="4">4+</option>
              <option value="6">6+</option>
            </select>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2"
            >
              <option value="all">Any time</option>
              <option value="15-45">15-45m</option>
              <option value="45-90">45-90m</option>
              <option value="90-150">90-150m</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as GameStatus | '')}
              className="rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2"
            >
              <option value="">Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={filtered} columns={columns} />
        </CardContent>
      </Card>

      <GameFormModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSave={(game) => {
          const minPlayers = game.min_players ?? 2;
          const maxPlayers = game.max_players ?? 4;
          const minTime = game.min_time_minutes ?? 30;
          const maxTime = game.max_time_minutes ?? 45;

          const newGame: Game = {
            id: `game-${rows.length + 1}`,
            venue_id: initialGames[0]?.venue_id ?? '',
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
          setRows((prev) => [newGame, ...prev]);
          push({ title: 'Game added', description: `${newGame.title} logged to library`, tone: 'success' });
        }}
      />
    </>
  );
}
