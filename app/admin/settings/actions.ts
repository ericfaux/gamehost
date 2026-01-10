"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  getVenueByOwnerId,
  uploadVenueLogo,
  updateVenueLogo,
  deleteVenueLogo,
} from "@/lib/data/venues";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

interface ActionResult {
  success: boolean;
  error?: string;
}

interface ToggleActiveResult {
  success: boolean;
  error?: string;
  needsConfirmation?: boolean;
  futureBookingCount?: number;
}

/**
 * Creates a new table for the current user's venue.
 * @param formData - Form data containing 'label' field
 */
export async function createTable(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in to create a table" };
  }

  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: "No venue found for your account" };
  }

  const rawLabel = formData.get("label");
  const label = typeof rawLabel === "string" ? rawLabel.trim() : "";

  const rawDescription = formData.get("description");
  const description = typeof rawDescription === "string" ? rawDescription.trim() : null;

  const rawCapacity = formData.get("capacity");
  const rawZoneId = formData.get("zone_id");
  const capacity =
    rawCapacity === null || rawCapacity === ""
      ? null
      : Number.isFinite(Number(rawCapacity))
        ? Number(rawCapacity)
        : NaN;
  const zoneId = typeof rawZoneId === "string" ? rawZoneId.trim() : "";

  if (!label) {
    return { success: false, error: "Table label is required" };
  }

  if (Number.isNaN(capacity)) {
    return { success: false, error: "Capacity must be a valid number" };
  }

  if (!zoneId) {
    return { success: false, error: "Zone selection is required" };
  }

  if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) {
    return { success: false, error: "Capacity must be a positive whole number" };
  }

  const { data: zoneData, error: zoneError } = await getSupabaseAdmin()
    .from("venue_zones")
    .select("id")
    .eq("id", zoneId)
    .eq("venue_id", venue.id)
    .single();

  if (zoneError || !zoneData) {
    return { success: false, error: "Selected zone is invalid" };
  }

  const { data: existingTable } = await getSupabaseAdmin()
    .from("venue_tables")
    .select("id")
    .eq("venue_id", venue.id)
    .eq("label", label)
    .eq("is_active", true)
    .single();

  if (existingTable) {
    return { success: false, error: "A table with this label already exists" };
  }

  const { error: insertError } = await getSupabaseAdmin()
    .from("venue_tables")
    .insert({
      venue_id: venue.id,
      label,
      description: description || null,
      capacity,
      is_active: true,
      zone_id: zoneId,
    });

  if (insertError) {
    console.error("Failed to create table:", insertError);
    return { success: false, error: "Failed to create table. Please try again." };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/sessions");

  return { success: true };
}

/**
 * Updates an existing table for the current user's venue.
 * @param formData - Form data containing 'id', 'label', 'capacity', and optional 'description'
 */
export async function updateTable(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in to update a table" };
  }

  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: "No venue found for your account" };
  }

  const rawId = formData.get("id");
  const rawLabel = formData.get("label");
  const rawCapacity = formData.get("capacity");
  const rawDescription = formData.get("description");
  const rawZoneId = formData.get("zone_id");

  const id = typeof rawId === "string" ? rawId : "";
  const label = typeof rawLabel === "string" ? rawLabel.trim() : "";
  const description = typeof rawDescription === "string" ? rawDescription.trim() : null;
  const capacity =
    rawCapacity === null || rawCapacity === ""
      ? null
      : Number.isFinite(Number(rawCapacity))
        ? Number(rawCapacity)
        : NaN;
  const zoneId = typeof rawZoneId === "string" ? rawZoneId.trim() : "";

  if (!id) {
    return { success: false, error: "Table ID is required" };
  }

  if (!label) {
    return { success: false, error: "Table label is required" };
  }

  if (Number.isNaN(capacity)) {
    return { success: false, error: "Capacity must be a valid number" };
  }

  if (!zoneId) {
    return { success: false, error: "Zone selection is required" };
  }

  if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) {
    return { success: false, error: "Capacity must be a positive whole number" };
  }

  const { data: zoneData, error: zoneError } = await getSupabaseAdmin()
    .from("venue_zones")
    .select("id")
    .eq("id", zoneId)
    .eq("venue_id", venue.id)
    .single();

  if (zoneError || !zoneData) {
    return { success: false, error: "Selected zone is invalid" };
  }

  const { data: tableData, error: fetchError } = await getSupabaseAdmin()
    .from("venue_tables")
    .select("id, venue_id")
    .eq("id", id)
    .single();

  if (fetchError || !tableData) {
    return { success: false, error: "Table not found" };
  }

  if (tableData.venue_id !== venue.id) {
    return { success: false, error: "You do not have permission to update this table" };
  }

  const { error: updateError } = await getSupabaseAdmin()
    .from("venue_tables")
    .update({
      label,
      capacity,
      description: description || null,
      zone_id: zoneId,
    })
    .eq("id", id);

  if (updateError) {
    console.error("Failed to update table:", updateError);
    return { success: false, error: "Failed to update table. Please try again." };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/sessions");

  return { success: true };
}

