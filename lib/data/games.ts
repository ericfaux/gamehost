import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type { Game, RecommendationParams, GameComplexity, TimeBucket } from '@/lib/db/types';
import { getCopiesInUseByGame } from './sessions';
import { getBggHotGames } from '@/lib/bgg';
import { normalizeTitle } from '@/lib/utils/strings';

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
 * Filters games by availability (copies_in_rotation > 0 and available copies > 0).
 *
 * @param games - Array of games to filter
 * @param copiesInUse - Map of game_id -> number of active sessions
 * @returns Filtered array of available games
 */
function filterByAvailability(games: Game[], copiesInUse: Record<string, number>): Game[] {
  return games.filter((game) => {
    const copies = game.copies_in_rotation ?? 1;
    // Hide games with 0 copies
    if (copies <= 0) return false;
    // Hide games where all copies are in use
    const inUse = copiesInUse[game.id] ?? 0;
    if (copies - inUse <= 0) return false;
    return true;
  });
}

/**
 * Fetches recommended games based on wizard parameters.
 * Applies filters progressively and relaxes them if no results are found.
 * Excludes games with copies_in_rotation <= 0 or all copies in use.
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

  // Fetch copies in use for availability filtering
  const copiesInUse = await getCopiesInUseByGame(venueId);

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

  games = filterByAvailability(games, copiesInUse);
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

  games = filterByAvailability(games, copiesInUse);
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

  games = filterByAvailability(games, copiesInUse);
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

/**
 * Fetches quick pick games for the guest landing page.
 * Returns available games, prioritizing by BGG rating then title.
 * Only returns games that are:
 * - in_rotation status
 * - not problematic condition
 * - have available copies (copies_in_rotation > copies_in_use)
 *
 * @param venueId - The venue's UUID
 * @param limit - Maximum number of games to return (default 6)
 * @returns Array of available games for quick picks
 */
export async function getQuickPickGames(venueId: string, limit: number = 6): Promise<Game[]> {
  // Fetch copies in use for availability filtering
  const copiesInUse = await getCopiesInUseByGame(venueId);

  // Query for in-rotation games with good condition
  const { data, error } = await getSupabaseAdmin()
    .from('games')
    .select('*')
    .eq('venue_id', venueId)
    .eq('status', 'in_rotation')
    .neq('condition', 'problematic')
    .gt('copies_in_rotation', 0)
    .order('bgg_rating', { ascending: false, nullsFirst: false })
    .order('title', { ascending: true });

  if (error) {
    console.error('Error fetching quick pick games:', error);
    return [];
  }

  const games = (data ?? []) as Game[];

  // Filter by availability and return up to limit
  const available = games.filter((game) => {
    const copies = game.copies_in_rotation ?? 1;
    const inUse = copiesInUse[game.id] ?? 0;
    return copies - inUse > 0;
  });

  return available.slice(0, limit);
}

/**
 * Fetches staff pick games for the guest landing page.
 * Returns a different set of games than trending to provide variety.
 *
 * Current strategy: Returns games sorted alphabetically by title,
 * excluding games that would appear in trending (top BGG rated).
 * This ensures guests see different options in each section.
 *
 * Future enhancement: Add `is_staff_pick` boolean to games table
 * and filter by that field.
 *
 * @param venueId - The venue's UUID
 * @param limit - Maximum number of games to return (default 4)
 * @returns Array of staff pick games
 */
export async function getStaffPickGames(venueId: string, limit: number = 4): Promise<Game[]> {
  // Get trending games to exclude them from staff picks
  const trendingGames = await getQuickPickGames(venueId, 10);
  const trendingIds = new Set(trendingGames.map((game) => game.id));

  // Fetch copies in use for availability filtering
  const copiesInUse = await getCopiesInUseByGame(venueId);

  // Query for in-rotation games with good condition, ordered alphabetically
  const { data, error } = await getSupabaseAdmin()
    .from('games')
    .select('*')
    .eq('venue_id', venueId)
    .eq('status', 'in_rotation')
    .neq('condition', 'problematic')
    .gt('copies_in_rotation', 0)
    .order('title', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching staff pick games:', error);
    return [];
  }

  const games = (data ?? []) as Game[];

  // Filter out trending games and check availability
  const available = games.filter((game) => {
    // Exclude games that appear in trending
    if (trendingIds.has(game.id)) return false;

    // Check availability
    const copies = game.copies_in_rotation ?? 1;
    const inUse = copiesInUse[game.id] ?? 0;
    return copies - inUse > 0;
  });

  return available.slice(0, limit);
}

/**
 * Fetches games from the venue's library that are currently trending on BGG.
 *
 * Matching strategy (in order of preference):
 * 1. Exact match on bgg_id (most reliable)
 * 2. Normalized title match (fallback for games without bgg_id)
 *
 * @param venueId - The venue's UUID
 * @returns Array of Game objects that match trending games, ordered by BGG rank
 *
 * @example
 * const trending = await getTrendingGamesForVenue(venue.id);
 * // Returns up to ~50 games that are both in-rotation AND trending on BGG
 */
export async function getTrendingGamesForVenue(venueId: string): Promise<Game[]> {
  // 1. Fetch BGG hot list (cached for 1 hour)
  const hotGames = await getBggHotGames();

  if (hotGames.length === 0) {
    return [];
  }

  // 2. Fetch venue's in_rotation games with relevant fields
  const { data: localGames, error } = await getSupabaseAdmin()
    .from('games')
    .select('*')
    .eq('venue_id', venueId)
    .eq('status', 'in_rotation');

  if (error || !localGames || localGames.length === 0) {
    return [];
  }

  // 3. Build lookup maps for efficient matching
  // Primary: bgg_id -> Game (exact match)
  const bggIdMap = new Map<string, Game>();
  // Secondary: normalized title -> Game (fuzzy fallback)
  const titleMap = new Map<string, Game>();

  for (const game of localGames as Game[]) {
    if (game.bgg_id) {
      bggIdMap.set(game.bgg_id, game);
    }
    titleMap.set(normalizeTitle(game.title), game);
  }

  // 4. Match hot games to local library, preserving BGG rank order
  const matches: Game[] = [];
  const matchedIds = new Set<string>(); // Prevent duplicates

  for (const hotGame of hotGames) {
    let localMatch: Game | undefined;

    // Try exact bgg_id match first
    localMatch = bggIdMap.get(hotGame.bggId);

    // Fall back to normalized title match
    if (!localMatch) {
      localMatch = titleMap.get(normalizeTitle(hotGame.title));
    }

    // Add if found and not already matched
    if (localMatch && !matchedIds.has(localMatch.id)) {
      matches.push(localMatch);
      matchedIds.add(localMatch.id);
    }
  }

  return matches;
}
