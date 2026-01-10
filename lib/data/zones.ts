/**
 * Venue Zones Data Layer
 *
 * Manages zone CRUD operations for venue floor plans.
 * Zones represent physical areas in a venue (e.g., "Main", "Patio", "Booths").
 */

import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type { VenueZone, VenueTableWithLayout, TableShape } from '@/lib/db/types';

// =============================================================================
// COLUMN SELECTIONS - Explicit column lists for query optimization
// =============================================================================

/**
 * All columns for the VenueZone type.
 */
const ZONE_COLUMNS = 'id, venue_id, name, sort_order, background_image_url, canvas_width, canvas_height, created_at' as const;

/**
 * All columns for VenueTableWithLayout (VenueTable + layout fields).
 */
const TABLE_WITH_LAYOUT_COLUMNS = `
  id, venue_id, label, description, capacity, is_active, created_at,
  zone_id, layout_x, layout_y, layout_w, layout_h, rotation_deg, layout_shape
` as const;

/**
 * Gets all zones for a venue, ordered by sort_order.
 *
 * @param venueId - The venue ID
 * @returns Array of zones sorted by sort_order
 */
export async function getVenueZones(venueId: string): Promise<VenueZone[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('venue_zones')
    .select(ZONE_COLUMNS)
    .eq('venue_id', venueId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching venue zones:', error);
    return [];
  }

  return (data ?? []) as VenueZone[];
}

/**
 * Gets a single zone by ID.
 *
 * @param zoneId - The zone ID
 * @returns The zone or null if not found
 */
export async function getZoneById(zoneId: string): Promise<VenueZone | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('venue_zones')
    .select(ZONE_COLUMNS)
    .eq('id', zoneId)
    .single();

  if (error) {
    console.error('Error fetching zone:', error);
    return null;
  }

  return data as VenueZone;
}

/**
 * Creates a new zone for a venue.
 *
 * @param venueId - The venue ID
 * @param name - Zone name
 * @param sortOrder - Sort order (position in tabs)
 * @returns The created zone
 */
export async function createZone(
  venueId: string,
  name: string,
  sortOrder: number
): Promise<VenueZone> {
  const { data, error } = await getSupabaseAdmin()
    .from('venue_zones')
    .insert({
      venue_id: venueId,
      name,
      sort_order: sortOrder,
      canvas_width: 1200,
      canvas_height: 800,
    })
    .select(ZONE_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Failed to create zone: ${error.message}`);
  }

  return data as VenueZone;
}

/**
 * Updates zone properties.
 *
 * @param zoneId - The zone ID
 * @param updates - Fields to update
 * @returns The updated zone
 */
export async function updateZone(
  zoneId: string,
  updates: Partial<Pick<VenueZone, 'name' | 'sort_order' | 'background_image_url' | 'canvas_width' | 'canvas_height'>>
): Promise<VenueZone> {
  const { data, error } = await getSupabaseAdmin()
    .from('venue_zones')
    .update(updates)
    .eq('id', zoneId)
    .select(ZONE_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Failed to update zone: ${error.message}`);
  }

  return data as VenueZone;
}

/**
 * Deletes a zone. Tables in this zone will have their zone_id set to null.
 *
 * @param zoneId - The zone ID to delete
 */
export async function deleteZone(zoneId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // First, unassign tables from this zone
  const { error: tableError } = await supabase
    .from('venue_tables')
    .update({ zone_id: null })
    .eq('zone_id', zoneId);

  if (tableError) {
    throw new Error(`Failed to unassign tables: ${tableError.message}`);
  }

  // Then delete the zone
  const { error: zoneError } = await supabase
    .from('venue_zones')
    .delete()
    .eq('id', zoneId);

  if (zoneError) {
    throw new Error(`Failed to delete zone: ${zoneError.message}`);
  }
}

/**
 * Bulk updates zones for a venue (name, sort_order, background_image_url).
 *
 * @param venueId - The venue ID
 * @param zones - Array of zone updates
 */
