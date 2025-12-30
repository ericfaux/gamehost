'use server';

/**
 * Server actions for admin sessions management.
 */

import { revalidatePath } from 'next/cache';
import {
  endSession,
  updateSessionGame,
  getSessionById,
  getEndedSessionsForVenue,
  type DateRangePreset,
  type EndedSession,
} from '@/lib/data';

export interface EndSessionResult {
  success: boolean;
  error?: string;
}

/**
 * Server action to end a session from the admin dashboard.
 * Sets feedback_submitted_at to mark the session as ended.
 */
export async function endSessionAction(sessionId: string): Promise<EndSessionResult> {
  try {
    console.log(`Admin ending session: ${sessionId}`);

    await endSession(sessionId);

    // Revalidate both sessions and library pages
    revalidatePath('/admin/sessions');
    revalidatePath('/admin/library');

    return { success: true };
  } catch (error) {
    console.error('Error ending session:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to end session. Please try again.';

    return {
      success: false,
      error: message,
    };
  }
}

export interface AssignGameResult {
  ok: boolean;
  error?: string;
}

/**
 * Server action to assign a game to an existing browsing session.
 * Updates the session's game_id without creating a new session.
 */
export async function assignGameToSessionAction(
  sessionId: string,
  gameId: string
): Promise<AssignGameResult> {
  try {
    // Validate inputs
    if (!sessionId || typeof sessionId !== 'string') {
      return { ok: false, error: 'Invalid session ID' };
    }
    if (!gameId || typeof gameId !== 'string') {
      return { ok: false, error: 'Invalid game ID' };
    }

    // Verify session exists and is active
    const session = await getSessionById(sessionId);
    if (!session) {
      return { ok: false, error: 'Session not found' };
    }
    if (session.feedback_submitted_at) {
      return { ok: false, error: 'Session has already ended' };
    }

    console.log(`Admin assigning game ${gameId} to session ${sessionId}`);

    // Update the session with the game
    await updateSessionGame(sessionId, gameId);

    // Revalidate both sessions and library pages
    revalidatePath('/admin/sessions');
    revalidatePath('/admin/library');

    return { ok: true };
  } catch (error) {
    console.error('Error assigning game to session:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to assign game. Please try again.';

    return {
      ok: false,
      error: message,
    };
  }
}

// =============================================================================
// HISTORICAL SESSIONS (Recent sessions list)
// =============================================================================

export interface ListEndedSessionsParams {
  venueId: string;
  rangePreset?: DateRangePreset;
  search?: string;
  beforeCursor?: { endedAt: string; id: string };
  limit?: number;
}

export interface ListEndedSessionsResult {
  ok: boolean;
  sessions: EndedSession[];
  nextCursor: { endedAt: string; id: string } | null;
  error?: string;
}

/**
 * Server action to list ended (historical) sessions with pagination and filters.
 * Used by the "Recent sessions" section in the Admin UI.
 */
export async function listEndedSessionsAction(
  params: ListEndedSessionsParams
): Promise<ListEndedSessionsResult> {
  try {
    const { venueId, rangePreset, search, beforeCursor, limit = 50 } = params;

    if (!venueId || typeof venueId !== 'string') {
      return { ok: false, sessions: [], nextCursor: null, error: 'Invalid venue ID' };
    }

    const result = await getEndedSessionsForVenue(venueId, {
      limit,
      before: beforeCursor,
      dateRangePreset: rangePreset,
      search,
    });

    return {
      ok: true,
      sessions: result.sessions,
      nextCursor: result.nextCursor,
    };
  } catch (error) {
    console.error('Error listing ended sessions:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to load sessions. Please try again.';

    return {
      ok: false,
      sessions: [],
      nextCursor: null,
      error: message,
    };
  }
}
