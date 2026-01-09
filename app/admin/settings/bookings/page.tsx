import { redirect } from "next/navigation";

/**
 * Redirects to the new booking settings location under /admin/bookings?view=settings
 * This preserves any existing bookmarks or links to the old location.
 */
export default function BookingSettingsPage() {
  redirect("/admin/bookings?view=settings");
}
