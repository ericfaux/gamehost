import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getVenueByOwnerId } from "@/lib/data/venues";
import { getOrCreateVenueBookingSettings } from "@/lib/data/bookings";
import { BookingSettingsForm } from "@/components/admin/settings/BookingSettingsForm";

export default async function BookingSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const venue = await getVenueByOwnerId(user.id);

  if (!venue) {
    redirect("/admin");
  }

  const settings = await getOrCreateVenueBookingSettings(venue.id);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">
            Settings
          </p>
          <h1 className="text-3xl">Booking Settings</h1>
        </div>
      </div>

      <p className="text-ink-secondary mt-2 mb-6">
        Configure how reservations work for {venue.name}.
      </p>

      <BookingSettingsForm venueId={venue.id} initialSettings={settings} />
    </>
  );
}