export async function saveVenueZones(
  venueId: string,
  zones: Array<{
    id: string;
    name: string;
    sort_order: number;
    background_image_url: string | null;
  }>
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Update each zone
  for (const zone of zones) {
    const { error } = await supabase
      .from('venue_zones')
      .update({
        name: zone.name,
        sort_order: zone.sort_order,
        background_image_url: zone.background_image_url,
      })
      .eq('id', zone.id)
      .eq('venue_id', venueId);

    if (error) {
      throw new Error(`Failed to update zone ${zone.id}: ${error.message}`);
    }
  }
}

/**
 * Gets all tables for a venue with layout fields.
 *
 * @param venueId - The venue ID
 * @returns Array of tables with layout information
 */
export async function getVenueTablesWithLayout(venueId: string): Promise<VenueTableWithLayout[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('venue_tables')
    .select(TABLE_WITH_LAYOUT_COLUMNS)
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .order('label', { ascending: true });

  if (error) {
    console.error('Error fetching venue tables with layout:', error);
    return [];
  }

  // Map to VenueTableWithLayout, providing defaults for missing layout fields
  return (data ?? []).map((table) => ({
    ...table,
    zone_id: table.zone_id ?? null,
    layout_x: table.layout_x ?? null,
    layout_y: table.layout_y ?? null,
    layout_w: table.layout_w ?? null,
    layout_h: table.layout_h ?? null,
    rotation_deg: table.rotation_deg ?? 0,
    layout_shape: (table.layout_shape as TableShape) ?? 'rect',
  })) as VenueTableWithLayout[];
}

/**
 * Updates a single table's layout properties.
 *
 * @param tableId - The table ID
 * @param layout - Layout fields to update
 * @returns The updated table
 */
export async function updateTableLayout(
  tableId: string,
  layout: {
    zone_id?: string | null;
    layout_x?: number | null;
    layout_y?: number | null;
    layout_w?: number | null;
    layout_h?: number | null;
    rotation_deg?: number;
    layout_shape?: TableShape;
  }
): Promise<VenueTableWithLayout> {
  const { data, error } = await getSupabaseAdmin()
    .from('venue_tables')
    .update(layout)
    .eq('id', tableId)
    .select(TABLE_WITH_LAYOUT_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Failed to update table layout: ${error.message}`);
  }

  return {
    ...data,
    zone_id: data.zone_id ?? null,
    layout_x: data.layout_x ?? null,
    layout_y: data.layout_y ?? null,
    layout_w: data.layout_w ?? null,
    layout_h: data.layout_h ?? null,
    rotation_deg: data.rotation_deg ?? 0,
    layout_shape: (data.layout_shape as TableShape) ?? 'rect',
  } as VenueTableWithLayout;
}

/**
 * Bulk updates table layouts for a venue.
 *
 * @param venueId - The venue ID
 * @param tables - Array of table layout updates
 */
export async function saveTableLayouts(
  venueId: string,
  tables: Array<{
    id: string;
    zone_id: string | null;
    layout_x: number | null;
    layout_y: number | null;
    layout_w: number | null;
    layout_h: number | null;
    rotation_deg: number;
    layout_shape: TableShape;
  }>
): Promise<void> {
  const supabase = getSupabaseAdmin();

  for (const table of tables) {
    const { error } = await supabase
      .from('venue_tables')
      .update({
        zone_id: table.zone_id,
        layout_x: table.layout_x,
        layout_y: table.layout_y,
        layout_w: table.layout_w,
        layout_h: table.layout_h,
        rotation_deg: table.rotation_deg,
        layout_shape: table.layout_shape,
      })
      .eq('id', table.id)
      .eq('venue_id', venueId);

    if (error) {
      throw new Error(`Failed to update table ${table.id}: ${error.message}`);
    }
  }
}

/**
 * Uploads an image to Supabase Storage and returns the public URL.
 *
 * @param file - The file blob to upload
 * @param fileName - The file name to use
 * @returns The public URL of the uploaded file
 */
export async function uploadZoneBackground(
  file: Blob,
  fileName: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const bucket = 'venue-floorplans';

  // Generate unique file path
  const fileExt = fileName.split('.').pop() || 'png';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(uniqueName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(uniqueName);

  return urlData.publicUrl;
}
