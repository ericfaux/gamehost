import { getSupabaseAdmin } from "@/lib/supabaseServer";
import type { VenueTableWithLayout, VenueZone } from "@/lib/db/types";

/**
 * Fetch all zones for a venue ordered by sort order.
 */
export async function getVenueZones(venueId: string): Promise<VenueZone[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("venue_zones")
    .select("*")
    .eq("venue_id", venueId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch venue zones: ${error.message}`);
  }

  return (data ?? []) as VenueZone[];
}

/**
 * Fetch tables for a venue including layout metadata for floor plan rendering.
 */
export async function getVenueTablesWithLayout(
  venueId: string
): Promise<VenueTableWithLayout[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("venue_tables")
    .select("*")
    .eq("venue_id", venueId)
    .eq("is_active", true)
    .order("label", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch venue tables with layout: ${error.message}`);
  }

  return (data ?? []) as VenueTableWithLayout[];
}
