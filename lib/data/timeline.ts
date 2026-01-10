/**
 * Timeline Data Layer
 *
 * This module provides data fetching and transformation for the booking Gantt view.
 * It combines bookings and active sessions into a unified timeline structure,
 * detects conflicts, and supports date navigation.
 *
 * Key features:
 * - Fetches bookings and sessions for a venue on a given date
 * - Transforms both into unified TimelineBlock structures
 * - Groups blocks by table for Gantt row rendering
 * - Detects overlapping blocks (conflicts) between bookings/sessions
 * - Supports configurable time ranges (start/end hours)
 *
 * Performance notes:
 * - All queries run in parallel where possible
 * - Target: <200ms for typical venue (10-20 tables, 50-100 bookings/day)
 */

import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type {
  BookingWithDetails,
  BookingStatus,
  Session,
  TimelineBlock,
  TimelineBlockType,
} from '@/lib/db/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Options for configuring timeline data fetch.
 */
export interface TimelineOptions {
  /** Start hour of the timeline (default: 9 = 9am) */
  startHour?: number;
  /** End hour of the timeline (default: 23 = 11pm) */
  endHour?: number;
  /** Include inactive tables in the timeline (default: false) */
  includeInactive?: boolean;
  /** Include active sessions in the timeline (default: false, shows bookings only) */
  includeSessions?: boolean;
}

/**
 * Time range for the timeline view.
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * View mode for the timeline.
 */
export type TimelineViewMode = 'day' | 'week' | 'month';

/**
 * A table row in the timeline, containing all blocks for that table.
 */
export interface TimelineTable {
  id: string;
  label: string;
  capacity: number | null;
  zone?: string;
  blocks: TimelineBlock[];
}

/**
 * Conflict severity levels.
 * - warning: 1-15 minutes of overlap
 * - critical: >15 minutes of overlap
 */
export type ConflictSeverity = 'warning' | 'critical';

/**
 * Represents an overlap between two blocks on the same table.
 */
export interface TimelineConflict {
  tableId: string;
  block1Id: string;
  block2Id: string;
  /** Minutes of overlap between the two blocks */
  overlapMinutes: number;
  severity: ConflictSeverity;
}

/**
 * The complete timeline data structure for rendering.
 */
export interface TimelineData {
  tables: TimelineTable[];
  timeRange: TimeRange;
  conflicts: TimelineConflict[];
}

/**
 * Block status for timeline rendering.
 */
export type TimelineBlockStatus =
  | 'confirmed'
  | 'arrived'
  | 'seated'
  | 'active'
  | 'overtime'
  | 'pending'
  | 'completed';

// -----------------------------------------------------------------------------
// Time Utility Functions
// -----------------------------------------------------------------------------

/**
 * Creates a time range for a specific date with start and end hours.
 *
 * @param date - Date string in 'YYYY-MM-DD' format
 * @param startHour - Start hour (0-23)
 * @param endHour - End hour (0-23)
 * @returns TimeRange with start and end Date objects
 */
export function getTimeRangeForDate(
  date: string,
  startHour: number,
  endHour: number
): TimeRange {
  return {
    start: new Date(`${date}T${String(startHour).padStart(2, '0')}:00:00`),
    end: new Date(`${date}T${String(endHour).padStart(2, '0')}:00:00`),
  };
}

/**
 * Checks if two time blocks overlap.
 * Two blocks overlap if: block1.start < block2.end AND block1.end > block2.start
 *
 * @param a - First block with start and end Date properties
 * @param b - Second block with start and end Date properties
 * @returns true if the blocks overlap
 */
export function blocksOverlap(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date }
): boolean {
  return a.start < b.end && a.end > b.start;
}

/**
 * Calculates the overlap duration in minutes between two time blocks.
 *
 * @param a - First block with start and end Date properties
 * @param b - Second block with start and end Date properties
 * @returns Overlap duration in minutes (0 if no overlap)
 */
function getOverlapMinutes(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date }
): number {
  if (!blocksOverlap(a, b)) {
    return 0;
  }

  const overlapStart = new Date(Math.max(a.start.getTime(), b.start.getTime()));
  const overlapEnd = new Date(Math.min(a.end.getTime(), b.end.getTime()));

  return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));
}

/**
 * Converts a time string 'HH:MM' or 'HH:MM:SS' to a Date object for a given date.
 *
 * @param date - Date string in 'YYYY-MM-DD' format
 * @param time - Time string in 'HH:MM' or 'HH:MM:SS' format
 * @returns Date object
 */
