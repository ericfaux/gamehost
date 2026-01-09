import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getVenueBySlug } from '@/lib/data/venues';
import { ReservationLookup } from '@/components/public/booking/ReservationLookup';
import type { Metadata, Viewport } from 'next';

interface Props {
  params: Promise<{ venueSlug: string }>;
}

// Viewport configuration for mobile
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { venueSlug } = await params;
  const venue = await getVenueBySlug(venueSlug);
  return {
    title: venue ? `Find Your Reservation - ${venue.name}` : 'Find Your Reservation',
    robots: 'noindex', // Don't index lookup pages
  };
}

export default async function ReservationLookupPage({ params }: Props) {
  const { venueSlug } = await params;

  const venue = await getVenueBySlug(venueSlug);

  if (!venue) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-muted)]">
      {/* Header with venue branding */}
      <header className="bg-[color:var(--color-surface)] border-b border-[color:var(--color-structure)]">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {/* Venue Initial */}
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <span className="text-teal-700 font-bold text-lg" aria-hidden="true">
                {venue.name.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[color:var(--color-ink-primary)]">
                {venue.name}
              </h1>
              <p className="text-sm text-[color:var(--color-ink-secondary)]">
                Find your reservation
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <ReservationLookup venueId={venue.id} venueSlug={venue.slug} />
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-4 py-8 text-center">
        <Link
          href={`/v/${venue.slug}/book`}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          Make a new reservation
        </Link>
      </footer>
    </div>
  );
}
