import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getVenueByOwnerId } from '@/lib/data/venues';
import { getOrCreateVenueBookingSettings, getOrCreateVenueOperatingHours } from '@/lib/data/bookings';
import { getVenueTables } from '@/lib/data/tables';
import { BookingsPageClient } from '@/components/admin/bookings/BookingsPageClient';

export default async function BookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const venue = await getVenueByOwnerId(user.id);

  if (!venue) {
    return (
      <div className="max-w-4xl p-6">
        <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">No Venue Found</h1>
        <p className="text-slate-600">
          You don&apos;t have a venue associated with your account yet.
        </p>
      </div>
    );
  }

  const [settings, venueTables, operatingHours] = await Promise.all([
    getOrCreateVenueBookingSettings(venue.id),
    getVenueTables(venue.id),
    getOrCreateVenueOperatingHours(venue.id),
  ]);

  return (
    <BookingsPageClient
      venueId={venue.id}
      venueName={venue.name}
      venueSlug={venue.slug}
      settings={settings}
      venueTables={venueTables}
      operatingHours={operatingHours}
    />
  );
}
