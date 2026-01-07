'use server';

import { createClient } from '@/utils/supabase/server';
import { getVenueByOwnerId } from '@/lib/data/venues';
import { getFeedbackHistory } from '@/lib/data/feedback';
import type { FeedbackFilters, FeedbackHistoryResult } from '@/lib/db/types';

/**
 * Fetches filtered feedback for the current user's venue.
 * Called when filters change or for pagination.
 */
export async function fetchFeedback(
  filters: FeedbackFilters,
  cursor?: string
): Promise<{ success: true; data: FeedbackHistoryResult } | { success: false; error: string }> {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get venue
    const venue = await getVenueByOwnerId(user.id);

    if (!venue) {
      return { success: false, error: 'No venue found' };
    }

    // Fetch data
    const data = await getFeedbackHistory(venue.id, filters, 50, cursor);

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
