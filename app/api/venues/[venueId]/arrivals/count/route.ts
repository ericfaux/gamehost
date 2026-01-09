import { NextResponse } from 'next/server';
import { getUpcomingBookingsCount, getVenueBookingSettings, BOOKING_SETTINGS_DEFAULTS } from '@/lib/data/bookings';

/**
 * GET /api/venues/[venueId]/arrivals/count
 *
 * Returns the count of upcoming arrivals for the sidebar badge.
 *
 * Query params:
 * - minutesAhead: How far ahead to look (default: 60)
 * - tz: IANA timezone string (e.g., "America/Los_Angeles") for correct local time filtering
 *
 * Returns: { count: number }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const { venueId } = await params;

  if (!venueId) {
    return NextResponse.json(
      { error: 'Venue ID is required' },
      { status: 400 }
    );
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const minutesAhead = parseInt(searchParams.get('minutesAhead') ?? '60', 10);
  const clientTimezone = searchParams.get('tz');

  try {
    // Fetch venue's configured timezone (prefer over client-provided)
    const venueSettings = await getVenueBookingSettings(venueId);
    const timezone = venueSettings?.timezone ?? clientTimezone ?? BOOKING_SETTINGS_DEFAULTS.timezone;

    const count = await getUpcomingBookingsCount(venueId, minutesAhead, timezone);
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching arrivals count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch arrivals count' },
      { status: 500 }
    );
  }
}
