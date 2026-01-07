/**
 * Session Data Layer
 *
 * This module manages session CRUD operations with a key invariant:
 * The table's active session (ended_at IS NULL) is the source of truth.
 *
 * Session State Invariants:
 * - At most one active session per table at any time
 * - If multiple active sessions exist, the most recent (by created_at) wins
 * - Cookies are convenience pointers; they must be validated against the table
 * - An "ended" session has ended_at set (non-null)
 * - feedback_submitted_at indicates when feedback was submitted (separate from session end)
 *
 * =============================================================================
 * MANUAL QA CHECKLIST - Session State Consistency
 * =============================================================================
 *
 * Test 1: Admin UI reflects guest check-in in realtime
 *   1. Open Admin /admin/sessions page
 *   2. In another browser/incognito, scan QR for Table 1 and click "Start Session"
 *   3. Verify: Admin shows Table 1 as "Browsing" (yellow), Live sessions count increments
 *
 * Test 2: Admin UI reflects game selection in realtime
 *   1. From browsing session (Test 1), select a game
 *   2. Verify: Admin shows Table 1 as "Playing [Game Name]" (green)
 *
 * Test 3: Admin UI reflects session end in realtime
 *   1. Guest clicks "End Session & Check Out"
 *   2. Verify: Admin shows Table 1 as "Available", Live sessions count decrements
 *
 * Test 4: Guest landing shows table's active session (not stale cookie)
 *   1. Start session at Table 1, select a game (shows "Now Playing Game A")
 *   2. Admin ends the session from Admin UI
 *   3. Refresh Guest page for Table 1
 *   4. Verify: Guest sees "Start Session" (not the old "Now Playing Game A")
 *
 * Test 5: New session after checkout has no previous game
 *   1. Start session, select Game A, confirm "Now Playing"
 *   2. Click "End Session & Check Out"
 *   3. Verify: Landing shows "Start Session" button
 *   4. Click "Start Session"
 *   5. Verify: Shows "Session Active" with "Find a game" (not Game A)
 *
 * Test 6: Cookie from Table A doesn't affect Table B
 *   1. Start session at Table 1, select Game A
 *   2. Navigate to Table 2's QR page (/v/venue/t/table2)
 *   3. Verify: Table 2 shows "Start Session" (ignores Table 1 cookie)
 *   4. Click "Start Session" at Table 2
 *   5. Verify: Table 2 has its own browsing session, Table 1 still shows Game A
 *
 * Test 7: Selecting game for Table A doesn't update Table B's session
 *   1. Open two incognito windows: one at Table 1, one at Table 2
 *   2. Start sessions on both tables (both in browsing state)
 *   3. In Table 1 window, select Game A
 *   4. Verify: Table 1 shows "Now Playing Game A"
 *   5. Refresh Table 2 window
 *   6. Verify: Table 2 still shows "Session Active" / browsing (not Game A)
 *
 * Test 8: End session ends correct table (not cookie table)
 *   1. Start session at Table 1, start session at Table 2
 *   2. On Table 2 page, click "End Session"
 *   3. Verify: Only Table 2's session ends; Table 1 still active
 *
 * Test 9: No duplicate active sessions can exist for the same table (INVARIANT)
 *   1. Attempt to create conditions where multiple active sessions might exist
 *   2. Verify: sanitizeActiveSessionsForTable always leaves at most one active
 *   3. Verify: Console logs show "[sanitize] Closing X duplicate sessions" if any
 *
 * Test 10: Ending session cannot reveal an older session ("random game" bug)
 *   1. Start session, select Game A
 *   2. (Simulate bug) If somehow two active sessions exist, end the newest
 *   3. Verify: endAllActiveSessionsForTable ends ALL of them
 *   4. Verify: Guest sees "Start Session" (not Game A or any old game)
 *
 * Test 11: New session after checkout starts browsing (no game inheritance)
 *   1. Start session, select Game A, confirm "Now Playing"
 *   2. End session via "End Session & Check Out"
 *   3. Click "Start Session" again
 *   4. Verify: Shows "Session Active" / browsing mode
 *   5. Verify: game_id is NULL in the new session (no inherited game)
 *
 * Test 12: Admin UI reflects guest start/select/end (RLS fix)
 *   1. Open Admin /admin/sessions (should use admin client, bypassing RLS)
 *   2. In incognito, start a guest session at Table 1
 *   3. Verify: Admin shows Table 1 as "Browsing" immediately
 *   4. Guest selects a game -> Admin shows "Playing"
 *   5. Guest ends session -> Admin shows Table 1 as "Available"
 *
 * Test 13: Feedback flow works correctly
 *   1. Start session, select a game
 *   2. Click "End Session & Check Out"
 *   3. Submit feedback -> ended_at AND feedback_submitted_at are set
 *   4. Skip feedback -> only ended_at is set, feedback_skipped = true
 *
 * =============================================================================
 */

