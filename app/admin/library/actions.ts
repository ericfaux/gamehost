'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { getVenueByOwnerId } from '@/lib/data/venues';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { normalizeTitle } from '@/lib/utils/strings';
import { getBggHotGames, searchBggGames, getBggGameDetails, rankSearchResults, getBggBestInstructionalVideo, BggRateLimitError } from '@/lib/bgg';
import type { GameComplexity, GameStatus, GameCondition } from '@/lib/db/types';

// Valid enum values for validation
const VALID_STATUSES: GameStatus[] = ['in_rotation', 'out_for_repair', 'retired', 'for_sale'];
const VALID_CONDITIONS: GameCondition[] = ['new', 'good', 'worn', 'problematic'];

interface CSVGameImport {
  // Title (required)
  Title?: string | number;
  title?: string | number;
  // Player counts
  MinPlayers?: string | number;
  minPlayers?: string | number;
  min_players?: string | number;
  MaxPlayers?: string | number;
  maxPlayers?: string | number;
  max_players?: string | number;
  // Playtime
  MinTime?: string | number;
  minTime?: string | number;
  min_time_minutes?: string | number;
  MaxTime?: string | number;
  maxTime?: string | number;
  max_time_minutes?: string | number;
  // Complexity
  Complexity?: string;
  complexity?: string;
  // Copies
  copies_in_rotation?: string | number;
  CopiesInRotation?: string | number;
  Copies?: string | number;
  copies?: string | number;
  // Description/Pitch
  Description?: string;
  description?: string;
  Pitch?: string;
  pitch?: string;
  // Shelf location
  ShelfLocation?: string;
  shelfLocation?: string;
  shelf_location?: string;
  // BGG Rank
  BggRank?: string | number;
  bggRank?: string | number;
  bgg_rank?: string | number;
  // BGG Rating
  BggRating?: string | number;
  bggRating?: string | number;
  bgg_rating?: string | number;
  // Image URL
  ImageUrl?: string;
  imageUrl?: string;
  image_url?: string;
  cover_image_url?: string;
  CoverImageUrl?: string;
  // Status
  Status?: string;
  status?: string;
  // Condition
  Condition?: string;
  condition?: string;
  // Vibes (can be JSON array or comma-separated string)
  Vibes?: string;
  vibes?: string;
  // Setup steps
  SetupSteps?: string;
  setupSteps?: string;
  setup_steps?: string;
  // Rules bullets
  RulesBullets?: string;
  rulesBullets?: string;
  rules_bullets?: string;
  // BGG ID
  BggId?: string | number;
  bggId?: string | number;
  bgg_id?: string | number;
  // Staff pick
  IsStaffPick?: string | boolean;
  isStaffPick?: string | boolean;
  is_staff_pick?: string | boolean;
  StaffPick?: string | boolean;
  staffPick?: string | boolean;
  // Instructional video URL
  InstructionalVideoUrl?: string;
  instructionalVideoUrl?: string;
  instructional_video_url?: string;
  VideoUrl?: string;
  videoUrl?: string;
  // Allow other columns to exist but ignore them
  [key: string]: unknown;
}

interface ImportOptions {
  autofillFromBgg?: boolean;
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  rateLimitHit?: boolean;
  /** IDs of newly imported games that need BGG enrichment */
  needsEnrichmentIds?: string[];
}

interface EnrichBatchResult {
  enriched: number;
  skipped: number;
  rateLimitHit: boolean;
  errors: string[];
}

interface AddGameResult {
  success: boolean;
  error?: string;
}

const VALID_COMPLEXITIES: GameComplexity[] = ['simple', 'medium', 'complex'];

// Rate limiting delay for BGG API calls (3000ms between requests to avoid 429 errors)
const BGG_DELAY_MS = 3000;

// Required fields that must have values for a game to be inserted
const REQUIRED_GAME_FIELDS = ['min_players', 'max_players', 'min_time_minutes', 'max_time_minutes'] as const;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validates that all required fields have values.
 * Returns an array of missing field names, or empty array if all present.
 */
function getMissingRequiredFields(gameData: Record<string, unknown>): string[] {
  const missing: string[] = [];
  for (const field of REQUIRED_GAME_FIELDS) {
    const value = gameData[field];
    if (value === null || value === undefined || value === 0) {
      missing.push(field);
    }
  }
  return missing;
}

/**
 * Fields that BGG API can populate automatically.
 */
const BGG_POPULATABLE_FIELDS = [
  'cover_image_url',
  'bgg_rank',
  'bgg_rating',
  'pitch',
  'vibes',
  'instructional_video_url',
  'bgg_id',
  'min_players',
  'max_players',
  'min_time_minutes',
  'max_time_minutes',
  'complexity',
] as const;

