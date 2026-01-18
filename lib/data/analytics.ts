import { getSupabaseAdmin } from '@/lib/supabaseServer';

// ============================================================================
// Types
// ============================================================================

export interface GamePlayStats {
  gameId: string;
  title: string;
  playCount: number;
  avgRating: number | null;
  lastPlayedAt: string | null;
}

export interface GraveyardGame {
  gameId: string;
  title: string;
  lastPlayedAt: string | null;
  status: string;
}

export interface HiddenGemGame {
  gameId: string;
  title: string;
  playCount: number;
  avgRating: number;
}

export interface AnalyticsSummary {
  // KPIs
  totalPlays30d: number;
  activeLibraryPct: number;
  avgSessionMinutes: number | null;
  venueCsat: number | null;

  // Lists
  topGames: GamePlayStats[];
  graveyardCandidates: GraveyardGame[];
  hiddenGems: HiddenGemGame[];
}

// ============================================================================
// Internal Types for Aggregation
// ============================================================================

interface GameStatsAggregation {
  playCount: number;
  ratingSum: number;
  ratingCount: number;
  lastPlayedAt: string | null;
}

interface GameRecord {
  id: string;
  title: string;
  status: string;
}

// ============================================================================
// Date Helpers
// ============================================================================

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

// ============================================================================
// Main Analytics Function (Optimized)
// ============================================================================

