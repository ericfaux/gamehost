'use server';

import { createClient } from '@/utils/supabase/server';
import { getVenueByOwnerId } from '@/lib/data/venues';
import { searchGamesInVenue } from '@/lib/data/games';

interface SearchResult {
  id: string;
  title: string;
  cover_image_url: string | null;
  min_players: number;
  max_players: number;
  min_time_minutes: number | null;
  max_time_minutes: number | null;
}

interface SearchGamesResponse {
  success: boolean;
  data?: SearchResult[];
  error?: string;
}

/**
 * Searches games in the current user's venue library.
 * Used by the global search bar in the admin header.
 */
export async function searchVenueGamesAction(query: string): Promise<SearchGamesResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const venue = await getVenueByOwnerId(user.id);
    if (!venue) {
      return { success: false, error: 'No venue found' };
    }

    const games = await searchGamesInVenue(venue.id, query, 10);

    // Return only the fields needed for the search dropdown
    const results: SearchResult[] = games.map((game) => ({
      id: game.id,
      title: game.title,
      cover_image_url: game.cover_image_url,
      min_players: game.min_players,
      max_players: game.max_players,
      min_time_minutes: game.min_time_minutes,
      max_time_minutes: game.max_time_minutes,
    }));

    return { success: true, data: results };
  } catch (error) {
    console.error('Error searching games:', error);
    return { success: false, error: 'Failed to search games' };
  }
}
