'use server';

import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import {
  getTimelineData,
  type TimelineData,
  type TimelineOptions,
} from '@/lib/data/timeline';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Error codes for timeline action failures.
 */
export type TimelineErrorCode = 'UNAUTHORIZED' | 'NOT_FOUND' | 'UNKNOWN';

/**
 * Result type for timeline actions.
 */
export interface TimelineActionResult {
  success: boolean;
  data?: TimelineData;
  error?: string;
  code?: TimelineErrorCode;
}

// -----------------------------------------------------------------------------
// Server Actions
// -----------------------------------------------------------------------------

/**
 * Fetches timeline data for a venue on a specific date.
 * Requires authentication and venue ownership.
 *
 * @param venueId - The venue ID to fetch timeline for
 * @param date - The date string in YYYY-MM-DD format
 * @param options - Optional timeline configuration (start/end hours)
 * @returns Timeline data or error result
 */
export async function fetchTimelineData(
  venueId: string,
  date: string,
  options?: TimelineOptions
): Promise<TimelineActionResult> {
  // 1. Verify user is authenticated
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: 'You must be logged in to view timeline data.',
      code: 'UNAUTHORIZED',
    };
  }

  // 2. Verify user owns this venue
  const supabase = getSupabaseAdmin();
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, owner_id')
    .eq('id', venueId)
    .single();

  if (venueError || !venue) {
    return {
      success: false,
      error: 'Venue not found.',
      code: 'NOT_FOUND',
    };
  }

  if (venue.owner_id !== user.id) {
    return {
      success: false,
      error: 'You do not have permission to view this venue.',
      code: 'UNAUTHORIZED',
    };
  }

  // 3. Fetch timeline data (now running in server context)
  try {
    const data = await getTimelineData(venueId, date, {
      startHour: options?.startHour ?? 9,
      endHour: options?.endHour ?? 23,
      includeInactive: options?.includeInactive ?? false,
    });

    return { success: true, data };
  } catch (err) {
    console.error('Timeline fetch error:', err);
    return {
      success: false,
      error: 'Failed to load timeline data.',
      code: 'UNKNOWN',
    };
  }
}
