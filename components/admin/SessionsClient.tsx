"use client";

import { useState } from "react";
import { Clock3, StopCircle } from "lucide-react";
import { StatusBadge, TokenChip, useToast } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Session, VenueTable } from "@/lib/db/types";

// Type for session with joined game and table data
export interface SessionWithDetails extends Session {
  games: { title: string } | null;
  venue_tables: { label: string } | null;
}

function formatDuration(started: string) {
  const diff = Date.now() - new Date(started).getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

interface SessionsClientProps {
  initialSessions: SessionWithDetails[];
  availableTables: VenueTable[];
}

export function SessionsClient({ initialSessions, availableTables }: SessionsClientProps) {
  const { push } = useToast();
  const [sessions, setSessions] = useState<SessionWithDetails[]>(initialSessions);

  // Calculate which tables are currently in use
  const tablesInUse = new Set(sessions.map((s) => s.table_id));
  const availableForSession = availableTables.filter((t) => !tablesInUse.has(t.id));

  const endSession = async (session: SessionWithDetails) => {
    // TODO: Replace with actual server action call
    // await endSessionAction(session.id);
    console.log("Ending session:", session.id);

    // Optimistically remove from UI
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
    push({
      title: "Session ended",
      description: `${session.games?.title ?? "Game"} closed`,
      tone: "neutral",
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Sessions</p>
          <h1 className="text-3xl">Live tables</h1>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Tables Overview Card */}
        <Card className="panel-surface">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Table Status</CardTitle>
            <div className="flex gap-2">
              <TokenChip tone="accent">{availableForSession.length} available</TokenChip>
              <TokenChip tone="muted">{tablesInUse.size} in use</TokenChip>
            </div>
          </CardHeader>
          <CardContent>
            {availableTables.length === 0 ? (
              <p className="text-sm text-[color:var(--color-ink-secondary)]">
                No tables configured. Go to{" "}
                <a href="/admin/settings" className="text-[color:var(--color-accent)] underline">
                  Settings
                </a>{" "}
                to add tables.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableTables.map((table) => {
                  const inUse = tablesInUse.has(table.id);
                  return (
                    <div
                      key={table.id}
                      className={`px-3 py-2 rounded-xl border text-sm font-medium ${
                        inUse
                          ? "bg-[color:var(--color-warn)]/10 border-[color:var(--color-warn)]/30 text-[color:var(--color-warn)]"
                          : "bg-[color:var(--color-accent-soft)] border-[color:var(--color-accent)]/30 text-[color:var(--color-accent)]"
                      }`}
                    >
                      {table.label}
                      <span className="ml-2 text-xs opacity-70">
                        {inUse ? "In use" : "Available"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Sessions Card */}
        <Card className="panel-surface">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Live sessions</CardTitle>
            <TokenChip tone="muted">{sessions.length} in progress</TokenChip>
          </CardHeader>
          <CardContent className="divide-y divide-[color:var(--color-structure)]">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-[color:var(--color-ink-primary)]">
                    {session.games?.title ?? "Unknown Game"}
                  </p>
                  <p className="text-sm text-[color:var(--color-ink-secondary)] flex items-center gap-2">
                    <StatusBadge status="in_use" />
                    <span className="font-mono">
                      {session.venue_tables?.label ?? session.table_id}
                    </span>
                    <Clock3 className="h-4 w-4" /> {formatDuration(session.started_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => endSession(session)}
                  >
                    <StopCircle className="h-4 w-4" /> End
                  </Button>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-secondary">
                No active sessions
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
