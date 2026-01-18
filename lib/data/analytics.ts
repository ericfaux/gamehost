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
// Date Helpers
// ============================================================================

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

// ============================================================================
// Main Analytics Function
// ============================================================================

export async function getAnalyticsDashboardData(
  venueId: string
): Promise<AnalyticsSummary> {
  const supabase = getSupabaseAdmin();
  const thirtyDaysAgo = daysAgo(30);
  const ninetyDaysAgo = daysAgo(90);

  // -------------------------------------------------------------------------
  // KPI 1: Total Plays (Last 30 Days)
  // Count sessions that have a game_id and started in the last 30 days
  // -------------------------------------------------------------------------
  // Use 'id' instead of '*' for count queries - more efficient
  const { count: totalPlays30d } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('venue_id', venueId)
    .not('game_id', 'is', null)
    .gte('started_at', thirtyDaysAgo);

  // -------------------------------------------------------------------------
  // KPI 2: Active Library Percentage
  // (Games played at least once in 90d / Total "in_rotation" games) * 100
  // -------------------------------------------------------------------------

  // Get total in_rotation games
  // Use 'id' instead of '*' for count queries - more efficient
  const { count: totalInRotation } = await supabase
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('venue_id', venueId)
    .eq('status', 'in_rotation');

  // Get unique games played in last 90 days
  // Limit to 10000 rows to prevent unbounded result sets
  const { data: recentlyPlayedGames } = await supabase
    .from('sessions')
    .select('game_id')
    .eq('venue_id', venueId)
    .not('game_id', 'is', null)
    .gte('started_at', ninetyDaysAgo)
    .limit(10000);

  const uniqueGamesPlayed = new Set(
    (recentlyPlayedGames ?? []).map((s) => s.game_id)
  ).size;

  const activeLibraryPct =
    totalInRotation && totalInRotation > 0
      ? Math.round((uniqueGamesPlayed / totalInRotation) * 100)
      : 0;

  // -------------------------------------------------------------------------
  // KPI 3: Average Session Minutes (Last 30 Days)
  // Exclude outliers: < 5 minutes or > 6 hours (360 minutes)
  // -------------------------------------------------------------------------
  // Limit to 10000 rows to prevent unbounded result sets
  const { data: completedSessions } = await supabase
    .from('sessions')
    .select('started_at, ended_at')
    .eq('venue_id', venueId)
    .not('game_id', 'is', null)
    .not('ended_at', 'is', null)
    .gte('started_at', thirtyDaysAgo)
    .limit(10000);

  let avgSessionMinutes: number | null = null;
  if (completedSessions && completedSessions.length > 0) {
    const validDurations: number[] = [];
    for (const session of completedSessions) {
      const started = new Date(session.started_at).getTime();
      const ended = new Date(session.ended_at).getTime();
      const durationMinutes = (ended - started) / (1000 * 60);

      // Exclude outliers (< 5 min or > 6 hours)
      if (durationMinutes >= 5 && durationMinutes <= 360) {
        validDurations.push(durationMinutes);
      }
    }

    if (validDurations.length > 0) {
      const sum = validDurations.reduce((acc, d) => acc + d, 0);
      avgSessionMinutes = Math.round(sum / validDurations.length);
    }
  }

  // -------------------------------------------------------------------------
  // KPI 4: Venue CSAT (Last 90 Days)
  // Average feedback_venue_rating
  // -------------------------------------------------------------------------
  // Limit to 10000 rows to prevent unbounded result sets
  const { data: venueRatings } = await supabase
    .from('sessions')
    .select('feedback_venue_rating')
    .eq('venue_id', venueId)
    .not('feedback_venue_rating', 'is', null)
    .gte('started_at', ninetyDaysAgo)
    .limit(10000);

  let venueCsat: number | null = null;
  if (venueRatings && venueRatings.length > 0) {
    const sum = venueRatings.reduce(
      (acc, s) => acc + (s.feedback_venue_rating ?? 0),
      0
    );
    venueCsat = Math.round((sum / venueRatings.length) * 10) / 10;
  }

  // -------------------------------------------------------------------------
  // Master Game Aggregation Query (Last 90 Days)
  // Used for: Top Games, Graveyard, Hidden Gems
  // -------------------------------------------------------------------------

  // Get all in_rotation games for the venue
  const { data: allGames } = await supabase
    .from('games')
    .select('id, title, status')
    .eq('venue_id', venueId)
    .eq('status', 'in_rotation');

  // Get all sessions with game feedback in last 90 days
  const { data: allSessions90d } = await supabase
    .from('sessions')
    .select('game_id, started_at, feedback_rating')
    .eq('venue_id', venueId)
    .not('game_id', 'is', null)
    .gte('started_at', ninetyDaysAgo);

  // Get sessions from last 30 days for top games
  const { data: allSessions30d } = await supabase
    .from('sessions')
    .select('game_id, started_at, feedback_rating')
    .eq('venue_id', venueId)
    .not('game_id', 'is', null)
    .gte('started_at', thirtyDaysAgo);

  // Build aggregation maps
  const gameStats90d = new Map<
    string,
    { playCount: number; ratings: number[]; lastPlayedAt: string | null }
  >();
  const gameStats30d = new Map<string, number>();

  // Initialize with all games
  for (const game of allGames ?? []) {
    gameStats90d.set(game.id, {
      playCount: 0,
      ratings: [],
      lastPlayedAt: null,
    });
    gameStats30d.set(game.id, 0);
  }

  // Aggregate 90-day sessions
  for (const session of allSessions90d ?? []) {
    const gameId = session.game_id;
    if (!gameId) continue;

    const stats = gameStats90d.get(gameId) ?? {
      playCount: 0,
      ratings: [],
      lastPlayedAt: null,
    };

    stats.playCount++;
    if (session.feedback_rating != null) {
      stats.ratings.push(session.feedback_rating);
    }
    if (
      !stats.lastPlayedAt ||
      session.started_at > stats.lastPlayedAt
    ) {
      stats.lastPlayedAt = session.started_at;
    }
    gameStats90d.set(gameId, stats);
  }

  // Aggregate 30-day sessions
  for (const session of allSessions30d ?? []) {
    const gameId = session.game_id;
    if (!gameId) continue;
    gameStats30d.set(gameId, (gameStats30d.get(gameId) ?? 0) + 1);
  }

  // -------------------------------------------------------------------------
  // Top Games (Top 5 by play count in last 30 days)
  // -------------------------------------------------------------------------
  const gameMap = new Map((allGames ?? []).map((g) => [g.id, g]));

  const topGames: GamePlayStats[] = Array.from(gameStats30d.entries())
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([gameId, playCount]) => {
      const game = gameMap.get(gameId);
      const stats90 = gameStats90d.get(gameId);
      const avgRating =
        stats90 && stats90.ratings.length > 0
          ? Math.round(
              (stats90.ratings.reduce((a, b) => a + b, 0) /
                stats90.ratings.length) *
                10
            ) / 10
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

  // We need to get last played date for ALL time for graveyard games
  const { data: allTimeLastPlayed } = await supabase
    .from('sessions')
    .select('game_id, started_at')
    .eq('venue_id', venueId)
    .not('game_id', 'is', null)
    .order('started_at', { ascending: false });

  const lastPlayedMap = new Map<string, string>();
  for (const session of allTimeLastPlayed ?? []) {
    if (session.game_id && !lastPlayedMap.has(session.game_id)) {
      lastPlayedMap.set(session.game_id, session.started_at);
    }
  }

  const graveyardCandidates: GraveyardGame[] = (allGames ?? [])
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
      if (stats.ratings.length === 0) return false;

      const avgRating =
        stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length;
      return avgRating > 4.5;
    })
    .map(([gameId, stats]) => {
      const game = gameMap.get(gameId)!;
      const avgRating =
        stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length;

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
    totalPlays30d: totalPlays30d ?? 0,
    activeLibraryPct,
    avgSessionMinutes,
    venueCsat,
    topGames,
    graveyardCandidates,
    hiddenGems,
  };
}
