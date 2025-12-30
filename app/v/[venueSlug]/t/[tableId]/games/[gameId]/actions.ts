'use server';

/**
 * Server actions for game detail page.
 * Handles game selection for the two-stage session flow.
 *
 * FIX: Now validates that cookie session belongs to the target table before updating.
 * Priority order:
 * 1. Cookie session (if valid and belongs to this table)
 * 2. Table's active session (if exists)
 * 3. Create new session (fallback)
 *
 * COPIES SUPPORT: Checks game availability before selection.
 * If all copies are in use, returns a friendly error.
 */

import { cookies } from 'next/headers';
import {
  createSession,
  updateSessionGame,
  getSessionById,
  sanitizeActiveSessionsForTable,
  endAllActiveSessionsForTable,
  getGameAvailability,
  getVenueBySlug,
} from '@/lib/data';

export interface SelectGameInput {
  venueSlug: string;
  tableId: string;
  gameId: string;
  wizardParams?: unknown;
}

export interface SelectGameResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

/**
 * Server action to select a game for the current session.
 *
 * FIX: Validates cookie session against the table before updating.
 * This ensures selecting a game for table A never updates table B's session.
 *
 * Logic:
 * 1. If cookie exists, validate it: must be active AND belong to this table.
 * 2. If cookie invalid/mismatched, try to use the table's active session.
 * 3. If no active session for table, create a new one.
 * 4. Always ensure cookie points to the session that was updated/created.
 */
export async function selectGameForSession(input: SelectGameInput): Promise<SelectGameResult> {
  try {
    const { venueSlug, tableId, gameId, wizardParams } = input;

    console.log(`Selecting game ${gameId} for Table: ${tableId}`);

    // Step 0: Check game availability before proceeding
    const venue = await getVenueBySlug(venueSlug);
    if (!venue) {
      return {
        success: false,
        error: 'Venue not found.',
      };
    }

    const availability = await getGameAvailability(gameId, venue.id);
    if (!availability) {
      return {
        success: false,
        error: 'Game not found.',
      };
    }

    if (availability.available <= 0) {
      return {
        success: false,
        error: 'Sorry, all copies of this game are currently in use. Please pick a different game.',
      };
    }

    const cookieStore = await cookies();
    const cookieSessionId = cookieStore.get('gamehost_session_id')?.value;

    let targetSessionId: string | null = null;

    // Step 1: Check if cookie session is valid for this table
    if (cookieSessionId) {
      const cookieSession = await getSessionById(cookieSessionId);

      if (
        cookieSession &&
        !cookieSession.feedback_submitted_at &&
        cookieSession.table_id === tableId
      ) {
        // Cookie session is valid and belongs to this table
        targetSessionId = cookieSessionId;
        console.log(`Using cookie session ${cookieSessionId} for table ${tableId}`);
      } else {
        // Cookie is invalid, ended, or belongs to a different table
        console.log(`Cookie session ${cookieSessionId} invalid for table ${tableId}, looking for active session`);
      }
    }

    // Step 2: If no valid cookie session, sanitize and get the canonical active session
    if (!targetSessionId) {
      const activeSession = await sanitizeActiveSessionsForTable(tableId);
      if (activeSession) {
        targetSessionId = activeSession.id;
        console.log(`Using table's canonical active session ${targetSessionId}`);
      }
    }

    // Step 3: If we found a session to update, update it
    if (targetSessionId) {
      try {
        const session = await updateSessionGame(targetSessionId, gameId);

        // Ensure cookie points to this session
        cookieStore.set('gamehost_session_id', session.id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24, // 24 hours
          path: '/',
        });

        return {
          success: true,
          sessionId: session.id,
        };
      } catch (updateError) {
        // If update fails (e.g., session was ended concurrently), fall through to create
        console.warn('Failed to update session, creating new one:', updateError);
      }
    }

    // Step 4: Fallback - Create a new session with the game
    // First, ensure no orphan sessions remain (defensive cleanup)
    await endAllActiveSessionsForTable(tableId);
    console.log(`Creating new session for Table: ${tableId}, Game: ${gameId}`);

    const session = await createSession({
      venueSlug,
      tableId,
      gameId,
      wizardParams,
    });

    // Set the session cookie
    cookieStore.set('gamehost_session_id', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return {
      success: true,
      sessionId: session.id,
    };
  } catch (error) {
    console.error('Error selecting game:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to start session. Please try again.';

    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Legacy function for backwards compatibility.
 * @deprecated Use selectGameForSession instead
 */
export async function startSession(input: SelectGameInput): Promise<SelectGameResult> {
  return selectGameForSession(input);
}
