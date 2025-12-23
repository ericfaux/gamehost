'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { getVenueByOwnerId } from '@/lib/data/venues';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type { GameComplexity } from '@/lib/db/types';

interface CSVGameImport {
  Title?: string | number;
  title?: string | number;
  Complexity?: string;
  complexity?: string;
  MinPlayers?: string | number;
  minPlayers?: string | number;
  min_players?: string | number;
  MaxPlayers?: string | number;
  maxPlayers?: string | number;
  max_players?: string | number;
  MinTime?: string | number;
  minTime?: string | number;
  min_time_minutes?: string | number;
  MaxTime?: string | number;
  maxTime?: string | number;
  max_time_minutes?: string | number;
  // Allow other columns to exist but ignore them
  [key: string]: unknown;
}

interface AddGameResult {
  success: boolean;
  error?: string;
}

const VALID_COMPLEXITIES: GameComplexity[] = ['simple', 'medium', 'complex'];

export async function importGames(games: CSVGameImport[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be logged in to import games');
  }

  const venue = await getVenueByOwnerId(user.id);

  if (!venue) {
    throw new Error('No venue found for your account');
  }

  function parseNumber(value: string | number | null | undefined) {
    const parsed = parseInt(String(value || ''), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  const mappedGames = games.map((game) => {
    const complexity = (game.Complexity || game.complexity || '').toString().toLowerCase();
    const normalizedComplexity: GameComplexity = VALID_COMPLEXITIES.includes(complexity as GameComplexity)
      ? (complexity as GameComplexity)
      : 'medium';

    return {
      venue_id: venue.id,
      title: (game.Title || game.title || 'Untitled Game').toString().trim(),
      min_players: parseNumber(game.MinPlayers || game.minPlayers || game.min_players),
      max_players: parseNumber(game.MaxPlayers || game.maxPlayers || game.max_players),
      min_time_minutes: parseNumber(game.MinTime || game.minTime || game.min_time_minutes),
      max_time_minutes: parseNumber(game.MaxTime || game.maxTime || game.max_time_minutes),
      complexity: normalizedComplexity,
      status: 'in_rotation',
      condition: 'good',
      vibes: [],
    };
  });

  await getSupabaseAdmin()
    .from('games')
    .insert(mappedGames);

  revalidatePath('/admin/library');
}

export async function addGame(formData: FormData): Promise<AddGameResult> {
  // Get current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in to add a game' };
  }

  // Get user's venue
  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: 'No venue found for your account' };
  }

  // Extract and validate form data
  const title = formData.get('title') as string | null;
  const description = formData.get('description') as string | null;
  const minPlayersStr = formData.get('minPlayers') as string | null;
  const maxPlayersStr = formData.get('maxPlayers') as string | null;
  const minTimeStr = formData.get('minTime') as string | null;
  const maxTimeStr = formData.get('maxTime') as string | null;
  const complexity = formData.get('complexity') as string | null;
  const shelfLocation = formData.get('shelfLocation') as string | null;
  const bggRankStr = formData.get('bggRank') as string | null;
  const bggRatingStr = formData.get('bggRating') as string | null;

  // Validate required fields
  if (!title || title.trim() === '') {
    return { success: false, error: 'Title is required' };
  }

  if (!minPlayersStr || !maxPlayersStr) {
    return { success: false, error: 'Player count range is required' };
  }

  if (!minTimeStr || !maxTimeStr) {
    return { success: false, error: 'Playtime range is required' };
  }

  if (!complexity) {
    return { success: false, error: 'Complexity is required' };
  }

  // Parse and validate numeric fields
  const minPlayers = parseInt(minPlayersStr, 10);
  const maxPlayers = parseInt(maxPlayersStr, 10);
  const minTime = parseInt(minTimeStr, 10);
  const maxTime = parseInt(maxTimeStr, 10);

  if (isNaN(minPlayers) || isNaN(maxPlayers) || minPlayers < 1) {
    return { success: false, error: 'Invalid player count values' };
  }

  if (minPlayers > maxPlayers) {
    return { success: false, error: 'Minimum players cannot exceed maximum players' };
  }

  if (isNaN(minTime) || isNaN(maxTime) || minTime < 1) {
    return { success: false, error: 'Invalid playtime values' };
  }

  if (minTime > maxTime) {
    return { success: false, error: 'Minimum time cannot exceed maximum time' };
  }

  // Validate complexity
  if (!VALID_COMPLEXITIES.includes(complexity as GameComplexity)) {
    return { success: false, error: 'Invalid complexity value' };
  }

  // Parse optional BGG fields
  let bggRank: number | null = null;
  let bggRating: number | null = null;

  if (bggRankStr && bggRankStr.trim() !== '') {
    bggRank = parseInt(bggRankStr, 10);
    if (isNaN(bggRank) || bggRank < 1) {
      return { success: false, error: 'BGG Rank must be a positive number' };
    }
  }

  if (bggRatingStr && bggRatingStr.trim() !== '') {
    bggRating = parseFloat(bggRatingStr);
    if (isNaN(bggRating) || bggRating < 0 || bggRating > 10) {
      return { success: false, error: 'BGG Rating must be between 0 and 10' };
    }
  }

  // Insert the new game
  const { error: insertError } = await getSupabaseAdmin()
    .from('games')
    .insert({
      venue_id: venue.id,
      title: title.trim(),
      pitch: description?.trim() || null,
      min_players: minPlayers,
      max_players: maxPlayers,
      min_time_minutes: minTime,
      max_time_minutes: maxTime,
      complexity: complexity as GameComplexity,
      shelf_location: shelfLocation?.trim() || null,
      bgg_rank: bggRank,
      bgg_rating: bggRating,
      status: 'in_rotation',
      condition: 'good',
      vibes: [],
    });

  if (insertError) {
    console.error('Failed to insert game:', insertError);
    return { success: false, error: 'Failed to add game. Please try again.' };
  }

  // Revalidate the library page to show the new game
  revalidatePath('/admin/library');

  return { success: true };
}

