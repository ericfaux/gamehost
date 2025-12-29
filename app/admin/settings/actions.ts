'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { getVenueByOwnerId } from '@/lib/data/venues';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Creates a new table for the current user's venue.
 * @param formData - Form data containing 'label' field
 */
export async function createTable(formData: FormData): Promise<ActionResult> {
  // Get current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in to create a table' };
  }

  // Get user's venue
  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: 'No venue found for your account' };
  }

  // Extract and validate form data
  const label = formData.get('label') as string | null;

  if (!label || label.trim() === '') {
    return { success: false, error: 'Table label is required' };
  }

  const trimmedLabel = label.trim();

  // Check for duplicate labels within the venue
  const { data: existingTable } = await getSupabaseAdmin()
    .from('venue_tables')
    .select('id')
    .eq('venue_id', venue.id)
    .eq('label', trimmedLabel)
    .eq('is_active', true)
    .single();

  if (existingTable) {
    return { success: false, error: 'A table with this label already exists' };
  }

  // Insert the new table
  const { error: insertError } = await getSupabaseAdmin()
    .from('venue_tables')
    .insert({
      venue_id: venue.id,
      label: trimmedLabel,
      is_active: true,
    });

  if (insertError) {
    console.error('Failed to create table:', insertError);
    return { success: false, error: 'Failed to create table. Please try again.' };
  }

  // Revalidate pages that display tables
  revalidatePath('/admin/settings');
  revalidatePath('/admin/sessions');

  return { success: true };
}

/**
 * Soft deletes a table by setting is_active to false.
 * @param tableId - The table's UUID
 */
export async function deleteTable(tableId: string): Promise<ActionResult> {
  // Get current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in to delete a table' };
  }

  // Get user's venue
  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: 'No venue found for your account' };
  }

  // Verify the table belongs to this venue
  const { data: tableData, error: fetchError } = await getSupabaseAdmin()
    .from('venue_tables')
    .select('id, venue_id')
    .eq('id', tableId)
    .single();

  if (fetchError || !tableData) {
    return { success: false, error: 'Table not found' };
  }

  if (tableData.venue_id !== venue.id) {
    return { success: false, error: 'You do not have permission to delete this table' };
  }

  // Soft delete by setting is_active to false
  const { error: updateError } = await getSupabaseAdmin()
    .from('venue_tables')
    .update({ is_active: false })
    .eq('id', tableId);

  if (updateError) {
    console.error('Failed to delete table:', updateError);
    return { success: false, error: 'Failed to delete table. Please try again.' };
  }

  // Revalidate pages that display tables
  revalidatePath('/admin/settings');
  revalidatePath('/admin/sessions');

  return { success: true };
}
