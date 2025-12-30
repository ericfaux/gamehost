'use server';

/**
 * Server actions for the table landing page.
 * Handles session check-in (creating session without a game) and ending sessions.
 */

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSession, getActiveSession, endSession as endSessionById } from '@/lib/data';

const STALE_SESSION_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface StartCheckInResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export interface EndSessionResult {
  success: boolean;
  error?: string;
}

/**
 * Server action to check in at a table (start a session without selecting a game).
 * Sets a gamehost_session_id cookie for later game selection.
 */
export async function startCheckIn(
  venueSlug: string,
  tableId: string
): Promise<StartCheckInResult> {
  try {
    // Check if there's already an active session for this table
    const existingSession = await getActiveSession(tableId);

    if (existingSession) {
      // Check if the session is stale (older than 12 hours)
      const sessionAge = Date.now() - new Date(existingSession.created_at).getTime();

      if (sessionAge > STALE_SESSION_THRESHOLD_MS) {
        // Session is stale - close it and create a new one
        console.log(`Closed stale session: ${existingSession.id} (age: ${Math.round(sessionAge / 3600000)}h)`);
        await endSessionById(existingSession.id);
        // Fall through to create a new session
      } else {
        // Session is recent - join it
        const cookieStore = await cookies();
        cookieStore.set('gamehost_session_id', existingSession.id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24, // 24 hours
          path: '/',
        });

        return {
          success: true,
          sessionId: existingSession.id,
        };
      }
    }

    console.log(`Starting check-in for Table: ${tableId}`);

    // Create a new session without a game
    const session = await createSession({
      venueSlug,
      tableId,
      // gameId is omitted - creates a "browsing" session
    });

    // Set the session cookie
    const cookieStore = await cookies();
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
    console.error('Error during check-in:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to start session. Please try again.';

    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Server action to end the current session for the table.
 *
 * FIX: Uses the table's active session as the source of truth, not the cookie.
 * This ensures:
 * 1. Ending a session always ends the correct table's session.
 * 2. A stale/mismatched cookie doesn't prevent ending the table's real session.
 * 3. The cookie is deleted robustly with the correct path.
 */
export async function endSession(
  venueSlug: string,
  tableId: string
): Promise<EndSessionResult> {
  try {
    const cookieStore = await cookies();
    const cookieSessionId = cookieStore.get('gamehost_session_id')?.value;

    // FIX: Prefer ending the table's active session (source of truth)
    const activeSession = await getActiveSession(tableId);

    if (activeSession) {
      // End the table's active session
      await endSessionById(activeSession.id);
      console.log(`Ended active session ${activeSession.id} for table ${tableId}`);
    } else if (cookieSessionId) {
      // Fallback: No active session for table, but cookie exists.
      // Only end it if it belongs to this table (safety check).
      const { getSessionById } = await import('@/lib/data');
      const cookieSession = await getSessionById(cookieSessionId);

      if (cookieSession && cookieSession.table_id === tableId && !cookieSession.feedback_submitted_at) {
        await endSessionById(cookieSessionId);
        console.log(`Ended cookie session ${cookieSessionId} for table ${tableId} (fallback)`);
      } else {
        // Cookie points to wrong table or already ended session
        console.log(`No active session to end for table ${tableId}`);
      }
    } else {
      return {
        success: false,
        error: 'No active session',
      };
    }

    // Delete the session cookie (always, to clean up stale cookies)
    // Use explicit path to ensure deletion works regardless of current route
    cookieStore.delete({
      name: 'gamehost_session_id',
      path: '/',
    });

    // Revalidate the page to reflect the new state
    revalidatePath(`/v/${venueSlug}/t/${tableId}`);

    return {
      success: true,
    };
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
