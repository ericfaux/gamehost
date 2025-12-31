'use server';

/**
 * Server actions for floor plan management.
 */

import { revalidatePath } from 'next/cache';
import {
  saveVenueZones,
  saveTableLayouts,
  createZone,
  deleteZone,
  uploadZoneBackground,
  updateZone,
} from '@/lib/data';
import type { TableShape } from '@/lib/db/types';

// =============================================================================
// ZONE MANAGEMENT
// =============================================================================

export interface ZonePayload {
  id: string;
  name: string;
  sort_order: number;
  background_image_url: string | null;
}

export interface SaveZonesResult {
  ok: boolean;
  error?: string;
}

/**
 * Server action to save zone updates (name, sort_order, background).
 */
export async function saveVenueZonesAction(
  venueId: string,
  zones: ZonePayload[]
): Promise<SaveZonesResult> {
  try {
    if (!venueId || typeof venueId !== 'string') {
      return { ok: false, error: 'Invalid venue ID' };
    }

    await saveVenueZones(venueId, zones);
    revalidatePath('/admin/sessions');

    return { ok: true };
  } catch (error) {
    console.error('Error saving zones:', error);
    const message = error instanceof Error ? error.message : 'Failed to save zones';
    return { ok: false, error: message };
  }
}

export interface CreateZoneResult {
  ok: boolean;
  zone?: { id: string; name: string };
  error?: string;
}

/**
 * Server action to create a new zone.
 */
export async function createZoneAction(
  venueId: string,
  name: string,
  sortOrder: number
): Promise<CreateZoneResult> {
  try {
    if (!venueId || typeof venueId !== 'string') {
      return { ok: false, error: 'Invalid venue ID' };
    }

    const zone = await createZone(venueId, name, sortOrder);
    revalidatePath('/admin/sessions');

    return { ok: true, zone: { id: zone.id, name: zone.name } };
  } catch (error) {
    console.error('Error creating zone:', error);
    const message = error instanceof Error ? error.message : 'Failed to create zone';
    return { ok: false, error: message };
  }
}

export interface DeleteZoneResult {
  ok: boolean;
  error?: string;
}

/**
 * Server action to delete a zone.
 */
export async function deleteZoneAction(zoneId: string): Promise<DeleteZoneResult> {
  try {
    if (!zoneId || typeof zoneId !== 'string') {
      return { ok: false, error: 'Invalid zone ID' };
    }

    await deleteZone(zoneId);
    revalidatePath('/admin/sessions');

    return { ok: true };
  } catch (error) {
    console.error('Error deleting zone:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete zone';
    return { ok: false, error: message };
  }
}

// =============================================================================
// TABLE LAYOUT MANAGEMENT
// =============================================================================

export interface TableLayoutPayload {
  id: string;
  zone_id: string | null;
  layout_x: number | null;
  layout_y: number | null;
  layout_w: number | null;
  layout_h: number | null;
  rotation_deg: number;
  layout_shape: TableShape;
}

export interface SaveTableLayoutsResult {
  ok: boolean;
  error?: string;
}

/**
 * Server action to save table layout updates.
 */
export async function saveTableLayoutsAction(
  venueId: string,
  tables: TableLayoutPayload[]
): Promise<SaveTableLayoutsResult> {
  try {
    if (!venueId || typeof venueId !== 'string') {
      return { ok: false, error: 'Invalid venue ID' };
    }

    await saveTableLayouts(venueId, tables);
    revalidatePath('/admin/sessions');

    return { ok: true };
  } catch (error) {
    console.error('Error saving table layouts:', error);
    const message = error instanceof Error ? error.message : 'Failed to save table layouts';
    return { ok: false, error: message };
  }
}

// =============================================================================
// BACKGROUND IMAGE UPLOAD
// =============================================================================

export interface UploadBackgroundResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/**
 * Server action to upload a zone background image.
 * Accepts base64-encoded file data.
 */
export async function uploadZoneBackgroundAction(
  zoneId: string,
  fileBase64: string,
  fileName: string
): Promise<UploadBackgroundResult> {
  try {
    if (!zoneId || typeof zoneId !== 'string') {
      return { ok: false, error: 'Invalid zone ID' };
    }

    if (!fileBase64 || !fileName) {
      return { ok: false, error: 'Invalid file data' };
    }

    // Decode base64 to blob
    const base64Data = fileBase64.split(',')[1] || fileBase64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes]);

    // Upload to storage
    const url = await uploadZoneBackground(blob, fileName);

    // Update the zone with the new URL
    await updateZone(zoneId, { background_image_url: url });

    revalidatePath('/admin/sessions');

    return { ok: true, url };
  } catch (error) {
    console.error('Error uploading background:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    return { ok: false, error: message };
  }
}

/**
 * Server action to update zone background URL (for paste URL).
 */
export async function updateZoneBackgroundUrlAction(
  zoneId: string,
  url: string | null
): Promise<SaveZonesResult> {
  try {
    if (!zoneId || typeof zoneId !== 'string') {
      return { ok: false, error: 'Invalid zone ID' };
    }

    await updateZone(zoneId, { background_image_url: url });
    revalidatePath('/admin/sessions');

    return { ok: true };
  } catch (error) {
    console.error('Error updating zone background:', error);
    const message = error instanceof Error ? error.message : 'Failed to update background';
    return { ok: false, error: message };
  }
}
