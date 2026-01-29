/**
 * Live Ops HUD Data Layer
 *
 * Provides all data needed for the admin dashboard in a single call.
 * Aggregates pulse metrics, alerts, activity, and bottleneck information.
 */

import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type { Game, Session } from '@/lib/db/types';
import {
  getActiveSessionsForVenue,
  getCopiesInUseByGame,
  getVenueExperienceSummary,
} from './sessions';
import { getTurnoverRisks, type TurnoverRisk } from './bookings';
import { getBggHotGames } from '@/lib/bgg';
import { normalizeTitle } from '@/lib/utils/strings';

// =============================================================================
// COLUMN SELECTIONS - Explicit column lists for query optimization
// =============================================================================

/**
 * All columns for the Game type.
 * Used when returning full Game objects.
 */
const GAME_COLUMNS = `
  id, venue_id, bgg_id, title, min_players, max_players,
  min_time_minutes, max_time_minutes, complexity, vibes,
  status, condition, shelf_location, pitch, setup_steps,
  rules_bullets, cover_image_url, bgg_rank, bgg_rating,
  copies_in_rotation, is_staff_pick, created_at
` as const;

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
  | 'feedback_negative_venue'
  | 'turnover_risk';

export type AlertCategory = 'tables' | 'maintenance' | 'experience';

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
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  contextChips: AlertContextChip[];
  details?: string;
  primaryAction: AlertAction;
  secondaryAction?: { label: string; type: 'link'; target: string };
  timestamp: string;
  /** Optional typed data payload for specific alert types */
  data?: TurnoverRiskAlertData;
}

/**
 * Typed data payload for turnover_risk alerts.
 * Contains all information needed to render and handle turnover risk alerts.
 */
export interface TurnoverRiskAlertData {
  table_id: string;
  table_label: string;
  session_id: string;
  booking_id: string;
  guest_name: string;
  booking_start_time: string;
  minutes_until_conflict: number;
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
      category: 'tables',
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

  // Note: Could build a map of tables waiting for each game from browsing sessions,
  // but this would require additional UX tracking to know which game they're waiting for.

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
      category: 'maintenance',
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
        category: 'maintenance',
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
        category: 'maintenance',
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

  // Aggregate negative game feedback (1-5 scale: <= 2 is negative)
  const negativeGameFeedback = negativeFeedback.filter(
    (f) => f.feedback_rating !== null && f.feedback_rating <= 2
  );

