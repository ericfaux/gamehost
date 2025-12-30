/**
 * Session Data Layer
 *
 * This module manages session CRUD operations with a key invariant:
 * The table's active session (feedback_submitted_at IS NULL) is the source of truth.
 *
 * Session State Invariants:
 * - At most one active session per table at any time
 * - If multiple active sessions exist, the most recent (by created_at) wins
 * - Cookies are convenience pointers; they must be validated against the table
 * - An "ended" session has feedback_submitted_at set (non-null)
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
 * =============================================================================
 */

import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type { Session } from '@/lib/db/types';
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

  // Verify session exists and is active (no feedback submitted)
  const { data: existingSession, error: sessionError } = await supabase
    .from('sessions')
    .select('id, feedback_submitted_at')
    .eq('id', sessionId)
    .single();

  if (sessionError || !existingSession) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  if (existingSession.feedback_submitted_at) {
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
 * An active session is one where feedback_submitted_at is NULL.
 *
 * @param tableId - The table ID to check
 * @returns The session ID if active, null otherwise
 */
export async function getActiveSessionId(tableId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('sessions')
    .select('id')
    .eq('table_id', tableId)
    .is('feedback_submitted_at', null)
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
    .is('feedback_submitted_at', null)
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

  // Session must exist, be active (no feedback), and belong to the correct table
  if (
    session &&
    !session.feedback_submitted_at &&
    session.table_id === tableId
  ) {
    return session;
  }

  return null;
}

/**
 * Sanitizes active sessions for a table by ending all but the newest.
 * This enforces the "at most one active session per table" invariant.
 *
 * @param tableId - The table ID to sanitize
 * @returns The single canonical active session (newest), or null if none exist
 */
export async function sanitizeActiveSessionsForTable(tableId: string): Promise<Session | null> {
  const supabase = getSupabaseAdmin();

  // Get ALL active sessions for this table, ordered by created_at desc
  const { data: activeSessions, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('table_id', tableId)
    .is('feedback_submitted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching active sessions for sanitization:', error);
    return null;
  }

  if (!activeSessions || activeSessions.length === 0) {
    return null;
  }

  // The newest session is the canonical one
  const [canonical, ...duplicates] = activeSessions as Session[];

  // End all duplicate sessions (older ones)
  if (duplicates.length > 0) {
    const duplicateIds = duplicates.map((s) => s.id);
    console.log(`[sanitize] Closing ${duplicates.length} duplicate active sessions for table ${tableId}: ${duplicateIds.join(', ')}`);

    const { error: endError } = await supabase
      .from('sessions')
      .update({ feedback_submitted_at: new Date().toISOString() })
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
    .is('feedback_submitted_at', null);

  if (fetchError || !activeSessions || activeSessions.length === 0) {
    return 0;
  }

  const sessionIds = activeSessions.map((s: { id: string }) => s.id);
  console.log(`[endAll] Ending ${sessionIds.length} active sessions for table ${tableId}: ${sessionIds.join(', ')}`);

  const { error: updateError } = await supabase
    .from('sessions')
    .update({ feedback_submitted_at: new Date().toISOString() })
    .in('id', sessionIds);

  if (updateError) {
    console.error('Error ending sessions:', updateError);
    return 0;
  }

  return sessionIds.length;
}

/**
 * Gets all active sessions for a venue.
 * Used by Admin UI to display session status using admin client (bypasses RLS).
 *
 * @param venueId - The venue ID
 * @returns Array of active sessions with game and table details
 */
export async function getActiveSessionsForVenue(venueId: string): Promise<Session[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('sessions')
    .select('*, games(title), venue_tables(label)')
    .eq('venue_id', venueId)
    .is('feedback_submitted_at', null)
    .order('started_at', { ascending: false });

  if (error) {
    console.error('Error fetching active sessions for venue:', error);
    return [];
  }

  return (data ?? []) as Session[];
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
    .is('feedback_submitted_at', null)
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
 * Ends a session by setting feedback_submitted_at.
 * Used when admin ends a session or when feedback is submitted.
 *
 * @param sessionId - The session ID to end
 * @returns The updated session row
 */
export async function endSession(sessionId: string): Promise<Session> {
  const { data: session, error } = await getSupabaseAdmin()
    .from('sessions')
    .update({
      feedback_submitted_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to end session: ${error.message}`);
  }

  return session as Session;
}
