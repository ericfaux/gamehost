"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  Clock3,
  StopCircle,
  Search,
  RefreshCcw,
  AlertTriangle,
  Gamepad2,
  ArrowDownWideNarrow,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Star,
  Heart,
  MessageSquare,
  ThumbsDown,
  ArrowRight,
} from "@/components/icons";
import { StatusBadge, TokenChip, useToast } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Session, Game } from "@/lib/db/types";
import type { EndedSession, DateRangePreset, VenueExperienceSummary } from "@/lib/data";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  endSessionAction,
  assignGameToSessionAction,
  listEndedSessionsAction,
} from "@/app/admin/sessions/actions";
import { AssignGameModal } from "./AssignGameModal";
import { VenueCommentsDrawer } from "./VenueCommentsDrawer";

// =============================================================================
// CONSTANTS - Stale session thresholds (easy to adjust)
// =============================================================================
const STALE_BROWSING_MINUTES = 20; // Browsing session is stale after 20 minutes
const LONG_PLAYING_HOURS = 3; // Playing session is "long" after 3 hours

// =============================================================================
// TYPES
// =============================================================================

// Type for session with joined game and table data
export interface SessionWithDetails extends Session {
  games: { title: string } | null;
  venue_tables: { label: string } | null;
}

type FilterMode = "all" | "browsing" | "playing";
type SortMode = "longest" | "newest";

// =============================================================================
// HELPERS
// =============================================================================

function formatDuration(started: string) {
  const diff = Date.now() - new Date(started).getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function getSessionDurationMinutes(session: SessionWithDetails): number {
  // Use created_at as the stable timestamp for duration calculation
  const timestamp = session.created_at;
  const diff = Date.now() - new Date(timestamp).getTime();
  return Math.max(1, Math.round(diff / 60000));
}

function isSessionStale(session: SessionWithDetails): boolean {
  const isBrowsing = session.game_id === null;
  const durationMinutes = getSessionDurationMinutes(session);

  if (isBrowsing) {
    return durationMinutes >= STALE_BROWSING_MINUTES;
  }
  return false; // Playing sessions are not "stale", just "long"
}

function isSessionLong(session: SessionWithDetails): boolean {
  const isPlaying = session.game_id !== null;
  const durationMinutes = getSessionDurationMinutes(session);

  if (isPlaying) {
    return durationMinutes >= LONG_PLAYING_HOURS * 60;
  }
  return false;
}

// Helpers for ended sessions
function formatEndedTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (isToday) {
    return `Today ${timeStr}`;
  } else if (isYesterday) {
    return `Yesterday ${timeStr}`;
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) + ` ${timeStr}`;
  }
}

