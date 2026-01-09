import { redirect } from "next/navigation";

/**
 * Redirects to the unified settings page with the bookings section selected.
 * This preserves any existing bookmarks or links to the old location.
 */
export default function BookingSettingsPage() {
  redirect("/admin/settings?section=bookings");
}
