'use server';

/**
 * Server actions for admin sessions management.
 */

import { revalidatePath } from 'next/cache';
import { endSession, updateSessionGame, getSessionById } from '@/lib/data';

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

    // Revalidate the sessions page to reflect changes
    revalidatePath('/admin/sessions');

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