import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type { Session, FeedbackComplexity, FeedbackReplay, FeedbackSource } from '@/lib/db/types';
import { getVenueBySlug } from './venues';

export interface CreateSessionParams {
  venueSlug: string;
  tableId: string;
  gameId?: string; // Now optional for check-in without game
  wizardParams?: unknown;
}

/**
 * Creates a new game session at a venue table.
 * If gameId is not provided, creates a "check-in" session (browsing state).
 *
 * @param params - Session creation parameters
 * @returns The created session row
 * @throws Error if venue or table is not found, or if gameId is provided but game doesn't exist
 */
export async function createSession(params: CreateSessionParams): Promise<Session> {
  const { venueSlug, tableId, gameId, wizardParams } = params;

  // Resolve venue by slug
  const venue = await getVenueBySlug(venueSlug);
  if (!venue) {
    throw new Error(`Venue not found: ${venueSlug}`);
  }

  // Verify table exists and belongs to this venue
  const { data: tableData, error: tableError } = await getSupabaseAdmin()
    .from('venue_tables')
    .select('id')
    .eq('id', tableId)
    .eq('venue_id', venue.id)
    .single();

  if (tableError || !tableData) {
    throw new Error(`Table not found or does not belong to venue: ${tableId}`);
  }

  // If gameId is provided, verify game exists
  if (gameId) {
    const { data: gameData, error: gameError } = await getSupabaseAdmin()
      .from('games')
      .select('id')
      .eq('id', gameId)
      .single();

    if (gameError || !gameData) {
      throw new Error(`Game not found: ${gameId}`);
    }
  }

  // Insert the session (game_id can be null for check-in)
  const { data: session, error: insertError } = await getSupabaseAdmin()
    .from('sessions')
    .insert({
      venue_id: venue.id,
      table_id: tableId,
      game_id: gameId ?? null,
      wizard_params: wizardParams ?? null,
    })
    .select('*')
    .single();

  if (insertError) {
    throw new Error(`Failed to create session: ${insertError.message}`);
  }

  return session as Session;
}

/**
 * Updates an existing session with a game selection.
 * Resets started_at to mark when the game actually started.
 *
 * @param sessionId - The session ID to update
 * @param gameId - The game ID to assign
 * @returns The updated session row
 * @throws Error if session or game is not found
 */
