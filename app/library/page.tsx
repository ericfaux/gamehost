"use client";

import { useMemo, useState } from "react";
import { Filter, Plus } from "lucide-react";
import { AppShell, StatusBadge, TokenChip, useToast } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Game, GameStatus } from "@/lib/db/types";
import { mockGames } from "@/lib/mockData";

const vibeFilters = ["calming", "pattern", "nature", "drafting", "asymmetric", "conflict", "engine", "serene", "racing"];
const statusOptions: GameStatus[] = ["in_rotation", "out_for_repair", "retired", "for_sale"];

function AddGameModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (game: Partial<Game>) => void }) {
  const [title, setTitle] = useState("");
  const [vibe, setVibe] = useState("calming");
  const [players, setPlayers] = useState("2-4");
  const [time, setTime] = useState("30-45");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="panel-surface max-w-lg w-full">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Add game</CardTitle>
          <button onClick={onClose} aria-label="Close" className="text-sm text-ink-secondary">✕</button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-rulebook text-ink-secondary">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Scout" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-rulebook text-ink-secondary">Vibe</label>
              <Input value={vibe} onChange={(e) => setVibe(e.target.value)} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-rulebook text-ink-secondary">Players</label>
              <Input value={players} onChange={(e) => setPlayers(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-rulebook text-ink-secondary">Time</label>
            <Input value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </CardContent>
        <div className="px-5 pb-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave({ title, vibes: [vibe], min_players: Number(players.split("-")[0] ?? 2), max_players: Number(players.split("-")[1] ?? 4), min_time_minutes: Number(time.split("-")[0] ?? 30), max_time_minutes: Number(time.split("-")[1] ?? 45) });
              onClose();
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <AppShell>
      <LibraryContent />
    </AppShell>
  );
}

function LibraryContent() {
  const { push } = useToast();
  const [selectedVibe, setSelectedVibe] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<GameStatus | "">("");
  const [players, setPlayers] = useState("all");
  const [time, setTime] = useState("all");
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Game[]>(mockGames);

  const columns: Column<Game>[] = [
    { key: "title", header: "Title", sortable: true },
    {
      key: "vibes",
      header: "Vibe",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.vibes.map((vibe) => (
            <TokenChip key={vibe}>{vibe}</TokenChip>
          ))}
        </div>
      ),
    },
    {
      key: "min_players",
      header: "Players",
      sortable: true,
      render: (row) => `${row.min_players}-${row.max_players}`,
    },
    {
      key: "min_time_minutes",
      header: "Time",
      sortable: true,
      render: (row) => `${row.min_time_minutes}-${row.max_time_minutes}m`,
    },
    { key: "shelf_location", header: "Location", render: (row) => <span className="font-mono text-xs">{row.shelf_location}</span> },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "condition",
      header: "Condition",
      render: (row) => <TokenChip tone="muted">{row.condition}</TokenChip>,
    },
  ];

  const filtered = useMemo(() => {
    return rows.filter((game) => {
      if (selectedVibe && !game.vibes.includes(selectedVibe)) return false;
      if (selectedStatus && game.status !== selectedStatus) return false;
      if (players !== "all") {
        const threshold = Number(players);
        if (game.max_players < threshold) return false;
      }
      if (time !== "all") {
        const [min, max] = time.split("-").map(Number);
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
              onChange={(e) => setSelectedStatus(e.target.value as GameStatus | "")}
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

      <AddGameModal
        open={open}
        onClose={() => setOpen(false)}
        onSave={(game) => {
          const newGame: Game = {
            id: `game-${rows.length + 1}`,
            venue_id: mockGames[0].venue_id,
            title: game.title ?? "Untitled",
            min_players: game.min_players ?? 2,
            max_players: game.max_players ?? 4,
            min_time_minutes: game.min_time_minutes ?? 30,
            max_time_minutes: game.max_time_minutes ?? 45,
            complexity: "medium",
            vibes: game.vibes ?? ["calming"],
            status: "in_rotation",
            condition: "new",
            shelf_location: "Wall X",
            pitch: null,
            setup_steps: null,
            rules_bullets: null,
            cover_image_url: null,
            bgg_rank: null,
            bgg_rating: null,
            created_at: new Date().toISOString(),
          };
          setRows((prev) => [newGame, ...prev]);
          push({ title: "Game added", description: `${newGame.title} logged to library`, tone: "success" });
        }}
      />
    </>
  );
}
