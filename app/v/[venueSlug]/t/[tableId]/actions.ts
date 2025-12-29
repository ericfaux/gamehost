'use server';

/**
 * Server actions for the table landing page.
 * Handles session check-in (creating session without a game).
 */

import { cookies } from 'next/headers';
import { createSession, getActiveSessionId } from '@/lib/data';

export interface StartCheckInResult {
  success: boolean;
  sessionId?: string;
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
    const existingSessionId = await getActiveSessionId(tableId);
    if (existingSessionId) {
      // Session already exists - set the cookie and return success
      const cookieStore = await cookies();
      cookieStore.set('gamehost_session_id', existingSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });

      return {
        success: true,
        sessionId: existingSessionId,
      };
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