/**
 * Checks if a game needs BGG enrichment (has missing fields that BGG can fill).
 */
function needsBggEnrichment(gameData: Record<string, unknown>): boolean {
  for (const field of BGG_POPULATABLE_FIELDS) {
    const value = gameData[field];
    if (value === null || value === undefined || value === '' ||
        (Array.isArray(value) && value.length === 0)) {
      return true;
    }
  }
  return false;
}

/**
 * Enriches game data with information from BoardGameGeek.
 * Only fills in fields that are missing (null/undefined/empty).
 * User-provided data always takes precedence.
 *
 * @throws BggRateLimitError if BGG rate limit is exceeded
 */
async function enrichGameFromBgg(
  title: string,
  existingData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // Search BGG by title (may throw BggRateLimitError)
  const searchResults = await searchBggGames(title);
  if (searchResults.length === 0) {
    return existingData;
  }

  // Rank results by fuzzy match score and pick the best match
  const rankedResults = rankSearchResults(title, searchResults);
  const bestMatch = rankedResults[0];

  // Reject if score is too low to avoid wrong matches
  const MIN_SCORE_THRESHOLD = 0.3;
  if ((bestMatch.matchScore ?? 0) < MIN_SCORE_THRESHOLD) {
    return existingData;
  }

  // Fetch full details from BGG (may throw BggRateLimitError)
  const details = await getBggGameDetails(bestMatch.id);
  if (!details) {
    return existingData;
  }

  // Create enriched data object, only filling missing fields
  const enriched = { ...existingData };

  // BGG ID
  if (!enriched.bgg_id) {
    enriched.bgg_id = bestMatch.id;
  }

  // Cover image
  if (!enriched.cover_image_url && details.cover_image_url) {
    enriched.cover_image_url = details.cover_image_url;
  }

  // BGG Rank
  if (enriched.bgg_rank === null && details.bgg_rank !== null) {
    enriched.bgg_rank = details.bgg_rank;
  }

  // BGG Rating
  if (enriched.bgg_rating === null && details.bgg_rating !== null) {
    enriched.bgg_rating = details.bgg_rating;
  }

  // Description/Pitch
  if (!enriched.pitch && details.pitch) {
    enriched.pitch = details.pitch;
  }

  // Vibes/Categories
  const currentVibes = enriched.vibes as string[] | undefined;
  if ((!currentVibes || currentVibes.length === 0) && details.vibes?.length) {
    enriched.vibes = details.vibes;
  }

  // Instructional video
  if (!enriched.instructional_video_url && details.instructional_video_url) {
    enriched.instructional_video_url = details.instructional_video_url;
  }

  // Player counts (only if not provided)
  if (enriched.min_players === null && details.min_players) {
    enriched.min_players = details.min_players;
  }
  if (enriched.max_players === null && details.max_players) {
    enriched.max_players = details.max_players;
  }

  // Playtime (only if not provided)
  if (enriched.min_time_minutes === null && details.min_time_minutes) {
    enriched.min_time_minutes = details.min_time_minutes;
  }
  if (enriched.max_time_minutes === null && details.max_time_minutes) {
    enriched.max_time_minutes = details.max_time_minutes;
  }

  // Complexity (only if using default)
  if (enriched.complexity === 'medium' && details.complexity) {
    enriched.complexity = details.complexity;
  }

  return enriched;
}