/**
 * Soft deletes a table by setting is_active to false.
 * @param tableId - The table's UUID
 */
export async function deleteTable(tableId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in to delete a table" };
  }

  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: "No venue found for your account" };
  }

  const { data: tableData, error: fetchError } = await getSupabaseAdmin()
    .from("venue_tables")
    .select("id, venue_id")
    .eq("id", tableId)
    .single();

  if (fetchError || !tableData) {
    return { success: false, error: "Table not found" };
  }

  if (tableData.venue_id !== venue.id) {
    return { success: false, error: "You do not have permission to delete this table" };
  }

  const { error: updateError } = await getSupabaseAdmin()
    .from("venue_tables")
    .update({ is_active: false })
    .eq("id", tableId);

  if (updateError) {
    console.error("Failed to delete table:", updateError);
    return { success: false, error: "Failed to delete table. Please try again." };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/sessions");

  return { success: true };
}

/**
 * Uploads a venue logo and updates the venue record.
 * Accepts base64-encoded image data.
 *
 * @param base64Data - Base64-encoded image data
 * @param fileName - Original file name (for extension)
 * @param mimeType - MIME type of the image
 */
export async function uploadVenueLogoAction(
  base64Data: string,
  fileName: string,
  mimeType: string
): Promise<ActionResult & { logoUrl?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in to upload a logo" };
  }

  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: "No venue found for your account" };
  }

  try {
    // Convert base64 to Blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    // Delete old logo if exists
    if (venue.logo_url) {
      await deleteVenueLogo(venue.logo_url);
    }

    // Upload new logo
    const logoUrl = await uploadVenueLogo(blob, fileName, mimeType);

    // Update venue with new logo URL
    await updateVenueLogo(venue.id, logoUrl);

    revalidatePath("/admin/settings");

    return { success: true, logoUrl };
  } catch (error) {
    console.error("Failed to upload logo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload logo",
    };
  }
}

/**
 * Removes the venue logo.
 */
export async function removeVenueLogoAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in to remove a logo" };
  }

  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: "No venue found for your account" };
  }

  try {
    // Delete logo file if exists
    if (venue.logo_url) {
      await deleteVenueLogo(venue.logo_url);
    }

    // Update venue to remove logo URL
    await updateVenueLogo(venue.id, null);

    revalidatePath("/admin/settings");

    return { success: true };
  } catch (error) {
    console.error("Failed to remove logo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove logo",
    };
  }
}

/**
 * Toggles a table's active status.
 * When deactivating, checks for future bookings and returns a warning if any exist.
 *
 * @param tableId - The table's UUID
 * @param setActive - Whether to activate (true) or deactivate (false) the table
 * @param force - If true, proceeds with deactivation even if future bookings exist
 */
