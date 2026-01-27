import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getVenueBySlug } from '@/lib/data/venues';
import { getVenueBookingSettings } from '@/lib/data/bookings';
import { BookingWizard } from '@/components/public/booking/BookingWizard';
import { BookingsDisabled } from '@/components/public/booking/BookingsDisabled';
import { BookingErrorBoundary } from '@/components/public/booking/BookingErrorBoundary';
import { BookingWizardSkeleton } from '@/components/public/booking/BookingSkeleton';
import type { Metadata, Viewport } from 'next';

interface PageProps {
  params: Promise<{ venueSlug: string }>;
}

// Viewport configuration for mobile
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
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
      {/* Header with venue branding */}
      <header className="bg-white border-b border-[color:var(--color-structure)]">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {/* Venue Logo or GameLedger fallback */}
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
              {venue.logo_url ? (
                <img
                  src={venue.logo_url}
                  alt={`${venue.name} logo`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src="/logo.png"
                  alt="GameLedger logo"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-stone-900">{venue.name}</h1>
              <p className="text-sm text-stone-500">Reserve a table</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <BookingErrorBoundary venueName={venue.name} venueSlug={venue.slug}>
          <Suspense fallback={<BookingWizardSkeleton />}>
            <BookingWizard
              venueId={venue.id}
              venueName={venue.name}
              venueSlug={venue.slug}
              settings={settings}
            />
          </Suspense>
        </BookingErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-4 py-8 text-center text-xs text-stone-400">
        <p>Powered by GameLedger</p>
      </footer>
    </div>
  );
}
