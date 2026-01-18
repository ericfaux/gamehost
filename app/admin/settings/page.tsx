import { Suspense } from "react";
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
    <Suspense fallback={<SettingsLoadingSkeleton />}>
      <UnifiedSettingsClient
        venueId={venue.id}
        venueName={venue.name}
        venueSlug={venue.slug}
        venueLogo={venue.logo_url}
        settings={settings}
        operatingHours={operatingHours}
      />
    </Suspense>
  );
}

function SettingsLoadingSkeleton() {
  return (
    <div className="-mx-4 md:-mx-6 -my-6 min-h-[calc(100vh-80px)] flex">
      {/* Left Navigation Sidebar */}
      <nav className="w-48 flex-shrink-0 border-r border-[color:var(--color-structure)] bg-stone-50/50 p-3">
        <div className="mb-4">
          <div className="h-6 w-24 bg-stone-200 rounded animate-pulse" />
        </div>
        <div className="space-y-1">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-4 h-4 bg-stone-200 rounded animate-pulse" />
              <div className="h-4 w-20 bg-stone-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-2xl px-6 py-6 space-y-6">
          <div className="space-y-2">
            <div className="h-6 w-32 bg-stone-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-stone-100 rounded animate-pulse" />
          </div>
          <div className="rounded-lg border border-[color:var(--color-structure)] p-6 space-y-4">
            <div className="h-5 w-24 bg-stone-200 rounded animate-pulse" />
            <div className="space-y-3">
              <div className="h-10 bg-stone-100 rounded animate-pulse" />
              <div className="h-10 bg-stone-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
