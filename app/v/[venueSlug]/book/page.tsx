import { notFound } from 'next/navigation';
import { getVenueBySlug } from '@/lib/data/venues';
import { getVenueBookingSettings } from '@/lib/data/bookings';
import { BookingWizard } from '@/components/public/booking/BookingWizard';
import { BookingsDisabled } from '@/components/public/booking/BookingsDisabled';

interface PageProps {
  params: Promise<{ venueSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { venueSlug } = await params;
  const venue = await getVenueBySlug(venueSlug);

  if (!venue) {
    return { title: 'Venue Not Found' };
  }

  return {
    title: `Book a Table at ${venue.name}`,
    description: `Reserve your spot at ${venue.name}. Pick your time, party size, and even reserve a game.`,
  };
}

export default async function BookingPage({ params }: PageProps) {
  const { venueSlug } = await params;
  const venue = await getVenueBySlug(venueSlug);

  if (!venue) {
    notFound();
  }

  const settings = await getVenueBookingSettings(venue.id);

  // If no settings exist, bookings are not configured/enabled
  if (!settings) {
    return <BookingsDisabled venueName={venue.name} />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-serif font-bold text-stone-900">{venue.name}</h1>
          <p className="text-sm text-stone-500">Reserve a table</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <BookingWizard
          venueId={venue.id}
          venueName={venue.name}
          venueSlug={venue.slug}
          settings={settings}
        />
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-4 py-8 text-center text-xs text-stone-400">
        <p>Powered by GameHost</p>
      </footer>
    </div>
  );
}