export async function importGames(
  games: CSVGameImport[],
  options?: ImportOptions
): Promise<ImportResult> {
  const autofillFromBgg = options?.autofillFromBgg ?? false;
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [], rateLimitHit: false };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be logged in to import games');
  }

  const venue = await getVenueByOwnerId(user.id);

  if (!venue) {
    throw new Error('No venue found for your account');
  }

  function parseNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = parseInt(String(value), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function parseFloat_(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = parseFloat(String(value));
    return Number.isNaN(parsed) ? null : parsed;
  }

  function parseCopies(value: string | number | null | undefined): number {
    const parsed = parseInt(String(value || ''), 10);
    return Number.isNaN(parsed) || parsed < 0 ? 1 : parsed;
  }

  function parseBoolean(value: string | boolean | null | undefined): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      return lower === 'true' || lower === '1' || lower === 'yes';
    }
    return false;
  }

  function parseVibes(value: string | null | undefined): string[] {
    if (!value || typeof value !== 'string') return [];
    const trimmed = value.trim();
    if (!trimmed) return [];

    // Try parsing as JSON array first
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((v): v is string => typeof v === 'string');
        }
      } catch {
        // Fall through to comma-separated parsing
      }
    }

    // Parse as comma-separated values
    return trimmed
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  function parseStatus(value: string | null | undefined): GameStatus {
    if (!value) return 'in_rotation';
    const lower = value.toLowerCase().trim();
    return VALID_STATUSES.includes(lower as GameStatus)
      ? (lower as GameStatus)
      : 'in_rotation';
  }

  function parseCondition(value: string | null | undefined): GameCondition {
    if (!value) return 'good';
    const lower = value.toLowerCase().trim();
    return VALID_CONDITIONS.includes(lower as GameCondition)
      ? (lower as GameCondition)
      : 'good';
  }

  function parseComplexity(value: string | null | undefined): GameComplexity {
    if (!value) return 'medium';
    const lower = value.toLowerCase().trim();
    return VALID_COMPLEXITIES.includes(lower as GameComplexity)
      ? (lower as GameComplexity)
      : 'medium';
  }

  // Fetch existing games for this venue to check for duplicates
  const { data: existingGames } = await getSupabaseAdmin()
    .from('games')
    .select('id, title, copies_in_rotation')
    .eq('venue_id', venue.id);

  // Build a map of normalized title -> existing game
  const existingGameMap = new Map<string, { id: string; title: string; copies_in_rotation: number }>();
  for (const game of existingGames ?? []) {
    const normalizedTitle = normalizeTitle(game.title);
    existingGameMap.set(normalizedTitle, {
      id: game.id,
      title: game.title,
      copies_in_rotation: game.copies_in_rotation ?? 1,
    });
  }

  const newGames: Array<Record<string, unknown>> = [];
  const updates: Array<{ id: string; copies_in_rotation: number }> = [];

  // Process each game from CSV
  for (let i = 0; i < games.length; i++) {
    const game = games[i];

    try {
      const title = (game.Title || game.title || '').toString().trim();
      if (!title) {
        result.errors.push(`Row ${i + 2}: Missing title`);
        continue;
      }

      const normalizedTitle = normalizeTitle(title);
      const copies = parseCopies(
        game.copies_in_rotation || game.CopiesInRotation || game.Copies || game.copies
      );

      const existing = existingGameMap.get(normalizedTitle);
      if (existing) {
        // Duplicate found: increment copies_in_rotation
        const newCopiesCount = existing.copies_in_rotation + copies;
        updates.push({ id: existing.id, copies_in_rotation: newCopiesCount });
        // Update the map in case there are multiple rows for the same game in CSV
        existing.copies_in_rotation = newCopiesCount;
        continue;
      }

      // Parse all fields from CSV
      let gameData: Record<string, unknown> = {
        venue_id: venue.id,
        title,
        min_players: parseNumber(game.MinPlayers || game.minPlayers || game.min_players),
        max_players: parseNumber(game.MaxPlayers || game.maxPlayers || game.max_players),
        min_time_minutes: parseNumber(game.MinTime || game.minTime || game.min_time_minutes),
        max_time_minutes: parseNumber(game.MaxTime || game.maxTime || game.max_time_minutes),
        complexity: parseComplexity(game.Complexity || game.complexity),
        copies_in_rotation: copies,
        status: parseStatus(game.Status || game.status),
        condition: parseCondition(game.Condition || game.condition),
        pitch: (game.Description || game.description || game.Pitch || game.pitch || '')?.toString().trim() || null,
        shelf_location: (game.ShelfLocation || game.shelfLocation || game.shelf_location || '')?.toString().trim() || null,
        bgg_rank: parseNumber(game.BggRank || game.bggRank || game.bgg_rank),
        bgg_rating: parseFloat_(game.BggRating || game.bggRating || game.bgg_rating),
        cover_image_url: (game.ImageUrl || game.imageUrl || game.image_url || game.cover_image_url || game.CoverImageUrl || '')?.toString().trim() || null,
        vibes: parseVibes(game.Vibes || game.vibes),
        setup_steps: (game.SetupSteps || game.setupSteps || game.setup_steps || '')?.toString().trim() || null,
        rules_bullets: (game.RulesBullets || game.rulesBullets || game.rules_bullets || '')?.toString().trim() || null,
        bgg_id: (game.BggId || game.bggId || game.bgg_id || '')?.toString().trim() || null,
        is_staff_pick: parseBoolean(game.IsStaffPick || game.isStaffPick || game.is_staff_pick || game.StaffPick || game.staffPick),
        instructional_video_url: (game.InstructionalVideoUrl || game.instructionalVideoUrl || game.instructional_video_url || game.VideoUrl || game.videoUrl || '')?.toString().trim() || null,
      };

      // Track whether this game needs BGG enrichment (done in batches after insert)
      const wantsBggEnrichment = autofillFromBgg && needsBggEnrichment(gameData);

      // If not using BGG, validate required fields now.
      // If using BGG, we insert with defaults and enrich later.
      if (!wantsBggEnrichment) {
        const missingFields = getMissingRequiredFields(gameData);
        if (missingFields.length > 0) {
          result.skipped++;
          result.errors.push(`Row ${i + 2} "${title}": Missing required fields (${missingFields.join(', ')}) - skipped`);
          continue;
        }
      } else {
        // Set temporary defaults for required fields so the row can be inserted.
        // These will be overwritten by BGG enrichment.
        if (gameData.min_players === null) gameData.min_players = 1;
        if (gameData.max_players === null) gameData.max_players = 4;
        if (gameData.min_time_minutes === null) gameData.min_time_minutes = 30;
        if (gameData.max_time_minutes === null) gameData.max_time_minutes = 60;
      }

      newGames.push({ ...gameData, _needsBggEnrichment: wantsBggEnrichment });

      // Add to map to handle duplicates within the same CSV
      existingGameMap.set(normalizedTitle, {
        id: '',
        title,
        copies_in_rotation: copies,
      });
    } catch (error) {
      result.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Perform batch insert for new games
  if (newGames.length > 0) {
    // Separate the enrichment flag before inserting
    const enrichmentFlags = newGames.map(g => g._needsBggEnrichment === true);
    const gamesToInsert = newGames.map(({ _needsBggEnrichment, ...rest }) => rest);

    const { data: insertedGames, error: insertError } = await getSupabaseAdmin()
      .from('games')
      .insert(gamesToInsert)
      .select('id');

    if (insertError) {
      console.error('Failed to insert games:', insertError);
      result.errors.push(`Database error: ${insertError.message}`);
    } else {
      result.imported = gamesToInsert.length;
      // Collect IDs of games that need BGG enrichment
      if (insertedGames) {
        result.needsEnrichmentIds = insertedGames
          .filter((_, idx) => enrichmentFlags[idx])
          .map(g => g.id);
      }
    }
  }

  // Perform updates for existing games
  for (const update of updates) {
    const { error: updateError } = await getSupabaseAdmin()
      .from('games')
      .update({ copies_in_rotation: update.copies_in_rotation })
      .eq('id', update.id);

    if (updateError) {
      result.errors.push(`Failed to update game: ${updateError.message}`);
    } else {
      result.updated++;
    }
  }

  revalidatePath('/admin/library');

  return result;
}

/**
 * Enriches a batch of games from BGG API.
 * Designed to be called repeatedly by the client with small batches
 * to avoid Vercel function timeouts and BGG rate limits.
 */
export async function enrichGamesBatch(gameIds: string[]): Promise<EnrichBatchResult> {
  const result: EnrichBatchResult = { enriched: 0, skipped: 0, rateLimitHit: false, errors: [] };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in');
  }

  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    throw new Error('No venue found for your account');
  }

  // Fetch the games to enrich
  const { data: games, error: fetchError } = await getSupabaseAdmin()
    .from('games')
    .select('id, title, cover_image_url, bgg_rank, bgg_rating, pitch, vibes, instructional_video_url, bgg_id, min_players, max_players, min_time_minutes, max_time_minutes, complexity')
    .eq('venue_id', venue.id)
    .in('id', gameIds);

  if (fetchError || !games) {
    result.errors.push('Failed to fetch games for enrichment');
    return result;
  }

  for (let i = 0; i < games.length; i++) {
    const game = games[i];

    if (result.rateLimitHit) {
      result.skipped++;
      continue;
    }

    try {
      const existingData: Record<string, unknown> = { ...game };
      delete existingData.id;

      const enriched = await enrichGameFromBgg(game.title, existingData);

      // Build update object with only changed fields
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(enriched)) {
        if (key !== 'id' && value !== game[key as keyof typeof game]) {
          updates[key] = value;
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await getSupabaseAdmin()
          .from('games')
          .update(updates)
          .eq('id', game.id);

        if (updateError) {
          result.errors.push(`Failed to update "${game.title}": ${updateError.message}`);
        } else {
          result.enriched++;
        }
      } else {
        result.skipped++;
      }
    } catch (error) {
      if (error instanceof BggRateLimitError) {
        result.rateLimitHit = true;
        result.skipped++;
        result.errors.push(`Rate limit hit while enriching "${game.title}"`);
      } else {
        result.errors.push(`Failed to enrich "${game.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Delay between BGG API calls
    if (i < games.length - 1 && !result.rateLimitHit) {
      await delay(BGG_DELAY_MS);
    }
  }

  revalidatePath('/admin/library');
  return result;
}

export async function addGame(formData: FormData): Promise<AddGameResult> {
  // Get current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in to add a game' };
  }

  // Get user's venue
  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: 'No venue found for your account' };
  }

  // Extract and validate form data
  const title = formData.get('title') as string | null;
  const description = formData.get('description') as string | null;
  const minPlayersStr = formData.get('minPlayers') as string | null;
  const maxPlayersStr = formData.get('maxPlayers') as string | null;
  const minTimeStr = formData.get('minTime') as string | null;
  const maxTimeStr = formData.get('maxTime') as string | null;
  const complexity = formData.get('complexity') as string | null;
  const shelfLocation = formData.get('shelfLocation') as string | null;
  const bggRankStr = formData.get('bggRank') as string | null;
  const bggRatingStr = formData.get('bggRating') as string | null;
  const copiesInRotationStr = formData.get('copiesInRotation') as string | null;
  const bggId = formData.get('bggId') as string | null;
  const imageUrl = formData.get('imageUrl') as string | null;
  const isStaffPickStr = formData.get('isStaffPick') as string | null;
  const instructionalVideoUrl = formData.get('instructionalVideoUrl') as string | null;

  // Validate required fields
  if (!title || title.trim() === '') {
    return { success: false, error: 'Title is required' };
  }

  if (!minPlayersStr || !maxPlayersStr) {
    return { success: false, error: 'Player count range is required' };
  }

  if (!minTimeStr || !maxTimeStr) {
    return { success: false, error: 'Playtime range is required' };
  }

  if (!complexity) {
    return { success: false, error: 'Complexity is required' };
  }

  // Parse and validate numeric fields
  const minPlayers = parseInt(minPlayersStr, 10);
  const maxPlayers = parseInt(maxPlayersStr, 10);
  const minTime = parseInt(minTimeStr, 10);
  const maxTime = parseInt(maxTimeStr, 10);

  if (isNaN(minPlayers) || isNaN(maxPlayers) || minPlayers < 1) {
    return { success: false, error: 'Invalid player count values' };
  }

  if (minPlayers > maxPlayers) {
    return { success: false, error: 'Minimum players cannot exceed maximum players' };
  }

  if (isNaN(minTime) || isNaN(maxTime) || minTime < 1) {
    return { success: false, error: 'Invalid playtime values' };
  }

  if (minTime > maxTime) {
    return { success: false, error: 'Minimum time cannot exceed maximum time' };
  }

  // Validate complexity
  if (!VALID_COMPLEXITIES.includes(complexity as GameComplexity)) {
    return { success: false, error: 'Invalid complexity value' };
  }

  // Parse optional BGG fields
  let bggRank: number | null = null;
  let bggRating: number | null = null;

  if (bggRankStr && bggRankStr.trim() !== '') {
    bggRank = parseInt(bggRankStr, 10);
    if (isNaN(bggRank) || bggRank < 1) {
      return { success: false, error: 'BGG Rank must be a positive number' };
    }
  }

  if (bggRatingStr && bggRatingStr.trim() !== '') {
    bggRating = parseFloat(bggRatingStr);
    if (isNaN(bggRating) || bggRating < 0 || bggRating > 10) {
      return { success: false, error: 'BGG Rating must be between 0 and 10' };
    }
  }

  // Parse copies in rotation (default to 1)
  let copiesInRotation = 1;
  if (copiesInRotationStr && copiesInRotationStr.trim() !== '') {
    copiesInRotation = parseInt(copiesInRotationStr, 10);
    if (isNaN(copiesInRotation) || copiesInRotation < 0) {
      return { success: false, error: 'Number of copies must be 0 or greater' };
    }
  }

  // Parse staff pick (default to false)
  const isStaffPick = isStaffPickStr === 'true';

  // Insert the new game
  const { error: insertError } = await getSupabaseAdmin()
    .from('games')
    .insert({
      venue_id: venue.id,
      bgg_id: bggId || null,
      title: title.trim(),
      pitch: description?.trim() || null,
      min_players: minPlayers,
      max_players: maxPlayers,
      min_time_minutes: minTime,
      max_time_minutes: maxTime,
      complexity: complexity as GameComplexity,
      shelf_location: shelfLocation?.trim() || null,
      bgg_rank: bggRank,
      bgg_rating: bggRating,
      copies_in_rotation: copiesInRotation,
      cover_image_url: imageUrl?.trim() || null,
      is_staff_pick: isStaffPick,
      instructional_video_url: instructionalVideoUrl?.trim() || null,
      status: 'in_rotation',
      condition: 'good',
      vibes: [],
    });

  if (insertError) {
    console.error('Failed to insert game:', insertError);
    return { success: false, error: 'Failed to add game. Please try again.' };
  }

  // Revalidate the library page to show the new game
  revalidatePath('/admin/library');

  return { success: true };
}

export async function updateGame(formData: FormData): Promise<AddGameResult> {
  // Get current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in to update a game' };
  }

  // Get user's venue
  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: 'No venue found for your account' };
  }

  const id = formData.get('id') as string | null;
  if (!id) {
    return { success: false, error: 'Game ID is required' };
  }

  // Extract and validate form data
  const title = formData.get('title') as string | null;
  const description = formData.get('description') as string | null;
  const minPlayersStr = formData.get('minPlayers') as string | null;
  const maxPlayersStr = formData.get('maxPlayers') as string | null;
  const minTimeStr = formData.get('minTime') as string | null;
  const maxTimeStr = formData.get('maxTime') as string | null;
  const complexity = formData.get('complexity') as string | null;
  const shelfLocation = formData.get('shelfLocation') as string | null;
  const bggRankStr = formData.get('bggRank') as string | null;
  const bggRatingStr = formData.get('bggRating') as string | null;
  const copiesInRotationStr = formData.get('copiesInRotation') as string | null;
  const statusStr = formData.get('status') as string | null;
  const conditionStr = formData.get('condition') as string | null;
  const vibesJson = formData.get('vibes') as string | null;
  const setupSteps = formData.get('setupSteps') as string | null;
  const rulesBullets = formData.get('rulesBullets') as string | null;
  const bggId = formData.get('bggId') as string | null;
  const imageUrl = formData.get('imageUrl') as string | null;
  const isStaffPickStr = formData.get('isStaffPick') as string | null;
  const instructionalVideoUrl = formData.get('instructionalVideoUrl') as string | null;

  // Validate required fields
  if (!title || title.trim() === '') {
    return { success: false, error: 'Title is required' };
  }

  if (!minPlayersStr || !maxPlayersStr) {
    return { success: false, error: 'Player count range is required' };
  }

  if (!minTimeStr || !maxTimeStr) {
    return { success: false, error: 'Playtime range is required' };
  }

  if (!complexity) {
    return { success: false, error: 'Complexity is required' };
  }

  // Parse and validate numeric fields
  const minPlayers = parseInt(minPlayersStr, 10);
  const maxPlayers = parseInt(maxPlayersStr, 10);
  const minTime = parseInt(minTimeStr, 10);
  const maxTime = parseInt(maxTimeStr, 10);

  if (isNaN(minPlayers) || isNaN(maxPlayers) || minPlayers < 1) {
    return { success: false, error: 'Invalid player count values' };
  }

  if (minPlayers > maxPlayers) {
    return { success: false, error: 'Minimum players cannot exceed maximum players' };
  }

  if (isNaN(minTime) || isNaN(maxTime) || minTime < 1) {
    return { success: false, error: 'Invalid playtime values' };
  }

  if (minTime > maxTime) {
    return { success: false, error: 'Minimum time cannot exceed maximum time' };
  }

  // Validate complexity
  if (!VALID_COMPLEXITIES.includes(complexity as GameComplexity)) {
    return { success: false, error: 'Invalid complexity value' };
  }

  // Validate status and condition
  const status: GameStatus = statusStr && VALID_STATUSES.includes(statusStr as GameStatus)
    ? (statusStr as GameStatus)
    : 'in_rotation';

  const condition: GameCondition = conditionStr && VALID_CONDITIONS.includes(conditionStr as GameCondition)
    ? (conditionStr as GameCondition)
    : 'good';

  // Parse vibes array
  let vibes: string[] = [];
  if (vibesJson) {
    try {
      vibes = JSON.parse(vibesJson);
    } catch {
      // If parsing fails, keep empty array
    }
  }

  // Parse optional BGG fields
  let bggRank: number | null = null;
  let bggRating: number | null = null;

  if (bggRankStr && bggRankStr.trim() !== '') {
    bggRank = parseInt(bggRankStr, 10);
    if (isNaN(bggRank) || bggRank < 1) {
      return { success: false, error: 'BGG Rank must be a positive number' };
    }
  }

  if (bggRatingStr && bggRatingStr.trim() !== '') {
    bggRating = parseFloat(bggRatingStr);
    if (isNaN(bggRating) || bggRating < 0 || bggRating > 10) {
      return { success: false, error: 'BGG Rating must be between 0 and 10' };
    }
  }

  // Parse copies in rotation (default to 1)
  let copiesInRotation = 1;
  if (copiesInRotationStr && copiesInRotationStr.trim() !== '') {
    copiesInRotation = parseInt(copiesInRotationStr, 10);
    if (isNaN(copiesInRotation) || copiesInRotation < 0) {
      return { success: false, error: 'Number of copies must be 0 or greater' };
    }
  }

  // Parse staff pick (default to false)
  const isStaffPick = isStaffPickStr === 'true';

  const { error: updateError } = await getSupabaseAdmin()
    .from('games')
    .update({
      venue_id: venue.id,
      bgg_id: bggId || null,
      title: title.trim(),
      pitch: description?.trim() || null,
      min_players: minPlayers,
      max_players: maxPlayers,
      min_time_minutes: minTime,
      max_time_minutes: maxTime,
      complexity: complexity as GameComplexity,
      shelf_location: shelfLocation?.trim() || null,
      bgg_rank: bggRank,
      bgg_rating: bggRating,
      copies_in_rotation: copiesInRotation,
      cover_image_url: imageUrl?.trim() || null,
      is_staff_pick: isStaffPick,
      instructional_video_url: instructionalVideoUrl?.trim() || null,
      status,
      condition,
      vibes,
      setup_steps: setupSteps?.trim() || null,
      rules_bullets: rulesBullets?.trim() || null,
    })
    .eq('id', id);

  if (updateError) {
    console.error('Failed to update game:', updateError);
    return { success: false, error: 'Failed to update game. Please try again.' };
  }

  revalidatePath('/admin/library');

  return { success: true };
}

/**
 * Inline field update - for quick edits directly in the table.
 * Supports: status, condition, shelf_location, copies_in_rotation
 */
export interface InlineUpdateResult {
  success: boolean;
  error?: string;
}

type InlineUpdateField = 'status' | 'condition' | 'shelf_location' | 'copies_in_rotation' | 'is_staff_pick';

export async function updateGameField(
  gameId: string,
  field: InlineUpdateField,
  value: string | number | boolean
): Promise<InlineUpdateResult> {
  // Get current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in to update a game' };
  }

  // Get user's venue
  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: 'No venue found for your account' };
  }

  // Validate the game exists and belongs to this venue
  const { data: existingGame, error: fetchError } = await getSupabaseAdmin()
    .from('games')
    .select('id, venue_id')
    .eq('id', gameId)
    .single();

  if (fetchError || !existingGame) {
    return { success: false, error: 'Game not found' };
  }

  if (existingGame.venue_id !== venue.id) {
    return { success: false, error: 'Game does not belong to your venue' };
  }

  // Validate and prepare the update
  let updateData: Record<string, unknown> = {};

  switch (field) {
    case 'status':
      if (!VALID_STATUSES.includes(value as GameStatus)) {
        return { success: false, error: 'Invalid status value' };
      }
      updateData = { status: value };
      break;

    case 'condition':
      if (!VALID_CONDITIONS.includes(value as GameCondition)) {
        return { success: false, error: 'Invalid condition value' };
      }
      updateData = { condition: value };
      break;

    case 'shelf_location':
      updateData = { shelf_location: String(value).trim() || null };
      break;

    case 'copies_in_rotation':
      const copies = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (isNaN(copies) || copies < 0) {
        return { success: false, error: 'Copies must be 0 or greater' };
      }
      updateData = { copies_in_rotation: copies };
      break;

    case 'is_staff_pick':
      const isStaffPick = value === true || value === 'true';
      updateData = { is_staff_pick: isStaffPick };
      break;

    default:
      return { success: false, error: 'Invalid field' };
  }

  // Perform the update
  const { error: updateError } = await getSupabaseAdmin()
    .from('games')
    .update(updateData)
    .eq('id', gameId);

  if (updateError) {
    console.error('Failed to update game field:', updateError);
    return { success: false, error: 'Failed to update. Please try again.' };
  }

  revalidatePath('/admin/library');

  return { success: true };
}

/**
 * Returns a Set of game IDs from the venue's library that are currently trending on BGG.
 * Used by the library list to show trending indicators.
 */
export async function getTrendingGameIds(venueId: string): Promise<Set<string>> {
  // Fetch BGG hot list
  const hotGames = await getBggHotGames();
  if (hotGames.length === 0) return new Set();

  // Fetch venue's games (just id, bgg_id, title for efficiency)
  const { data: localGames } = await getSupabaseAdmin()
    .from('games')
    .select('id, bgg_id, title')
    .eq('venue_id', venueId);

  if (!localGames) return new Set();

  // Build lookup structures
  const bggIdToGameId = new Map<string, string>();
  const titleToGameId = new Map<string, string>();

  for (const game of localGames) {
    if (game.bgg_id) {
      bggIdToGameId.set(game.bgg_id, game.id);
    }
    titleToGameId.set(normalizeTitle(game.title), game.id);
  }

  // Find matches
  const trendingIds = new Set<string>();

  for (const hot of hotGames) {
    const byId = bggIdToGameId.get(hot.bggId);
    if (byId) {
      trendingIds.add(byId);
      continue;
    }

    const byTitle = titleToGameId.get(normalizeTitle(hot.title));
    if (byTitle) {
      trendingIds.add(byTitle);
    }
  }

  return trendingIds;
}

/**
 * Fetches a cover image from BoardGameGeek for a game missing one.
 * Searches BGG by title, takes the top result's full image URL,
 * and saves it to the database.
 */
export interface FetchCoverResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export async function fetchCoverFromBgg(
  gameId: string,
  title: string
): Promise<FetchCoverResult> {
  // Get current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in' };
  }

  // Get user's venue
  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: 'No venue found for your account' };
  }

  // Validate the game exists and belongs to this venue
  const { data: existingGame, error: fetchError } = await getSupabaseAdmin()
    .from('games')
    .select('id, venue_id')
    .eq('id', gameId)
    .single();

  if (fetchError || !existingGame) {
    return { success: false, error: 'Game not found' };
  }

  if (existingGame.venue_id !== venue.id) {
    return { success: false, error: 'Game does not belong to your venue' };
  }

  // Search BGG for the game
  const searchResults = await searchBggGames(title);
  if (searchResults.length === 0) {
    return { success: false, error: 'No match found on BGG' };
  }

  // Rank results by fuzzy match score and pick the best match
  const rankedResults = rankSearchResults(title, searchResults);
  const bestMatch = rankedResults[0];

  // Reject if score is too low to avoid wrong matches
  const MIN_SCORE_THRESHOLD = 0.3;
  if ((bestMatch.matchScore ?? 0) < MIN_SCORE_THRESHOLD) {
    return {
      success: false,
      error: `Best match "${bestMatch.title}" scored too low (${((bestMatch.matchScore ?? 0) * 100).toFixed(0)}%)`,
    };
  }

  // Get full details for the best match (includes full-size image URL)
  const details = await getBggGameDetails(bestMatch.id);
  if (!details || !details.cover_image_url) {
    return { success: false, error: 'Could not retrieve cover image from BGG' };
  }

  // Update the game with the cover image URL
  const { error: updateError } = await getSupabaseAdmin()
    .from('games')
    .update({ cover_image_url: details.cover_image_url })
    .eq('id', gameId);

  if (updateError) {
    console.error('Failed to update game cover:', updateError);
    return { success: false, error: 'Failed to save cover image' };
  }

  revalidatePath('/admin/library');

  return { success: true, imageUrl: details.cover_image_url };
}

/**
 * Fetches an instructional video URL from BoardGameGeek for a game.
 * Searches BGG by title (or uses existing bgg_id), finds the best instructional video,
 * and saves it to the database.
 */
export interface FetchVideoResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
}

export async function fetchVideoFromBgg(
  gameId: string,
  title: string
): Promise<FetchVideoResult> {
  // Get current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in' };
  }

  // Get user's venue
  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: 'No venue found for your account' };
  }

  // Validate the game exists and belongs to this venue
  const { data: existingGame, error: fetchError } = await getSupabaseAdmin()
    .from('games')
    .select('id, venue_id, bgg_id')
    .eq('id', gameId)
    .single();

  if (fetchError || !existingGame) {
    return { success: false, error: 'Game not found' };
  }

  if (existingGame.venue_id !== venue.id) {
    return { success: false, error: 'Game does not belong to your venue' };
  }

  let bggId = existingGame.bgg_id;

  // If no BGG ID, search for the game first
  if (!bggId) {
    const searchResults = await searchBggGames(title);
    if (searchResults.length === 0) {
      return { success: false, error: 'No match found on BGG' };
    }

    // Rank results by fuzzy match score and pick the best match
    const rankedResults = rankSearchResults(title, searchResults);
    const bestMatch = rankedResults[0];

    // Reject if score is too low to avoid wrong matches
    const MIN_SCORE_THRESHOLD = 0.3;
    if ((bestMatch.matchScore ?? 0) < MIN_SCORE_THRESHOLD) {
      return {
        success: false,
        error: `Best match "${bestMatch.title}" scored too low (${((bestMatch.matchScore ?? 0) * 100).toFixed(0)}%)`,
      };
    }

    bggId = bestMatch.id;
  }

  // Fetch the best instructional video
  const videoUrl = await getBggBestInstructionalVideo(bggId);
  if (!videoUrl) {
    return { success: false, error: 'No instructional videos found on BGG for this game' };
  }

  // Update the game with the video URL (and bgg_id if we didn't have it)
  const updateData: Record<string, unknown> = { instructional_video_url: videoUrl };
  if (!existingGame.bgg_id) {
    updateData.bgg_id = bggId;
  }

  const { error: updateError } = await getSupabaseAdmin()
    .from('games')
    .update(updateData)
    .eq('id', gameId);

  if (updateError) {
    console.error('Failed to update game video:', updateError);
    return { success: false, error: 'Failed to save video URL' };
  }

  revalidatePath('/admin/library');

  return { success: true, videoUrl };
}