export async function updateSessionGame(sessionId: string, gameId: string): Promise<Session> {
  const supabase = getSupabaseAdmin();

  // Verify game exists
  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .select('id')
    .eq('id', gameId)
    .single();

  if (gameError || !gameData) {
    throw new Error(`Game not found: ${gameId}`);
  }

  // Verify session exists and is active (not ended)
  const { data: existingSession, error: sessionError } = await supabase
    .from('sessions')
    .select('id, ended_at')
    .eq('id', sessionId)
    .single();

  if (sessionError || !existingSession) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  if (existingSession.ended_at) {
    throw new Error(`Session has already ended: ${sessionId}`);
  }

  // Update the session with game_id and reset started_at
  const { data: session, error: updateError } = await supabase
    .from('sessions')
    .update({
      game_id: gameId,
      started_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select('*')
    .single();

  if (updateError) {
    throw new Error(`Failed to update session: ${updateError.message}`);
  }

  return session as Session;
}

/**
 * Gets the active session ID for a table, if one exists.
 * An active session is one where ended_at is NULL.
 *
 * @param tableId - The table ID to check
 * @returns The session ID if active, null otherwise
 */
export async function getActiveSessionId(tableId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('sessions')
    .select('id')
    .eq('table_id', tableId)
    .is('ended_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error checking for active session:', error);
    return null;
  }

  return data?.id ?? null;
}

/**
 * Gets the full active session for a table, if one exists.
 *
 * @param tableId - The table ID to check
 * @returns The full session if active, null otherwise
 */
export async function getActiveSession(tableId: string): Promise<Session | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('sessions')
    .select('*')
    .eq('table_id', tableId)
    .is('ended_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error checking for active session:', error);
    return null;
  }

  return data as Session | null;
}

/**
 * Gets a session by its ID.
 *
 * @param sessionId - The session ID to fetch
 * @returns The session if found, null otherwise
 */
export async function getSessionById(sessionId: string): Promise<Session | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching session by ID:', error);
    return null;
  }

  return data as Session | null;
}

/**
 * Validates that a session belongs to a specific table and is active.
 * Use this before updating a session from a cookie to prevent cross-table contamination.
 *
 * @param sessionId - The session ID to validate
 * @param tableId - The expected table ID
 * @returns The session if valid, null otherwise
 */
export async function validateSessionForTable(
  sessionId: string,
  tableId: string
): Promise<Session | null> {
  const session = await getSessionById(sessionId);

  // Session must exist, be active (not ended), and belong to the correct table
  if (
    session &&
    !session.ended_at &&
    session.table_id === tableId
  ) {
    return session;
  }

  return null;
}

/**
 * Sanitizes active sessions for a table by ending all but the canonical session.
 * Canonical selection prioritizes playing sessions, then newest started_at/created_at.
 * This enforces the "at most one active session per table" invariant.
 *
 * @param tableId - The table ID to sanitize
 * @returns The single canonical active session, or null if none exist
 */
