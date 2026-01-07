/**
 * Feedback Data Layer
 *
 * This module handles feedback history queries for the Feedback History Tile.
 * It queries sessions that have submitted feedback (not skipped) and provides
 * filtering, pagination, and aggregation capabilities.
 */

import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type {
  FeedbackFilters,
  FeedbackHistoryRow,
  FeedbackHistoryResult,
  FeedbackStats,
  FeedbackComplexity,
  FeedbackReplay,
  FeedbackSource,
} from '@/lib/db/types';

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Calculates the date range based on filter options.
 * Custom dates override presets.
 *
 * @param filters - Filter options containing date range settings
 * @returns Object with start and end ISO strings, or nulls if no range specified
 */
function getDateRange(filters?: FeedbackFilters): { start: string | null; end: string | null } {
  if (!filters) {
    return { start: null, end: null };
  }

  const now = new Date();
  let start: string | null = null;
  let end: string | null = null;

  // Custom dates override presets
  if (filters.startDate) {
    start = filters.startDate;
  } else if (filters.dateRangePreset) {
    switch (filters.dateRangePreset) {
      case 'today': {
        // Midnight today in local time
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        start = midnight.toISOString();
        break;
      }
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        break;
    }
  }

  if (filters.endDate) {
    end = filters.endDate;
  }

  return { start, end };
}

/**
 * Maps sentiment filter to rating value.
 *
 * @param sentiment - Sentiment filter value
 * @returns Rating value (1, 3, or 5)
 */
function sentimentToRating(sentiment: 'positive' | 'neutral' | 'negative'): number {
  switch (sentiment) {
    case 'positive':
      return 5;
    case 'neutral':
      return 3;
    case 'negative':
      return 1;
  }
}

/**
 * Escapes special characters in a string for use in Supabase ilike patterns.
 *
 * @param str - String to escape
 * @returns Escaped string safe for ilike
 */
function escapeIlike(str: string): string {
  // Escape %, _, and \ which have special meaning in LIKE patterns
  return str.replace(/[%_\\]/g, '\\$&');
}

// -----------------------------------------------------------------------------
// Raw Query Result Type
// -----------------------------------------------------------------------------

/** Raw row structure returned from Supabase query (before transformation) */
interface RawFeedbackRow {
  id: string;
  started_at: string;
  ended_at: string;
  feedback_submitted_at: string;
  feedback_rating: number | null;
  feedback_complexity: FeedbackComplexity | null;
  feedback_replay: FeedbackReplay | null;
  feedback_comment: string | null;
  feedback_venue_rating: number | null;
  feedback_venue_comment: string | null;
  feedback_source: FeedbackSource | null;
  game_id: string | null;
  table_id: string | null;
  // Supabase returns FK joins as arrays even for single records
  games: { title: string }[] | { title: string } | null;
  venue_tables: { label: string }[] | { label: string } | null;
}

/**
 * Transforms a raw Supabase row into a FeedbackHistoryRow.
 * Handles FK array extraction pattern.
 *
 * @param raw - Raw row from Supabase
 * @returns Transformed FeedbackHistoryRow
 */
function transformRow(raw: RawFeedbackRow): FeedbackHistoryRow {
  // Handle FK relations - Supabase may return as array or object depending on query
  const gameData = Array.isArray(raw.games) ? raw.games[0] : raw.games;
  const tableData = Array.isArray(raw.venue_tables) ? raw.venue_tables[0] : raw.venue_tables;

  return {
    id: raw.id,
    submittedAt: raw.feedback_submitted_at,
    endedAt: raw.ended_at,
    startedAt: raw.started_at,
    gameId: raw.game_id,
    gameTitle: gameData?.title ?? null,
    tableId: raw.table_id,
    tableLabel: tableData?.label ?? null,
    gameRating: raw.feedback_rating,
    complexity: raw.feedback_complexity,
    replay: raw.feedback_replay,
    comment: raw.feedback_comment,
    venueRating: raw.feedback_venue_rating,
    venueComment: raw.feedback_venue_comment,
    source: raw.feedback_source ?? 'end_sheet',
  };
}

