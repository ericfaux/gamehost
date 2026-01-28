'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { getVenueByOwnerId } from '@/lib/data/venues';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export interface AnalyticsActionResult {
  success: boolean;
  error?: string;
}

/**
 * Promote a Hidden Gem to Staff Pick
 * Sets is_staff_pick = true for the game
 */
export async function promoteHiddenGem(gameId: string): Promise<AnalyticsActionResult> {
  // Get current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in' };
  }

  // Get user's venue
  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: 'No venue found for your account' };
  }

  // Validate the game exists and belongs to this venue
  const { data: existingGame, error: fetchError } = await getSupabaseAdmin()
    .from('games')
    .select('id, venue_id, title')
    .eq('id', gameId)
    .single();

  if (fetchError || !existingGame) {
    return { success: false, error: 'Game not found' };
  }

  if (existingGame.venue_id !== venue.id) {
    return { success: false, error: 'Game does not belong to your venue' };
  }

  // Update is_staff_pick = true
  const { error: updateError } = await getSupabaseAdmin()
    .from('games')
    .update({ is_staff_pick: true })
    .eq('id', gameId);

  if (updateError) {
    console.error('Failed to promote game:', updateError);
    return { success: false, error: 'Failed to promote. Please try again.' };
  }

  revalidatePath('/admin/analytics');
  revalidatePath('/admin/library');

  return { success: true };
}

/**
 * Retire a Graveyard Game
 * Sets status = 'retired' for the game
 */
export async function retireGraveyardGame(gameId: string): Promise<AnalyticsActionResult> {
  // Get current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in' };
  }

  // Get user's venue
  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: 'No venue found for your account' };
  }

  // Validate the game exists and belongs to this venue
  const { data: existingGame, error: fetchError } = await getSupabaseAdmin()
    .from('games')
    .select('id, venue_id, title')
    .eq('id', gameId)
    .single();

  if (fetchError || !existingGame) {
    return { success: false, error: 'Game not found' };
  }

  if (existingGame.venue_id !== venue.id) {
    return { success: false, error: 'Game does not belong to your venue' };
  }

  // Update status = 'retired'
  const { error: updateError } = await getSupabaseAdmin()
    .from('games')
    .update({ status: 'retired' })
    .eq('id', gameId);

  if (updateError) {
    console.error('Failed to retire game:', updateError);
    return { success: false, error: 'Failed to retire. Please try again.' };
  }

  revalidatePath('/admin/analytics');
  revalidatePath('/admin/library');

  return { success: true };
}
