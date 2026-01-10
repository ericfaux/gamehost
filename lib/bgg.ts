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
  instructional_video_url: string | null;
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
    // Include videos=1 to fetch instructional video in the same request
    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/thing?id=${encodeURIComponent(bggId)}&stats=1&videos=1`,
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

    // Parse videos to find best instructional video
    const videosContainer = item.videos as Record<string, unknown> | undefined;
    const videoEntries = normalizeArray(videosContainer?.video as unknown[]);

    let instructionalVideoUrl: string | null = null;

    if (videoEntries.length > 0) {
      // Parse and sort videos to find the best instructional one
      const videos = videoEntries
        .map((entry) => {
          if (typeof entry !== 'object' || entry === null) return null;
          const data = entry as Record<string, unknown>;
          const link = data['@_link'];
          const category = String(data['@_category'] || '').toLowerCase();
          const language = String(data['@_language'] || '');
          const videoTitle = String(data['@_title'] || '');

          // Normalize YouTube URL
          const normalizedLink = link ? normalizeYouTubeUrl(String(link)) : null;
          if (!normalizedLink) return null;

          return { link: normalizedLink, category, language, title: videoTitle };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null);

      // Sort: instructional first, English preferred, keywords in title
      videos.sort((a, b) => {
        if (a.category === 'instructional' && b.category !== 'instructional') return -1;
        if (a.category !== 'instructional' && b.category === 'instructional') return 1;

        const aIsEnglish = a.language.toLowerCase() === 'english';
        const bIsEnglish = b.language.toLowerCase() === 'english';
        if (aIsEnglish && !bIsEnglish) return -1;
        if (!aIsEnglish && bIsEnglish) return 1;

        const keywords = ['how to play', 'tutorial', 'rules', 'learn'];
        const aHasKeyword = keywords.some((kw) => a.title.toLowerCase().includes(kw));
        const bHasKeyword = keywords.some((kw) => b.title.toLowerCase().includes(kw));
        if (aHasKeyword && !bHasKeyword) return -1;
        if (!aHasKeyword && bHasKeyword) return 1;

        return 0;
      });

      if (videos.length > 0) {
        instructionalVideoUrl = videos[0].link;
      }
    }

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
      instructional_video_url: instructionalVideoUrl,
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

/**
 * Represents a video entry from BoardGameGeek.
 */
export interface BggVideoResult {
  /** Video ID on BGG */
  id: string;
  /** Video title */
  title: string;
  /** Category: 'instructional', 'review', 'session', 'interview', 'unboxing', 'humor', 'other' */
  category: string;
  /** Language code (e.g., 'English', 'German') */
  language: string;
  /** YouTube video URL */
  link: string;
  /** Username who posted the video */
  username: string;
  /** Post date (ISO string) */
  postdate: string;
}

/**
 * Converts a BGG video link to a standard YouTube watch URL.
 * BGG videos link to YouTube but may use various formats.
 * Returns null if the link doesn't appear to be a YouTube URL.
 */
function normalizeYouTubeUrl(link: string): string | null {
  if (!link) return null;

  // Handle various YouTube URL formats
  const patterns = [
    // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    // Short URL: https://youtu.be/VIDEO_ID
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    // Embed URL: https://www.youtube.com/embed/VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = link.match(pattern);
    if (match && match[1]) {
      return `https://www.youtube.com/watch?v=${match[1]}`;
    }
  }

  return null;
}

/**
 * Fetches videos for a game from BoardGameGeek.
 * Returns an array of video results, with instructional videos preferred.
 *
 * @param bggId - The BGG game ID
 * @returns Array of videos, sorted with instructional videos first
 *
 * @example
 * const videos = await getBggGameVideos("174430");
 * // Returns videos for "Gloomhaven"
 */
export async function getBggGameVideos(bggId: string): Promise<BggVideoResult[]> {
  if (!bggId.trim()) return [];

  try {
    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/thing?id=${encodeURIComponent(bggId)}&videos=1`,
      {
        headers: getBggHeaders(),
        cache: 'force-cache',
        next: { revalidate: 86400 }, // Cache for 24 hours
      }
    );

    if (response.status === 401) {
      console.error('BGG API Error: 401 Unauthorized. Please verify BGG_API_TOKEN is correct.');
    }

    if (!response.ok) {
      console.error('BGG videos request failed', response.status, response.statusText);
      return [];
    }

    const xml = await response.text();
    const parsed = parser.parse(xml);
    const item = normalizeArray(parsed?.items?.item)[0] as Record<string, unknown> | undefined;

    if (!item) return [];

    const videosContainer = item.videos as Record<string, unknown> | undefined;
    const videoEntries = normalizeArray(videosContainer?.video as unknown[]);

    const videos: BggVideoResult[] = videoEntries
      .map((entry): BggVideoResult | null => {
        if (typeof entry !== 'object' || entry === null) return null;

        const data = entry as Record<string, unknown>;

        const id = data['@_id'];
        const title = data['@_title'];
        const category = data['@_category'];
        const language = data['@_language'];
        const link = data['@_link'];
        const username = data['@_username'];
        const postdate = data['@_postdate'];

        // Normalize the YouTube URL
        const normalizedLink = normalizeYouTubeUrl(String(link || ''));
        if (!normalizedLink) return null;

        return {
          id: String(id || ''),
          title: String(title || ''),
          category: String(category || '').toLowerCase(),
          language: String(language || ''),
          link: normalizedLink,
          username: String(username || ''),
          postdate: String(postdate || ''),
        };
      })
      .filter((video): video is BggVideoResult => video !== null);

    // Sort: instructional first, then by language (English preferred), then by date
    return videos.sort((a, b) => {
      // Instructional videos first
      if (a.category === 'instructional' && b.category !== 'instructional') return -1;
      if (a.category !== 'instructional' && b.category === 'instructional') return 1;

      // English language preferred
      const aIsEnglish = a.language.toLowerCase() === 'english';
      const bIsEnglish = b.language.toLowerCase() === 'english';
      if (aIsEnglish && !bIsEnglish) return -1;
      if (!aIsEnglish && bIsEnglish) return 1;

      // Prefer videos with "how to play", "tutorial", or "rules" in title
      const keywords = ['how to play', 'tutorial', 'rules', 'learn'];
      const aHasKeyword = keywords.some((kw) => a.title.toLowerCase().includes(kw));
      const bHasKeyword = keywords.some((kw) => b.title.toLowerCase().includes(kw));
      if (aHasKeyword && !bHasKeyword) return -1;
      if (!aHasKeyword && bHasKeyword) return 1;

      // Sort by date (newest first) as final tiebreaker
      return new Date(b.postdate).getTime() - new Date(a.postdate).getTime();
    });
  } catch (error) {
    console.error('Failed to fetch BGG game videos', error);
    return [];
  }
}

/**
 * Fetches the best instructional video for a game from BoardGameGeek.
 * Returns the YouTube URL of the top-ranked video, or null if none found.
 *
 * @param bggId - The BGG game ID
 * @returns YouTube URL string or null
 *
 * @example
 * const videoUrl = await getBggBestInstructionalVideo("174430");
 * // Returns "https://www.youtube.com/watch?v=..." or null
 */
export async function getBggBestInstructionalVideo(bggId: string): Promise<string | null> {
  const videos = await getBggGameVideos(bggId);
  if (videos.length === 0) return null;

  // The first video is already the best match due to sorting
  return videos[0].link;
}