// -----------------------------------------------------------------------------
// Main Query Functions
// -----------------------------------------------------------------------------

/**
 * Fetches paginated feedback history for a venue with filtering.
 * Only returns sessions where feedback was actually submitted (not skipped).
 *
 * @param venueId - The venue UUID
 * @param filters - Optional filter criteria
 * @param limit - Page size (default: 50)
 * @param cursor - Pagination cursor (feedback_submitted_at of last row)
 * @returns Paginated feedback rows with stats
 */
export async function getFeedbackHistory(
  venueId: string,
  filters?: FeedbackFilters,
  limit: number = 50,
  cursor?: string
): Promise<FeedbackHistoryResult> {
  const supabase = getSupabaseAdmin();
  const { start, end } = getDateRange(filters);

  // Build the base query
  let query = supabase
    .from('sessions')
    .select(
      `
      id,
      started_at,
      ended_at,
      feedback_submitted_at,
      feedback_rating,
      feedback_complexity,
      feedback_replay,
      feedback_comment,
      feedback_venue_rating,
      feedback_venue_comment,
      feedback_source,
      game_id,
      table_id,
      games!sessions_game_id_fkey(title),
      venue_tables!sessions_table_id_fkey(label)
    `,
      { count: 'exact' }
    )
    .eq('venue_id', venueId)
    .not('feedback_submitted_at', 'is', null)
    .eq('feedback_skipped', false);

  // Apply date range filters
  if (start) {
    query = query.gte('feedback_submitted_at', start);
  }
  if (end) {
    query = query.lte('feedback_submitted_at', end);
  }

  // Apply sentiment filter
  if (filters?.sentiment) {
    const ratingValue = sentimentToRating(filters.sentiment);
    const ratingType = filters.ratingType ?? 'all';

    if (ratingType === 'game') {
      query = query.eq('feedback_rating', ratingValue);
    } else if (ratingType === 'venue') {
      query = query.eq('feedback_venue_rating', ratingValue);
    } else {
      // 'all' - match either game OR venue rating
      query = query.or(
        `feedback_rating.eq.${ratingValue},feedback_venue_rating.eq.${ratingValue}`
      );
    }
  }

  // Apply hasComment filter
  if (filters?.hasComment === true) {
    query = query.or(
      'feedback_comment.neq.,feedback_venue_comment.neq.'
    );
  }

  // Apply source filter
  if (filters?.source) {
    query = query.eq('feedback_source', filters.source);
  }

  // Apply cursor pagination
  if (cursor) {
    query = query.lt('feedback_submitted_at', cursor);
  }

  // Order by feedback_submitted_at DESC and limit
  query = query
    .order('feedback_submitted_at', { ascending: false })
    .limit(limit + 1); // Fetch one extra to check if there's more

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching feedback history:', error);
    throw new Error(`Failed to fetch feedback history: ${error.message}`);
  }

  let rows = (data ?? []) as RawFeedbackRow[];

  // Apply search filter client-side (needed to search across joined relations)
  if (filters?.search && filters.search.trim()) {
    const term = filters.search.toLowerCase().trim();
    rows = rows.filter((row) => {
      const gameData = Array.isArray(row.games) ? row.games[0] : row.games;
      const tableData = Array.isArray(row.venue_tables) ? row.venue_tables[0] : row.venue_tables;

      const commentMatch = row.feedback_comment?.toLowerCase().includes(term);
      const venueCommentMatch = row.feedback_venue_comment?.toLowerCase().includes(term);
      const gameMatch = gameData?.title?.toLowerCase().includes(term);
      const tableMatch = tableData?.label?.toLowerCase().includes(term);

      return commentMatch || venueCommentMatch || gameMatch || tableMatch;
    });
  }

  // Determine pagination
  const hasMore = rows.length > limit;
  const resultRows = hasMore ? rows.slice(0, limit) : rows;

  // Calculate next cursor
  let nextCursor: string | null = null;
  if (hasMore && resultRows.length > 0) {
    nextCursor = resultRows[resultRows.length - 1].feedback_submitted_at;
  }

  // Transform rows
  const transformedRows = resultRows.map(transformRow);

  // Calculate stats from the full filtered dataset
  // For accurate stats, we need to fetch all matching rows (without pagination)
  const stats = await getFeedbackStats(venueId, filters);

  return {
    rows: transformedRows,
    stats,
    nextCursor,
    totalCount: count ?? transformedRows.length,
  };
}

