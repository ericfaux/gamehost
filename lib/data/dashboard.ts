/**
 * Live Ops HUD Data Layer
 *
 * Provides all data needed for the admin dashboard in a single call.
 * Aggregates pulse metrics, alerts, activity, and bottleneck information.
 */

import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type { Game, Session, VenueTable } from '@/lib/db/types';
import {
  getActiveSessionsForVenue,
  getCopiesInUseByGame,
  getVenueExperienceSummary,
} from './sessions';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_BROWSING_THRESHOLD_MINUTES = 15;
const STALE_BROWSING_SEVERITY_THRESHOLD_MINUTES = 20;
const LARGE_TABLE_CAPACITY_THRESHOLD = 4;

// =============================================================================
// Types
// =============================================================================

export type AlertType =
  | 'table_browsing_stale'
  | 'game_bottlenecked'
  | 'game_problematic'
  | 'game_out_for_repair'
  | 'feedback_negative_game'
  | 'feedback_negative_venue';

export type AlertSeverity = 'low' | 'medium' | 'high';

export type ChipTone = 'default' | 'warn' | 'danger' | 'accent';

export interface AlertContextChip {
  label: string;
  tone: ChipTone;
}

export interface AlertAction {
  label: string;
  type: 'modal' | 'link';
  target: string;
  params?: Record<string, unknown>;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  contextChips: AlertContextChip[];
  details?: string;
  primaryAction: AlertAction;
  secondaryAction?: { label: string; type: 'link'; target: string };
  timestamp: string;
}

export interface RecentEndedSession {
  id: string;
  tableLabel: string;
  gameTitle: string | null;
  endedAt: string;
  durationMinutes: number;
  feedbackRating: number | null;
}

export interface RecentFeedback {
  id: string;
  tableLabel: string;
  gameTitle: string | null;
  gameRating: number | null;
  venueRating: number | null;
  comment: string | null;
  submittedAt: string;
}

export interface BottleneckedGame {
  gameId: string;
  title: string;
  copiesInRotation: number;
  copiesInUse: number;
  waitingTables: string[];
}

export interface OpsHudData {
  pulse: {
    activeTables: number;
    waitingTables: number;
    openIssues: number;
    venuePulse: {
      avg: number | null;
      count: number;
    };
  };
  alerts: Alert[];
  activity: {
    recentEnded: RecentEndedSession[];
    recentFeedback: RecentFeedback[];
  };
  bottleneckedGames: BottleneckedGame[];
  meta: {
    generatedAt: string;
    thresholds: {
      browsingMinutes: number;
    };
  };
}

// =============================================================================
// Internal Types
// =============================================================================

/** Raw session type from Supabase - relations are arrays */
interface RawSessionWithRelations extends Session {
  games?: { title: string }[] | null;
  venue_tables?: { label: string; capacity: number | null }[] | null;
}

/** Cleaned session type - relations are single objects */
interface SessionWithRelations extends Session {
  games?: { title: string } | null;
  venue_tables?: { label: string; capacity: number | null } | null;
}

/** Transform raw Supabase session response to clean type */
function transformSessionRelations(raw: RawSessionWithRelations): SessionWithRelations {
  return {
    ...raw,
    games: raw.games?.[0] ?? null,
    venue_tables: raw.venue_tables?.[0] ?? null,
  };
}

/** Raw type from Supabase - relations are arrays */
interface RawNegativeFeedbackRow {
  id: string;
  game_id: string | null;
  feedback_rating: number | null;
  feedback_venue_rating: number | null;
  feedback_venue_comment: string | null;
  feedback_submitted_at: string;
  games: { title: string }[] | null;
  venue_tables: { label: string }[] | null;
}

/** Cleaned type for application use - relations are single objects */
interface NegativeFeedbackRow {
  id: string;
  game_id: string | null;
  feedback_rating: number | null;
  feedback_venue_rating: number | null;
  feedback_venue_comment: string | null;
  feedback_submitted_at: string;
  games: { title: string } | null;
  venue_tables: { label: string } | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

function minutesAgo(minutes: number): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - minutes);
  return date.toISOString();
}

function hoursAgo(hours: number): string {
  return minutesAgo(hours * 60);
}

