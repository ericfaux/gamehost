import { XMLParser } from 'fast-xml-parser';
import type { GameComplexity } from '@/lib/db/types';

const BGG_HEADERS = {
  'User-Agent': 'GameHost-Manager/1.0 (admin@gamehost.local)',
  Accept: 'application/xml',
};

export interface BggSearchResult {
  id: string;
  title: string;
  year: string;
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
        headers: BGG_HEADERS,
        cache: 'no-store',
      }
    );

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
    console.error('Failed to search BGG games', error);
    return [];
  }
}

export async function getBggGameDetails(bggId: string): Promise<BggGameDetails | null> {
  if (!bggId.trim()) return null;

  try {
    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/thing?id=${encodeURIComponent(bggId)}&stats=1`,
      {
        headers: BGG_HEADERS,
        cache: 'force-cache',
        next: { revalidate: 3600 },
      }
    );

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
    console.error('Failed to fetch BGG game details', error);
    return null;
  }
}
