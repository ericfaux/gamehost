import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type { Venue, VenueTable } from '@/lib/db/types';

/**
 * Fetches a venue by its unique slug.
 * @param slug - The venue's slug (e.g., "the-board-room")
 * @returns The venue or null if not found
 */
export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('venues')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    // PGRST116 = no rows found (not really an error for our use case)
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch venue by slug: ${error.message}`);
  }

  return data as Venue;
}

/**
 * Fetches a venue and one of its tables by venue slug and table ID.
 * Useful for QR code flows: /v/[venueSlug]/t/[tableId]
 *
 * @param venueSlug - The venue's slug
 * @param tableId - The table's UUID
 * @returns Object with venue and table, or null if either is missing
 */
export async function getVenueAndTableBySlugAndTableId(
  venueSlug: string,
  tableId: string
): Promise<{ venue: Venue; table: VenueTable } | null> {
  // First, get the venue
  const venue = await getVenueBySlug(venueSlug);
  if (!venue) {
    return null;
  }

  // Then, get the table and verify it belongs to this venue
  const { data: tableData, error: tableError } = await getSupabaseAdmin()
    .from('venue_tables')
    .select('*')
    .eq('id', tableId)
    .eq('venue_id', venue.id)
    .single();

  if (tableError) {
    if (tableError.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch table: ${tableError.message}`);
  }

  return {
    venue,
    table: tableData as VenueTable,
  };
}
