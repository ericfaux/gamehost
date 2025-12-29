import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type { VenueTable } from '@/lib/db/types';

/**
 * Fetches all active tables for a venue, ordered by label.
 * @param venueId - The venue's UUID
 * @returns Array of active venue tables
 */
export async function getVenueTables(venueId: string): Promise<VenueTable[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('venue_tables')
    .select('*')
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .order('label', { ascending: true });

  if (error) {
    console.error('Failed to fetch venue tables:', error);
    throw new Error(`Failed to fetch venue tables: ${error.message}`);
  }

  return (data ?? []) as VenueTable[];
}

/**
 * Fetches a single table by ID.
 * @param tableId - The table's UUID
 * @returns The venue table or null if not found
 */
export async function getVenueTableById(tableId: string): Promise<VenueTable | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('venue_tables')
    .select('*')
    .eq('id', tableId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch venue table: ${error.message}`);
  }

  return data as VenueTable;
}
