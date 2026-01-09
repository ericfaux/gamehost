import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getVenueByOwnerId } from "@/lib/data/venues";
import { getOrCreateVenueBookingSettings, getOrCreateVenueOperatingHours } from "@/lib/data/bookings";
import { UnifiedSettingsClient } from "@/components/admin/settings/UnifiedSettingsClient";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch venue for the current user
  const venue = await getVenueByOwnerId(user.id);

  if (!venue) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="panel-surface max-w-md">
          <CardContent className="py-6">
            <p className="text-center text-[color:var(--color-ink-secondary)]">
              No venue found for your account. Please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch settings and operating hours
  const [settings, operatingHours] = await Promise.all([
    getOrCreateVenueBookingSettings(venue.id),
    getOrCreateVenueOperatingHours(venue.id),
  ]);

  return (
    <UnifiedSettingsClient
      venueId={venue.id}
      venueName={venue.name}
      venueSlug={venue.slug}
      venueLogo={venue.logo_url}
      settings={settings}
      operatingHours={operatingHours}
    />
  );
}
