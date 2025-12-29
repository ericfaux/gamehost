"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getVenueByOwnerId } from "@/lib/data/venues";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

interface ActionResult {
  success: boolean;
  error?: string;
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
  const capacity =
    rawCapacity === null || rawCapacity === ""
      ? null
      : Number.isFinite(Number(rawCapacity))
        ? Number(rawCapacity)
        : NaN;

  if (!label) {
    return { success: false, error: "Table label is required" };
  }

  if (Number.isNaN(capacity)) {
    return { success: false, error: "Capacity must be a valid number" };
  }

  if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) {
    return { success: false, error: "Capacity must be a positive whole number" };
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

  const id = typeof rawId === "string" ? rawId : "";
  const label = typeof rawLabel === "string" ? rawLabel.trim() : "";
  const description = typeof rawDescription === "string" ? rawDescription.trim() : null;
  const capacity =
    rawCapacity === null || rawCapacity === ""
      ? null
      : Number.isFinite(Number(rawCapacity))
        ? Number(rawCapacity)
        : NaN;

  if (!id) {
    return { success: false, error: "Table ID is required" };
  }

  if (!label) {
    return { success: false, error: "Table label is required" };
  }

  if (Number.isNaN(capacity)) {
    return { success: false, error: "Capacity must be a valid number" };
  }

  if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) {
    return { success: false, error: "Capacity must be a positive whole number" };
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
