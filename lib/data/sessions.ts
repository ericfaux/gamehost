import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type { Session } from '@/lib/db/types';
import { getVenueBySlug } from './venues';

export interface CreateSessionParams {
  venueSlug: string;
  tableId: string;
  gameId: string;
  wizardParams?: unknown;
}

/**
 * Creates a new game session at a venue table.
 *
 * @param params - Session creation parameters
 * @returns The created session row
 * @throws Error if venue, table, or game is not found
 */
export async function createSession(params: CreateSessionParams): Promise<Session> {
  const { venueSlug, tableId, gameId, wizardParams } = params;

  // Resolve venue by slug
  const venue = await getVenueBySlug(venueSlug);
  if (!venue) {
    throw new Error(`Venue not found: ${venueSlug}`);
  }

  // Verify table exists and belongs to this venue
  const { data: tableData, error: tableError } = await getSupabaseAdmin()
    .from('venue_tables')
    .select('id')
    .eq('id', tableId)
    .eq('venue_id', venue.id)
    .single();

  if (tableError || !tableData) {
    throw new Error(`Table not found or does not belong to venue: ${tableId}`);
  }

  // Verify game exists
  const { data: gameData, error: gameError } = await getSupabaseAdmin()
    .from('games')
    .select('id')
    .eq('id', gameId)
    .single();

  if (gameError || !gameData) {
    throw new Error(`Game not found: ${gameId}`);
  }

  // Insert the session
  const { data: session, error: insertError } = await getSupabaseAdmin()
    .from('sessions')
    .insert({
      venue_id: venue.id,
      table_id: tableId,
      game_id: gameId,
      wizard_params: wizardParams ?? null,
    })
    .select('*')
    .single();

  if (insertError) {
    throw new Error(`Failed to create session: ${insertError.message}`);
  }

  return session as Session;
}
