import { XMLParser } from 'fast-xml-parser';
import type { GameComplexity } from '@/lib/db/types';
import { calculateMatchScore } from '@/lib/utils/strings';

const BGG_API_TOKEN = process.env.BGG_API_TOKEN;

function getBggHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'User-Agent': 'GameHost-App/1.0',
    Accept: 'application/xml',
  };

  if (BGG_API_TOKEN) {
    headers.Authorization = `Bearer ${BGG_API_TOKEN}`;
  }

  return headers;
}

export interface BggSearchResult {
  id: string;
  title: string;
  year: string;
  /** Match score from fuzzy comparison (0-1, higher is better) */
  matchScore?: number;
}

export interface BggGameDetails {
  title: string;
  min_players: number;
  max_players: number;
  min_time_minutes: number;
  max_time_minutes: number;
  cover_image_url: string;
  bgg_rank: number | null;
  bgg_rating: number | null;
  pitch: string;
  vibes: string[];
  complexity: GameComplexity;
}

/**
 * Represents a game from BGG's "Hotness" trending list.
 */
export interface BggHotGame {
  /** BGG's unique game identifier */
  bggId: string;
  /** Current rank on the Hotness list (1-50) */
  rank: number;
  /** Game title as listed on BGG */
  title: string;
  /** Year the game was published */
  yearPublished: string;
  /** URL to the game's thumbnail image */
  thumbnail: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

function normalizeArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function numericFromAttribute(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === 'object' && value !== null) {
    const attributeValue = (value as Record<string, unknown>)['@_value'];
    if (typeof attributeValue === 'number') return attributeValue;
    if (typeof attributeValue === 'string') {
      const parsed = Number(attributeValue);
      return Number.isNaN(parsed) ? null : parsed;
    }
  }
  return null;
}

function pickPrimaryName(nameField: unknown): string {
  if (!nameField) return '';
  const names = normalizeArray(nameField as unknown[]);
  const primary = names.find((entry) =>
    typeof entry === 'object' && entry !== null && (entry as Record<string, unknown>)['@_type'] === 'primary'
  );

  const target = (primary ?? names[0]) as Record<string, unknown> | undefined;
  const value = target ? target['@_value'] : undefined;
  return typeof value === 'string' ? value : '';
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

function truncate(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function mapWeightToComplexity(weight: number): GameComplexity {
  if (weight <= 2.3) return 'simple';
  if (weight <= 3.5) return 'medium';
  return 'complex';
}

export async function searchBggGames(query: string): Promise<BggSearchResult[]> {
  if (!query.trim()) return [];

  try {
    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(query)}`,
      {
        headers: getBggHeaders(),
        cache: 'no-store',
      }
    );

    if (response.status === 401) {
      console.error('BGG API Error: 401 Unauthorized. Please verify BGG_API_TOKEN is correct in Vercel Settings.');
    }

    if (!response.ok) {
      console.error('BGG search request failed', response.status, response.statusText);
      return [];
    }

    const xml = await response.text();
    const parsed = parser.parse(xml);
    const items = normalizeArray(parsed?.items?.item);

    if (items.length === 0) {
      console.warn('BGG search returned no items. Raw response:', truncate(xml, 200));
      return [];
    }

    return items
      .map((item) => {
        if (typeof item !== 'object' || item === null) return null;
        const data = item as Record<string, unknown>;
        const id = data['@_id'];
        const titleSource = data.name as Record<string, unknown> | undefined;
        const title = titleSource?.['@_value'];
        const yearValue = (data.yearpublished as Record<string, unknown> | undefined)?.['@_value'];

        return {
          id: typeof id === 'string' || typeof id === 'number' ? String(id) : '',
          title: typeof title === 'string' ? title : '',
          year: typeof yearValue === 'string' || typeof yearValue === 'number' ? String(yearValue) : '',
        } satisfies BggSearchResult;
      })
      .filter((result): result is BggSearchResult => Boolean(result && result.id));
  } catch (error) {
    if ((error as { status?: number }).status === 401) {
      console.error(
        'BGG API Error: 401 Unauthorized. Please verify BGG_API_TOKEN is correct in Vercel Settings.'
      );
    }
    console.error('Failed to search BGG games', error);
    return [];
  }
}

/**
 * Ranks BGG search results by how well they match the search query.
 * Uses fuzzy matching with length penalty to prefer exact matches
 * over expansions/variants with longer titles.
 *
 * @param query - The original search query
 * @param results - Array of search results from BGG
 * @returns Results sorted by match score (highest first), with scores attached
 *
 * @example
 * const results = await searchBggGames("Catan");
 * const ranked = rankSearchResults("Catan", results);
 * // ranked[0] will be "Catan" (score: 1.0), not "Catan: Seafarers" (score: ~0.11)
 */
export function rankSearchResults(
  query: string,
  results: BggSearchResult[]
): BggSearchResult[] {
  return results
    .map((result) => ({
      ...result,
      matchScore: calculateMatchScore(query, result.title),
    }))
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
}

export async function getBggGameDetails(bggId: string): Promise<BggGameDetails | null> {
  if (!bggId.trim()) return null;

  try {
    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/thing?id=${encodeURIComponent(bggId)}&stats=1`,
      {
        headers: getBggHeaders(),
        cache: 'force-cache',
        next: { revalidate: 3600 },
      }
    );

    if (response.status === 401) {
      console.error('BGG API Error: 401 Unauthorized. Please verify BGG_API_TOKEN is correct in Vercel Settings.');
    }

    if (!response.ok) return null;

    const xml = await response.text();
    const parsed = parser.parse(xml);
    const item = normalizeArray(parsed?.items?.item)[0] as Record<string, unknown> | undefined;

    if (!item) return null;

    const title = pickPrimaryName(item.name);
    const minPlayers = numericFromAttribute(item.minplayers) ?? 0;
    const maxPlayers = numericFromAttribute(item.maxplayers) ?? minPlayers;
    const minPlaytime = numericFromAttribute(item.minplaytime) ?? 0;
    const maxPlaytime = numericFromAttribute(item.maxplaytime) ?? minPlaytime;
    const coverImageUrl = typeof item.image === 'string' ? item.image : '';

    const ratings = (item.statistics as Record<string, unknown> | undefined)?.ratings as
      | Record<string, unknown>
      | undefined;

    const rankEntries = normalizeArray((ratings?.ranks as Record<string, unknown> | undefined)?.rank);
    const boardGameRank = rankEntries.find(
      (rank) => typeof rank === 'object' && rank !== null && (rank as Record<string, unknown>)['@_name'] === 'boardgame'
    ) as Record<string, unknown> | undefined;

    const rankValue = boardGameRank?.['@_value'];
    const parsedRank =
      typeof rankValue === 'string' && rankValue !== 'Not Ranked'
        ? Number(rankValue)
        : typeof rankValue === 'number'
          ? rankValue
          : null;
    const bggRank = Number.isFinite(parsedRank) ? parsedRank : null;

    const averageRating = numericFromAttribute(ratings?.average);
    const bggRating = averageRating !== null ? Math.round(averageRating * 10) / 10 : null;

    const weight = numericFromAttribute(ratings?.averageweight);
    const complexity = weight !== null ? mapWeightToComplexity(weight) : 'medium';

    const descriptionRaw = typeof item.description === 'string' ? item.description : '';
    const cleanedDescription = truncate(stripHtml(descriptionRaw), 200);

    const linkEntries = normalizeArray(item.link as unknown[]);
    const vibes = linkEntries
      .filter(
        (link) =>
          typeof link === 'object' &&
          link !== null &&
          (link as Record<string, unknown>)['@_type'] === 'boardgamecategory'
      )
      .slice(0, 3)
      .map((link) => {
        const value = (link as Record<string, unknown>)['@_value'];
        return typeof value === 'string' ? value : '';
      })
      .filter(Boolean);

    return {
      title,
      min_players: minPlayers,
      max_players: maxPlayers,
      min_time_minutes: minPlaytime,
      max_time_minutes: maxPlaytime,
      cover_image_url: coverImageUrl,
      bgg_rank: bggRank,
      bgg_rating: bggRating,
      pitch: cleanedDescription,
      vibes,
      complexity,
    };
  } catch (error) {
    if ((error as { status?: number }).status === 401) {
      console.error(
        'BGG API Error: 401 Unauthorized. Please verify BGG_API_TOKEN is correct in Vercel Settings.'
      );
    }
    console.error('Failed to fetch BGG game details', error);
    return null;
  }
}