export async function getAnalyticsDashboardData(
  venueId: string
): Promise<AnalyticsSummary> {
  const supabase = getSupabaseAdmin();
  const thirtyDaysAgo = daysAgo(30);
  const ninetyDaysAgo = daysAgo(90);

  // -------------------------------------------------------------------------
  // Parallel Query Execution - Batch 1 (KPI queries)
  // All these queries are independent and can run in parallel
  // -------------------------------------------------------------------------
  const [
    // KPI 1: Total Plays (Last 30 Days)
    totalPlays30dResult,
    // KPI 2a: Total in_rotation games
    totalInRotationResult,
    // KPI 2b: Unique games played in last 90 days (only fetch distinct game_ids)
    uniqueGamesResult,
    // KPI 3: Session durations for avg calculation (limited fields, limited rows)
    sessionDurationsResult,
    // KPI 4: Venue ratings (only the rating field, limited rows)
    venueRatingsResult,
    // Games list for aggregation
    allGamesResult,
  ] = await Promise.all([
    // KPI 1: Count sessions with game_id in last 30 days
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .not('game_id', 'is', null)
      .gte('started_at', thirtyDaysAgo),

    // KPI 2a: Count in_rotation games
    supabase
      .from('games')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .eq('status', 'in_rotation'),

    // KPI 2b: Get only distinct game_ids (much smaller result set)
    // Using select with only game_id minimizes data transfer
    supabase
      .from('sessions')
      .select('game_id')
      .eq('venue_id', venueId)
      .not('game_id', 'is', null)
      .gte('started_at', ninetyDaysAgo)
      .limit(5000),

    // KPI 3: Get session times for duration calculation
    // Limit to reasonable sample size - 2000 sessions is statistically sufficient
    supabase
      .from('sessions')
      .select('started_at, ended_at')
      .eq('venue_id', venueId)
      .not('game_id', 'is', null)
      .not('ended_at', 'is', null)
      .gte('started_at', thirtyDaysAgo)
      .order('started_at', { ascending: false })
      .limit(2000),

    // KPI 4: Get venue ratings only (single column)
    // Limit to reasonable sample size
    supabase
      .from('sessions')
      .select('feedback_venue_rating')
      .eq('venue_id', venueId)
      .not('feedback_venue_rating', 'is', null)
      .gte('started_at', ninetyDaysAgo)
      .limit(2000),

    // Games list
    supabase
      .from('games')
      .select('id, title, status')
      .eq('venue_id', venueId)
      .eq('status', 'in_rotation'),
  ]);

  // -------------------------------------------------------------------------
  // Process KPI Results
  // -------------------------------------------------------------------------

  // KPI 1: Total Plays
  const totalPlays30d = totalPlays30dResult.count ?? 0;

  // KPI 2: Active Library Percentage
  const totalInRotation = totalInRotationResult.count ?? 0;
  const uniqueGamesPlayed = new Set(
    (uniqueGamesResult.data ?? []).map((s) => s.game_id)
  ).size;
  const activeLibraryPct =
    totalInRotation > 0
      ? Math.round((uniqueGamesPlayed / totalInRotation) * 100)
      : 0;

  // KPI 3: Average Session Minutes (with outlier exclusion)
  let avgSessionMinutes: number | null = null;
  const completedSessions = sessionDurationsResult.data;
  if (completedSessions && completedSessions.length > 0) {
    let sum = 0;
    let count = 0;
    for (const session of completedSessions) {
      const started = new Date(session.started_at).getTime();
      const ended = new Date(session.ended_at).getTime();
      const durationMinutes = (ended - started) / (1000 * 60);
      // Exclude outliers (< 5 min or > 6 hours)
      if (durationMinutes >= 5 && durationMinutes <= 360) {
        sum += durationMinutes;
        count++;
      }
    }
    if (count > 0) {
      avgSessionMinutes = Math.round(sum / count);
    }
  }

  // KPI 4: Venue CSAT
  let venueCsat: number | null = null;
  const venueRatings = venueRatingsResult.data;
  if (venueRatings && venueRatings.length > 0) {
    let sum = 0;
    for (const s of venueRatings) {
      sum += s.feedback_venue_rating ?? 0;
    }
    venueCsat = Math.round((sum / venueRatings.length) * 10) / 10;
  }

  // -------------------------------------------------------------------------
  // Parallel Query Execution - Batch 2 (Game aggregation queries)
  // These queries are for top games, graveyard, and hidden gems
  // Optimized: fetch only what's needed with proper limits
  // -------------------------------------------------------------------------

  const allGames = (allGamesResult.data ?? []) as GameRecord[];
  const gameMap = new Map<string, GameRecord>(allGames.map((g) => [g.id, g]));
  const gameIds = allGames.map((g) => g.id);

  // Skip aggregation queries if no games
  if (gameIds.length === 0) {
    return {
      totalPlays30d,
      activeLibraryPct,
      avgSessionMinutes,
      venueCsat,
      topGames: [],
      graveyardCandidates: [],
      hiddenGems: [],
    };
  }

  // Run game-level aggregation queries in parallel
  const [
    // Sessions in last 30 days (for top games - need game_id and count)
    sessions30dResult,
    // Sessions in last 90 days (for hidden gems - need game_id, rating, started_at)
    sessions90dResult,
    // Last played dates for graveyard candidates (optimized: only for games with 0 plays in 90d)
    // We'll compute this more efficiently by getting max(started_at) per game
    lastPlayedResult,
  ] = await Promise.all([
    // 30-day sessions: only need game_id for counting
    supabase
      .from('sessions')
      .select('game_id')
      .eq('venue_id', venueId)
      .not('game_id', 'is', null)
      .in('game_id', gameIds)
      .gte('started_at', thirtyDaysAgo)
      .limit(10000),

    // 90-day sessions: need game_id, rating, started_at for aggregation
    supabase
      .from('sessions')
      .select('game_id, feedback_rating, started_at')
      .eq('venue_id', venueId)
      .not('game_id', 'is', null)
      .in('game_id', gameIds)
      .gte('started_at', ninetyDaysAgo)
      .limit(10000),

    // All-time last played: get most recent session per game
    // Order by started_at desc and limit to reduce data transfer
    // We only need this for graveyard candidates (games with 0 plays in 90d)
    supabase
      .from('sessions')
      .select('game_id, started_at')
      .eq('venue_id', venueId)
      .not('game_id', 'is', null)
      .in('game_id', gameIds)
      .lt('started_at', ninetyDaysAgo)
      .order('started_at', { ascending: false })
      .limit(5000),
  ]);

  // -------------------------------------------------------------------------
  // Efficient Aggregation Using Running Sums (not arrays)
  // -------------------------------------------------------------------------

  // Initialize game stats with running sums (not arrays - saves memory)
  const gameStats90d = new Map<string, GameStatsAggregation>();
  const gameStats30d = new Map<string, number>();

  for (const game of allGames) {
    gameStats90d.set(game.id, {
      playCount: 0,
      ratingSum: 0,
      ratingCount: 0,
      lastPlayedAt: null,
    });
    gameStats30d.set(game.id, 0);
  }

  // Aggregate 90-day sessions (running sum instead of array)
  for (const session of sessions90dResult.data ?? []) {
    const gameId = session.game_id;
    if (!gameId) continue;

    const stats = gameStats90d.get(gameId);
    if (!stats) continue;

    stats.playCount++;
    if (session.feedback_rating != null) {
      stats.ratingSum += session.feedback_rating;
      stats.ratingCount++;
    }
    if (!stats.lastPlayedAt || session.started_at > stats.lastPlayedAt) {
      stats.lastPlayedAt = session.started_at;
    }
  }

  // Aggregate 30-day sessions
  for (const session of sessions30dResult.data ?? []) {
    const gameId = session.game_id;
    if (!gameId) continue;
    gameStats30d.set(gameId, (gameStats30d.get(gameId) ?? 0) + 1);
  }

  // Build last played map from historical sessions (before 90 days)
  // Only needed for games with 0 plays in last 90 days
  const lastPlayedMap = new Map<string, string>();
  for (const session of lastPlayedResult.data ?? []) {
    const gameId = session.game_id;
    if (gameId && !lastPlayedMap.has(gameId)) {
      lastPlayedMap.set(gameId, session.started_at);
    }
  }

  // -------------------------------------------------------------------------
  // Top Games (Top 5 by play count in last 30 days)
  // -------------------------------------------------------------------------
  const topGames: GamePlayStats[] = Array.from(gameStats30d.entries())
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([gameId, playCount]) => {
      const game = gameMap.get(gameId);
      const stats90 = gameStats90d.get(gameId);
      const avgRating =
        stats90 && stats90.ratingCount > 0
          ? Math.round((stats90.ratingSum / stats90.ratingCount) * 10) / 10
          : null;

      return {
        gameId,
        title: game?.title ?? 'Unknown Game',
        playCount,
        avgRating,
        lastPlayedAt: stats90?.lastPlayedAt ?? null,
      };
    });

  // -------------------------------------------------------------------------
  // Graveyard Candidates
  // Games with 0 plays in last 90 days AND status is 'in_rotation'
  // -------------------------------------------------------------------------
  const graveyardCandidates: GraveyardGame[] = allGames
    .filter((game) => {
      const stats = gameStats90d.get(game.id);
      return stats && stats.playCount === 0;
    })
    .map((game) => ({
      gameId: game.id,
      title: game.title,
      lastPlayedAt: lastPlayedMap.get(game.id) ?? null,
      status: game.status,
    }))
    .sort((a, b) => {
      // Sort by last played (never played first, then oldest first)
      if (!a.lastPlayedAt && !b.lastPlayedAt) return 0;
      if (!a.lastPlayedAt) return -1;
      if (!b.lastPlayedAt) return 1;
      return a.lastPlayedAt.localeCompare(b.lastPlayedAt);
    });

  // -------------------------------------------------------------------------
  // Hidden Gems
  // Games with < 5 plays in last 90 days BUT avg rating > 4.5
  // -------------------------------------------------------------------------
  const hiddenGems: HiddenGemGame[] = Array.from(gameStats90d.entries())
    .filter(([gameId, stats]) => {
      const game = gameMap.get(gameId);
      if (!game || game.status !== 'in_rotation') return false;
      if (stats.playCount === 0 || stats.playCount >= 5) return false;
      if (stats.ratingCount === 0) return false;

      const avgRating = stats.ratingSum / stats.ratingCount;
      return avgRating > 4.5;
    })
    .map(([gameId, stats]) => {
      const game = gameMap.get(gameId)!;
      const avgRating = stats.ratingSum / stats.ratingCount;

      return {
        gameId,
        title: game.title,
        playCount: stats.playCount,
        avgRating: Math.round(avgRating * 10) / 10,
      };
    })
    .sort((a, b) => b.avgRating - a.avgRating);

  // -------------------------------------------------------------------------
  // Return Final Summary
  // -------------------------------------------------------------------------
  return {
    totalPlays30d,
    activeLibraryPct,
    avgSessionMinutes,
    venueCsat,
    topGames,
    graveyardCandidates,
    hiddenGems,
  };
}
