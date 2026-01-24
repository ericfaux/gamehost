'use server';

import { searchGamesInVenue } from '@/lib/data';
import type { Game } from '@/lib/db/types';

/**
 * Server action to search games in a venue's library.
 * Used by the guest library page for Option A checkout flow.
 *
 * @param venueId - The venue's UUID
 * @param query - Search query string (minimum 2 characters)
 * @returns Array of matching games
 */
export async function searchGamesAction(
  venueId: string,
  query: string
): Promise<Game[]> {
  return searchGamesInVenue(venueId, query, 20);
}