export async function sanitizeActiveSessionsForTable(tableId: string): Promise<Session | null> {
  const supabase = getSupabaseAdmin();

  // Get ALL active sessions for this table
  const { data: activeSessions, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('table_id', tableId)
    .is('ended_at', null);

  if (error) {
    console.error('Error fetching active sessions for sanitization:', error);
    return null;
  }

  if (!activeSessions || activeSessions.length === 0) {
    return null;
  }

  const sortedSessions = (activeSessions as Session[]).sort((a, b) => {
    const aHasGame = a.game_id !== null;
    const bHasGame = b.game_id !== null;

    if (aHasGame !== bHasGame) {
      return aHasGame ? -1 : 1; // Prefer sessions with a game selected
    }

    const aTimestamp = new Date(a.started_at ?? a.created_at).getTime();
    const bTimestamp = new Date(b.started_at ?? b.created_at).getTime();

    return bTimestamp - aTimestamp; // Newest started_at (or created_at) wins
  });

  const [canonical, ...duplicates] = sortedSessions;

  if (duplicates.length > 0) {
    const duplicateIds = duplicates.map((s) => s.id);
    console.log(`[sanitize] Closing ${duplicates.length} duplicate active sessions for table ${tableId}: ${duplicateIds.join(', ')}`);

    const { error: endError } = await supabase
      .from('sessions')
      .update({ ended_at: new Date().toISOString() })
      .in('id', duplicateIds);

    if (endError) {
      console.error('Error ending duplicate sessions:', endError);
    }
  }

  return canonical;
}

/**
 * Ends ALL active sessions for a table.
 * Use this when completely clearing the table (e.g., guest checkout).
 *
 * @param tableId - The table ID to clear
 * @returns Number of sessions ended
 */
export async function endAllActiveSessionsForTable(tableId: string): Promise<number> {
  const supabase = getSupabaseAdmin();

  // Get all active sessions for this table
  const { data: activeSessions, error: fetchError } = await supabase
    .from('sessions')
    .select('id')
    .eq('table_id', tableId)
    .is('ended_at', null);

  if (fetchError || !activeSessions || activeSessions.length === 0) {
    return 0;
  }

  const sessionIds = activeSessions.map((s: { id: string }) => s.id);
  console.log(`[endAll] Ending ${sessionIds.length} active sessions for table ${tableId}: ${sessionIds.join(', ')}`);

  const { error: updateError } = await supabase
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .in('id', sessionIds);

  if (updateError) {
    console.error('Error ending sessions:', updateError);
    return 0;
  }

  return sessionIds.length;
}

/**
 * Session with joined game and venue_tables details.
 * Used when fetching sessions that include related data via Supabase joins.
 */
export interface SessionWithDetails extends Session {
  games: { title: string } | null;
  venue_tables: { label: string } | null;
}

/**
 * Gets all active sessions for a venue.
 * Used by Admin UI to display session status using admin client (bypasses RLS).
 *
 * @param venueId - The venue ID
 * @returns Array of active sessions with game and table details
 */
export async function getActiveSessionsForVenue(venueId: string): Promise<SessionWithDetails[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('sessions')
    .select('*, games(title), venue_tables(label)')
    .eq('venue_id', venueId)
    .is('ended_at', null)
    .order('started_at', { ascending: false });

  if (error) {
    console.error('Error fetching active sessions for venue:', error);
    return [];
  }

  return (data ?? []) as SessionWithDetails[];
}

/**
 * Gets a map of game_id -> count of active sessions using that game for a venue.
 * Used by Admin Library UI and Guest recommendation filtering.
 *
 * @param venueId - The venue ID
 * @returns Record mapping game_id to number of active sessions
 */
export async function getCopiesInUseByGame(venueId: string): Promise<Record<string, number>> {
  const { data, error } = await getSupabaseAdmin()
    .from('sessions')
    .select('game_id')
    .eq('venue_id', venueId)
    .is('ended_at', null)
    .not('game_id', 'is', null);

  if (error) {
    console.error('Error fetching copies in use:', error);
    return {};
  }

  const counts: Record<string, number> = {};
  for (const session of data ?? []) {
    const gameId = session.game_id as string;
    counts[gameId] = (counts[gameId] || 0) + 1;
  }

  return counts;
}

/**
 * Ends a session by setting ended_at.
 * Used when admin ends a session directly (without feedback).
 * Does NOT set feedback_submitted_at - that's only for when feedback is actually submitted.
 *
 * @param sessionId - The session ID to end
 * @returns The updated session row
 */
export async function endSession(sessionId: string): Promise<Session> {
  const { data: session, error } = await getSupabaseAdmin()
    .from('sessions')
    .update({
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to end session: ${error.message}`);
  }

  return session as Session;
}

// =============================================================================
// FEEDBACK SUBMISSION
// =============================================================================

export interface SubmitFeedbackParams {
  sessionId: string;
  tableId: string;
  // Feedback fields (all optional)
  gameRating?: number | null; // 1-5, mapped from sentiment
  venueRating?: number | null; // 1-5, mapped from sentiment
  complexity?: FeedbackComplexity | null;
  replay?: FeedbackReplay | null;
  comment?: string | null;
  // Skip flag
  skipped: boolean;
  // Source of feedback
  source?: FeedbackSource;
}

/**
 * Submits feedback for a session and ends the session.
 * This is the primary way guests end their session at checkout.
 *
 * @param params - Feedback submission parameters
 * @returns The updated session row
 * @throws Error if session doesn't exist, is already ended, or doesn't belong to table
 */
export async function submitFeedbackAndEndSession(params: SubmitFeedbackParams): Promise<Session> {
  const {
    sessionId,
    tableId,
    gameRating,
    venueRating,
    complexity,
    replay,
    comment,
    skipped,
    source = 'end_sheet',
  } = params;

  const supabase = getSupabaseAdmin();

  // Verify session exists, is active, and belongs to the table
  const { data: existingSession, error: fetchError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (fetchError || !existingSession) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  if (existingSession.ended_at) {
    throw new Error(`Session has already ended: ${sessionId}`);
  }

  if (existingSession.table_id !== tableId) {
    throw new Error(`Session does not belong to table: ${tableId}`);
  }

  const now = new Date().toISOString();

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    ended_at: now,
    feedback_skipped: skipped,
    feedback_source: source,
  };

  if (skipped) {
    // On skip: just end the session, leave feedback fields null
    // feedback_submitted_at remains null to indicate no feedback was given
  } else {
    // On submit: set feedback fields and feedback_submitted_at
    updatePayload.feedback_submitted_at = now;

    // Game feedback (only if game was selected)
    if (existingSession.game_id) {
      if (gameRating !== undefined) updatePayload.feedback_rating = gameRating;
      if (complexity !== undefined) updatePayload.feedback_complexity = complexity;
      if (replay !== undefined) updatePayload.feedback_replay = replay;
      // Store comment in game comment field if game exists
      if (comment !== undefined) updatePayload.feedback_comment = comment;
    }

    // Venue feedback
    if (venueRating !== undefined) updatePayload.feedback_venue_rating = venueRating;

    // Store comment in venue comment ONLY if venue rating is negative (1)
    // This captures "experience complaints" without duplicating every comment
    if (venueRating === 1 && comment) {
      updatePayload.feedback_venue_comment = comment;
    }
  }

  const { data: session, error: updateError } = await supabase
    .from('sessions')
    .update(updatePayload)
    .eq('id', sessionId)
    .select('*')
    .single();

  if (updateError) {
    throw new Error(`Failed to submit feedback: ${updateError.message}`);
  }

  return session as Session;
}

// =============================================================================
// HISTORICAL SESSIONS (for Admin "Recent sessions" view)
// =============================================================================

export type DateRangePreset = 'today' | '7d' | '30d';

export interface EndedSessionsOptions {
  /** Maximum rows to return (default: 50) */
  limit?: number;
  /** Cursor for pagination: { endedAt: string, id: string } */
  before?: { endedAt: string; id: string };
  /** Date range preset */
  dateRangePreset?: DateRangePreset;
  /** Custom start date (ISO string, overrides preset) */
  startDate?: string;
  /** Custom end date (ISO string, overrides preset) */
  endDate?: string;
  /** Search term to match table label or game title (case-insensitive substring) */
  search?: string;
}

export interface EndedSession extends Session {
  games: { title: string } | null;
  venue_tables: { label: string } | null;
}

export interface EndedSessionsResult {
  sessions: EndedSession[];
  /** Next cursor for pagination, null if no more results */
  nextCursor: { endedAt: string; id: string } | null;
}

/**
 * Gets ended sessions for a venue with pagination and filtering support.
 * Ended sessions are those with ended_at IS NOT NULL.
 *
 * Orders by ended_at DESC (most recently ended first),
 * with tie-breaker by id DESC to ensure stable ordering.
 *
 * @param venueId - The venue ID
 * @param options - Pagination and filter options
 * @returns Paginated ended sessions with next cursor
 */
// =============================================================================
// FEEDBACK AGGREGATION (for Admin Dashboard)
// =============================================================================

/** Config constant for feedback aggregation timeframe */
export const FEEDBACK_TIMEFRAME_DAYS = 90;

/** Feedback row for aggregation */
export interface FeedbackRow {
  id: string;
  game_id: string;
  feedback_rating: number | null;
  feedback_complexity: FeedbackComplexity | null;
  feedback_replay: FeedbackReplay | null;
  feedback_comment: string | null;
  feedback_submitted_at: string;
}

/** Per-game feedback summary for Library display */
export interface GameFeedbackSummary {
  gameId: string;
  avgRating: number | null;
  responseCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  playAgainYes: number;
  playAgainMaybe: number;
  playAgainNo: number;
}

/**
 * Fetches feedback rows for a venue within a timeframe.
 * Used to compute per-game aggregates for the Library page.
 *
 * @param venueId - The venue ID
 * @param days - Timeframe in days (default: 90)
 * @returns Map of game_id to GameFeedbackSummary
 */
export async function getFeedbackSummariesByGame(
  venueId: string,
  days: number = FEEDBACK_TIMEFRAME_DAYS
): Promise<Record<string, GameFeedbackSummary>> {
  const supabase = getSupabaseAdmin();
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Fetch feedback rows with game_id, within timeframe
  const { data, error } = await supabase
    .from('sessions')
    .select('id, game_id, feedback_rating, feedback_complexity, feedback_replay, feedback_comment, feedback_submitted_at')
    .eq('venue_id', venueId)
    .not('ended_at', 'is', null)
    .not('feedback_submitted_at', 'is', null)
    .not('game_id', 'is', null)
    .gte('feedback_submitted_at', cutoffDate);

  if (error) {
    console.error('Error fetching feedback for venue:', error);
    return {};
  }

  // Aggregate by game_id
  const summaries: Record<string, GameFeedbackSummary> = {};

  for (const row of data ?? []) {
    const gameId = row.game_id as string;
    if (!summaries[gameId]) {
      summaries[gameId] = {
        gameId,
        avgRating: null,
        responseCount: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
        playAgainYes: 0,
        playAgainMaybe: 0,
        playAgainNo: 0,
      };
    }

    const summary = summaries[gameId];
    summary.responseCount++;

    // Rating buckets: negative (1,2), neutral (3), positive (4,5)
    // Also works for 1/3/5 scale
    const rating = row.feedback_rating;
    if (rating !== null) {
      if (rating <= 2) summary.negativeCount++;
      else if (rating === 3) summary.neutralCount++;
      else if (rating >= 4) summary.positiveCount++;
    }

    // Play again breakdown
    const replay = row.feedback_replay as FeedbackReplay | null;
    if (replay === 'definitely') summary.playAgainYes++;
    else if (replay === 'maybe') summary.playAgainMaybe++;
    else if (replay === 'no') summary.playAgainNo++;
  }

  // Compute average ratings
  for (const gameId of Object.keys(summaries)) {
    const summary = summaries[gameId];
    const ratedRows = (data ?? []).filter(
      (r) => r.game_id === gameId && r.feedback_rating !== null
    );
    if (ratedRows.length > 0) {
      const sum = ratedRows.reduce((acc, r) => acc + (r.feedback_rating ?? 0), 0);
      summary.avgRating = Number((sum / ratedRows.length).toFixed(1));
    }
  }

  return summaries;
}

/** Detailed feedback for a single game (drawer view) */
export interface GameFeedbackDetail {
  gameId: string;
  avgRating: number | null;
  responseCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  playAgainYes: number;
  playAgainMaybe: number;
  playAgainNo: number;
  complexityTooSimple: number;
  complexityJustRight: number;
  complexityTooComplex: number;
  recentComments: Array<{
    id: string;
    comment: string;
    rating: number | null;
    submittedAt: string;
  }>;
}

/**
 * Fetches detailed feedback for a specific game.
 * Used for the feedback drilldown drawer.
 *
 * @param venueId - The venue ID
 * @param gameId - The game ID
 * @param days - Timeframe in days (default: 90)
 * @returns GameFeedbackDetail or null if no feedback
 */
export async function getGameFeedbackDetail(
  venueId: string,
  gameId: string,
  days: number = FEEDBACK_TIMEFRAME_DAYS
): Promise<GameFeedbackDetail | null> {
  const supabase = getSupabaseAdmin();
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('sessions')
    .select('id, feedback_rating, feedback_complexity, feedback_replay, feedback_comment, feedback_submitted_at')
    .eq('venue_id', venueId)
    .eq('game_id', gameId)
    .not('ended_at', 'is', null)
    .not('feedback_submitted_at', 'is', null)
    .gte('feedback_submitted_at', cutoffDate)
    .order('feedback_submitted_at', { ascending: false });

  if (error) {
    console.error('Error fetching game feedback detail:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const detail: GameFeedbackDetail = {
    gameId,
    avgRating: null,
    responseCount: data.length,
    positiveCount: 0,
    neutralCount: 0,
    negativeCount: 0,
    playAgainYes: 0,
    playAgainMaybe: 0,
    playAgainNo: 0,
    complexityTooSimple: 0,
    complexityJustRight: 0,
    complexityTooComplex: 0,
    recentComments: [],
  };

  let ratingSum = 0;
  let ratingCount = 0;

  for (const row of data) {
    // Rating
    const rating = row.feedback_rating;
    if (rating !== null) {
      ratingSum += rating;
      ratingCount++;
      if (rating <= 2) detail.negativeCount++;
      else if (rating === 3) detail.neutralCount++;
      else if (rating >= 4) detail.positiveCount++;
    }

    // Replay
    const replay = row.feedback_replay as FeedbackReplay | null;
    if (replay === 'definitely') detail.playAgainYes++;
    else if (replay === 'maybe') detail.playAgainMaybe++;
    else if (replay === 'no') detail.playAgainNo++;

    // Complexity
    const complexity = row.feedback_complexity as FeedbackComplexity | null;
    if (complexity === 'too_simple') detail.complexityTooSimple++;
    else if (complexity === 'just_right') detail.complexityJustRight++;
    else if (complexity === 'too_complex') detail.complexityTooComplex++;

    // Comments (limit to 20)
    if (row.feedback_comment && detail.recentComments.length < 20) {
      detail.recentComments.push({
        id: row.id,
        comment: row.feedback_comment,
        rating: row.feedback_rating,
        submittedAt: row.feedback_submitted_at,
      });
    }
  }

  if (ratingCount > 0) {
    detail.avgRating = Number((ratingSum / ratingCount).toFixed(1));
  }

  return detail;
}

// =============================================================================
// VENUE EXPERIENCE SUMMARY (for Admin Dashboard)
// =============================================================================

export interface VenueExperienceSummary {
  avgRating: number | null;
  responseCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  commentCount: number;
}

/**
 * Fetches venue experience summary for the past N days.
 *
 * @param venueId - The venue ID
 * @param days - Timeframe in days (default: 7)
 * @returns VenueExperienceSummary
 */
export async function getVenueExperienceSummary(
  venueId: string,
  days: number = 7
): Promise<VenueExperienceSummary> {
  const supabase = getSupabaseAdmin();
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('sessions')
    .select('feedback_venue_rating, feedback_venue_comment')
    .eq('venue_id', venueId)
    .not('ended_at', 'is', null)
    .not('feedback_submitted_at', 'is', null)
    .not('feedback_venue_rating', 'is', null)
    .gte('feedback_submitted_at', cutoffDate);

  if (error) {
    console.error('Error fetching venue experience summary:', error);
    return {
      avgRating: null,
      responseCount: 0,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
      commentCount: 0,
    };
  }

  if (!data || data.length === 0) {
    return {
      avgRating: null,
      responseCount: 0,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
      commentCount: 0,
    };
  }

  let ratingSum = 0;
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;
  let commentCount = 0;

  for (const row of data) {
    const rating = row.feedback_venue_rating;
    if (rating !== null) {
      ratingSum += rating;
      if (rating <= 2) negativeCount++;
      else if (rating === 3) neutralCount++;
      else if (rating >= 4) positiveCount++;
    }
    if (row.feedback_venue_comment) commentCount++;
  }

  return {
    avgRating: Number((ratingSum / data.length).toFixed(1)),
    responseCount: data.length,
    positiveCount,
    neutralCount,
    negativeCount,
    commentCount,
  };
}

export interface VenueExperienceComment {
  id: string;
  comment: string;
  rating: number;
  submittedAt: string;
}

/**
 * Fetches recent venue experience comments (for negative ratings).
 *
 * @param venueId - The venue ID
 * @param limit - Maximum comments to return (default: 10)
 * @returns Array of comments, sorted by newest first
 */
export async function getVenueExperienceComments(
  venueId: string,
  limit: number = 10
): Promise<VenueExperienceComment[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('sessions')
    .select('id, feedback_venue_rating, feedback_venue_comment, feedback_submitted_at')
    .eq('venue_id', venueId)
    .not('ended_at', 'is', null)
    .not('feedback_submitted_at', 'is', null)
    .not('feedback_venue_comment', 'is', null)
    .order('feedback_submitted_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching venue experience comments:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    comment: row.feedback_venue_comment!,
    rating: row.feedback_venue_rating ?? 0,
    submittedAt: row.feedback_submitted_at,
  }));
}

// =============================================================================
// HISTORICAL SESSIONS (for Admin "Recent sessions" view)
// =============================================================================

export async function getEndedSessionsForVenue(
  venueId: string,
  options: EndedSessionsOptions = {}
): Promise<EndedSessionsResult> {
  const {
    limit = 50,
    before,
    dateRangePreset,
    startDate,
    endDate,
    search,
  } = options;

  const supabase = getSupabaseAdmin();

  // Build the base query
  let query = supabase
    .from('sessions')
    .select('*, games(title), venue_tables(label)')
    .eq('venue_id', venueId)
    .not('ended_at', 'is', null);

  // Apply date range filter
  const now = new Date();
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;

  if (startDate) {
    rangeStart = new Date(startDate);
  } else if (dateRangePreset) {
    if (dateRangePreset === 'today') {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateRangePreset === '7d') {
      rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRangePreset === '30d') {
      rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  if (endDate) {
    rangeEnd = new Date(endDate);
  }

  if (rangeStart) {
    query = query.gte('ended_at', rangeStart.toISOString());
  }
  if (rangeEnd) {
    query = query.lte('ended_at', rangeEnd.toISOString());
  }

  // Apply cursor-based pagination (before cursor)
  // We want rows where (ended_at, id) < (cursor.endedAt, cursor.id)
  // Using a compound condition to handle ties
  if (before) {
    query = query.or(
      `ended_at.lt.${before.endedAt},` +
      `and(ended_at.eq.${before.endedAt},id.lt.${before.id})`
    );
  }

  // Order by ended_at desc, then id desc for tie-breaker
  query = query
    .order('ended_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1); // Fetch one extra to check if there's more

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching ended sessions:', error);
    return { sessions: [], nextCursor: null };
  }

  const sessions = (data ?? []) as EndedSession[];

  // Filter by search term (done client-side since we need to match joined data)
  // This is efficient for small result sets; for very large sets, consider SQL functions
  let filtered = sessions;
  if (search && search.trim()) {
    const term = search.toLowerCase().trim();
    filtered = sessions.filter((s) => {
      const tableMatch = s.venue_tables?.label?.toLowerCase().includes(term);
      const gameMatch = s.games?.title?.toLowerCase().includes(term);
      return tableMatch || gameMatch;
    });
  }

  // Determine if there are more results
  const hasMore = filtered.length > limit;
  const resultSessions = hasMore ? filtered.slice(0, limit) : filtered;

  // Calculate next cursor
  let nextCursor: { endedAt: string; id: string } | null = null;
  if (hasMore && resultSessions.length > 0) {
    const lastSession = resultSessions[resultSessions.length - 1];
    nextCursor = {
      endedAt: lastSession.ended_at!,
      id: lastSession.id,
    };
  }

  return { sessions: resultSessions, nextCursor };
}
