'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { getVenueByOwnerId } from '@/lib/data/venues';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type { GameComplexity } from '@/lib/db/types';

interface AddGameResult {
  success: boolean;
  error?: string;
}

const VALID_COMPLEXITIES: GameComplexity[] = ['simple', 'medium', 'complex'];

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
