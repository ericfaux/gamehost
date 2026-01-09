import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getVenueBySlug } from '@/lib/data/venues';
import { getBookingById, getVenueBookingSettings } from '@/lib/data/bookings';
import { ManageBookingClient } from '@/components/public/booking/ManageBookingClient';
import { ManageBookingSkeleton } from '@/components/public/booking/BookingSkeleton';
import { BookingErrorBoundary } from '@/components/public/booking/BookingErrorBoundary';
import { Button } from '@/components/ui/button';
import { AlertCircle } from '@/components/icons';
import type { Metadata, Viewport } from 'next';

interface Props {
  params: Promise<{ venueSlug: string; bookingId: string }>;
  searchParams: Promise<{ email?: string }>;
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
    title: venue ? `Manage Booking - ${venue.name}` : 'Manage Booking',
    robots: 'noindex', // Don't index manage pages
  };
}

export default async function ManageBookingPage({ params, searchParams }: Props) {
  const { venueSlug, bookingId } = await params;
  const { email } = await searchParams;

  const venue = await getVenueBySlug(venueSlug);

  if (!venue) {
    notFound();
  }

  const booking = await getBookingById(bookingId);

  if (!booking) {
    return (
      <ManageBookingError
        venueName={venue.name}
        venueSlug={venue.slug}
        error="booking_not_found"
        message="We couldn't find this booking. It may have been cancelled or the link is incorrect."
      />
    );
  }

  // Verify booking belongs to this venue
  if (booking.venue_id !== venue.id) {
    notFound();
  }

  // Fetch venue settings for calendar integration
  const venueSettings = await getVenueBookingSettings(venue.id);

  // Optional: Verify email matches (if provided in URL)
  if (email && booking.guest_email) {
    const emailMatch = email.toLowerCase() === booking.guest_email.toLowerCase();
    if (!emailMatch) {
      return (
        <ManageBookingError
          venueName={venue.name}
          venueSlug={venue.slug}
          error="email_mismatch"
          message="The email address doesn't match this booking. Please check the link in your confirmation email."
        />
      );
    }
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
                Manage your reservation
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <BookingErrorBoundary venueName={venue.name} venueSlug={venue.slug}>
          <Suspense fallback={<ManageBookingSkeleton />}>
            <ManageBookingClient
              booking={booking}
              venueName={venue.name}
              venueSettings={venueSettings}
            />
          </Suspense>
        </BookingErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-4 py-8 text-center text-xs text-[color:var(--color-ink-secondary)]">
        <p>Questions? Contact {venue.name} directly.</p>
      </footer>
    </div>
  );
}

function ManageBookingError({
  venueName,
  venueSlug,
  message,
}: {
  venueName: string;
  venueSlug: string;
  error: string;
  message: string;
}) {
  return (
    <div className="min-h-screen bg-[color:var(--color-muted)]">
      <header className="bg-[color:var(--color-surface)] border-b border-[color:var(--color-structure)]">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-serif font-bold text-[color:var(--color-ink-primary)]">
            {venueName}
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[color:var(--color-structure)] flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold mb-2 text-[color:var(--color-ink-primary)]">
            Booking Not Found
          </h2>
          <p className="text-[color:var(--color-ink-secondary)] mb-6">{message}</p>
          <Link href={`/v/${venueSlug}/book`}>
            <Button variant="secondary" className="min-h-[48px]">
              Make a New Booking
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
