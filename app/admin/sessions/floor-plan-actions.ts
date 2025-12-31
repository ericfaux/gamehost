'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type { VenueZone } from '@/lib/db/types';

interface ZonePayload {
  id: string;
  name: string;
  sort_order: number;
  background_image_url: string | null;
  canvas_width: number | null;
  canvas_height: number | null;
}

interface TableLayoutPayload {
  id: string;
  zone_id: string | null;
  layout_x: number | null;
  layout_y: number | null;
  layout_w: number | null;
  layout_h: number | null;
  layout_shape: string | null;
  rotation_deg: number | null;
}

export async function saveVenueZonesAction(venueId: string, zones: ZonePayload[]) {
  const { error } = await getSupabaseAdmin().from('venue_zones').upsert(
    zones.map((zone) => ({
      ...zone,
      venue_id: venueId,
    })),
    { onConflict: 'id' }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/sessions');
  return { ok: true, zones };
}

export async function saveTableLayoutsAction(venueId: string, tables: TableLayoutPayload[]) {
  const payload = tables.map((table) => ({ ...table, venue_id: venueId }));
  const { error } = await getSupabaseAdmin().from('venue_tables').upsert(payload, {
    onConflict: 'id',
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/sessions');
  return { ok: true };
}

export async function createZoneAction(venueId: string, name: string, sortOrder: number) {
  const { data, error } = await getSupabaseAdmin()
    .from('venue_zones')
    .insert({ venue_id: venueId, name, sort_order: sortOrder })
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/sessions');
  return { ok: true, zone: data as VenueZone };
}

export async function deleteZoneAction(zoneId: string) {
  const { error } = await getSupabaseAdmin().from('venue_zones').delete().eq('id', zoneId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/sessions');
  return { ok: true };
}

export async function uploadZoneBackgroundAction(zoneId: string, _base64: string, _fileName: string) {
  // Placeholder: background uploads would normally go to storage; we simply acknowledge the call.
  return { ok: true, url: null };
}