function getMinutesSince(isoString: string): number {
  const then = new Date(isoString).getTime();
  const now = Date.now();
  return Math.round((now - then) / (1000 * 60));
}

function calculateSeverity(base: AlertSeverity, modifiers: number): AlertSeverity {
  const levels: AlertSeverity[] = ['low', 'medium', 'high'];
  const baseIndex = levels.indexOf(base);
  const newIndex = Math.min(baseIndex + modifiers, levels.length - 1);
  return levels[newIndex];
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// =============================================================================
// Alert Generators
// =============================================================================

function generateBrowsingStaleAlerts(
  activeSessions: SessionWithRelations[],
  thresholdMinutes: number
): Alert[] {
  const alerts: Alert[] = [];
  const cutoffTime = minutesAgo(thresholdMinutes);
  const seenTables = new Set<string>();

  for (const session of activeSessions) {
    // Only browsing sessions (no game selected)
    if (session.game_id !== null) continue;
    // Only sessions older than threshold
    if (session.started_at >= cutoffTime) continue;
    // Dedupe by table
    if (seenTables.has(session.table_id)) continue;
    seenTables.add(session.table_id);

    const tableLabel = session.venue_tables?.label ?? 'Unknown Table';
    const tableCapacity = session.venue_tables?.capacity ?? 0;
    const minutesBrowsing = getMinutesSince(session.started_at);

    // Severity modifiers
    let modifiers = 0;
    if (minutesBrowsing > STALE_BROWSING_SEVERITY_THRESHOLD_MINUTES) modifiers++;
    if (tableCapacity > LARGE_TABLE_CAPACITY_THRESHOLD) modifiers++;

    const severity = calculateSeverity('medium', modifiers);
    const chips: AlertContextChip[] = [
      { label: formatDuration(minutesBrowsing), tone: minutesBrowsing > 20 ? 'danger' : 'warn' },
    ];
    if (tableCapacity > 0) {
      chips.push({ label: `${tableCapacity} seats`, tone: 'default' });
    }

    alerts.push({
      id: `table_browsing:${session.id}`,
      type: 'table_browsing_stale',
      severity,
      title: `Table ${tableLabel} browsing for ${minutesBrowsing} min`,
      contextChips: chips,
      details: 'Guest may need help finding a game',
      primaryAction: {
        label: 'View Table',
        type: 'modal',
        target: 'table-detail',
        params: { tableId: session.table_id, sessionId: session.id },
      },
      secondaryAction: {
        label: 'Go to Sessions',
        type: 'link',
        target: '/admin/sessions',
      },
      timestamp: session.started_at,
    });
  }

  return alerts;
}

function generateGameBottleneckAlerts(
  games: Game[],
  copiesInUse: Record<string, number>,
  topGameIds: Set<string>,
  activeSessions: SessionWithRelations[]
): Alert[] {
  const alerts: Alert[] = [];
  const seenGames = new Set<string>();

  // Build map of tables waiting for each game (browsing sessions)
  const waitingTablesMap = new Map<string, string[]>();
  for (const session of activeSessions) {
    if (session.game_id === null) {
      // We can't know which game they're waiting for from a browsing session
      // This would require additional UX tracking
    }
  }

  for (const game of games) {
    if (game.status !== 'in_rotation') continue;
    const inUse = copiesInUse[game.id] ?? 0;
    if (inUse < game.copies_in_rotation) continue;
    if (seenGames.has(game.id)) continue;
    seenGames.add(game.id);

    // Severity modifiers
    let modifiers = 0;
    if (topGameIds.has(game.id)) modifiers++;

    const severity = calculateSeverity('low', modifiers);
    const chips: AlertContextChip[] = [
      { label: `${inUse}/${game.copies_in_rotation} in use`, tone: 'warn' },
    ];
    if (topGameIds.has(game.id)) {
      chips.push({ label: 'Popular', tone: 'accent' });
    }

    alerts.push({
      id: `game_bottlenecked:${game.id}`,
      type: 'game_bottlenecked',
      severity,
      title: `${game.title} is fully checked out`,
      contextChips: chips,
      details: 'All copies are currently in use',
      primaryAction: {
        label: 'View Game',
        type: 'modal',
        target: 'game-detail',
        params: { gameId: game.id },
      },
      secondaryAction: {
        label: 'Go to Library',
        type: 'link',
        target: '/admin/library',
      },
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

function generateGameMaintenanceAlerts(
  games: Game[],
  copiesInUse: Record<string, number>
): Alert[] {
  const alerts: Alert[] = [];
  const seenGames = new Set<string>();

  for (const game of games) {
    if (seenGames.has(game.id)) continue;

    // Problematic condition
    if (game.condition === 'problematic') {
      seenGames.add(game.id);

      // Check if also bottlenecked for severity boost
      const inUse = copiesInUse[game.id] ?? 0;
      const isBottlenecked = inUse >= game.copies_in_rotation && game.status === 'in_rotation';

      let modifiers = 0;
      if (isBottlenecked) modifiers++;

      const severity = calculateSeverity('medium', modifiers);
      const chips: AlertContextChip[] = [
        { label: 'Problematic', tone: 'danger' },
      ];
      if (isBottlenecked) {
        chips.push({ label: 'Bottlenecked', tone: 'warn' });
      }

      alerts.push({
        id: `game_problematic:${game.id}`,
        type: 'game_problematic',
        severity,
        title: `${game.title} needs attention`,
        contextChips: chips,
        details: 'Game condition marked as problematic',
        primaryAction: {
          label: 'View Game',
          type: 'modal',
          target: 'game-detail',
          params: { gameId: game.id },
        },
        secondaryAction: {
          label: 'Go to Library',
          type: 'link',
          target: '/admin/library',
        },
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    // Out for repair status
    if (game.status === 'out_for_repair') {
      seenGames.add(game.id);

      alerts.push({
        id: `game_out_for_repair:${game.id}`,
        type: 'game_out_for_repair',
        severity: 'low',
        title: `${game.title} is out for repair`,
        contextChips: [{ label: 'Out for Repair', tone: 'warn' }],
        details: 'Track repair status and return to rotation when ready',
        primaryAction: {
          label: 'View Game',
          type: 'modal',
          target: 'game-detail',
          params: { gameId: game.id },
        },
        secondaryAction: {
          label: 'Go to Library',
          type: 'link',
          target: '/admin/library',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

function generateFeedbackAlerts(
  negativeFeedback: NegativeFeedbackRow[]
): Alert[] {
  const alerts: Alert[] = [];

  // Aggregate negative game feedback
  const negativeGameFeedback = negativeFeedback.filter(
    (f) => f.feedback_rating !== null && f.feedback_rating < 3
  );

  if (negativeGameFeedback.length > 0) {
    const mostRecent = negativeGameFeedback[0];
    const count = negativeGameFeedback.length;

    alerts.push({
      id: `feedback_negative_game:aggregate`,
      type: 'feedback_negative_game',
      severity: 'low',
      title:
        count === 1
          ? `Negative game rating: ${mostRecent.games?.title ?? 'Unknown'}`
          : `${count} negative game ratings in 24h`,
      contextChips: [
        { label: `${count} rating${count > 1 ? 's' : ''}`, tone: 'warn' },
      ],
      details:
        count === 1
          ? `Rating: ${mostRecent.feedback_rating}/5`
          : 'Review recent game feedback',
      primaryAction: {
        label: 'View Feedback',
        type: 'link',
        target: '/admin/sessions?filter=negative_game',
      },
      timestamp: mostRecent.feedback_submitted_at,
    });
  }

  // Aggregate negative venue feedback
  const negativeVenueFeedback = negativeFeedback.filter(
    (f) => f.feedback_venue_rating !== null && f.feedback_venue_rating < 3
  );

  if (negativeVenueFeedback.length > 0) {
    const mostRecent = negativeVenueFeedback[0];
    const count = negativeVenueFeedback.length;
    const hasComments = negativeVenueFeedback.some((f) => f.feedback_venue_comment);

    // Severity modifiers
    let modifiers = 0;
    if (hasComments) modifiers++;

    const severity = calculateSeverity('medium', modifiers);
    const chips: AlertContextChip[] = [
      { label: `${count} rating${count > 1 ? 's' : ''}`, tone: 'danger' },
    ];
    if (hasComments) {
      chips.push({ label: 'Has comments', tone: 'accent' });
    }

    alerts.push({
      id: `feedback_negative_venue:aggregate`,
      type: 'feedback_negative_venue',
      severity,
      title:
        count === 1
          ? `Negative venue rating (${mostRecent.feedback_venue_rating}/5)`
          : `${count} negative venue ratings in 24h`,
      contextChips: chips,
      details: hasComments
        ? 'Review comments for actionable feedback'
        : 'Consider following up with recent guests',
      primaryAction: {
        label: 'View Feedback',
        type: 'link',
        target: '/admin/sessions?filter=negative_venue',
      },
      timestamp: mostRecent.feedback_submitted_at,
    });
  }

  return alerts;
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Fetches all data needed for the Live Ops HUD in a single call.
 *
 * @param venueId - The venue ID to fetch data for
 * @returns OpsHudData containing pulse metrics, alerts, activity, and bottleneck info
 */
export async function getOpsHud(venueId: string): Promise<OpsHudData> {
  const supabase = getSupabaseAdmin();
  const twentyFourHoursAgo = hoursAgo(24);
  const sevenDaysAgo = hoursAgo(24 * 7);
  const browsingThreshold = DEFAULT_BROWSING_THRESHOLD_MINUTES;

  // ---------------------------------------------------------------------------
  // Parallel Data Fetching
  // ---------------------------------------------------------------------------
  const [
    activeSessions,
    copiesInUse,
    venuePulseSummary,
    allGames,
    recentEndedData,
    recentFeedbackData,
    negativeFeedback24h,
    topGamesThisWeek,
  ] = await Promise.all([
    // Active sessions with relations - transform array relations to single objects
    getActiveSessionsForVenue(venueId).then((sessions) =>
      (sessions as unknown as RawSessionWithRelations[]).map(transformSessionRelations)
    ),

    // Copies in use by game
    getCopiesInUseByGame(venueId),

    // Venue pulse (24h)
    getVenueExperienceSummary(venueId, 1),

    // All games for the venue
    supabase
      .from('games')
      .select('*')
      .eq('venue_id', venueId)
      .then(({ data }) => (data ?? []) as Game[]),

    // Recent ended sessions (last 5)
    supabase
      .from('sessions')
      .select('id, started_at, ended_at, feedback_rating, game_id, games(title), venue_tables(label)')
      .eq('venue_id', venueId)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(5)
      .then(({ data }) => data ?? []),

    // Recent feedback (last 5)
    supabase
      .from('sessions')
      .select(
        'id, feedback_rating, feedback_venue_rating, feedback_comment, feedback_venue_comment, feedback_submitted_at, game_id, games(title), venue_tables(label)'
      )
      .eq('venue_id', venueId)
      .not('feedback_submitted_at', 'is', null)
      .order('feedback_submitted_at', { ascending: false })
      .limit(5)
      .then(({ data }) => data ?? []),

    // Negative feedback in last 24h
    supabase
      .from('sessions')
      .select(
        'id, game_id, feedback_rating, feedback_venue_rating, feedback_venue_comment, feedback_submitted_at, games(title), venue_tables(label)'
      )
      .eq('venue_id', venueId)
      .not('feedback_submitted_at', 'is', null)
      .gte('feedback_submitted_at', twentyFourHoursAgo)
      .or('feedback_rating.lt.3,feedback_venue_rating.lt.3')
      .order('feedback_submitted_at', { ascending: false })
      .then(({ data }) => {
        // Transform raw Supabase response (arrays) to clean type (single objects)
        return ((data ?? []) as RawNegativeFeedbackRow[]).map((row) => ({
          ...row,
          games: row.games?.[0] ?? null,
          venue_tables: row.venue_tables?.[0] ?? null,
        })) as NegativeFeedbackRow[];
      }),

    // Top 5 games this week (for severity boosting)
    supabase
      .from('sessions')
      .select('game_id')
      .eq('venue_id', venueId)
      .not('game_id', 'is', null)
      .gte('started_at', sevenDaysAgo)
      .then(({ data }) => {
        const counts = new Map<string, number>();
        for (const row of data ?? []) {
          const gameId = row.game_id as string;
          counts.set(gameId, (counts.get(gameId) ?? 0) + 1);
        }
        const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
        return new Set(sorted.slice(0, 5).map(([id]) => id));
      }),
  ]);

  // ---------------------------------------------------------------------------
  // Pulse Metrics
  // ---------------------------------------------------------------------------
  const browsingCutoff = minutesAgo(browsingThreshold);
  const waitingTables = activeSessions.filter(
    (s) => s.game_id === null && s.started_at < browsingCutoff
  ).length;

  const openIssues = allGames.filter(
    (g) => g.condition === 'problematic' || g.status === 'out_for_repair'
  ).length;

  const pulse = {
    activeTables: activeSessions.length,
    waitingTables,
    openIssues,
    venuePulse: {
      avg: venuePulseSummary.avgRating,
      count: venuePulseSummary.responseCount,
    },
  };

  // ---------------------------------------------------------------------------
  // Alerts
  // ---------------------------------------------------------------------------
  const browsingAlerts = generateBrowsingStaleAlerts(
    activeSessions,
    browsingThreshold
  );

  const bottleneckAlerts = generateGameBottleneckAlerts(
    allGames,
    copiesInUse,
    topGamesThisWeek,
    activeSessions
  );

  const maintenanceAlerts = generateGameMaintenanceAlerts(allGames, copiesInUse);

  const feedbackAlerts = generateFeedbackAlerts(negativeFeedback24h);

  // Combine and sort by severity (high first)
  const severityOrder: Record<AlertSeverity, number> = { high: 0, medium: 1, low: 2 };
  const allAlerts = [
    ...browsingAlerts,
    ...bottleneckAlerts,
    ...maintenanceAlerts,
    ...feedbackAlerts,
  ].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // ---------------------------------------------------------------------------
  // Activity
  // ---------------------------------------------------------------------------
  const recentEnded: RecentEndedSession[] = recentEndedData.map((row) => {
    const startedAt = new Date(row.started_at).getTime();
    const endedAt = new Date(row.ended_at).getTime();
    const durationMinutes = Math.round((endedAt - startedAt) / (1000 * 60));

    // Supabase relations return as arrays - access first element
    const venueTables = row.venue_tables as { label: string }[] | null;
    const games = row.games as { title: string }[] | null;

    return {
      id: row.id,
      tableLabel: venueTables?.[0]?.label ?? 'Unknown',
      gameTitle: games?.[0]?.title ?? null,
      endedAt: row.ended_at,
      durationMinutes,
      feedbackRating: row.feedback_rating,
    };
  });

  const recentFeedback: RecentFeedback[] = recentFeedbackData.map((row) => {
    // Supabase relations return as arrays - access first element
    const venueTables = row.venue_tables as { label: string }[] | null;
    const games = row.games as { title: string }[] | null;

    return {
      id: row.id,
      tableLabel: venueTables?.[0]?.label ?? 'Unknown',
      gameTitle: games?.[0]?.title ?? null,
      gameRating: row.feedback_rating,
      venueRating: row.feedback_venue_rating,
      comment: row.feedback_comment || row.feedback_venue_comment || null,
      submittedAt: row.feedback_submitted_at!,
    };
  });

  // ---------------------------------------------------------------------------
  // Bottlenecked Games
  // ---------------------------------------------------------------------------
  const bottleneckedGames: BottleneckedGame[] = allGames
    .filter((g) => {
      if (g.status !== 'in_rotation') return false;
      const inUse = copiesInUse[g.id] ?? 0;
      return inUse >= g.copies_in_rotation;
    })
    .map((g) => ({
      gameId: g.id,
      title: g.title,
      copiesInRotation: g.copies_in_rotation,
      copiesInUse: copiesInUse[g.id] ?? 0,
      waitingTables: [], // Would require additional tracking
    }));

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    pulse,
    alerts: allAlerts,
    activity: {
      recentEnded,
      recentFeedback,
    },
    bottleneckedGames,
    meta: {
      generatedAt: new Date().toISOString(),
      thresholds: {
        browsingMinutes: browsingThreshold,
      },
    },
  };
}
