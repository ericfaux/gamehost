import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type { Venue, VenueTable } from '@/lib/db/types';

// Constants for logo upload
const LOGO_BUCKET = 'venue-logos';
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

/**
 * Fetches a venue by its owner's user ID.
 * @param ownerId - The owner's UUID (from auth.users)
 * @returns The venue or null if not found
 */
export async function getVenueByOwnerId(ownerId: string): Promise<Venue | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('venues')
    .select('*')
    .eq('owner_id', ownerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch venue by owner: ${error.message}`);
  }

  return data as Venue;
}

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

/**
 * Validates a logo file before upload.
 * @param file - The file blob to validate
 * @param mimeType - The MIME type of the file
 * @returns Object with valid boolean and optional error message
 */
export function validateLogoFile(
  file: Blob,
  mimeType: string
): { valid: boolean; error?: string } {
  if (file.size > MAX_LOGO_SIZE_BYTES) {
    return {
      valid: false,
      error: `Logo must be under 2MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`,
    };
  }

  if (!ALLOWED_LOGO_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: 'Logo must be PNG, JPG, or SVG format.',
    };
  }

  return { valid: true };
}

/**
 * Uploads a venue logo to Supabase Storage and returns the public URL.
 * Validates file size (max 2MB) and type (PNG, JPG, SVG).
 *
 * @param file - The file blob to upload
 * @param fileName - The original file name (used for extension)
 * @param mimeType - The MIME type of the file
 * @returns The public URL of the uploaded logo
 * @throws Error if validation fails or upload fails
 */
export async function uploadVenueLogo(
  file: Blob,
  fileName: string,
  mimeType: string
): Promise<string> {
  // Validate file
  const validation = validateLogoFile(file, mimeType);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const supabase = getSupabaseAdmin();

  // Generate unique file path
  const fileExt = fileName.split('.').pop() || 'png';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(uniqueName, file, {
      cacheControl: '3600',
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload logo: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(LOGO_BUCKET)
    .getPublicUrl(uniqueName);

  return urlData.publicUrl;
}

/**
 * Updates a venue's logo URL.
 *
 * @param venueId - The venue ID
 * @param logoUrl - The new logo URL (or null to remove)
 * @returns The updated venue
 */
export async function updateVenueLogo(
  venueId: string,
  logoUrl: string | null
): Promise<Venue> {
  const { data, error } = await getSupabaseAdmin()
    .from('venues')
    .update({ logo_url: logoUrl })
    .eq('id', venueId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update venue logo: ${error.message}`);
  }

  return data as Venue;
}

/**
 * Deletes a logo file from Supabase Storage.
 * Extracts the file name from the URL and removes it.
 *
 * @param logoUrl - The public URL of the logo to delete
 */
export async function deleteVenueLogo(logoUrl: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Extract file name from URL
  // URL format: https://xxx.supabase.co/storage/v1/object/public/venue-logos/filename.ext
  const urlParts = logoUrl.split('/');
  const fileName = urlParts[urlParts.length - 1];

  if (!fileName) {
    console.warn('Could not extract file name from logo URL:', logoUrl);
    return;
  }

  const { error } = await supabase.storage
    .from(LOGO_BUCKET)
    .remove([fileName]);

  if (error) {
    console.error('Failed to delete logo file:', error.message);
    // Don't throw - we still want to update the database even if file deletion fails
  }
}
