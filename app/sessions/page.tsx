"use client";

import { useMemo, useState } from "react";
import { Clock3, PlayCircle, StopCircle } from "lucide-react";
import { AppShell, StatusBadge, TokenChip, useToast } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Game, Session } from "@/lib/db/types";
import { mockGames, mockSessions, mockTables } from "@/lib/mockData";

function formatDuration(started: string) {
  const diff = Date.now() - new Date(started).getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function SessionsPage() {
  const { push } = useToast();
  const [sessions, setSessions] = useState<Session[]>(mockSessions);
  const [tableId, setTableId] = useState(mockTables[0]?.id ?? "");
  const [gameId, setGameId] = useState(mockGames[0]?.id ?? "");
  const [note, setNote] = useState("");

  const live = useMemo(() => sessions, [sessions]);

  const startSession = () => {
    if (!tableId || !gameId) return;
    const now = new Date().toISOString();
    const newSession: Session = {
      id: `session-${sessions.length + 1}`,
      venue_id: mockGames[0].venue_id,
      table_id: tableId,
      game_id: gameId,
      started_at: now,
      wizard_params: { note },
      created_at: now,
      feedback_rating: null,
      feedback_complexity: null,
      feedback_replay: null,
      feedback_comment: null,
      feedback_submitted_at: null,
    };
    setSessions((prev) => [newSession, ...prev]);
    push({ title: "Session started", description: `${mockGames.find((g) => g.id === gameId)?.title ?? "Game"} at ${tableId}`, tone: "success" });
  };

  const endSession = (id: string) => {
    const ended = sessions.find((s) => s.id === id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    push({ title: "Session ended", description: `${mockGames.find((g) => g.id === ended?.game_id)?.title ?? "Game"} closed`, tone: "neutral" });
  };

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Sessions</p>
          <h1 className="text-3xl">Live tables</h1>
        </div>
      </div>

      <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Live sessions</CardTitle>
            <TokenChip tone="muted">{live.length} in progress</TokenChip>
          </CardHeader>
          <CardContent className="divide-y divide-[color:var(--color-structure)]">
            {live.map((session) => {
              const game = mockGames.find((g) => g.id === session.game_id) as Game;
              return (
                <div key={session.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[color:var(--color-ink-primary)]">{game?.title}</p>
                    <p className="text-sm text-[color:var(--color-ink-secondary)] flex items-center gap-2">
                      <StatusBadge status="in_use" />
                      <span className="font-mono">{session.table_id}</span>
                      <Clock3 className="h-4 w-4" /> {formatDuration(session.started_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => endSession(session.id)}>
                      <StopCircle className="h-4 w-4" /> End
                    </Button>
                  </div>
                </div>
              );
            })}
            {live.length === 0 && <p className="py-6 text-center text-sm text-ink-secondary">No active sessions</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Start a session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-rulebook text-ink-secondary">Table token</label>
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2"
              >
                {mockTables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-rulebook text-ink-secondary">Game QR</label>
              <select
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2"
              >
                {mockGames.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-rulebook text-ink-secondary">Notes</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Café shift, family table, etc." />
            </div>
            <Button className="w-full" onClick={startSession}>
              <PlayCircle className="h-4 w-4" /> Start session
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
