'use server';

// FIX: Updated imports to match the actual exports in lib/bgg.ts
import { 
  searchBggGames, 
  getBggGameDetails, 
  type BggSearchResult, 
  type BggGameDetails 
} from '@/lib/bgg';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface SearchGamesResult {
  success: boolean;
  data?: BggSearchResult[]; // FIX: Updated type name
  error?: string;
}

interface GetGameDetailsResult {
  success: boolean;
  data?: BggGameDetails; // FIX: Updated type name
  error?: string;
}

// -----------------------------------------------------------------------------
// Server Actions
// -----------------------------------------------------------------------------

/**
 * Server action to search BoardGameGeek for games.
 * Provides a secure wrapper for client-side usage.
 * * @param query - The search term
 * @returns Search results or error
 */
export async function searchGamesAction(query: string): Promise<SearchGamesResult> {
  if (!query || query.trim() === '') {
    return { success: false, error: 'Search query is required' };
  }

  try {
    // FIX: Updated function call
    const results = await searchBggGames(query);
    return { success: true, data: results };
  } catch (error) {
    console.error('BGG search error:', error);
    
    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('429')) {
        return { 
          success: false, 
          error: 'BGG API rate limit reached. Please wait a moment and try again.' 
        };
      }
      if (error.message.includes('503') || error.message.includes('502')) {
        return { 
          success: false, 
          error: 'BoardGameGeek is currently unavailable. Please try again later.' 
        };
      }
    }
    
    return { 
      success: false, 
      error: 'Failed to search BoardGameGeek. Please try again.' 
    };
  }
}

/**
 * Server action to fetch game details from BoardGameGeek.
 * Provides a secure wrapper for client-side usage.
 * * @param id - The BGG game ID
 * @returns Game details or error
 */
export async function getGameDetailsAction(id: string): Promise<GetGameDetailsResult> {
  if (!id || id.trim() === '') {
    return { success: false, error: 'Game ID is required' };
  }

  try {
    // FIX: Updated function call
    const details = await getBggGameDetails(id);
    
    if (!details) {
       return { 
          success: false, 
          error: 'Game not found on BoardGameGeek.' 
        };
    }

    return { success: true, data: details };
  } catch (error) {
    console.error('BGG details fetch error:', error);
    
    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('429')) {
        return { 
          success: false, 
          error: 'BGG API rate limit reached. Please wait a moment and try again.' 
        };
      }
      if (error.message.includes('503') || error.message.includes('502')) {
        return { 
          success: false, 
          error: 'BoardGameGeek is currently unavailable. Please try again later.' 
        };
      }
    }
    
    return { 
      success: false, 
      error: 'Failed to fetch game details. Please try again.' 
    };
  }
}
