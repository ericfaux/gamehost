"use client";

import { useState } from "react";
import { Clock3, StopCircle } from "lucide-react";
import { StatusBadge, TokenChip, useToast } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Session } from "@/lib/db/types";

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
}

export function SessionsClient({ initialSessions }: SessionsClientProps) {
  const { push } = useToast();
  const [sessions, setSessions] = useState<SessionWithDetails[]>(initialSessions);

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

      <Card className="panel-surface">
        <CardHeader className="flex items-center justify-between">
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
    </>
  );
}