function formatSessionDuration(startedAt: string, createdAt: string, endedAt: string): string {
  // Prefer started_at if it exists and is different from created_at
  const start = new Date(startedAt || createdAt);
  const end = new Date(endedAt);
  const diffMs = end.getTime() - start.getTime();

  if (diffMs < 0) return "—";

  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

function prioritizeSessions(a: SessionWithDetails, b: SessionWithDetails) {
  const aHasGame = a.game_id !== null;
  const bHasGame = b.game_id !== null;

  if (aHasGame !== bHasGame) {
    return aHasGame ? -1 : 1;
  }

  const aTimestamp = new Date(a.started_at ?? a.created_at).getTime();
  const bTimestamp = new Date(b.started_at ?? b.created_at).getTime();

  return bTimestamp - aTimestamp;
}

// =============================================================================
// COMPONENT
// =============================================================================

interface SessionsClientProps {
  initialSessions: SessionWithDetails[];
  availableGames: Game[];
  venueId: string;
  initialEndedSessions: EndedSession[];
  initialEndedCursor: { endedAt: string; id: string } | null;
  venuePulse: VenueExperienceSummary;
}

export function SessionsClient({
  initialSessions,
  availableGames,
  venueId,
  initialEndedSessions,
  initialEndedCursor,
  venuePulse,
}: SessionsClientProps) {
  const { push } = useToast();
  const router = useRouter();

  // Session state
  const [sessions, setSessions] = useState<SessionWithDetails[]>(initialSessions);
  const [endingSessionId, setEndingSessionId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter, sort, and search state
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("longest");
  const [searchTerm, setSearchTerm] = useState("");

  // Assign game modal state
  const [assignModalSession, setAssignModalSession] = useState<SessionWithDetails | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // =============================================================================
  // ENDED SESSIONS STATE (Recent sessions)
  // =============================================================================
  const [endedSessions, setEndedSessions] = useState<EndedSession[]>(initialEndedSessions);
  const [endedCursor, setEndedCursor] = useState<{ endedAt: string; id: string } | null>(initialEndedCursor);
  const [endedRangePreset, setEndedRangePreset] = useState<DateRangePreset>("7d");
  const [endedSearchTerm, setEndedSearchTerm] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRecentExpanded, setIsRecentExpanded] = useState(true);
  const [isFilteringEnded, setIsFilteringEnded] = useState(false);

  // Feedback filters for ended sessions
  const [hasFeedbackFilter, setHasFeedbackFilter] = useState(false);
  const [lowExperienceFilter, setLowExperienceFilter] = useState(false);

  // Venue comments drawer state
  const [venueCommentsOpen, setVenueCommentsOpen] = useState(false);

  // Sync local state when initialSessions prop changes
  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  // Sync ended sessions when initial data changes
  useEffect(() => {
    setEndedSessions(initialEndedSessions);
    setEndedCursor(initialEndedCursor);
  }, [initialEndedSessions, initialEndedCursor]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  const { dedupedSessions, hasDuplicateTables } = useMemo(() => {
    const grouped = new Map<string, SessionWithDetails[]>();

    sessions.forEach((session) => {
      const existing = grouped.get(session.table_id) ?? [];
      grouped.set(session.table_id, [...existing, session]);
    });

    const winners: SessionWithDetails[] = [];
    let duplicatesDetected = false;

    grouped.forEach((sessionList) => {
      if (sessionList.length > 1) {
        duplicatesDetected = true;
      }

      const [winner] = [...sessionList].sort(prioritizeSessions);
      if (winner) {
        winners.push(winner);
      }
    });

    return { dedupedSessions: winners, hasDuplicateTables: duplicatesDetected };
  }, [sessions]);

  // Count browsing vs playing sessions
  const browsingSessions = useMemo(
    () => dedupedSessions.filter((s) => s.game_id === null),
    [dedupedSessions]
  );

  const playingSessions = useMemo(
    () => dedupedSessions.filter((s) => s.game_id !== null),
    [dedupedSessions]
  );

  // Filter sessions based on mode and search
  const filteredSessions = useMemo(() => {
    let result = dedupedSessions;

    // Apply filter mode
    if (filterMode === "browsing") {
      result = result.filter((s) => s.game_id === null);
    } else if (filterMode === "playing") {
      result = result.filter((s) => s.game_id !== null);
    }

    // Apply search term (table name or game title)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((s) => {
        const tableMatch = s.venue_tables?.label?.toLowerCase().includes(term);
        const gameMatch = s.games?.title?.toLowerCase().includes(term);
        return tableMatch || gameMatch;
      });
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      if (sortMode === "longest") {
        // Longest first (oldest created_at first)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        // Newest first (most recent created_at first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [dedupedSessions, filterMode, searchTerm, sortMode]);

  // Count stale browsing sessions for badge
  const staleBrowsingCount = useMemo(
    () => browsingSessions.filter(isSessionStale).length,
    [browsingSessions]
  );

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

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

  const handleAssignGame = async (gameId: string) => {
    if (!assignModalSession || isAssigning) return;

    setIsAssigning(true);

    try {
      const result = await assignGameToSessionAction(assignModalSession.id, gameId);

      if (result.ok) {
        const selectedGame = availableGames.find((g) => g.id === gameId);
        push({
          title: "Game assigned",
          description: `${selectedGame?.title ?? "Game"} assigned to ${assignModalSession.venue_tables?.label ?? "table"}`,
          tone: "success",
        });
        setAssignModalSession(null);
        router.refresh();
      } else {
        push({
          title: "Failed to assign game",
          description: result.error ?? "Something went wrong",
          tone: "danger",
        });
      }
    } catch (error) {
      console.error("Error assigning game:", error);
      push({
        title: "Failed to assign game",
        description: "Something went wrong. Please try again.",
        tone: "danger",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // =============================================================================
  // ENDED SESSIONS HANDLERS
  // =============================================================================

  // Fetch ended sessions with current filters (used for filter changes)
  const fetchEndedSessions = useCallback(async (
    rangePreset: DateRangePreset,
    search: string,
    append: boolean = false,
    cursor?: { endedAt: string; id: string }
  ) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsFilteringEnded(true);
    }

    try {
      const result = await listEndedSessionsAction({
        venueId,
        rangePreset,
        search: search.trim() || undefined,
        beforeCursor: cursor,
        limit: 50,
      });

      if (result.ok) {
        if (append) {
          // Append to existing list, avoiding duplicates
          setEndedSessions((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const newSessions = result.sessions.filter((s) => !existingIds.has(s.id));
            return [...prev, ...newSessions];
          });
        } else {
          setEndedSessions(result.sessions);
        }
        setEndedCursor(result.nextCursor);
      } else {
        push({
          title: "Failed to load sessions",
          description: result.error ?? "Something went wrong",
          tone: "danger",
        });
      }
    } catch (error) {
      console.error("Error fetching ended sessions:", error);
      push({
        title: "Failed to load sessions",
        description: "Something went wrong. Please try again.",
        tone: "danger",
      });
    } finally {
      setIsLoadingMore(false);
      setIsFilteringEnded(false);
    }
  }, [venueId, push]);

  // Handle range preset change
  const handleRangePresetChange = useCallback((preset: DateRangePreset) => {
    setEndedRangePreset(preset);
    setEndedCursor(null);
    fetchEndedSessions(preset, endedSearchTerm);
  }, [endedSearchTerm, fetchEndedSessions]);

  // Handle search change (debounced effect)
  useEffect(() => {
    // Skip on initial mount or when search is cleared
    const timer = setTimeout(() => {
      // Only fetch if search has actually been used (not initial state)
      if (endedSearchTerm !== "" || endedSessions.length > 0) {
        setEndedCursor(null);
        fetchEndedSessions(endedRangePreset, endedSearchTerm);
      }
    }, 300);

    return () => clearTimeout(timer);
    // Only re-run when endedSearchTerm changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endedSearchTerm]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (endedCursor && !isLoadingMore) {
      fetchEndedSessions(endedRangePreset, endedSearchTerm, true, endedCursor);
    }
  }, [endedCursor, isLoadingMore, endedRangePreset, endedSearchTerm, fetchEndedSessions]);

  // Filter ended sessions by search term and feedback filters (client-side for already-loaded data)
  const filteredEndedSessions = useMemo(() => {
    let result = endedSessions;

    // Apply "Has feedback" filter
    if (hasFeedbackFilter) {
      result = result.filter((s) => s.feedback_submitted_at !== null);
    }

    // Apply "Low experience" filter (venue rating <=2)
    if (lowExperienceFilter) {
      result = result.filter((s) => {
        const rating = s.feedback_venue_rating;
        return rating !== null && rating <= 2;
      });
    }

    // Apply search term
    if (endedSearchTerm.trim()) {
      const term = endedSearchTerm.toLowerCase().trim();
      result = result.filter((s) => {
        const tableMatch = s.venue_tables?.label?.toLowerCase().includes(term);
        const gameMatch = s.games?.title?.toLowerCase().includes(term);
        return tableMatch || gameMatch;
      });
    }

    return result;
  }, [endedSessions, endedSearchTerm, hasFeedbackFilter, lowExperienceFilter]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <>
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">
            Sessions
          </p>
          <h1 className="text-3xl">Live tables</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh sessions"
        >
          <RefreshCcw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span className="ml-1">Refresh</span>
        </Button>
      </div>

      {/* Triage Controls */}
      <Card className="panel-surface">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter tabs */}
            <div className="flex items-center rounded-lg border border-structure bg-elevated p-1">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filterMode === "all"
                    ? "bg-surface shadow-card text-ink-primary"
                    : "text-ink-secondary hover:text-ink-primary"
                }`}
                aria-pressed={filterMode === "all"}
              >
                All
                <span className="ml-1.5 text-xs opacity-70">
                  ({dedupedSessions.length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("browsing")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filterMode === "browsing"
                    ? "bg-surface shadow-card text-ink-primary"
                    : "text-ink-secondary hover:text-ink-primary"
                }`}
                aria-pressed={filterMode === "browsing"}
              >
                Browsing
                <span className="ml-1.5 text-xs opacity-70">
                  ({browsingSessions.length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("playing")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filterMode === "playing"
                    ? "bg-surface shadow-card text-ink-primary"
                    : "text-ink-secondary hover:text-ink-primary"
                }`}
                aria-pressed={filterMode === "playing"}
              >
                Playing
                <span className="ml-1.5 text-xs opacity-70">
                  ({playingSessions.length})
                </span>
              </button>
            </div>

            {/* Sort dropdown */}
            <div className="flex items-center gap-2">
              <ArrowDownWideNarrow className="h-4 w-4 text-ink-secondary" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="rounded-lg border border-structure bg-elevated px-3 py-1.5 text-sm font-medium shadow-card focus:outline-none"
                aria-label="Sort sessions"
              >
                <option value="longest">Longest first</option>
                <option value="newest">Newest first</option>
              </select>
            </div>

            {/* Search input */}
            <div className="flex-1 min-w-[200px] relative">
              <Input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by table or game..."
                className="pl-9 h-9"
                aria-label="Search sessions"
              />
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-ink-secondary" />
            </div>

            {/* Stale warning badge */}
            {staleBrowsingCount > 0 && (
              <TokenChip tone="warn">
                <AlertTriangle className="h-3 w-3" />
                {staleBrowsingCount} stale
              </TokenChip>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {/* Live Sessions Card */}
        <Card className="panel-surface">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Live sessions</CardTitle>
            <div className="flex gap-2">
              {hasDuplicateTables && (
                <TokenChip tone="warn">Duplicate sessions detected</TokenChip>
              )}
              {browsingSessions.length > 0 && (
                <TokenChip tone="warn">
                  {browsingSessions.length} browsing
                </TokenChip>
              )}
              {playingSessions.length > 0 && (
                <TokenChip tone="accent">
                  {playingSessions.length} playing
                </TokenChip>
              )}
              {dedupedSessions.length === 0 && (
                <TokenChip tone="muted">0 in progress</TokenChip>
              )}
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-[color:var(--color-structure)]">
            {filteredSessions.map((session) => {
              const isBrowsing = session.game_id === null;
              const isEnding = endingSessionId === session.id;
              const stale = isSessionStale(session);
              const long = isSessionLong(session);

              return (
                <div
                  key={session.id}
                  className="py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    {isBrowsing ? (
                      // Browsing state - no game selected yet
                      <div className="flex items-center gap-2 flex-wrap">
                        <Search className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <p className="font-semibold text-blue-700 dark:text-blue-400">
                          Browsing...
                        </p>
                        {stale && (
                          <TokenChip tone="warn">
                            <AlertTriangle className="h-3 w-3" />
                            Stale
                          </TokenChip>
                        )}
                      </div>
                    ) : (
                      // Playing state - game selected
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-green-700 dark:text-green-400">
                          {session.games?.title ?? "Unknown Game"}
                        </p>
                        {long && (
                          <TokenChip tone="muted">
                            <Clock3 className="h-3 w-3" />
                            Long session
                          </TokenChip>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-[color:var(--color-ink-secondary)] flex items-center gap-2 mt-1">
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
                    {isBrowsing && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setAssignModalSession(session)}
                        aria-label={`Assign game to ${session.venue_tables?.label ?? "table"}`}
                      >
                        <Gamepad2 className="h-4 w-4" />
                        <span className="ml-1">Assign game</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => endSession(session)}
                      disabled={isEnding}
                      aria-label={`End session at ${session.venue_tables?.label ?? "table"}`}
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
            {filteredSessions.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-secondary">
                {dedupedSessions.length === 0
                  ? "No active sessions"
                  : "No sessions match your filters"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Venue Pulse Summary */}
        {venuePulse.responseCount > 0 && (
          <Card className="panel-surface">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    <span className="text-sm font-medium text-[color:var(--color-ink-primary)]">
                      Venue pulse
                    </span>
                  </div>
                  <div className="h-4 w-px bg-[color:var(--color-structure)]" />
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-semibold text-[color:var(--color-ink-primary)]">
                      {venuePulse.avgRating !== null ? venuePulse.avgRating.toFixed(1) : '—'}
                    </span>
                    <span className="text-xs text-[color:var(--color-ink-secondary)]">
                      ({venuePulse.responseCount} ratings, 7d)
                    </span>
                  </div>
                  {venuePulse.negativeCount > 0 && (
                    <>
                      <div className="h-4 w-px bg-[color:var(--color-structure)]" />
                      <TokenChip tone="warn">
                        <ThumbsDown className="h-3 w-3" />
                        {venuePulse.negativeCount} low
                      </TokenChip>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {venuePulse.commentCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVenueCommentsOpen(true)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {venuePulse.commentCount} comments
                    </Button>
                  )}
                  <Link
                    href="/admin/feedback?range=7d"
                    className="text-sm text-[color:var(--color-accent)] hover:underline flex items-center gap-1"
                  >
                    View all
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Sessions Card (Historical / Ended) */}
        <Card className="panel-surface">
          <CardHeader className="flex flex-row items-center justify-between">
            <button
              type="button"
              onClick={() => setIsRecentExpanded(!isRecentExpanded)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              aria-expanded={isRecentExpanded}
            >
              <Clock className="h-5 w-5 text-ink-secondary" />
              <CardTitle>Recent sessions</CardTitle>
              {isRecentExpanded ? (
                <ChevronUp className="h-4 w-4 text-ink-secondary" />
              ) : (
                <ChevronDown className="h-4 w-4 text-ink-secondary" />
              )}
            </button>
            {!isRecentExpanded && (
              <TokenChip tone="muted">
                {filteredEndedSessions.length} ended
              </TokenChip>
            )}
          </CardHeader>

          {isRecentExpanded && (
            <CardContent>
              {/* Filters row */}
              <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-structure">
                {/* Time range tabs */}
                <div className="flex items-center rounded-lg border border-structure bg-elevated p-1">
                  <button
                    type="button"
                    onClick={() => handleRangePresetChange("today")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      endedRangePreset === "today"
                        ? "bg-surface shadow-card text-ink-primary"
                        : "text-ink-secondary hover:text-ink-primary"
                    }`}
                    aria-pressed={endedRangePreset === "today"}
                    disabled={isFilteringEnded}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRangePresetChange("7d")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      endedRangePreset === "7d"
                        ? "bg-surface shadow-card text-ink-primary"
                        : "text-ink-secondary hover:text-ink-primary"
                    }`}
                    aria-pressed={endedRangePreset === "7d"}
                    disabled={isFilteringEnded}
                  >
                    Last 7 days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRangePresetChange("30d")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      endedRangePreset === "30d"
                        ? "bg-surface shadow-card text-ink-primary"
                        : "text-ink-secondary hover:text-ink-primary"
                    }`}
                    aria-pressed={endedRangePreset === "30d"}
                    disabled={isFilteringEnded}
                  >
                    Last 30 days
                  </button>
                </div>

                {/* Search input */}
                <div className="flex-1 min-w-[180px] relative">
                  <Input
                    type="search"
                    value={endedSearchTerm}
                    onChange={(e) => setEndedSearchTerm(e.target.value)}
                    placeholder="Search table or game..."
                    className="pl-9 h-8 text-sm"
                    aria-label="Search recent sessions"
                  />
                  <Search className="h-4 w-4 absolute left-3 top-2 text-ink-secondary" />
                </div>

                {/* Feedback filter toggles */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHasFeedbackFilter(!hasFeedbackFilter)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                      hasFeedbackFilter
                        ? "bg-[color:var(--color-accent-soft)] border-[color:var(--color-accent)] text-[color:var(--color-accent)]"
                        : "border-structure text-ink-secondary hover:text-ink-primary"
                    }`}
                    aria-pressed={hasFeedbackFilter}
                  >
                    Has feedback
                  </button>
                  <button
                    type="button"
                    onClick={() => setLowExperienceFilter(!lowExperienceFilter)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                      lowExperienceFilter
                        ? "bg-red-100 dark:bg-red-900/20 border-red-400 dark:border-red-600 text-red-700 dark:text-red-400"
                        : "border-structure text-ink-secondary hover:text-ink-primary"
                    }`}
                    aria-pressed={lowExperienceFilter}
                  >
                    Low experience
                  </button>
                </div>

                {/* Loading indicator */}
                {isFilteringEnded && (
                  <Loader2 className="h-4 w-4 animate-spin text-ink-secondary" />
                )}
              </div>

              {/* Sessions list - compact ledger style */}
              {filteredEndedSessions.length > 0 ? (
                <div className="space-y-0">
                  {/* Header row */}
                  <div className="hidden sm:grid grid-cols-[1fr_100px_1fr_60px_80px] gap-2 px-2 py-1.5 text-xs font-medium text-ink-secondary uppercase tracking-wide border-b border-structure">
                    <span>Ended</span>
                    <span>Table</span>
                    <span>Game</span>
                    <span>Rating</span>
                    <span className="text-right">Duration</span>
                  </div>

                  {/* Data rows */}
                  {filteredEndedSessions.map((session) => {
                    const hasFeedback = session.feedback_submitted_at !== null;
                    const gameRating = session.feedback_rating;
                    const venueRating = session.feedback_venue_rating;
                    const hasComment = session.feedback_comment !== null;

                    return (
                      <div
                        key={session.id}
                        className="grid grid-cols-1 sm:grid-cols-[1fr_100px_1fr_60px_80px] gap-1 sm:gap-2 px-2 py-2 text-sm border-b border-structure/50 hover:bg-elevated/50 transition-colors"
                      >
                        {/* Ended timestamp */}
                        <span className="text-ink-secondary text-xs sm:text-sm">
                          <span className="sm:hidden font-medium text-ink-primary">Ended: </span>
                          {session.ended_at
                            ? formatEndedTimestamp(session.ended_at)
                            : "—"}
                        </span>

                        {/* Table */}
                        <span className="font-mono text-xs sm:text-sm">
                          <span className="sm:hidden font-medium text-ink-primary font-sans">Table: </span>
                          {session.venue_tables?.label ?? "—"}
                        </span>

                        {/* Game */}
                        <span className={`text-xs sm:text-sm truncate ${session.game_id ? "" : "text-ink-secondary italic"}`}>
                          <span className="sm:hidden font-medium text-ink-primary">Game: </span>
                          {session.games?.title ?? "No game selected"}
                        </span>

                        {/* Rating markers */}
                        <span className="flex items-center gap-1">
                          {hasFeedback ? (
                            <>
                              {gameRating !== null && (
                                <span
                                  className={`inline-flex items-center gap-0.5 text-xs ${
                                    gameRating >= 4
                                      ? "text-green-600"
                                      : gameRating <= 2
                                      ? "text-red-600"
                                      : "text-yellow-600"
                                  }`}
                                  title={`Game: ${gameRating}/5`}
                                >
                                  <Star className="h-3 w-3" />
                                  {gameRating}
                                </span>
                              )}
                              {venueRating !== null && (
                                <span
                                  className={`inline-flex items-center gap-0.5 text-xs ${
                                    venueRating >= 4
                                      ? "text-green-600"
                                      : venueRating <= 2
                                      ? "text-red-600"
                                      : "text-yellow-600"
                                  }`}
                                  title={`Venue: ${venueRating}/5`}
                                >
                                  <Heart className="h-3 w-3" />
                                  {venueRating}
                                </span>
                              )}
                              {hasComment && (
                                <MessageSquare
                                  className="h-3 w-3 text-ink-secondary"
                                  title="Has comment"
                                />
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-ink-secondary">—</span>
                          )}
                        </span>

                        {/* Duration */}
                        <span className="text-xs sm:text-sm text-right tabular-nums">
                          <span className="sm:hidden font-medium text-ink-primary">Duration: </span>
                          {session.ended_at
                            ? formatSessionDuration(
                                session.started_at,
                                session.created_at,
                                session.ended_at
                              )
                            : "—"}
                        </span>
                      </div>
                    );
                  })}

                  {/* Load more button */}
                  {endedCursor && (
                    <div className="pt-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            Loading...
                          </>
                        ) : (
                          "Load more"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-ink-secondary">
                  {isFilteringEnded
                    ? "Loading..."
                    : endedSearchTerm.trim()
                    ? "No sessions match your search"
                    : "No sessions yet. Ended sessions will appear here."}
                </p>
              )}
            </CardContent>
          )}
        </Card>
      </div>

      {/* Assign Game Modal */}
      <AssignGameModal
        isOpen={assignModalSession !== null}
        onClose={() => setAssignModalSession(null)}
        onAssign={handleAssignGame}
        games={availableGames}
        tableLabel={assignModalSession?.venue_tables?.label ?? "Table"}
        isAssigning={isAssigning}
      />

      {/* Venue Comments Drawer */}
      <VenueCommentsDrawer
        venueId={venueId}
        isOpen={venueCommentsOpen}
        onClose={() => setVenueCommentsOpen(false)}
      />
    </>
  );
}