function timeToDate(date: string, time: string): Date {
  // Normalize time to HH:MM:SS format
  const timeParts = time.split(':');
  const hours = timeParts[0];
  const minutes = timeParts[1];
  const seconds = timeParts[2] ?? '00';

  return new Date(`${date}T${hours}:${minutes}:${seconds}`);
}

/**
 * Parses an ISO timestamp and returns a Date object.
 *
 * @param isoString - ISO timestamp string
 * @returns Date object
 */
function parseISODate(isoString: string): Date {
  return new Date(isoString);
}

// -----------------------------------------------------------------------------
// Transform Functions
// -----------------------------------------------------------------------------

/**
 * Default session duration in minutes when no game is associated.
 */
const DEFAULT_SESSION_DURATION_MINUTES = 120;

/**
 * Transforms a booking into a TimelineBlock.
 *
 * @param booking - The booking with table and game details
 * @param date - The date string in 'YYYY-MM-DD' format
 * @returns TimelineBlock representing the booking
 */
export function bookingToTimelineBlock(
  booking: BookingWithDetails,
  date: string
): TimelineBlock {
  const startDate = timeToDate(date, booking.start_time);
  const endDate = timeToDate(date, booking.end_time);

  return {
    id: `booking-${booking.id}`,
    type: 'booking' as TimelineBlockType,
    table_id: booking.table_id ?? '',
    table_label: booking.venue_table?.label ?? 'Unassigned',
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    // Booking-specific fields
    booking_id: booking.id,
    booking_status: booking.status,
    guest_name: booking.guest_name,
    party_size: booking.party_size,
    // Session fields (null for bookings)
    session_id: null,
    game_title: booking.game?.title ?? null,
  };
}

/**
 * Raw session type from Supabase with joined game and table data.
 */
interface SessionWithDetails extends Session {
  games: Array<{ title: string; max_time_minutes: number }> | { title: string; max_time_minutes: number } | null;
  venue_tables: Array<{ id: string; label: string }> | { id: string; label: string } | null;
}

/**
 * Transforms a session into a TimelineBlock.
 * Calculates estimated end time based on game duration or default.
 *
 * @param session - The session with game and table details
 * @param date - The date string in 'YYYY-MM-DD' format (for consistency)
 * @returns TimelineBlock representing the session
 */
export function sessionToTimelineBlock(
  session: SessionWithDetails,
  _date: string
): TimelineBlock {
  const now = new Date();

  // Parse session start time
  const startDate = parseISODate(session.started_at);

  // Extract game info (handle array or object from Supabase joins)
  const gameData = Array.isArray(session.games) && session.games.length > 0
    ? session.games[0]
    : !Array.isArray(session.games)
      ? session.games
      : null;

  const gameDuration = gameData?.max_time_minutes ?? DEFAULT_SESSION_DURATION_MINUTES;
  const gameTitle = gameData?.title ?? null;

  // Calculate estimated end time
  const estimatedEnd = new Date(startDate.getTime() + gameDuration * 60 * 1000);

  // Extract table info
  const tableData = Array.isArray(session.venue_tables) && session.venue_tables.length > 0
    ? session.venue_tables[0]
    : !Array.isArray(session.venue_tables)
      ? session.venue_tables
      : null;

  // Determine session status
  const isOvertime = now > estimatedEnd;
  const sessionStatus: BookingStatus = isOvertime ? 'seated' : 'arrived'; // Using closest booking status equivalents

  return {
    id: `session-${session.id}`,
    type: 'session' as TimelineBlockType,
    table_id: session.table_id,
    table_label: tableData?.label ?? 'Unknown',
    start_time: startDate.toISOString(),
    end_time: estimatedEnd.toISOString(),
    // Booking fields (null for sessions)
    booking_id: null,
    booking_status: sessionStatus, // Using booking status for consistency
    guest_name: null,
    party_size: null,
    // Session-specific fields
    session_id: session.id,
    game_title: gameTitle,
  };
}

// -----------------------------------------------------------------------------
// Conflict Detection
// -----------------------------------------------------------------------------

/**
 * Threshold in minutes for critical severity.
 * Overlaps >= this value are critical, otherwise warning.
 */
const CRITICAL_OVERLAP_THRESHOLD_MINUTES = 15;

/**
 * Detects conflicts (overlaps) between blocks on the same table.
 *
 * @param blocks - Array of timeline blocks (already grouped by table)
 * @param tableId - The table ID for these blocks
 * @returns Array of detected conflicts
 */
