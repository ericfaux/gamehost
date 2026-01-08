import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type { BookingStatus, TimelineBlock } from '@/lib/db/types';

// =============================================================================
// Types
// =============================================================================

interface TableForColor {
  id: string;
  label: string;
  color_index: number | null;
}

interface OperatingHours {
  startHour: number;
  endHour: number;
}

interface TimelineConflict {
  tableId: string;
  block1Id: string;
  block2Id: string;
  overlapMinutes: number;
  severity: 'warning' | 'critical';
}

interface TimeDistribution {
  morning: number;
  lunch: number;
  afternoon: number;
  evening: number;
}

interface DayData {
  totalBookings: number;
  confirmedCount: number;
  pendingCount: number;
  distribution: TimeDistribution;
}

// =============================================================================
// Constants
// =============================================================================

const EXCLUDED_BOOKING_STATUSES: BookingStatus[] = [
  'cancelled_by_guest',
  'cancelled_by_venue',
  'no_show',
];

const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 23;

// =============================================================================
// Utility Functions
// =============================================================================

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeToDate(date: string, time: string): Date {
  const timeParts = time.split(':');
  const hours = timeParts[0];
  const minutes = timeParts[1];
  const seconds = timeParts[2] ?? '00';
  return new Date(`${date}T${hours}:${minutes}:${seconds}`);
}

function getTimeSegment(time: string): 'morning' | 'lunch' | 'afternoon' | 'evening' {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 12) return 'morning';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function blocksOverlap(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date }
): boolean {
  return a.start < b.end && a.end > b.start;
}

function getOverlapMinutes(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date }
): number {
  if (!blocksOverlap(a, b)) return 0;
  const overlapStart = new Date(Math.max(a.start.getTime(), b.start.getTime()));
  const overlapEnd = new Date(Math.min(a.end.getTime(), b.end.getTime()));
  return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));
}

// =============================================================================
// Data Fetching Functions
// =============================================================================

async function getOperatingHours(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  venueId: string,
  dayOfWeek: number
): Promise<OperatingHours> {
  const { data } = await supabase
    .from('venue_operating_hours')
    .select('open_time, close_time, is_closed')
    .eq('venue_id', venueId)
    .eq('day_of_week', dayOfWeek)
    .single();

  if (!data || data.is_closed) {
    return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR };
  }

  const startHour = parseInt(data.open_time.split(':')[0], 10);
  const endHour = parseInt(data.close_time.split(':')[0], 10);

  return { startHour, endHour };
}

async function getTables(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  venueId: string
): Promise<TableForColor[]> {
  const { data } = await supabase
    .from('venue_tables')
    .select('id, label, color_index')
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .order('label', { ascending: true });

  return (data ?? []) as TableForColor[];
}

