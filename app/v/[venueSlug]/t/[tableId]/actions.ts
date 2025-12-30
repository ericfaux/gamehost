'use server';

/**
 * Server actions for the table landing page.
 * Handles session check-in (creating session without a game) and ending sessions.
 */

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSession, sanitizeActiveSessionsForTable, endAllActiveSessionsForTable } from '@/lib/data';

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
    // Sanitize: ensure at most one active session, get the canonical one
    const existingSession = await sanitizeActiveSessionsForTable(tableId);

    if (existingSession) {
      // Check if the session is stale (older than 12 hours)
      const sessionAge = Date.now() - new Date(existingSession.created_at).getTime();

      if (sessionAge > STALE_SESSION_THRESHOLD_MS) {
        // Session is stale - close ALL active sessions and create a new one
        console.log(`Closing stale session: ${existingSession.id} (age: ${Math.round(sessionAge / 3600000)}h)`);
        await endAllActiveSessionsForTable(tableId);
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
 * FIX: Ends ALL active sessions for the table (not just one) to prevent
 * "random game" bug where older orphaned sessions resurface after ending.
 * This ensures:
 * 1. The table is completely cleared - no stale sessions can appear.
 * 2. A new session after checkout starts fresh (browsing, no game).
 * 3. The cookie is deleted robustly with the correct path.
 */
export async function endSession(
  venueSlug: string,
  tableId: string
): Promise<EndSessionResult> {
  try {
    const cookieStore = await cookies();

    // End ALL active sessions for this table (defensive - handles duplicates)
    const endedCount = await endAllActiveSessionsForTable(tableId);
    console.log(`Ended ${endedCount} active session(s) for table ${tableId}`);

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
