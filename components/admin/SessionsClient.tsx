"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, StopCircle, Search, RotateCw } from "lucide-react";
import { StatusBadge, TokenChip, useToast } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Session, VenueTable } from "@/lib/db/types";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { endSessionAction } from "@/app/admin/sessions/actions";

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
  const [endingSessionId, setEndingSessionId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    // Reset after a short delay to show the animation
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const tablesInUse = useMemo(() => new Set(sessions.map((s) => s.table_id)), [sessions]);
  const availableForSession = useMemo(
    () => availableTables.filter((t) => !tablesInUse.has(t.id)),
    [availableTables, tablesInUse],
  );
  const [selectedTableId, setSelectedTableId] = useState<string>(availableForSession[0]?.id ?? "");

  // Count browsing vs playing sessions
  const browsingSessions = useMemo(
    () => sessions.filter((s) => s.game_id === null),
    [sessions],
  );
  const playingSessions = useMemo(
    () => sessions.filter((s) => s.game_id !== null),
    [sessions],
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    if (availableForSession.length === 0) {
      setSelectedTableId("");
      return;
    }

    if (!availableForSession.find((table) => table.id === selectedTableId)) {
      setSelectedTableId(availableForSession[0].id);
    }
  }, [availableForSession, selectedTableId]);

  const endSession = async (session: SessionWithDetails) => {
    if (endingSessionId === session.id) return;

    setEndingSessionId(session.id);

    try {
      const result = await endSessionAction(session.id);

      if (result.success) {
        // Optimistically remove from UI
        setSessions((prev) => prev.filter((s) => s.id !== session.id));
        push({
          title: "Session ended",
          description: session.games?.title
            ? `${session.games.title} closed`
            : "Browsing session closed",
          tone: "neutral",
        });
      } else {
        push({
          title: "Failed to end session",
          description: result.error ?? "Something went wrong",
          tone: "danger",
        });
      }
    } catch (error) {
      console.error("Error ending session:", error);
      push({
        title: "Failed to end session",
        description: "Something went wrong. Please try again.",
        tone: "danger",
      });
    } finally {
      setEndingSessionId(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Sessions</p>
          <h1 className="text-3xl">Live tables</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh sessions"
        >
          <RotateCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="ml-1">Refresh</span>
        </Button>
      </div>

      <div className="grid gap-4">
        <Card className="panel-surface">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Start a session</CardTitle>
            <TokenChip tone="muted">Beta</TokenChip>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableTables.length === 0 ? (
              <p className="text-sm text-ink-secondary">
                No tables found. <a href="/admin/settings" className="text-[color:var(--color-accent)] underline">Create one in Settings.</a>
              </p>
            ) : availableForSession.length === 0 ? (
              <p className="text-sm text-ink-secondary">All tables are currently in use.</p>
            ) : (
              <form
                className="flex flex-col gap-3 md:flex-row md:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!selectedTableId) {
                    push({
                      title: "Select a table",
                      description: "Choose a table before starting a session.",
                      tone: "danger",
                    });
                    return;
                  }

                  const selectedTable = availableTables.find((table) => table.id === selectedTableId);
                  push({
                    title: "Table ready",
                    description: `${selectedTable?.label ?? "Table"} selected. Continue with your session setup.`,
                    tone: "neutral",
                  });
                }}
              >
                <div className="flex-1 space-y-2">
                  <label className="text-xs uppercase tracking-rulebook text-ink-secondary">
                    Assign table
                  </label>
                  <select
                    value={selectedTableId}
                    onChange={(event) => setSelectedTableId(event.target.value)}
                    className="w-full rounded-lg border border-structure bg-surface px-3 py-2 text-sm shadow-token focus:outline-none"
                  >
                    {availableForSession.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-ink-secondary">Tables currently in use are hidden.</p>
                </div>

                <Button type="submit" className="md:w-auto">
                  Start session
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

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
                  const session = sessions.find((s) => s.table_id === table.id);
                  const isBrowsing = session && session.game_id === null;

                  return (
                    <div
                      key={table.id}
                      className={`px-3 py-2 rounded-xl border text-sm font-medium ${
                        inUse
                          ? isBrowsing
                            ? "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700/50 text-yellow-700 dark:text-yellow-400"
                            : "bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700/50 text-green-700 dark:text-green-400"
                          : "bg-[color:var(--color-accent-soft)] border-[color:var(--color-accent)]/30 text-[color:var(--color-accent)]"
                      }`}
                    >
                      {table.label}
                      <span className="ml-2 text-xs opacity-70">
                        {inUse ? (isBrowsing ? "Browsing" : "Playing") : "Available"}
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
            <div className="flex gap-2">
              {browsingSessions.length > 0 && (
                <TokenChip tone="warn">{browsingSessions.length} browsing</TokenChip>
              )}
              {playingSessions.length > 0 && (
                <TokenChip tone="accent">{playingSessions.length} playing</TokenChip>
              )}
              {sessions.length === 0 && (
                <TokenChip tone="muted">0 in progress</TokenChip>
              )}
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-[color:var(--color-structure)]">
            {sessions.map((session) => {
              const isBrowsing = session.game_id === null;
              const isEnding = endingSessionId === session.id;

              return (
                <div
                  key={session.id}
                  className="py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    {isBrowsing ? (
                      // Browsing state - no game selected yet
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <p className="font-semibold text-yellow-700 dark:text-yellow-400">
                          Browsing...
                        </p>
                      </div>
                    ) : (
                      // Playing state - game selected
                      <p className="font-semibold text-green-700 dark:text-green-400">
                        {session.games?.title ?? "Unknown Game"}
                      </p>
                    )}
                    <p className="text-sm text-[color:var(--color-ink-secondary)] flex items-center gap-2">
                      <StatusBadge status={isBrowsing ? "pending" : "in_use"} />
                      <span className="font-mono">
                        {session.venue_tables?.label ?? session.table_id}
                      </span>
                      <Clock3 className="h-4 w-4" />
                      <span>
                        {isBrowsing ? "Deciding: " : "Playing: "}
                        {formatDuration(session.started_at)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => endSession(session)}
                      disabled={isEnding}
                    >
                      {isEnding ? (
                        <>
                          <svg
                            className="h-4 w-4 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Ending...
                        </>
                      ) : (
                        <>
                          <StopCircle className="h-4 w-4" /> End
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
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