function detectConflictsForTable(
  blocks: TimelineBlock[],
  tableId: string
): TimelineConflict[] {
  const conflicts: TimelineConflict[] = [];

  // Sort blocks by start time for efficient comparison
  const sortedBlocks = [...blocks].sort((a, b) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  // Compare each pair of blocks
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
          severity: overlapMinutes >= CRITICAL_OVERLAP_THRESHOLD_MINUTES ? 'critical' : 'warning',
        });
      }
    }
  }

  return conflicts;
}

/**
 * Detects all conflicts across all tables in the timeline.
 *
 * @param tables - Array of timeline tables with their blocks
 * @returns Array of all detected conflicts
 */
function detectConflicts(tables: TimelineTable[]): TimelineConflict[] {
  const allConflicts: TimelineConflict[] = [];

  for (const table of tables) {
    if (table.blocks.length > 1) {
      const tableConflicts = detectConflictsForTable(table.blocks, table.id);
      allConflicts.push(...tableConflicts);
    }
  }

  return allConflicts;
}

// -----------------------------------------------------------------------------
// Main Data Fetch Function
// -----------------------------------------------------------------------------

/**
 * Statuses to exclude from booking queries.
 */
const EXCLUDED_BOOKING_STATUSES: BookingStatus[] = [
  'cancelled_by_guest',
  'cancelled_by_venue',
  'no_show',
];

/**
 * Fetches and transforms timeline data for a venue on a specific date.
 *
 * Implementation steps:
 * 1. Fetch all venue tables (with zone info if available)
 * 2. Fetch all bookings for the date (exclude cancelled/no-show)
 * 3. Fetch all active sessions for the venue
 * 4. Transform into TimelineBlock structures
 * 5. Group blocks by table
 * 6. Detect conflicts between blocks
 * 7. Return structured TimelineData
 *
 * @param venueId - The venue's UUID
 * @param date - Date in 'YYYY-MM-DD' format
 * @param options - Optional configuration for the timeline
 * @returns Promise<TimelineData> with tables, time range, and conflicts
 */
