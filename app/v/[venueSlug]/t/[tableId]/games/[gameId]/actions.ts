'use server';

/**
 * Server actions for game detail page.
 * Handles session creation when user clicks "We're playing this".
 */

import { createSession } from '@/lib/data';

export interface StartSessionInput {
  venueSlug: string;
  tableId: string;
  gameId: string;
  wizardParams?: unknown;
}

export interface StartSessionResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

/**
 * Server action to create a new game session.
 * Called when the user confirms they're playing a game.
 */
export async function startSession(input: StartSessionInput): Promise<StartSessionResult> {
  try {
    const { venueSlug, tableId, gameId, wizardParams } = input;

    console.log(`Starting session for Table: ${tableId}, Game: ${gameId}`);

    const session = await createSession({
      venueSlug,
      tableId,
      gameId,
      wizardParams,
    });

    return {
      success: true,
      sessionId: session.id,
    };
  } catch (error) {
    console.error('Error creating session:', error);

    // Return user-friendly error message
    const message =
      error instanceof Error ? error.message : 'Failed to start session. Please try again.';

    return {
      success: false,
      error: message,
    };
  }
}
