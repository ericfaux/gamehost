"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Updates the current user's profile.
 * Uses upsert to create the profile row if it doesn't exist.
 * @param formData - Form data containing 'name' field
 */
export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in to update your profile" };
  }

  const rawName = formData.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";

  // Validation: minimum 2 characters
  if (name.length < 2) {
    return { success: false, error: "Name must be at least 2 characters" };
  }

  // Upsert profile - creates if missing, updates if exists
  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        name,
      },
      {
        onConflict: "id",
      }
    );

  if (upsertError) {
    console.error("Failed to update profile:", upsertError);
    return { success: false, error: "Failed to update profile. Please try again." };
  }

  // Revalidate to update the AppShell header immediately
  revalidatePath("/admin", "layout");

  return { success: true };
}

/**
 * Signs out the current user and redirects to the login page.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