/**
 * Fetches the current "Hotness" trending games list from BoardGameGeek.
 * Results are cached for 1 hour since the list updates infrequently.
 *
 * @returns Array of up to 50 trending games, ordered by rank
 *
 * @example
 * const hotGames = await getBggHotGames();
 * // Returns: [{ bggId: "123", rank: 1, title: "Dune: Imperium", ... }, ...]
 */
export async function getBggHotGames(): Promise<BggHotGame[]> {
  try {
    const response = await fetch(
      'https://boardgamegeek.com/xmlapi2/hot?type=boardgame',
      {
        headers: getBggHeaders(),
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      console.error('BGG hotness request failed', response.status, response.statusText);
      return [];
    }

    const xml = await response.text();
    const parsed = parser.parse(xml);
    const items = normalizeArray(parsed?.items?.item);

    return items
      .map((item): BggHotGame | null => {
        if (typeof item !== 'object' || item === null) return null;

        const data = item as Record<string, unknown>;
        const id = data['@_id'];
        const rank = data['@_rank'];
        const nameNode = data.name as Record<string, unknown> | undefined;
        const yearNode = data.yearpublished as Record<string, unknown> | undefined;
        const thumbnailNode = data.thumbnail as Record<string, unknown> | undefined;

        // Extract values - BGG hotness uses @_value for nested elements
        const title = nameNode?.['@_value'];
        const yearPublished = yearNode?.['@_value'];
        // Thumbnail can be either @_value attribute or direct text content
        const thumbnail =
          typeof data.thumbnail === 'string'
            ? data.thumbnail
            : thumbnailNode?.['@_value'] ?? '';

        if (!id || !rank || !title) return null;

        return {
          bggId: String(id),
          rank: typeof rank === 'number' ? rank : parseInt(String(rank), 10),
          title: String(title),
          yearPublished: yearPublished ? String(yearPublished) : '',
          thumbnail: typeof thumbnail === 'string' ? thumbnail : '',
        };
      })
      .filter((game): game is BggHotGame => game !== null)
      .sort((a, b) => a.rank - b.rank);
  } catch (error) {
    console.error('Failed to fetch BGG hotness list', error);
    return [];
  }
}
