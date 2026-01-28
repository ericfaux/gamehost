'use server';

/**
 * Server actions for the table landing page.
 * Handles session check-in (creating session without a game), ending sessions,
 * and feedback submission.
 */

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  createSession,
  sanitizeActiveSessionsForTable,
  endAllActiveSessionsForTable,
  submitFeedbackAndEndSession,
  type FeedbackComplexity,
  type FeedbackReplay,
} from '@/lib/data';

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
 * Server action to end the current session for the table without feedback.
 * Used as a fallback when guest skips feedback from the legacy flow.
 *
 * FIX: Ends ALL active sessions for the table (not just one) to prevent
 * "random game" bug where older orphaned sessions resurface after ending.
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

// =============================================================================
// FEEDBACK SUBMISSION
// =============================================================================

export interface FeedbackSubmissionInput {
  sessionId: string;
  tableId: string;
  venueSlug: string;
  // Feedback fields (all optional)
  gameRating?: number | null; // 1 = 👎, 3 = 😐, 5 = 👍
  venueRating?: number | null; // 1 = 👎, 3 = 😐, 5 = 👍
  complexity?: FeedbackComplexity | null;
  replay?: FeedbackReplay | null;
  gameComment?: string | null; // Comment specifically about the game
  venueComment?: string | null; // Comment specifically about the venue
  // Skip flag
  skipped: boolean;
}

export interface FeedbackSubmissionResult {
  success: boolean;
  error?: string;
}

/**
 * Server action to submit feedback and end the session.
 * This is the primary checkout flow for guests.
 *
 * On Submit:
 * - Updates session with feedback fields
 * - Sets feedback_submitted_at = now
 * - Sets feedback_skipped = false
 * - Sets feedback_source = 'end_sheet'
 * - Sets ended_at = now
 *
 * On Skip:
 * - Sets ended_at = now
 * - Sets feedback_skipped = true
 * - Leaves feedback_submitted_at NULL
 */
export async function submitFeedbackAndEndSessionAction(
  input: FeedbackSubmissionInput
): Promise<FeedbackSubmissionResult> {
  try {
    const {
      sessionId,
      tableId,
      venueSlug,
      gameRating,
      venueRating,
      complexity,
      replay,
      gameComment,
      venueComment,
      skipped,
    } = input;

    console.log(`Submitting feedback for session ${sessionId}, skipped: ${skipped}`);

    // Submit feedback and end session
    await submitFeedbackAndEndSession({
      sessionId,
      tableId,
      gameRating,
      venueRating,
      complexity,
      replay,
      gameComment,
      venueComment,
      skipped,
      source: 'end_sheet',
    });

    // Delete the session cookie
    const cookieStore = await cookies();
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
    console.error('Error submitting feedback:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to submit feedback. Please try again.';

    return {
      success: false,
      error: message,
    };
  }
}
