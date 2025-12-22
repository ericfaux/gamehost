import { XMLParser } from 'fast-xml-parser';
import type { GameComplexity } from '@/lib/db/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface BGGSearchResult {
  id: string;
  name: string;
  year: number | null;
}

export interface BGGGameDetails {
  name: string;
  description: string | null;
  minPlayers: number;
  maxPlayers: number;
  minPlaytime: number;
  maxPlaytime: number;
  complexity: GameComplexity;
  bggRank: number | null;
  bggRating: number | null;
  thumbnail: string | null;
}

// -----------------------------------------------------------------------------
// XML Parser Configuration
// -----------------------------------------------------------------------------

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
});

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Maps BGG's averageweight (1-5 scale) to our GameComplexity enum.
 * - < 2: Simple
 * - < 3.5: Medium
 * - >= 3.5: Complex
 */
function mapWeightToComplexity(weight: number): GameComplexity {
  if (weight < 2) return 'simple';
  if (weight < 3.5) return 'medium';
  return 'complex';
}

/**
 * Decodes HTML entities in a string.
 * BGG descriptions come with HTML-encoded characters.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#10;/g, '\n')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Strips HTML tags from a string.
 */
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Cleans up BGG description text.
 */
function cleanDescription(description: string | undefined | null): string | null {
  if (!description) return null;
  
  let cleaned = decodeHtmlEntities(description);
  cleaned = stripHtmlTags(cleaned);
  cleaned = cleaned.trim();
  
  // Limit to a reasonable length
  if (cleaned.length > 1000) {
    cleaned = cleaned.substring(0, 1000) + '...';
  }
  
  return cleaned || null;
}

/**
 * Safely extracts a numeric value from BGG's XML attribute format.
 */
function extractNumericValue(obj: unknown): number | null {
  if (typeof obj === 'number') return obj;
  if (typeof obj === 'object' && obj !== null) {
    const value = (obj as Record<string, unknown>)['@_value'];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
  }
  return null;
}

/**
 * Extracts the primary name from BGG's name field.
 * The name field can be a single object or an array.
 */
function extractPrimaryName(nameField: unknown): string {
  if (!nameField) return 'Unknown';

  // If it's an array, find the primary type
  if (Array.isArray(nameField)) {
    const primary = nameField.find(
      (n) => n['@_type'] === 'primary'
    );
    return primary?.['@_value'] || nameField[0]?.['@_value'] || 'Unknown';
  }

  // If it's a single object
  if (typeof nameField === 'object' && nameField !== null) {
    return (nameField as Record<string, unknown>)['@_value'] as string || 'Unknown';
  }

  return 'Unknown';
}

// -----------------------------------------------------------------------------
// BGG API Functions
// -----------------------------------------------------------------------------

/**
 * Searches BoardGameGeek for games matching the query.
 * 
 * @param query - The search term
 * @returns Array of search results with id, name, and year
 * @throws Error if the API request fails
 */
export async function searchBGG(query: string): Promise<BGGSearchResult[]> {
  if (!query || query.trim() === '') {
    return [];
  }

  const encodedQuery = encodeURIComponent(query.trim());
  const url = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodedQuery}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`BGG API error: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml);

  // Handle empty results
  if (!parsed.items || !parsed.items.item) {
    return [];
  }

  // Normalize to array (single result comes as object, multiple as array)
  const items = Array.isArray(parsed.items.item)
    ? parsed.items.item
    : [parsed.items.item];

  return items.map((item: Record<string, unknown>) => {
    const nameField = item.name;
    let name = 'Unknown';

    // Name can be an array (multiple names) or single object
    if (Array.isArray(nameField)) {
      const primary = nameField.find((n) => n['@_type'] === 'primary');
      name = primary?.['@_value'] || nameField[0]?.['@_value'] || 'Unknown';
    } else if (typeof nameField === 'object' && nameField !== null) {
      name = (nameField as Record<string, unknown>)['@_value'] as string || 'Unknown';
    }

    const yearPublished = item.yearpublished;
    let year: number | null = null;
    if (typeof yearPublished === 'object' && yearPublished !== null) {
      const yearValue = (yearPublished as Record<string, unknown>)['@_value'];
      if (typeof yearValue === 'number') {
        year = yearValue;
      }
    }

    return {
      id: String(item['@_id']),
      name,
      year,
    };
  });
}

/**
 * Fetches detailed information about a specific game from BGG.
 * 
 * @param id - The BGG game ID
 * @returns Game details mapped to our schema
 * @throws Error if the API request fails or game is not found
 */
export async function getBGGDetails(id: string): Promise<BGGGameDetails> {
  if (!id || id.trim() === '') {
    throw new Error('Game ID is required');
  }

  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${encodeURIComponent(id)}&stats=1`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`BGG API error: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml);

  // Check if game exists
  if (!parsed.items || !parsed.items.item) {
    throw new Error('Game not found on BoardGameGeek');
  }

  // Handle single item (most common) or take first from array
  const item = Array.isArray(parsed.items.item)
    ? parsed.items.item[0]
    : parsed.items.item;

  // Extract name
  const name = extractPrimaryName(item.name);

  // Extract description
  const description = cleanDescription(item.description as string | undefined);

  // Extract player counts
  const minPlayers = extractNumericValue(item.minplayers) || 1;
  const maxPlayers = extractNumericValue(item.maxplayers) || minPlayers;

  // Extract playtime
  const minPlaytime = extractNumericValue(item.minplaytime) || 30;
  const maxPlaytime = extractNumericValue(item.maxplaytime) || minPlaytime;

  // Extract thumbnail
  const thumbnail = typeof item.thumbnail === 'string' ? item.thumbnail : null;

  // Extract statistics
  let bggRank: number | null = null;
  let bggRating: number | null = null;
  let complexity: GameComplexity = 'medium';

  if (item.statistics?.ratings) {
    const ratings = item.statistics.ratings;

    // Extract average rating
    bggRating = extractNumericValue(ratings.average);
    if (bggRating !== null) {
      bggRating = Math.round(bggRating * 10) / 10; // Round to 1 decimal
    }

    // Extract weight and map to complexity
    const weight = extractNumericValue(ratings.averageweight);
    if (weight !== null) {
      complexity = mapWeightToComplexity(weight);
    }

    // Extract board game rank
    if (ratings.ranks?.rank) {
      const ranks = Array.isArray(ratings.ranks.rank)
        ? ratings.ranks.rank
        : [ratings.ranks.rank];

      const boardGameRank = ranks.find(
        (r: Record<string, unknown>) => r['@_name'] === 'boardgame'
      );

      if (boardGameRank) {
        const rankValue = boardGameRank['@_value'];
        if (typeof rankValue === 'number') {
          bggRank = rankValue;
        } else if (typeof rankValue === 'string' && rankValue !== 'Not Ranked') {
          const parsed = parseInt(rankValue, 10);
          if (!isNaN(parsed)) {
            bggRank = parsed;
          }
        }
      }
    }
  }

  return {
    name,
    description,
    minPlayers,
    maxPlayers,
    minPlaytime,
    maxPlaytime,
    complexity,
    bggRank,
    bggRating,
    thumbnail,
  };
}
