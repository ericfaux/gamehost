import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type { Game, RecommendationParams, GameComplexity, TimeBucket } from '@/lib/db/types';

/**
 * Fetches a single game by its ID.
 * @param gameId - The game's UUID
 * @returns The game or null if not found
 */
export async function getGameById(gameId: string): Promise<Game | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch game by ID: ${error.message}`);
  }

  return data as Game;
}

/**
 * Fetches all games for a venue, ordered by title.
 * @param venueId - The venue's UUID
 * @returns Array of games (may be empty)
 */
export async function getGamesForVenue(venueId: string): Promise<Game[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('games')
    .select('*')
    .eq('venue_id', venueId)
    .order('title', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch games for venue: ${error.message}`);
  }

  return (data ?? []) as Game[];
}

/**
 * Maps a time bucket to min/max minute ranges.
 */
function getTimeRange(bucket: TimeBucket): { min: number; max: number } {
  switch (bucket) {
    case '30-45':
      return { min: 0, max: 45 };
    case '60-120':
      return { min: 45, max: 120 };
    case '120+':
      return { min: 120, max: 999 };
    default:
      return { min: 0, max: 999 };
  }
}

/**
 * Maps complexity tolerance to allowed game complexity values.
 */
function getAllowedComplexities(tolerance: string): GameComplexity[] {
  switch (tolerance) {
    case 'super_simple':
      return ['simple'];
    case 'medium':
      return ['medium', 'simple'];
    case 'dont_mind_complex':
      return ['complex', 'medium'];
    default:
      return ['simple', 'medium', 'complex'];
  }
}

/**
 * Fetches recommended games based on wizard parameters.
 * Applies filters progressively and relaxes them if no results are found.
 *
 * @param params - Recommendation parameters from the wizard
 * @returns Array of up to 5 recommended games
 */
export async function getRecommendedGames(params: RecommendationParams): Promise<Game[]> {
  const { venueId, playerCount, timeBucket, complexityTolerance, vibes } = params;

  const timeRange = getTimeRange(timeBucket);
  const allowedComplexities = getAllowedComplexities(complexityTolerance);
  const targetComplexity = allowedComplexities[0];

  // Effective player count: for 5+ groups, treat as 5 but still check max_players
  const effectivePlayerCount = Math.min(playerCount, 5);

  // Attempt 1: Full filters including vibes
  let games = await queryGames({
    venueId,
    playerCount: effectivePlayerCount,
    actualPlayerCount: playerCount,
    timeRange,
    allowedComplexities,
    targetComplexity,
    vibes,
    includeVibesFilter: true,
  });

  if (games.length > 0) {
    return games.slice(0, 5);
  }

  // Attempt 2: Drop vibes filter
  games = await queryGames({
    venueId,
    playerCount: effectivePlayerCount,
    actualPlayerCount: playerCount,
    timeRange,
    allowedComplexities,
    targetComplexity,
    vibes: [],
    includeVibesFilter: false,
  });

  if (games.length > 0) {
    return games.slice(0, 5);
  }

  // Attempt 3: Also relax time filter
  games = await queryGames({
    venueId,
    playerCount: effectivePlayerCount,
    actualPlayerCount: playerCount,
    timeRange: { min: 0, max: 999 },
    allowedComplexities,
    targetComplexity,
    vibes: [],
    includeVibesFilter: false,
  });

  return games.slice(0, 5);
}

interface QueryGamesOptions {
  venueId: string;
  playerCount: number;
  actualPlayerCount: number;
  timeRange: { min: number; max: number };
  allowedComplexities: GameComplexity[];
  vibes: string[];
  includeVibesFilter: boolean;
  targetComplexity?: GameComplexity;
}

/**
 * Internal helper to query games with specific filters.
 */
async function queryGames(options: QueryGamesOptions): Promise<Game[]> {
  const {
    venueId,
    playerCount,
    actualPlayerCount,
    timeRange,
    allowedComplexities,
    vibes,
    includeVibesFilter,
    targetComplexity,
  } = options;

  let query = getSupabaseAdmin()
    .from('games')
    .select('*')
    .eq('venue_id', venueId)
    .eq('status', 'in_rotation')
    .neq('condition', 'problematic')
    .lte('min_players', playerCount)
    .gte('max_players', actualPlayerCount)
    .lte('min_time_minutes', timeRange.max)
    .gte('max_time_minutes', timeRange.min)
    .in('complexity', allowedComplexities);

  // Apply vibes filter: at least one overlap with params.vibes
  if (includeVibesFilter && vibes.length > 0) {
    // Supabase's overlaps checks if any element matches
    query = query.overlaps('vibes', vibes);
  }

  // Order by created_at descending (newest first) as a proxy for "featured"
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch recommended games: ${error.message}`);
  }

  const games = (data ?? []) as Game[];

  if (targetComplexity) {
    return [...games].sort((a, b) => {
      const aMatch = a.complexity === targetComplexity ? 1 : 0;
      const bMatch = b.complexity === targetComplexity ? 1 : 0;

      if (aMatch !== bMatch) {
        return bMatch - aMatch;
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  return games;
}