export async function updateGame(formData: FormData): Promise<AddGameResult> {
  // Get current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in to update a game' };
  }

  // Get user's venue
  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: 'No venue found for your account' };
  }

  const id = formData.get('id') as string | null;
  if (!id) {
    return { success: false, error: 'Game ID is required' };
  }

  // Extract and validate form data
  const title = formData.get('title') as string | null;
  const description = formData.get('description') as string | null;
  const minPlayersStr = formData.get('minPlayers') as string | null;
  const maxPlayersStr = formData.get('maxPlayers') as string | null;
  const minTimeStr = formData.get('minTime') as string | null;
  const maxTimeStr = formData.get('maxTime') as string | null;
  const complexity = formData.get('complexity') as string | null;
  const shelfLocation = formData.get('shelfLocation') as string | null;
  const bggRankStr = formData.get('bggRank') as string | null;
  const bggRatingStr = formData.get('bggRating') as string | null;

  // Validate required fields
  if (!title || title.trim() === '') {
    return { success: false, error: 'Title is required' };
  }

  if (!minPlayersStr || !maxPlayersStr) {
    return { success: false, error: 'Player count range is required' };
  }

  if (!minTimeStr || !maxTimeStr) {
    return { success: false, error: 'Playtime range is required' };
  }

  if (!complexity) {
    return { success: false, error: 'Complexity is required' };
  }

  // Parse and validate numeric fields
  const minPlayers = parseInt(minPlayersStr, 10);
  const maxPlayers = parseInt(maxPlayersStr, 10);
  const minTime = parseInt(minTimeStr, 10);
  const maxTime = parseInt(maxTimeStr, 10);

  if (isNaN(minPlayers) || isNaN(maxPlayers) || minPlayers < 1) {
    return { success: false, error: 'Invalid player count values' };
  }

  if (minPlayers > maxPlayers) {
    return { success: false, error: 'Minimum players cannot exceed maximum players' };
  }

  if (isNaN(minTime) || isNaN(maxTime) || minTime < 1) {
    return { success: false, error: 'Invalid playtime values' };
  }

  if (minTime > maxTime) {
    return { success: false, error: 'Minimum time cannot exceed maximum time' };
  }

  // Validate complexity
  if (!VALID_COMPLEXITIES.includes(complexity as GameComplexity)) {
    return { success: false, error: 'Invalid complexity value' };
  }

  // Parse optional BGG fields
  let bggRank: number | null = null;
  let bggRating: number | null = null;

  if (bggRankStr && bggRankStr.trim() !== '') {
    bggRank = parseInt(bggRankStr, 10);
    if (isNaN(bggRank) || bggRank < 1) {
      return { success: false, error: 'BGG Rank must be a positive number' };
    }
  }

  if (bggRatingStr && bggRatingStr.trim() !== '') {
    bggRating = parseFloat(bggRatingStr);
    if (isNaN(bggRating) || bggRating < 0 || bggRating > 10) {
      return { success: false, error: 'BGG Rating must be between 0 and 10' };
    }
  }

  const { error: updateError } = await getSupabaseAdmin()
    .from('games')
    .update({
      venue_id: venue.id,
      title: title.trim(),
      pitch: description?.trim() || null,
      min_players: minPlayers,
      max_players: maxPlayers,
      min_time_minutes: minTime,
      max_time_minutes: maxTime,
      complexity: complexity as GameComplexity,
      shelf_location: shelfLocation?.trim() || null,
      bgg_rank: bggRank,
      bgg_rating: bggRating,
    })
    .eq('id', id);

  if (updateError) {
    console.error('Failed to update game:', updateError);
    return { success: false, error: 'Failed to update game. Please try again.' };
  }

  revalidatePath('/admin/library');

  return { success: true };
}