  if (negativeGameFeedback.length > 0) {
    const mostRecent = negativeGameFeedback[0];
    const count = negativeGameFeedback.length;

    alerts.push({
      id: `feedback_negative_game:aggregate`,
      type: 'feedback_negative_game',
      category: 'experience',
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

  // Aggregate negative venue feedback (1-5 scale: <= 2 is negative)
  const negativeVenueFeedback = negativeFeedback.filter(
    (f) => f.feedback_venue_rating !== null && f.feedback_venue_rating <= 2
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
      category: 'experience',
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
      .select(GAME_COLUMNS)
      .eq('venue_id', venueId)
      .then(({ data }) => (data ?? []) as Game[]),

    // Recent ended sessions (last 5)
    supabase
      .from('sessions')
      .select('id, started_at, ended_at, feedback_rating, game_id, games!sessions_game_id_fkey(title), venue_tables!sessions_table_id_fkey(label)')
      .eq('venue_id', venueId)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(5)
      .then(({ data }) => data ?? []),

    // Recent feedback (last 5)
    supabase
      .from('sessions')
      .select(
        'id, feedback_rating, feedback_venue_rating, feedback_comment, feedback_venue_comment, feedback_submitted_at, game_id, games!sessions_game_id_fkey(title), venue_tables!sessions_table_id_fkey(label)'
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
        'id, game_id, feedback_rating, feedback_venue_rating, feedback_venue_comment, feedback_submitted_at, games!sessions_game_id_fkey(title), venue_tables!sessions_table_id_fkey(label)'
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

// =============================================================================
// Standalone Alert & Activity Functions
// =============================================================================

/**
 * Converts turnover risks from bookings data to Alert format for the Alert Queue.
 */
function generateTurnoverRiskAlerts(turnoverRisks: TurnoverRisk[]): Alert[] {
  return turnoverRisks.map((risk) => {
    // Format booking time for display
    const bookingTimeParts = risk.booking_start_time.split(':');
    let hours = parseInt(bookingTimeParts[0], 10);
    const minutes = bookingTimeParts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    const formattedTime = `${hours}:${minutes} ${ampm}`;

    const chips: AlertContextChip[] = [
      {
        label: `${risk.minutes_until_conflict} min`,
        tone: risk.severity === 'high' ? 'danger' : risk.severity === 'medium' ? 'warn' : 'default',
      },
    ];
    if (risk.party_size > 0) {
      chips.push({ label: `${risk.party_size} guests`, tone: 'default' });
    }

    return {
      id: risk.id,
      type: 'turnover_risk' as AlertType,
      category: 'tables' as AlertCategory,
      severity: risk.severity,
      title: `Turnover Risk: Table ${risk.table_label}`,
      contextChips: chips,
      details: `${risk.guest_name} booked at ${formattedTime}`,
      primaryAction: {
        label: 'Notify Table',
        type: 'modal',
        target: 'notify-table',
        params: {
          tableId: risk.table_id,
          sessionId: risk.session_id,
          bookingId: risk.booking_id,
          guestName: risk.guest_name,
          bookingTime: formattedTime,
        },
      },
      secondaryAction: {
        label: 'View Booking',
        type: 'link',
        target: `/admin/bookings?booking=${risk.booking_id}`,
      },
      timestamp: new Date().toISOString(),
      data: {
        table_id: risk.table_id,
        table_label: risk.table_label,
        session_id: risk.session_id,
        booking_id: risk.booking_id,
        guest_name: risk.guest_name,
        booking_start_time: risk.booking_start_time,
        minutes_until_conflict: risk.minutes_until_conflict,
      },
    };
  });
}

/**
 * Fetches all alerts for a venue.
 * Generates alerts based on:
 * - Tables browsing > 15 minutes without a game assigned
 * - Games where copies_in_use >= copies_in_rotation
 * - Games with condition = 'problematic' or status = 'out_for_repair'
 * - Negative feedback (rating < 3) in last 24h
 * - Turnover risks (active sessions conflicting with upcoming bookings)
 *
 * @param venueId - The venue ID to fetch alerts for
 * @returns Array of Alert objects sorted by severity (high first)
 */
export async function getAlerts(venueId: string): Promise<Alert[]> {
  const supabase = getSupabaseAdmin();
  const twentyFourHoursAgo = hoursAgo(24);
  const sevenDaysAgo = hoursAgo(24 * 7);
  const browsingThreshold = DEFAULT_BROWSING_THRESHOLD_MINUTES;

  // Parallel data fetching
  const [
    activeSessions,
    copiesInUse,
    allGames,
    negativeFeedback24h,
    topGamesThisWeek,
    turnoverRisks,
  ] = await Promise.all([
    // Active sessions with relations
    getActiveSessionsForVenue(venueId).then((sessions) =>
      (sessions as unknown as RawSessionWithRelations[]).map(transformSessionRelations)
    ),

    // Copies in use by game
    getCopiesInUseByGame(venueId),

    // All games for the venue
    supabase
      .from('games')
      .select(GAME_COLUMNS)
      .eq('venue_id', venueId)
      .then(({ data }) => (data ?? []) as Game[]),

    // Negative feedback in last 24h
    supabase
      .from('sessions')
      .select(
        'id, game_id, feedback_rating, feedback_venue_rating, feedback_venue_comment, feedback_submitted_at, games!sessions_game_id_fkey(title), venue_tables!sessions_table_id_fkey(label)'
      )
      .eq('venue_id', venueId)
      .not('feedback_submitted_at', 'is', null)
      .gte('feedback_submitted_at', twentyFourHoursAgo)
      .or('feedback_rating.lt.3,feedback_venue_rating.lt.3')
      .order('feedback_submitted_at', { ascending: false })
      .then(({ data }) => {
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

    // Turnover risks (sessions that may conflict with upcoming bookings)
    getTurnoverRisks(venueId),
  ]);

  // Generate all alerts
  const browsingAlerts = generateBrowsingStaleAlerts(activeSessions, browsingThreshold);
  const bottleneckAlerts = generateGameBottleneckAlerts(
    allGames,
    copiesInUse,
    topGamesThisWeek,
    activeSessions
  );
  const maintenanceAlerts = generateGameMaintenanceAlerts(allGames, copiesInUse);
  const feedbackAlerts = generateFeedbackAlerts(negativeFeedback24h);
  const turnoverAlerts = generateTurnoverRiskAlerts(turnoverRisks);

  // Combine and sort by severity (high first)
  const severityOrder: Record<AlertSeverity, number> = { high: 0, medium: 1, low: 2 };
  return [
    ...browsingAlerts,
    ...bottleneckAlerts,
    ...maintenanceAlerts,
    ...feedbackAlerts,
    ...turnoverAlerts,
  ].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Fetches games that are at full capacity (all copies in use).
 *
 * @param venueId - The venue ID to fetch bottlenecked games for
 * @returns Array of BottleneckedGame objects
 */
export async function getBottleneckedGames(venueId: string): Promise<BottleneckedGame[]> {
  const supabase = getSupabaseAdmin();

  const [copiesInUse, allGames] = await Promise.all([
    getCopiesInUseByGame(venueId),
    supabase
      .from('games')
      .select(GAME_COLUMNS)
      .eq('venue_id', venueId)
      .then(({ data }) => (data ?? []) as Game[]),
  ]);

  return allGames
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
}

/**
 * Fetches recent activity for a venue.
 *
 * @param venueId - The venue ID to fetch activity for
 * @returns Object with last 5 ended sessions and last 5 feedback items
 */
export async function getRecentActivity(venueId: string): Promise<{
  ended: RecentEndedSession[];
  feedback: RecentFeedback[];
}> {
  const supabase = getSupabaseAdmin();

  const [recentEndedData, recentFeedbackData] = await Promise.all([
    // Recent ended sessions (last 5)
    supabase
      .from('sessions')
      .select('id, started_at, ended_at, feedback_rating, game_id, games!sessions_game_id_fkey(title), venue_tables!sessions_table_id_fkey(label)')
      .eq('venue_id', venueId)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(5)
      .then(({ data }) => data ?? []),

    // Recent feedback (last 5)
    supabase
      .from('sessions')
      .select(
        'id, feedback_rating, feedback_venue_rating, feedback_comment, feedback_venue_comment, feedback_submitted_at, game_id, games!sessions_game_id_fkey(title), venue_tables!sessions_table_id_fkey(label)'
      )
      .eq('venue_id', venueId)
      .not('feedback_submitted_at', 'is', null)
      .order('feedback_submitted_at', { ascending: false })
      .limit(5)
      .then(({ data }) => data ?? []),
  ]);

  // Transform ended sessions
  const ended: RecentEndedSession[] = recentEndedData.map((row) => {
    const startedAt = new Date(row.started_at).getTime();
    const endedAt = new Date(row.ended_at).getTime();
    const durationMinutes = Math.round((endedAt - startedAt) / (1000 * 60));

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

  // Transform feedback
  const feedback: RecentFeedback[] = recentFeedbackData.map((row) => {
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

  return { ended, feedback };
}

/**
 * Counts the number of browsing sessions (sessions without a game assigned).
 *
 * @param venueId - The venue ID to count browsing sessions for
 * @returns Number of active sessions without a game
 */
export async function getBrowsingSessionsCount(venueId: string): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { count } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('venue_id', venueId)
    .is('ended_at', null)
    .is('game_id', null);

  return count ?? 0;
}

// =============================================================================
// DASHBOARD DATA (for main Dashboard page)
// =============================================================================

/**
 * Venue feedback data for dashboard display.
 */
export interface VenueFeedback {
  avgRating: number | null;
  responseCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  recentComments: Array<{
    id: string;
    comment: string;
    rating: number;
    submittedAt: string;
  }>;
}

export interface DashboardData {
  // Quick stats
  gamesInLibrary: number;
  activeSessions: number;
  totalSessionsToday: number;

  // Trending games (BGG Hotness)
  trendingGamesCount: number;
  trendingGamesTotal: number;

  // Venue feedback (last 30 days)
  venueFeedback: VenueFeedback;

  // Alerts and activity
  alerts: Alert[];
  bottleneckedGames: BottleneckedGame[];
  recentEnded: RecentEndedSession[];
  recentFeedback: RecentFeedback[];
  browsingSessionsCount: number;
}

/**
 * Fetches all data needed for the main Dashboard page.
 *
 * @param venueId - The venue ID to fetch data for
 * @returns DashboardData containing quick stats, venue feedback, alerts, and activity
 */
export async function getDashboardData(venueId: string): Promise<DashboardData> {
  const supabase = getSupabaseAdmin();

  // Calculate date boundaries
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Parallel data fetching - combine basic stats with alert/activity functions
  const [
    gamesCountResult,
    activeSessionsResult,
    todaySessionsResult,
    venueFeedbackResult,
    alerts,
    bottleneckedGames,
    recentActivity,
    browsingSessionsCount,
    hotGames,
    rotationGamesResult,
  ] = await Promise.all([
    // Games in library count
    supabase
      .from('games')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId),

    // Active sessions count (ended_at IS NULL)
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .is('ended_at', null),

    // Total sessions today (created_at >= start of today)
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .gte('created_at', startOfToday.toISOString()),

    // Venue feedback (last 30 days, where feedback_venue_rating IS NOT NULL)
    supabase
      .from('sessions')
      .select('id, feedback_venue_rating, feedback_venue_comment, feedback_submitted_at')
      .eq('venue_id', venueId)
      .not('feedback_venue_rating', 'is', null)
      .gte('feedback_submitted_at', thirtyDaysAgo.toISOString())
      .order('feedback_submitted_at', { ascending: false }),

    // Alerts
    getAlerts(venueId),

    // Bottlenecked games
    getBottleneckedGames(venueId),

    // Recent activity
    getRecentActivity(venueId),

    // Browsing sessions count
    getBrowsingSessionsCount(venueId),

    // BGG hot games for trending calculation
    getBggHotGames(),

    // All in_rotation games for trending matching
    supabase
      .from('games')
      .select('id, bgg_id, title')
      .eq('venue_id', venueId)
      .eq('status', 'in_rotation'),
  ]);

  // Process games count
  const gamesInLibrary = gamesCountResult.count ?? 0;

  // Process active sessions count
  const activeSessions = activeSessionsResult.count ?? 0;

  // Process today's sessions count
  const totalSessionsToday = todaySessionsResult.count ?? 0;

  // -------------------------------------------------------------------------
  // Trending Games Count (BGG Hotness matching)
  // -------------------------------------------------------------------------
  const rotationGames = rotationGamesResult.data ?? [];
  const trendingGamesTotal = rotationGames.length;
  let trendingGamesCount = 0;

  if (hotGames.length > 0 && rotationGames.length > 0) {
    // Build lookup maps for efficient matching
    const bggIdSet = new Set(
      rotationGames.filter((g) => g.bgg_id).map((g) => g.bgg_id)
    );
    const titleSet = new Set(rotationGames.map((g) => normalizeTitle(g.title)));

    // Count matches (by bgg_id or normalized title)
    for (const hot of hotGames) {
      if (bggIdSet.has(hot.bggId) || titleSet.has(normalizeTitle(hot.title))) {
        trendingGamesCount++;
      }
    }
  }

  // Process venue feedback
  const feedbackRows = venueFeedbackResult.data ?? [];
  let ratingSum = 0;
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;
  const recentComments: Array<{
    id: string;
    comment: string;
    rating: number;
    submittedAt: string;
  }> = [];

  for (const row of feedbackRows) {
    const rating = row.feedback_venue_rating;
    if (rating !== null) {
      ratingSum += rating;
      if (rating <= 2) negativeCount++;
      else if (rating === 3) neutralCount++;
      else if (rating >= 4) positiveCount++;
    }

    // Collect comments (limit to 10)
    if (row.feedback_venue_comment && recentComments.length < 10) {
      recentComments.push({
        id: row.id,
        comment: row.feedback_venue_comment,
        rating: row.feedback_venue_rating ?? 0,
        submittedAt: row.feedback_submitted_at,
      });
    }
  }

  const responseCount = feedbackRows.length;
  const avgRating = responseCount > 0
    ? Number((ratingSum / responseCount).toFixed(1))
    : null;

  return {
    gamesInLibrary,
    activeSessions,
    totalSessionsToday,
    trendingGamesCount,
    trendingGamesTotal,
    venueFeedback: {
      avgRating,
      responseCount,
      positiveCount,
      neutralCount,
      negativeCount,
      recentComments,
    },
    alerts,
    bottleneckedGames,
    recentEnded: recentActivity.ended,
    recentFeedback: recentActivity.feedback,
    browsingSessionsCount,
  };
}