/**
 * Gets aggregated feedback stats for a venue within a date range.
 * Used for the summary header when filters change.
 *
 * @param venueId - The venue UUID
 * @param filters - Filter criteria (uses same date logic)
 * @returns Aggregated statistics
 */
export async function getFeedbackStats(
  venueId: string,
  filters?: FeedbackFilters
): Promise<FeedbackStats> {
  const supabase = getSupabaseAdmin();
  const { start, end } = getDateRange(filters);

  // Build query for stats - we need all rows matching filters (no pagination)
  let query = supabase
    .from('sessions')
    .select(
      `
      feedback_rating,
      feedback_venue_rating,
      feedback_comment,
      feedback_venue_comment,
      feedback_source
    `
    )
    .eq('venue_id', venueId)
    .not('feedback_submitted_at', 'is', null)
    .eq('feedback_skipped', false);

  // Apply date range filters
  if (start) {
    query = query.gte('feedback_submitted_at', start);
  }
  if (end) {
    query = query.lte('feedback_submitted_at', end);
  }

  // Apply source filter for consistency with history query
  if (filters?.source) {
    query = query.eq('feedback_source', filters.source);
  }

  // Note: We don't apply sentiment/hasComment/search filters here
  // Stats should reflect the broader dataset within the date range

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching feedback stats:', error);
    return createEmptyStats();
  }

  if (!data || data.length === 0) {
    return createEmptyStats();
  }

  // Aggregate stats
  let gameRatingSum = 0;
  let gameRatingCount = 0;
  let venueRatingSum = 0;
  let venueRatingCount = 0;
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;
  let commentCount = 0;
  let venueCommentCount = 0;

  for (const row of data) {
    // Game rating stats
    const gameRating = row.feedback_rating;
    if (gameRating !== null) {
      gameRatingSum += gameRating;
      gameRatingCount++;

      // Sentiment buckets based on game rating
      if (gameRating === 5) positiveCount++;
      else if (gameRating === 3) neutralCount++;
      else if (gameRating === 1) negativeCount++;
    }

    // Venue rating stats
    const venueRating = row.feedback_venue_rating;
    if (venueRating !== null) {
      venueRatingSum += venueRating;
      venueRatingCount++;
    }

    // Comment counts
    if (row.feedback_comment && row.feedback_comment.trim()) {
      commentCount++;
    }
    if (row.feedback_venue_comment && row.feedback_venue_comment.trim()) {
      venueCommentCount++;
    }
  }

  return {
    totalResponses: data.length,
    avgGameRating: gameRatingCount > 0
      ? Number((gameRatingSum / gameRatingCount).toFixed(1))
      : null,
    avgVenueRating: venueRatingCount > 0
      ? Number((venueRatingSum / venueRatingCount).toFixed(1))
      : null,
    positiveCount,
    neutralCount,
    negativeCount,
    commentCount,
    venueCommentCount,
  };
}

/**
 * Creates an empty stats object for when no data is available.
 *
 * @returns Empty FeedbackStats
 */
function createEmptyStats(): FeedbackStats {
  return {
    totalResponses: 0,
    avgGameRating: null,
    avgVenueRating: null,
    positiveCount: 0,
    neutralCount: 0,
    negativeCount: 0,
    commentCount: 0,
    venueCommentCount: 0,
  };
}