export async function getTimelineData(
  venueId: string,
  date: string,
  options: TimelineOptions = {}
): Promise<TimelineData> {
  const {
    startHour = 9,
    endHour = 23,
    includeInactive = false,
    includeSessions = false,
  } = options;

  const supabase = getSupabaseAdmin();

  // -------------------------------------------------------------------------
  // Step 1-3: Fetch all data in parallel for performance
  // -------------------------------------------------------------------------

  // Type definitions for raw query results
  interface RawTableRow {
    id: string;
    label: string;
    capacity: number | null;
    is_active: boolean;
    venue_zones: Array<{ name: string }> | { name: string } | null;
  }

  interface RawBookingRow {
    id: string;
    venue_id: string;
    table_id: string | null;
    session_id: string | null;
    status: BookingStatus;
    booking_date: string;
    start_time: string;
    end_time: string;
    party_size: number;
    guest_name: string;
    guest_email: string | null;
    guest_phone: string | null;
    notes: string | null;
    internal_notes: string | null;
    game_id: string | null;
    venue_tables: Array<{ id: string; label: string; capacity: number | null }> | null;
    games: Array<{ id: string; title: string; cover_image_url: string | null }> | null;
    [key: string]: unknown;
  }

  interface RawSessionRow {
    id: string;
    venue_id: string;
    table_id: string;
    game_id: string | null;
    started_at: string;
    ended_at: string | null;
    games: Array<{ title: string; max_time_minutes: number }> | null;
    venue_tables: Array<{ id: string; label: string }> | null;
    [key: string]: unknown;
  }

  const [tablesResult, bookingsResult, sessionsResult] = await Promise.all([
    // Fetch tables with zone info
    supabase
      .from('venue_tables')
      .select(`
        id,
        label,
        capacity,
        is_active,
        venue_zones:zone_id (name)
      `)
      .eq('venue_id', venueId)
      .order('label', { ascending: true })
      .then((result: { data: unknown[] | null; error: unknown }): RawTableRow[] => {
        if (result.error) {
          console.error('Error fetching venue tables for timeline:', result.error);
          return [];
        }
        // Filter by active status if needed
        const tables = (result.data ?? []) as RawTableRow[];
        if (!includeInactive) {
          return tables.filter((t: RawTableRow) => t.is_active);
        }
        return tables;
      }),

    // Fetch bookings for the date
    supabase
      .from('bookings')
      .select(`
        *,
        venue_tables:table_id (id, label, capacity),
        games:game_id (id, title, cover_image_url)
      `)
      .eq('venue_id', venueId)
      .eq('booking_date', date)
      .not('status', 'in', `(${EXCLUDED_BOOKING_STATUSES.join(',')})`)
      .order('start_time', { ascending: true })
      .then((result: { data: unknown[] | null; error: unknown }): RawBookingRow[] => {
        if (result.error) {
          console.error('Error fetching bookings for timeline:', result.error);
          return [];
        }
        return (result.data ?? []) as RawBookingRow[];
      }),

    // Fetch active sessions (only if includeSessions is true)
    includeSessions
      ? supabase
          .from('sessions')
          .select(`
            *,
            games:game_id (title, max_time_minutes),
            venue_tables:table_id (id, label)
          `)
          .eq('venue_id', venueId)
          .is('ended_at', null)
          .then((result: { data: unknown[] | null; error: unknown }): RawSessionRow[] => {
            if (result.error) {
              console.error('Error fetching sessions for timeline:', result.error);
              return [];
            }
            return (result.data ?? []) as RawSessionRow[];
          })
      : Promise.resolve([] as RawSessionRow[]),
  ]);

  // -------------------------------------------------------------------------
  // Step 4: Transform data into TimelineBlock structures
  // -------------------------------------------------------------------------

  // Transform bookings
  const bookingBlocks: TimelineBlock[] = bookingsResult.map((raw: RawBookingRow) => {
    // Transform Supabase array relations to single objects
    const venueTablesArray = raw.venue_tables;
    const venue_table = Array.isArray(venueTablesArray) && venueTablesArray.length > 0
      ? venueTablesArray[0]
      : venueTablesArray && !Array.isArray(venueTablesArray)
        ? venueTablesArray
        : null;

    const gamesArray = raw.games;
    const game = Array.isArray(gamesArray) && gamesArray.length > 0
      ? gamesArray[0]
      : gamesArray && !Array.isArray(gamesArray)
        ? gamesArray
        : null;

    const booking = {
      ...raw,
      venue_table,
      game,
    } as unknown as BookingWithDetails;

    return bookingToTimelineBlock(booking, date);
  });

  // Transform sessions (only if includeSessions is true)
  const sessionBlocks: TimelineBlock[] = includeSessions
    ? sessionsResult.map((session: RawSessionRow) =>
        sessionToTimelineBlock(session as unknown as SessionWithDetails, date)
      )
    : [];

  // Combine all blocks
  const allBlocks = [...bookingBlocks, ...sessionBlocks];

  // -------------------------------------------------------------------------
  // Step 5: Group blocks by table
  // -------------------------------------------------------------------------

  // Create a map of table_id -> blocks
  const blocksByTable = new Map<string, TimelineBlock[]>();

  for (const block of allBlocks) {
    if (block.table_id) {
      const existing = blocksByTable.get(block.table_id) ?? [];
      existing.push(block);
      blocksByTable.set(block.table_id, existing);
    }
  }

  // Build TimelineTable array from tables result
  const timelineTables: TimelineTable[] = tablesResult.map((table: RawTableRow) => {
    // Extract zone name
    const zoneData = Array.isArray(table.venue_zones) && table.venue_zones.length > 0
      ? table.venue_zones[0]
      : !Array.isArray(table.venue_zones)
        ? table.venue_zones
        : null;

    return {
      id: table.id,
      label: table.label,
      capacity: table.capacity,
      zone: zoneData?.name,
      blocks: blocksByTable.get(table.id) ?? [],
    };
  });

  // -------------------------------------------------------------------------
  // Step 6: Detect conflicts
  // -------------------------------------------------------------------------

  const conflicts = detectConflicts(timelineTables);

  // -------------------------------------------------------------------------
  // Step 7: Build and return TimelineData
  // -------------------------------------------------------------------------

  const timeRange = getTimeRangeForDate(date, startHour, endHour);

  return {
    tables: timelineTables,
    timeRange,
    conflicts,
  };
}

// -----------------------------------------------------------------------------
// Weekly Timeline Data
// -----------------------------------------------------------------------------

/**
 * Day data for a table in weekly view.
 */
export interface WeeklyDayData {
  bookingCount: number;
  blocks: TimelineBlock[];
}

/**
 * A table row in the weekly timeline view.
 */
export interface WeeklyTable {
  id: string;
  label: string;
  capacity: number | null;
  zone?: string;
  /** Map of date string (YYYY-MM-DD) to day data */
  days: Record<string, WeeklyDayData>;
}

