"use client";

import { useEffect, useMemo, useState } from "react";
import { OperatorShell } from "../../components/OperatorShell";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useMockData } from "../../context/MockDataContext";
import { Clock, Play, Scan } from "lucide-react";

const tables = ["Table 1", "Table 2", "Table 3", "Table 4", "Table 5", "Table 6"];

function formatDuration(start: number, now: number) {
  const diff = Math.max(0, now - start);
  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function SessionsPage() {
  const { games, sessions, startSession, endSession } = useMockData();
  const [selectedTable, setSelectedTable] = useState(tables[0]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [now, setNow] = useState(Date.now());

  const availableGames = useMemo(
    () => games.filter((game) => game.status === "available"),
    [games]
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (availableGames.length === 0) {
      setSelectedGame("");
      return;
    }
    const exists = availableGames.find((game) => game.id === selectedGame);
    if (!exists) {
      setSelectedGame(availableGames[0].id);
    }
  }, [availableGames, selectedGame]);

  const activeSessions = sessions.map((session) => ({
    ...session,
    game: games.find((g) => g.id === session.gameId),
  }));

  return (
    <OperatorShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-ledger text-ink-secondary">Live Control</p>
          <h1 className="text-3xl font-serif text-ink-primary">Sessions</h1>
        </div>
        <Badge tone="warning">Timers synced</Badge>
      </div>

      <div className="grid grid-cols-[1fr_1.1fr] gap-6 items-start">
        <Card className="border-2 border-stroke/80 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-accent-secondary text-card flex items-center justify-center shadow-token">
              <Scan className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-ledger text-ink-secondary">Quick Action</p>
              <p className="text-lg font-serif text-ink-primary">Simulated QR Scanner</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex flex-col gap-2 text-sm font-semibold text-ink-primary">
              <span className="text-xs uppercase tracking-ledger text-ink-secondary">Table</span>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="rounded-token border border-stroke bg-card px-3 py-2 shadow-inner shadow-stroke/30 focus:border-ink-primary focus:outline-none"
              >
                {tables.map((table) => (
                  <option key={table} value={table}>
                    {table}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-ink-primary">
              <span className="text-xs uppercase tracking-ledger text-ink-secondary">Select game</span>
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="rounded-token border border-stroke bg-card px-3 py-2 shadow-inner shadow-stroke/30 focus:border-ink-primary focus:outline-none"
              >
                {availableGames.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.title} · {game.players} players
                  </option>
                ))}
              </select>
              {availableGames.length === 0 && (
                <p className="text-xs text-ink-secondary">No available games right now.</p>
              )}
            </label>
          </div>
          <Button
            className="w-full justify-center gap-2"
            disabled={!selectedGame || availableGames.length === 0}
            onClick={() => selectedGame && startSession(selectedTable, selectedGame)}
          >
            <Play className="h-4 w-4" /> Start session
          </Button>
        </Card>

        <Card className="border-2 border-stroke/80">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stroke bg-paper/70">
            <div>
              <p className="text-xs uppercase tracking-ledger text-ink-secondary">Active tables</p>
              <p className="text-lg font-serif text-ink-primary">{sessions.length} Sessions</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-ink-secondary">
              <Clock className="h-4 w-4" />
              Live timers
            </div>
          </div>
          <div className="divide-y divide-stroke">
            {activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between px-5 py-4 hover:bg-highlight/70">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge tone="warning">{session.table}</Badge>
                    <span className="text-sm font-semibold text-ink-primary">{session.game?.title}</span>
                  </div>
                  <div className="text-xs text-ink-secondary font-mono">
                    Started {formatDuration(session.startedAt, now)} ago
                  </div>
                </div>
                <Button variant="secondary" onClick={() => endSession(session.id)}>
                  End session
                </Button>
              </div>
            ))}
            {activeSessions.length === 0 && (
              <div className="px-5 py-6 text-sm text-ink-secondary">No games running right now.</div>
            )}
          </div>
        </Card>
      </div>
    </OperatorShell>
  );
}
