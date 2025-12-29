'use server';

/**
 * Server actions for game detail page.
 * Handles game selection for the two-stage session flow:
 * 1. If session cookie exists: Update the existing session with the game
 * 2. If no cookie (fallback): Create a new session with the game
 */

import { cookies } from 'next/headers';
import { createSession, updateSessionGame } from '@/lib/data';

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
 * If a gamehost_session_id cookie exists, updates the existing session.
 * Otherwise, creates a new session with the game (legacy/fallback behavior).
 */
export async function selectGameForSession(input: SelectGameInput): Promise<SelectGameResult> {
  try {
    const { venueSlug, tableId, gameId, wizardParams } = input;

    console.log(`Selecting game ${gameId} for Table: ${tableId}`);

    // Check for existing session cookie
    const cookieStore = await cookies();
    const existingSessionId = cookieStore.get('gamehost_session_id')?.value;

    if (existingSessionId) {
      // Update the existing session with the selected game
      console.log(`Updating existing session ${existingSessionId} with game ${gameId}`);

      try {
        const session = await updateSessionGame(existingSessionId, gameId);
        return {
          success: true,
          sessionId: session.id,
        };
      } catch (updateError) {
        // If update fails (e.g., session was ended), fall through to create new session
        console.warn('Failed to update existing session, creating new one:', updateError);
      }
    }

    // Fallback: Create a new session with the game
    console.log(`Creating new session for Table: ${tableId}, Game: ${gameId}`);

    const session = await createSession({
      venueSlug,
      tableId,
      gameId,
      wizardParams,
    });

    // Set/update the session cookie
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