async function getBookingsForDay(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  venueId: string,
  date: string
): Promise<TimelineBlock[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      table_id,
      start_time,
      end_time,
      status,
      guest_name,
      party_size,
      game_id,
      venue_tables:table_id (id, label),
      games:game_id (id, title)
    `)
    .eq('venue_id', venueId)
    .eq('booking_date', date)
    .not('status', 'in', `(${EXCLUDED_BOOKING_STATUSES.join(',')})`)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }

  return (data ?? []).map((raw) => {
    const venueTablesArray = raw.venue_tables as Array<{ id: string; label: string }> | null;
    const venue_table = Array.isArray(venueTablesArray) && venueTablesArray.length > 0
      ? venueTablesArray[0]
      : venueTablesArray && !Array.isArray(venueTablesArray)
        ? venueTablesArray
        : null;

    const gamesArray = raw.games as Array<{ id: string; title: string }> | null;
    const game = Array.isArray(gamesArray) && gamesArray.length > 0
      ? gamesArray[0]
      : gamesArray && !Array.isArray(gamesArray)
        ? gamesArray
        : null;

    const startDate = timeToDate(date, raw.start_time);
    const endDate = timeToDate(date, raw.end_time);

    return {
      id: `booking-${raw.id}`,
      type: 'booking' as const,
      table_id: raw.table_id,
      table_label: venue_table?.label ?? 'Unassigned',
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      booking_id: raw.id,
      booking_status: raw.status,
      guest_name: raw.guest_name,
      party_size: raw.party_size,
      session_id: null,
      game_title: game?.title ?? null,
    } as TimelineBlock;
  });
}

function detectConflicts(blocks: TimelineBlock[]): TimelineConflict[] {
  const conflicts: TimelineConflict[] = [];

  // Group blocks by table
  const blocksByTable = new Map<string, TimelineBlock[]>();
  for (const block of blocks) {
    if (!block.table_id) continue;
    const existing = blocksByTable.get(block.table_id) ?? [];
    existing.push(block);
    blocksByTable.set(block.table_id, existing);
  }

  // Check each table for conflicts
  for (const [tableId, tableBlocks] of blocksByTable) {
    if (tableBlocks.length < 2) continue;

    const sortedBlocks = [...tableBlocks].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    for (let i = 0; i < sortedBlocks.length; i++) {
      for (let j = i + 1; j < sortedBlocks.length; j++) {
        const blockA = sortedBlocks[i];
        const blockB = sortedBlocks[j];

        const aRange = {
          start: new Date(blockA.start_time),
          end: new Date(blockA.end_time),
        };
        const bRange = {
          start: new Date(blockB.start_time),
          end: new Date(blockB.end_time),
        };

        const overlapMinutes = getOverlapMinutes(aRange, bRange);

        if (overlapMinutes > 0) {
          conflicts.push({
            tableId,
            block1Id: blockA.id,
            block2Id: blockB.id,
            overlapMinutes,
            severity: overlapMinutes >= 15 ? 'critical' : 'warning',
          });
        }
      }
    }
  }

  return conflicts;
}

// =============================================================================
// API Route Handler
// =============================================================================

/**
 * GET /api/venues/[venueId]/calendar
 *
 * Fetches calendar data for the booking calendar views.
 *
 * Query params:
 * - view: 'day' | 'week' | 'month'
 * - date: YYYY-MM-DD (for day and week views)
 * - year: number (for month view)
 * - month: 1-12 (for month view)
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

  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') ?? 'day';

  try {
    const supabase = getSupabaseAdmin();

    if (view === 'day') {
      const dateStr = searchParams.get('date') ?? formatDateString(new Date());
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();

      const [blocks, tables, operatingHours] = await Promise.all([
        getBookingsForDay(supabase, venueId, dateStr),
        getTables(supabase, venueId),
        getOperatingHours(supabase, venueId, dayOfWeek),
      ]);

      const conflicts = detectConflicts(blocks);

      return NextResponse.json({
        blocks,
        tables,
        conflicts,
        operatingHours,
      });
    }

    if (view === 'week') {
      const dateStr = searchParams.get('date') ?? formatDateString(new Date());
      const startDate = new Date(dateStr);

      // Get Sunday of the week
      const dayOfWeek = startDate.getDay();
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() - dayOfWeek);

      // Generate 7 days
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        weekDates.push(formatDateString(d));
      }

      // Fetch tables and operating hours for the first day
      const [tables, operatingHours] = await Promise.all([
        getTables(supabase, venueId),
        getOperatingHours(supabase, venueId, 0), // Use Sunday's hours as default
      ]);

      // Fetch bookings for all days in parallel
      const bookingsByDatePromises = weekDates.map((date) =>
        getBookingsForDay(supabase, venueId, date).then((blocks) => ({ date, blocks }))
      );
      const bookingResults = await Promise.all(bookingsByDatePromises);

      // Build blocksByDate map
      const blocksByDate: Record<string, TimelineBlock[]> = {};
      let allBlocks: TimelineBlock[] = [];

      for (const { date, blocks } of bookingResults) {
        blocksByDate[date] = blocks;
        allBlocks = [...allBlocks, ...blocks];
      }

      const conflicts = detectConflicts(allBlocks);

      return NextResponse.json({
        blocksByDate,
        tables,
        conflicts,
        operatingHours,
        weekStart: weekDates[0],
        weekEnd: weekDates[6],
      });
    }

    if (view === 'month') {
      const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);
      const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1), 10);

      // Calculate month start and end
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);

      const monthStartStr = formatDateString(monthStart);
      const monthEndStr = formatDateString(monthEnd);

      // Fetch all bookings for the month
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, booking_date, start_time, status')
        .eq('venue_id', venueId)
        .gte('booking_date', monthStartStr)
        .lte('booking_date', monthEndStr)
        .not('status', 'in', `(${EXCLUDED_BOOKING_STATUSES.join(',')})`)
        .order('booking_date', { ascending: true });

      if (error) {
        console.error('Error fetching month bookings:', error);
        return NextResponse.json(
          { error: 'Failed to fetch month data' },
          { status: 500 }
        );
      }

      // Aggregate by date
      const days: Record<string, DayData> = {};

      for (const booking of bookings ?? []) {
        const dateKey = booking.booking_date;

        if (!days[dateKey]) {
          days[dateKey] = {
            totalBookings: 0,
            confirmedCount: 0,
            pendingCount: 0,
            distribution: { morning: 0, lunch: 0, afternoon: 0, evening: 0 },
          };
        }

        days[dateKey].totalBookings++;

        if (
          booking.status === 'confirmed' ||
          booking.status === 'arrived' ||
          booking.status === 'seated' ||
          booking.status === 'completed'
        ) {
          days[dateKey].confirmedCount++;
        } else if (booking.status === 'pending') {
          days[dateKey].pendingCount++;
        }

        // Add to distribution
        const segment = getTimeSegment(booking.start_time);
        days[dateKey].distribution[segment]++;
      }

      return NextResponse.json({ days, month, year });
    }

    return NextResponse.json(
      { error: 'Invalid view parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in calendar endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
