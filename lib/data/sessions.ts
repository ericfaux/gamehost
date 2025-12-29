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
