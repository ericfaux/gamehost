import { NextResponse } from 'next/server';
import { formatInTimeZone } from 'date-fns-tz';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { getVenueBookingSettings, BOOKING_SETTINGS_DEFAULTS } from '@/lib/data/bookings';
import type { BookingWithDetails, BookingStatus } from '@/lib/db/types';

/**
 * GET /api/venues/[venueId]/arrivals
 *
 * Fetches arrivals for the Arrivals Board.
 * Includes:
 * - Late arrivals (bookings from past 30 minutes that haven't been seated)
 * - Upcoming arrivals (bookings in the next N minutes)
 *
 * Query params:
 * - minutesAhead: How far ahead to look (default: 60)
 * - tz: IANA timezone string (e.g., "America/Los_Angeles") for correct local time filtering
 *
 * Returns bookings with status 'confirmed' or 'arrived' ordered by start_time.
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

  // Minutes to look back for late arrivals
  const minutesBehind = 30;

  try {
    // Fetch venue's configured timezone (prefer over client-provided)
    const venueSettings = await getVenueBookingSettings(venueId);
    const timezone = venueSettings?.timezone ?? clientTimezone ?? BOOKING_SETTINGS_DEFAULTS.timezone;
    const supabase = getSupabaseAdmin();
    const now = new Date();

    // Calculate time range in the venue's local timezone
    // This ensures we compare against booking times which are stored in local time
    const today = formatInTimeZone(now, timezone, 'yyyy-MM-dd');

    // Look back 30 minutes for late arrivals
    const lookBackDate = new Date(now.getTime() - minutesBehind * 60 * 1000);
    const lookBackTime = formatInTimeZone(lookBackDate, timezone, 'HH:mm:ss');

    // Look ahead for upcoming arrivals
    const lookAheadDate = new Date(now.getTime() + minutesAhead * 60 * 1000);
    const lookAheadTime = formatInTimeZone(lookAheadDate, timezone, 'HH:mm:ss');

    // Only include confirmed or arrived bookings
    const validStatuses: BookingStatus[] = ['confirmed', 'arrived'];

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        venue_tables:table_id (id, label, capacity),
        games:game_id (id, title, cover_image_url)
      `)
      .eq('venue_id', venueId)
      .eq('booking_date', today)
      .in('status', validStatuses)
      .gte('start_time', lookBackTime)
      .lte('start_time', lookAheadTime)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching arrivals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch arrivals' },
        { status: 500 }
      );
    }

    // Transform the data to extract foreign key objects from arrays
    const arrivals: BookingWithDetails[] = (data ?? []).map((row) => {
      const rawData = row as Record<string, unknown>;

      // Extract venue_tables[0] -> venue_table
      const venueTablesArray = rawData.venue_tables as Array<{
        id: string;
        label: string;
        capacity: number | null;
      }> | null;
      const venue_table =
        Array.isArray(venueTablesArray) && venueTablesArray.length > 0
          ? venueTablesArray[0]
          : venueTablesArray && !Array.isArray(venueTablesArray)
            ? venueTablesArray
            : null;

      // Extract games[0] -> game
      const gamesArray = rawData.games as Array<{
        id: string;
        title: string;
        cover_image_url: string | null;
      }> | null;
      const game =
        Array.isArray(gamesArray) && gamesArray.length > 0
          ? gamesArray[0]
          : gamesArray && !Array.isArray(gamesArray)
            ? gamesArray
            : null;

      // Remove arrays and add extracted objects
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { venue_tables: _vt, games: _g, ...booking } = rawData;

      return {
        ...booking,
        venue_table,
        game,
      } as BookingWithDetails;
    });

    return NextResponse.json(arrivals);
  } catch (error) {
    console.error('Error in arrivals endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