export async function toggleTableActive(
  tableId: string,
  setActive: boolean,
  force: boolean = false
): Promise<ToggleActiveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in to update a table" };
  }

  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: "No venue found for your account" };
  }

  // Verify table belongs to venue
  const { data: tableData, error: fetchError } = await getSupabaseAdmin()
    .from("venue_tables")
    .select("id, venue_id, is_active")
    .eq("id", tableId)
    .single();

  if (fetchError || !tableData) {
    return { success: false, error: "Table not found" };
  }

  if (tableData.venue_id !== venue.id) {
    return { success: false, error: "You do not have permission to update this table" };
  }

  // If deactivating and not forcing, check for future bookings
  if (!setActive && !force) {
    const today = new Date().toISOString().split('T')[0];
    const { count, error: countError } = await getSupabaseAdmin()
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("table_id", tableId)
      .gte("booking_date", today)
      .not("status", "in", "(cancelled_by_guest,cancelled_by_venue,no_show,completed)");

    if (countError) {
      console.error("Error checking future bookings:", countError);
    } else if (count && count > 0) {
      return {
        success: false,
        needsConfirmation: true,
        futureBookingCount: count,
        error: `This table has ${count} upcoming booking${count === 1 ? '' : 's'}. Deactivating will not cancel them automatically.`,
      };
    }
  }

  // Perform the update
  const { error: updateError } = await getSupabaseAdmin()
    .from("venue_tables")
    .update({ is_active: setActive })
    .eq("id", tableId);

  if (updateError) {
    console.error("Failed to toggle table active status:", updateError);
    return { success: false, error: "Failed to update table. Please try again." };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/sessions");
  revalidatePath("/admin/floorplan");

  return { success: true };
}

/**
 * Toggles a zone's active status.
 * When deactivating, checks for future bookings on tables in this zone.
 *
 * @param zoneId - The zone's UUID
 * @param setActive - Whether to activate (true) or deactivate (false) the zone
 * @param force - If true, proceeds with deactivation even if future bookings exist
 */
export async function toggleZoneActive(
  zoneId: string,
  setActive: boolean,
  force: boolean = false
): Promise<ToggleActiveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in to update a zone" };
  }

  const venue = await getVenueByOwnerId(user.id);
  if (!venue) {
    return { success: false, error: "No venue found for your account" };
  }

  // Verify zone belongs to venue
  const { data: zoneData, error: fetchError } = await getSupabaseAdmin()
    .from("venue_zones")
    .select("id, venue_id, is_active")
    .eq("id", zoneId)
    .single();

  if (fetchError || !zoneData) {
    return { success: false, error: "Zone not found" };
  }

  if (zoneData.venue_id !== venue.id) {
    return { success: false, error: "You do not have permission to update this zone" };
  }

  // If deactivating and not forcing, check for future bookings on tables in this zone
  if (!setActive && !force) {
    // First get all tables in this zone
    const { data: tablesInZone, error: tablesError } = await getSupabaseAdmin()
      .from("venue_tables")
      .select("id")
      .eq("zone_id", zoneId)
      .eq("is_active", true);

    if (tablesError) {
      console.error("Error fetching tables in zone:", tablesError);
    } else if (tablesInZone && tablesInZone.length > 0) {
      const tableIds = tablesInZone.map((t: { id: string }) => t.id);
      const today = new Date().toISOString().split('T')[0];

      const { count, error: countError } = await getSupabaseAdmin()
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .in("table_id", tableIds)
        .gte("booking_date", today)
        .not("status", "in", "(cancelled_by_guest,cancelled_by_venue,no_show,completed)");

      if (countError) {
        console.error("Error checking future bookings:", countError);
      } else if (count && count > 0) {
        return {
          success: false,
          needsConfirmation: true,
          futureBookingCount: count,
          error: `Tables in this zone have ${count} upcoming booking${count === 1 ? '' : 's'}. Deactivating will not cancel them automatically.`,
        };
      }
    }
  }

  // Perform the update
  const { error: updateError } = await getSupabaseAdmin()
    .from("venue_zones")
    .update({ is_active: setActive })
    .eq("id", zoneId);

  if (updateError) {
    console.error("Failed to toggle zone active status:", updateError);
    return { success: false, error: "Failed to update zone. Please try again." };
  }

  // If deactivating zone, also deactivate all tables in the zone
  if (!setActive) {
    const { error: tablesUpdateError } = await getSupabaseAdmin()
      .from("venue_tables")
      .update({ is_active: false })
      .eq("zone_id", zoneId);

    if (tablesUpdateError) {
      console.error("Failed to deactivate tables in zone:", tablesUpdateError);
      // Zone was already deactivated, so just log the error but don't fail
    }
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/sessions");
  revalidatePath("/admin/floorplan");

  return { success: true };
}
