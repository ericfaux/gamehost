'use server';

/**
 * Server actions for admin sessions management.
 */

import { endSession } from '@/lib/data';

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