/**
 * Weekly timeline data structure.
 */
export interface WeeklyTimelineData {
  tables: WeeklyTable[];
  weekStart: Date;
  weekEnd: Date;
}

/**
 * Gets the Monday of the week for a given date.
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Formats a date to YYYY-MM-DD string.
 */
function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Fetches weekly timeline data for a venue.
 *
 * @param venueId - The venue's UUID
 * @param weekStartDate - Any date within the week (will find Monday)
 * @param options - Optional configuration
 * @returns Promise<WeeklyTimelineData>
 */
export async function getWeeklyTimelineData(
  venueId: string,
  weekStartDate: Date,
  options: TimelineOptions = {}
): Promise<WeeklyTimelineData> {
  const { includeInactive = false } = options;
  const supabase = getSupabaseAdmin();

  // Calculate week start (Monday) and end (Sunday)
  const weekStart = getWeekStart(weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekStartStr = formatDateToString(weekStart);
  const weekEndStr = formatDateToString(weekEnd);

  // Generate array of dates for the week
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    weekDates.push(formatDateToString(d));
  }

  // Fetch tables and bookings in parallel
  interface RawTableRow {
    id: string;
    label: string;
    capacity: number | null;
    is_active: boolean;
    venue_zones: Array<{ name: string }> | { name: string } | null;
  }

  interface RawBookingRow {
    id: string;
    table_id: string | null;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: BookingStatus;
    guest_name: string;
    party_size: number;
    game_id: string | null;
    venue_tables: Array<{ id: string; label: string }> | null;
    games: Array<{ id: string; title: string }> | null;
  }

  const [tablesResult, bookingsResult] = await Promise.all([
    // Fetch tables
    supabase
      .from('venue_tables')
      .select(`
        id,
        label,
        capacity,
        is_active,
        venue_zones:zone_id (name)
      `)
      .eq('venue_id', venueId)
      .order('label', { ascending: true })
      .then((result): RawTableRow[] => {
        if (result.error) {
          console.error('Error fetching venue tables:', result.error);
          return [];
        }
        const tables = (result.data ?? []) as RawTableRow[];
        if (!includeInactive) {
          return tables.filter((t) => t.is_active);
        }
        return tables;
      }),

    // Fetch bookings for the week
    supabase
      .from('bookings')
      .select(`
        id,
        table_id,
        booking_date,
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
      .gte('booking_date', weekStartStr)
      .lte('booking_date', weekEndStr)
      .not('status', 'in', `(${EXCLUDED_BOOKING_STATUSES.join(',')})`)
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })
      .then((result): RawBookingRow[] => {
        if (result.error) {
          console.error('Error fetching weekly bookings:', result.error);
          return [];
        }
        return (result.data ?? []) as RawBookingRow[];
      }),
  ]);

  // Group bookings by table and date
  const bookingsByTableAndDate = new Map<string, Map<string, TimelineBlock[]>>();

  for (const booking of bookingsResult) {
    if (!booking.table_id) continue;

    const tableId = booking.table_id;
    const dateKey = booking.booking_date;

    // Get or create table map
    if (!bookingsByTableAndDate.has(tableId)) {
      bookingsByTableAndDate.set(tableId, new Map());
    }
    const tableMap = bookingsByTableAndDate.get(tableId)!;

    // Get or create date array
    if (!tableMap.has(dateKey)) {
      tableMap.set(dateKey, []);
    }

    // Transform to TimelineBlock
    const venueTable = Array.isArray(booking.venue_tables) && booking.venue_tables.length > 0
      ? booking.venue_tables[0]
      : null;
    const game = Array.isArray(booking.games) && booking.games.length > 0
      ? booking.games[0]
      : null;

    const startDate = new Date(`${dateKey}T${booking.start_time}`);
    const endDate = new Date(`${dateKey}T${booking.end_time}`);

    const block: TimelineBlock = {
      id: `booking-${booking.id}`,
      type: 'booking',
      table_id: tableId,
      table_label: venueTable?.label ?? 'Unassigned',
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      booking_id: booking.id,
      booking_status: booking.status,
      guest_name: booking.guest_name,
      party_size: booking.party_size,
      session_id: null,
      game_title: game?.title ?? null,
    };

    tableMap.get(dateKey)!.push(block);
  }

  // Build weekly table data
  const weeklyTables: WeeklyTable[] = tablesResult.map((table) => {
    const zoneData = Array.isArray(table.venue_zones) && table.venue_zones.length > 0
      ? table.venue_zones[0]
      : !Array.isArray(table.venue_zones)
        ? table.venue_zones
        : null;

    const days: Record<string, WeeklyDayData> = {};
    const tableBookings = bookingsByTableAndDate.get(table.id);

    for (const dateStr of weekDates) {
      const blocks = tableBookings?.get(dateStr) ?? [];
      days[dateStr] = {
        bookingCount: blocks.length,
        blocks,
      };
    }

    return {
      id: table.id,
      label: table.label,
      capacity: table.capacity,
      zone: zoneData?.name,
      days,
    };
  });

  return {
    tables: weeklyTables,
    weekStart,
    weekEnd,
  };
}

// -----------------------------------------------------------------------------
// Monthly Timeline Data
// -----------------------------------------------------------------------------

/**
 * Day data for monthly view.
 */
export interface MonthlyDayData {
  totalBookings: number;
  confirmedCount: number;
  pendingCount: number;
}

/**
 * Monthly timeline data structure.
 */
export interface MonthlyTimelineData {
  /** Map of date string (YYYY-MM-DD) to day data */
  days: Record<string, MonthlyDayData>;
  month: number;
  year: number;
}

/**
 * Fetches monthly timeline data for a venue.
 *
 * @param venueId - The venue's UUID
 * @param year - The year
 * @param month - The month (1-12)
 * @param options - Optional configuration
 * @returns Promise<MonthlyTimelineData>
 */
export async function getMonthlyTimelineData(
  venueId: string,
  year: number,
  month: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: TimelineOptions = {}
): Promise<MonthlyTimelineData> {
  const supabase = getSupabaseAdmin();

  // Calculate month start and end
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  const monthStartStr = formatDateToString(monthStart);
  const monthEndStr = formatDateToString(monthEnd);

  // Fetch all bookings for the month
  interface RawBookingRow {
    id: string;
    booking_date: string;
    status: BookingStatus;
  }

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, booking_date, status')
    .eq('venue_id', venueId)
    .gte('booking_date', monthStartStr)
    .lte('booking_date', monthEndStr)
    .not('status', 'in', `(${EXCLUDED_BOOKING_STATUSES.join(',')})`)
    .order('booking_date', { ascending: true });

  if (error) {
    console.error('Error fetching monthly bookings:', error);
    return { days: {}, month, year };
  }

  const bookingsData = (bookings ?? []) as RawBookingRow[];

  // Aggregate by date
  const days: Record<string, MonthlyDayData> = {};

  for (const booking of bookingsData) {
    const dateKey = booking.booking_date;

    if (!days[dateKey]) {
      days[dateKey] = {
        totalBookings: 0,
        confirmedCount: 0,
        pendingCount: 0,
      };
    }

    days[dateKey].totalBookings++;

    if (booking.status === 'confirmed' || booking.status === 'arrived' || booking.status === 'seated' || booking.status === 'completed') {
      days[dateKey].confirmedCount++;
    } else if (booking.status === 'pending') {
      days[dateKey].pendingCount++;
    }
  }

  return { days, month, year };
}

// -----------------------------------------------------------------------------
// Real-time Subscription (Optional, for future implementation)
// -----------------------------------------------------------------------------

/**
 * Sets up real-time subscriptions for timeline updates.
 * Listens to changes in bookings and sessions tables.
 *
 * @param venueId - The venue's UUID
 * @param date - The date to monitor in 'YYYY-MM-DD' format
 * @param onUpdate - Callback function when data changes
 * @returns Unsubscribe function to clean up subscriptions
 */
export function subscribeToTimelineChanges(
  venueId: string,
  date: string,
  onUpdate: (data: TimelineData) => void
): () => void {
  const supabase = getSupabaseAdmin();

  // Create channels for bookings and sessions
  const bookingsChannel = supabase
    .channel(`timeline-bookings-${venueId}-${date}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `venue_id=eq.${venueId}`,
      },
      async () => {
        // Refetch timeline data on any booking change
        const data = await getTimelineData(venueId, date);
        onUpdate(data);
      }
    )
    .subscribe();

  const sessionsChannel = supabase
    .channel(`timeline-sessions-${venueId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `venue_id=eq.${venueId}`,
      },
      async () => {
        // Refetch timeline data on any session change
        const data = await getTimelineData(venueId, date);
        onUpdate(data);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(bookingsChannel);
    supabase.removeChannel(sessionsChannel);
  };
}
