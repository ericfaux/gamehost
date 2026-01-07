/**
 * Bookings Data Layer
 *
 * This module provides data access functions for the booking system.
 * All functions use the server-side Supabase client with service role
 * privileges, bypassing RLS. These should only be used in server
 * components, API routes, and server actions.
 *
 * Key patterns:
 * - Foreign key arrays are extracted to single objects (Supabase returns arrays for many-to-one)
 * - Errors are logged but functions return gracefully (null or empty arrays)
 * - Cancelled bookings are excluded by default in list queries
 */

import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type {
  Booking,
  BookingWithTable,
  BookingWithDetails,
  BookingStatus,
  BookingConflict,
  VenueBookingSettings,
} from '@/lib/db/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Options for filtering booking queries.
 */
export interface BookingQueryOptions {
  /** Single date filter (YYYY-MM-DD format) */
  date?: string;
  /** Range start (YYYY-MM-DD format) */
  startDate?: string;
  /** Range end (YYYY-MM-DD format) */
  endDate?: string;
  /** Filter by status(es). Default excludes cancelled statuses */
  status?: BookingStatus[];
  /** Maximum number of results to return */
  limit?: number;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Transforms raw Supabase booking data with foreign key arrays into typed BookingWithDetails.
 * Supabase returns foreign keys as arrays even for many-to-one relationships.
 *
 * @param raw - Raw booking row from Supabase with venue_tables and games arrays
 * @returns BookingWithDetails with extracted single objects
 */
function transformBookingWithDetails(raw: Record<string, unknown>): BookingWithDetails {
  // Extract venue_tables[0] -> venue_table
  const venueTablesArray = raw.venue_tables as Array<{
    id: string;
    label: string;
    capacity: number | null;
  }> | null;
  const venue_table = Array.isArray(venueTablesArray) && venueTablesArray.length > 0
    ? venueTablesArray[0]
    : venueTablesArray && !Array.isArray(venueTablesArray)
      ? venueTablesArray
      : null;

  // Extract games[0] -> game
  const gamesArray = raw.games as Array<{
    id: string;
    title: string;
    cover_image_url: string | null;
  }> | null;
  const game = Array.isArray(gamesArray) && gamesArray.length > 0
    ? gamesArray[0]
    : gamesArray && !Array.isArray(gamesArray)
      ? gamesArray
      : null;

  // Remove the arrays and add the extracted objects
  const { venue_tables, games, ...booking } = raw;

  return {
    ...booking,
    venue_table,
    game,
  } as BookingWithDetails;
}

/**
 * Transforms raw Supabase booking data with foreign key array into typed BookingWithTable.
 *
 * @param raw - Raw booking row from Supabase with venue_tables array
 * @returns BookingWithTable with extracted single object
 */
function transformBookingWithTable(raw: Record<string, unknown>): BookingWithTable {
  // Extract venue_tables[0] -> venue_table
  const venueTablesArray = raw.venue_tables as Array<{
    id: string;
    label: string;
    capacity: number | null;
  }> | null;
  const venue_table = Array.isArray(venueTablesArray) && venueTablesArray.length > 0
    ? venueTablesArray[0]
    : venueTablesArray && !Array.isArray(venueTablesArray)
      ? venueTablesArray
      : null;

  // Remove the array and add the extracted object
  const { venue_tables, ...booking } = raw;

  return {
    ...booking,
    venue_table,
  } as BookingWithTable;
}

/**
 * Default statuses to exclude in list queries.
 * Cancelled and no-show bookings are typically excluded.
 */
const CANCELLED_STATUSES: BookingStatus[] = ['cancelled_by_guest', 'cancelled_by_venue'];

/**
 * Gets today's date in YYYY-MM-DD format.
 */
function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// -----------------------------------------------------------------------------
// Core Query Functions
// -----------------------------------------------------------------------------

/**
 * Fetches a single booking by ID with table and game joins.
 *
 * @param id - The booking's UUID
 * @returns The booking with details or null if not found
 */
export async function getBookingById(id: string): Promise<BookingWithDetails | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('bookings')
    .select(`
      *,
      venue_tables:table_id (id, label, capacity),
      games:game_id (id, title, cover_image_url)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching booking by ID:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return transformBookingWithDetails(data as Record<string, unknown>);
}

/**
 * Fetches bookings for a venue with optional filtering.
 * By default returns today's bookings excluding cancelled statuses.
 *
 * @param venueId - The venue's UUID
 * @param options - Optional filters (date, dateRange, status, limit)
 * @returns Array of bookings with table info
 */
export async function getBookingsForVenue(
  venueId: string,
  options: BookingQueryOptions = {}
): Promise<BookingWithTable[]> {
  const {
    date,
    startDate,
    endDate,
    status,
    limit,
  } = options;

  let query = getSupabaseAdmin()
    .from('bookings')
    .select(`
      *,
      venue_tables:table_id (id, label, capacity)
    `)
    .eq('venue_id', venueId);

  // Apply date filtering
  if (date) {
    // Single date filter
    query = query.eq('booking_date', date);
  } else if (startDate || endDate) {
    // Date range filter
    if (startDate) {
      query = query.gte('booking_date', startDate);
    }
    if (endDate) {
      query = query.lte('booking_date', endDate);
    }
  } else {
    // Default to today
    query = query.eq('booking_date', getTodayDate());
  }

  // Apply status filtering
  if (status && status.length > 0) {
    query = query.in('status', status);
  } else {
    // Default: exclude cancelled statuses
    query = query.not('status', 'in', `(${CANCELLED_STATUSES.join(',')})`);
  }

  // Order by date and time
  query = query
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true });

  // Apply limit
  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching bookings for venue:', error);
    return [];
  }

  return (data ?? []).map((row) => transformBookingWithTable(row as Record<string, unknown>));
}

/**
 * Fetches all bookings for a specific table on a specific date.
 * Excludes cancelled and no-show bookings.
 *
 * @param tableId - The table's UUID
 * @param date - The date in YYYY-MM-DD format
 * @returns Array of bookings ordered by start time
 */
export async function getBookingsByTable(
  tableId: string,
  date: string
): Promise<Booking[]> {
  const excludeStatuses: BookingStatus[] = ['cancelled_by_guest', 'cancelled_by_venue', 'no_show'];

  const { data, error } = await getSupabaseAdmin()
    .from('bookings')
    .select('*')
    .eq('table_id', tableId)
    .eq('booking_date', date)
    .not('status', 'in', `(${excludeStatuses.join(',')})`)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching bookings by table:', error);
    return [];
  }

  return (data ?? []) as Booking[];
}

/**
 * Fetches upcoming bookings starting within the next N minutes.
 * Used for the Arrivals Board display.
 *
 * @param venueId - The venue's UUID
 * @param minutesAhead - How many minutes ahead to look (default: 60)
 * @returns Array of upcoming bookings with table and game details
 */
export async function getUpcomingBookings(
  venueId: string,
  minutesAhead: number = 60
): Promise<BookingWithDetails[]> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Calculate the current time and cutoff time in HH:MM:SS format
  const currentTime = now.toTimeString().split(' ')[0];
  const cutoffDate = new Date(now.getTime() + minutesAhead * 60 * 1000);
  const cutoffTime = cutoffDate.toTimeString().split(' ')[0];

  // Only include confirmed or arrived bookings
  const validStatuses: BookingStatus[] = ['confirmed', 'arrived'];

  const { data, error } = await getSupabaseAdmin()
    .from('bookings')
    .select(`
      *,
      venue_tables:table_id (id, label, capacity),
      games:game_id (id, title, cover_image_url)
    `)
    .eq('venue_id', venueId)
    .eq('booking_date', today)
    .in('status', validStatuses)
    .gte('start_time', currentTime)
    .lte('start_time', cutoffTime)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching upcoming bookings:', error);
    return [];
  }

  return (data ?? []).map((row) => transformBookingWithDetails(row as Record<string, unknown>));
}

/**
 * Fetches all bookings for a guest by their email address.
 * Used for guest manage-booking pages.
 *
 * @param email - The guest's email address
 * @returns Array of bookings with table info, ordered by date DESC
 */
export async function getBookingsByGuestEmail(email: string): Promise<BookingWithTable[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('bookings')
    .select(`
      *,
      venue_tables:table_id (id, label, capacity)
    `)
    .eq('guest_email', email)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching bookings by guest email:', error);
    return [];
  }

  return (data ?? []).map((row) => transformBookingWithTable(row as Record<string, unknown>));
}

// -----------------------------------------------------------------------------
// Venue Settings
// -----------------------------------------------------------------------------

/**
 * Default values for venue booking settings.
 * These match the database column defaults for reference in UI components.
 */
export const BOOKING_SETTINGS_DEFAULTS: Omit<VenueBookingSettings, 'id' | 'venue_id' | 'created_at' | 'updated_at'> = {
  default_duration_minutes: 120,
  min_booking_notice_hours: 1,
  max_advance_booking_days: 30,
  buffer_minutes_between_bookings: 15,
  slot_interval_minutes: 30,
  allow_walk_ins: true,
  require_phone: false,
  require_email: true,
  confirmation_message_template: null,
};

/**
 * Fetches the booking settings for a venue.
 *
 * @param venueId - The venue's UUID
 * @returns The venue booking settings or null if not configured
 */
export async function getVenueBookingSettings(
  venueId: string
): Promise<VenueBookingSettings | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('venue_booking_settings')
    .select('*')
    .eq('venue_id', venueId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching venue booking settings:', error);
    return null;
  }

  return data as VenueBookingSettings | null;
}

/**
 * Creates booking settings for a venue with database defaults.
 * Optionally override specific fields.
 *
 * @param venueId - The venue's UUID
 * @param overrides - Optional partial settings to override defaults
 * @returns The created venue booking settings
 * @throws Error if creation fails
 */
export async function createVenueBookingSettings(
  venueId: string,
  overrides?: Partial<Omit<VenueBookingSettings, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>
): Promise<VenueBookingSettings> {
  const { data, error } = await getSupabaseAdmin()
    .from('venue_booking_settings')
    .insert({
      venue_id: venueId,
      ...overrides,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating venue booking settings:', error);
    throw new Error(`Failed to create venue booking settings: ${error.message}`);
  }

  return data as VenueBookingSettings;
}

/**
 * Updates booking settings for a venue.
 * Only provided fields are updated; unspecified fields remain unchanged.
 *
 * @param venueId - The venue's UUID
 * @param updates - Partial settings to update
 * @returns The updated venue booking settings, or null if settings don't exist
 */
export async function updateVenueBookingSettings(
  venueId: string,
  updates: Partial<Omit<VenueBookingSettings, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>
): Promise<VenueBookingSettings | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('venue_booking_settings')
    .update(updates)
    .eq('venue_id', venueId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Error updating venue booking settings:', error);
    return null;
  }

  return data as VenueBookingSettings | null;
}

/**
 * Gets existing venue booking settings or creates them with defaults.
 * This is the main function UI components should use to ensure settings always exist.
 * Never returns null - guarantees settings exist after call.
 *
 * @param venueId - The venue's UUID
 * @returns The venue booking settings (existing or newly created)
 */
export async function getOrCreateVenueBookingSettings(
  venueId: string
): Promise<VenueBookingSettings> {
  // Try to get existing settings first
  const existing = await getVenueBookingSettings(venueId);
  if (existing) {
    return existing;
  }

  // Settings don't exist, create with defaults
  return createVenueBookingSettings(venueId);
}

// -----------------------------------------------------------------------------
// Availability Types
// -----------------------------------------------------------------------------

/**
 * Parameters for checking a specific table's availability.
 */
export interface CheckAvailabilityParams {
  tableId: string;
  date: string;          // 'YYYY-MM-DD'
  startTime: string;     // 'HH:MM'
  endTime: string;       // 'HH:MM'
  excludeBookingId?: string;  // For editing existing bookings
}

/**
 * Result of a table availability check.
 */
export interface AvailabilityResult {
  available: boolean;
  conflicts: BookingConflict[];  // Empty if available
}

/**
 * Parameters for finding available tables.
 */
export interface TableAvailabilityParams {
  venueId: string;
  date: string;          // 'YYYY-MM-DD'
  startTime: string;     // 'HH:MM'
  endTime: string;       // 'HH:MM'
  partySize: number;
}

/**
 * An available table with fit indicators.
 */
export interface AvailableTableWithFit {
  table_id: string;
  table_label: string;
  capacity: number | null;
  is_exact_fit: boolean;    // capacity == partySize
  is_tight_fit: boolean;    // capacity == partySize + 1
}

/**
 * Parameters for querying available time slots.
 */
export interface SlotQueryParams {
  venueId: string;
  date: string;            // 'YYYY-MM-DD'
  partySize: number;
  durationMinutes: number;
  startHour?: number;      // Default 10 (10am)
  endHour?: number;        // Default 22 (10pm)
  intervalMinutes?: number; // Default 30
}

/**
 * A time slot with available tables.
 */
export interface AvailableSlotWithTables {
  start_time: string;      // 'HH:MM'
  end_time: string;        // 'HH:MM'
  available_tables: AvailableTableWithFit[];
  is_available: boolean;   // true if at least one table available
}

/**
 * Parameters for checking game availability.
 */
export interface GameAvailabilityParams {
  gameId: string;
  date: string;            // 'YYYY-MM-DD'
  startTime: string;       // 'HH:MM'
  endTime: string;         // 'HH:MM'
}

/**
 * Result of a game availability check.
 */
export interface GameAvailabilityResult {
  available: boolean;
  copiesTotal: number;       // From games.copies_in_rotation
  copiesReserved: number;    // Count of overlapping bookings with this game
  copiesAvailable: number;   // Total - reserved
}

// -----------------------------------------------------------------------------
// Time Utility Functions
// -----------------------------------------------------------------------------

/**
 * Converts a time string 'HH:MM' to minutes since midnight.
 *
 * @example
 * // timeToMinutes('10:30') returns 630
 * // timeToMinutes('00:00') returns 0
 * // timeToMinutes('23:59') returns 1439
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to a time string 'HH:MM'.
 *
 * @example
 * // minutesToTime(630) returns '10:30'
 * // minutesToTime(0) returns '00:00'
 * // minutesToTime(1439) returns '23:59'
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Adds minutes to a time string and returns the new time string.
 * Handles wrapping past midnight.
 *
 * @example
 * // addMinutesToTime('10:00', 120) returns '12:00'
 * // addMinutesToTime('23:00', 120) returns '01:00' (wraps)
 */
export function addMinutesToTime(time: string, minutes: number): string {
  const totalMinutes = timeToMinutes(time) + minutes;
  return minutesToTime(totalMinutes);
}

/**
 * Checks if a date+time is in the past relative to now.
 *
 * @param date - Date string in 'YYYY-MM-DD' format
 * @param time - Time string in 'HH:MM' format
 * @returns true if the datetime is before current time
 *
 * @example
 * // If now is 2024-01-15 15:00:
 * // isTimeInPast('2024-01-15', '14:00') returns true
 * // isTimeInPast('2024-01-15', '16:00') returns false
 * // isTimeInPast('2024-01-14', '20:00') returns true (past date)
 */
export function isTimeInPast(date: string, time: string): boolean {
  const now = new Date();
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const targetDate = new Date(year, month - 1, day, hours, minutes);
  return targetDate < now;
}

/**
 * Normalizes a time string to 'HH:MM' format.
 * Handles 'HH:MM:SS' format from database by stripping seconds.
 */
function normalizeTime(time: string): string {
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
}

// -----------------------------------------------------------------------------
// Availability Check Functions
// -----------------------------------------------------------------------------

/**
 * Checks if a specific table is available for booking at the given time.
 * Uses the database function check_table_availability for the initial check,
 * then fetches conflicting bookings if not available.
 *
 * Time overlap logic: Two time ranges overlap if start1 < end2 AND end1 > start2
 *
 * Test cases:
 * - Booking from 7-9pm should conflict with 8-10pm request
 * - Booking from 7-9pm should NOT conflict with 9-11pm request (adjacent, no overlap)
 * - Editing a booking should exclude itself from conflict check
 *
 * @param params - Check availability parameters
 * @returns AvailabilityResult with available flag and any conflicts
 */
export async function checkTableAvailability(
  params: CheckAvailabilityParams
): Promise<AvailabilityResult> {
  const { tableId, date, startTime, endTime, excludeBookingId } = params;

  const supabase = getSupabaseAdmin();

  // Call database function for the availability check
  const { data: isAvailable, error: rpcError } = await supabase.rpc(
    'check_table_availability',
    {
      p_table_id: tableId,
      p_date: date,
      p_start_time: startTime,
      p_end_time: endTime,
      p_exclude_booking_id: excludeBookingId ?? null,
    }
  );

  if (rpcError) {
    console.error('Error checking table availability:', rpcError);
    // On error, fall back to manual check
    return await checkTableAvailabilityManual(params);
  }

  if (isAvailable) {
    return { available: true, conflicts: [] };
  }

  // Not available - fetch conflicting bookings for context
  const conflicts = await getConflictingBookings(tableId, date, startTime, endTime, excludeBookingId);

  return { available: false, conflicts };
}

/**
 * Manual fallback for checking table availability when RPC fails.
 * Implements the same time overlap logic locally.
 */
async function checkTableAvailabilityManual(
  params: CheckAvailabilityParams
): Promise<AvailabilityResult> {
  const { tableId, date, startTime, endTime, excludeBookingId } = params;

  const conflicts = await getConflictingBookings(tableId, date, startTime, endTime, excludeBookingId);

  return {
    available: conflicts.length === 0,
    conflicts,
  };
}

/**
 * Fetches bookings that conflict with the requested time range.
 * Two time ranges overlap if: start1 < end2 AND end1 > start2
 */
async function getConflictingBookings(
  tableId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<BookingConflict[]> {
  const supabase = getSupabaseAdmin();
  const excludeStatuses: BookingStatus[] = ['cancelled_by_guest', 'cancelled_by_venue', 'no_show'];

  let query = supabase
    .from('bookings')
    .select(`
      id,
      table_id,
      guest_name,
      start_time,
      end_time,
      venue_tables:table_id (label)
    `)
    .eq('table_id', tableId)
    .eq('booking_date', date)
    .not('status', 'in', `(${excludeStatuses.join(',')})`)
    // Time overlap: start1 < end2 AND end1 > start2
    .lt('start_time', endTime)
    .gt('end_time', startTime);

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching conflicting bookings:', error);
    return [];
  }

  interface ConflictingBookingRow {
    id: string;
    table_id: string;
    guest_name: string;
    start_time: string;
    end_time: string;
    venue_tables: { label: string } | null;
  }

  return (data ?? []).map((booking: ConflictingBookingRow) => {
    return {
      booking_id: booking.id,
      table_id: booking.table_id,
      table_label: booking.venue_tables?.label ?? 'Unknown',
      guest_name: booking.guest_name,
      start_time: normalizeTime(booking.start_time),
      end_time: normalizeTime(booking.end_time),
      conflict_type: 'overlap' as const,
    };
  });
}

/**
 * Gets available tables for a venue at a specific time, sorted by best fit.
 * Uses the database function get_available_tables for efficient querying.
 *
 * Sorting priority:
 * 1. Exact fit (capacity == partySize) first
 * 2. Tight fit (capacity == partySize + 1) second
 * 3. Then smallest table that fits
 *
 * Test cases:
 * - Party of 6 should not see 4-seat tables
 * - Party of 4 at a 4-seat table should be marked as exact fit
 * - Party of 3 at a 4-seat table should be marked as tight fit
 * - Results sorted: exact fit, tight fit, then by capacity ascending
 *
 * @param params - Table availability parameters
 * @returns Array of available tables with fit indicators
 */
export async function getAvailableTables(
  params: TableAvailabilityParams
): Promise<AvailableTableWithFit[]> {
  const { venueId, date, startTime, endTime, partySize } = params;

  const supabase = getSupabaseAdmin();

  // Try database function first
  const { data, error } = await supabase.rpc('get_available_tables', {
    p_venue_id: venueId,
    p_date: date,
    p_start_time: startTime,
    p_end_time: endTime,
    p_party_size: partySize,
  });

  if (error) {
    console.error('Error calling get_available_tables:', error);
    // Fall back to manual implementation
    return await getAvailableTablesManual(params);
  }

  // Map RPC result to our interface with fit indicators
  return (data ?? []).map((table: { table_id: string; table_label: string; capacity: number | null }) => ({
    table_id: table.table_id,
    table_label: table.table_label,
    capacity: table.capacity,
    is_exact_fit: table.capacity === partySize,
    is_tight_fit: table.capacity === partySize + 1,
  }));
}

/**
 * Manual fallback for getting available tables when RPC fails.
 */
async function getAvailableTablesManual(
  params: TableAvailabilityParams
): Promise<AvailableTableWithFit[]> {
  const { venueId, date, startTime, endTime, partySize } = params;

  const supabase = getSupabaseAdmin();
  const excludeStatuses: BookingStatus[] = ['cancelled_by_guest', 'cancelled_by_venue', 'no_show'];

  // Get all active tables for the venue that can fit the party
  const { data: tables, error: tablesError } = await supabase
    .from('venue_tables')
    .select('id, label, capacity')
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .gte('capacity', partySize);

  if (tablesError || !tables) {
    console.error('Error fetching venue tables:', tablesError);
    return [];
  }

  // Type for table rows
  interface TableRow {
    id: string;
    label: string;
    capacity: number | null;
  }

  // Type for booking rows
  interface BookingTimeRow {
    table_id: string;
    start_time: string;
    end_time: string;
  }

  // Get all bookings for these tables on the given date
  const tableIds = (tables as TableRow[]).map((t) => t.id);
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('table_id, start_time, end_time')
    .in('table_id', tableIds)
    .eq('booking_date', date)
    .not('status', 'in', `(${excludeStatuses.join(',')})`)
    // Time overlap check
    .lt('start_time', endTime)
    .gt('end_time', startTime);

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
    return [];
  }

  // Find tables with no conflicting bookings
  const bookedTableIds = new Set((bookings as BookingTimeRow[] ?? []).map((b) => b.table_id));
  const availableTables = (tables as TableRow[])
    .filter((t) => !bookedTableIds.has(t.id))
    .map((t) => ({
      table_id: t.id,
      table_label: t.label,
      capacity: t.capacity,
      is_exact_fit: t.capacity === partySize,
      is_tight_fit: t.capacity === partySize + 1,
    }));

  // Sort by best fit
  return sortTablesByFit(availableTables, partySize);
}

/**
 * Sorts tables by best fit for the party size.
 * Priority: exact fit > tight fit > smallest that fits
 */
function sortTablesByFit(
  tables: AvailableTableWithFit[],
  partySize: number
): AvailableTableWithFit[] {
  return [...tables].sort((a, b) => {
    // Exact fit first
    if (a.is_exact_fit && !b.is_exact_fit) return -1;
    if (!a.is_exact_fit && b.is_exact_fit) return 1;

    // Tight fit second
    if (a.is_tight_fit && !b.is_tight_fit) return -1;
    if (!a.is_tight_fit && b.is_tight_fit) return 1;

    // Then by capacity (smallest that fits)
    const aCapacity = a.capacity ?? Infinity;
    const bCapacity = b.capacity ?? Infinity;
    return aCapacity - bCapacity;
  });
}

/**
 * Generates available time slots for a venue on a given date.
 * Checks availability at each interval and returns slots with their available tables.
 *
 * Features:
 * - Filters out slots in the past (for today)
 * - Respects venue's min_booking_notice_hours setting
 * - Excludes slots that would extend past endHour
 *
 * Test cases:
 * - Slot at 10:00 for 2 hours should have end_time 12:00
 * - Today at 3pm should not show 2pm slots
 * - 2-hour slot at 21:00 with endHour 22 should not appear (extends to 23:00)
 * - Party of 6 should not see slots with only 4-seat tables available
 *
 * @param params - Slot query parameters
 * @returns Array of slots with availability information
 */
export async function getAvailableSlots(
  params: SlotQueryParams
): Promise<AvailableSlotWithTables[]> {
  const {
    venueId,
    date,
    partySize,
    durationMinutes,
    startHour = 10,
    endHour = 22,
    intervalMinutes = 30,
  } = params;

  // Get venue settings for min_booking_notice_hours
  const settings = await getVenueBookingSettings(venueId);
  const minNoticeHours = settings?.min_booking_notice_hours ?? BOOKING_SETTINGS_DEFAULTS.min_booking_notice_hours;

  const slots: AvailableSlotWithTables[] = [];
  const now = new Date();
  const isToday = date === now.toISOString().split('T')[0];

  // Calculate the earliest allowed booking time based on notice requirement
  let earliestMinutes = startHour * 60;
  if (isToday) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const minNoticeMinutes = minNoticeHours * 60;
    earliestMinutes = Math.max(earliestMinutes, currentMinutes + minNoticeMinutes);
  }

  // Generate slots from startHour to endHour at intervalMinutes
  const endMinutes = endHour * 60;

  for (let slotStart = startHour * 60; slotStart < endMinutes; slotStart += intervalMinutes) {
    const slotEnd = slotStart + durationMinutes;

    // Skip if slot extends past closing time
    if (slotEnd > endMinutes) {
      continue;
    }

    // Skip if slot is in the past or before minimum notice time
    if (slotStart < earliestMinutes) {
      continue;
    }

    const startTime = minutesToTime(slotStart);
    const endTime = minutesToTime(slotEnd);

    // Get available tables for this slot
    const availableTables = await getAvailableTables({
      venueId,
      date,
      startTime,
      endTime,
      partySize,
    });

    slots.push({
      start_time: startTime,
      end_time: endTime,
      available_tables: availableTables,
      is_available: availableTables.length > 0,
    });
  }

  return slots;
}

/**
 * Checks if a game copy is available for booking at the given time.
 * Counts overlapping bookings that have this game reserved.
 *
 * Note: This checks bookings (reservations), not active sessions.
 * For real-time availability during play, use getCopiesInUseByGame from sessions.ts
 *
 * Test cases:
 * - Game with 2 copies and 1 overlapping booking should show 1 available
 * - Game with 1 copy and 1 overlapping booking should show 0 available (not available)
 * - Game with 3 copies and 0 overlapping bookings should show 3 available
 * - Non-overlapping bookings should not count against availability
 *
 * @param params - Game availability parameters
 * @returns GameAvailabilityResult with copy counts
 */
export async function checkGameAvailability(
  params: GameAvailabilityParams
): Promise<GameAvailabilityResult> {
  const { gameId, date, startTime, endTime } = params;

  const supabase = getSupabaseAdmin();

  // Get game's total copies
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('copies_in_rotation, venue_id')
    .eq('id', gameId)
    .single();

  if (gameError || !game) {
    console.error('Error fetching game:', gameError);
    return {
      available: false,
      copiesTotal: 0,
      copiesReserved: 0,
      copiesAvailable: 0,
    };
  }

  const copiesTotal = game.copies_in_rotation ?? 1;

  // Count overlapping bookings with this game
  const excludeStatuses: BookingStatus[] = ['cancelled_by_guest', 'cancelled_by_venue', 'no_show', 'completed'];

  const { count, error: countError } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .eq('booking_date', date)
    .not('status', 'in', `(${excludeStatuses.join(',')})`)
    // Time overlap: start1 < end2 AND end1 > start2
    .lt('start_time', endTime)
    .gt('end_time', startTime);

  if (countError) {
    console.error('Error counting game bookings:', countError);
    return {
      available: copiesTotal > 0,
      copiesTotal,
      copiesReserved: 0,
      copiesAvailable: copiesTotal,
    };
  }

  const copiesReserved = count ?? 0;
  const copiesAvailable = Math.max(0, copiesTotal - copiesReserved);

  return {
    available: copiesAvailable > 0,
    copiesTotal,
    copiesReserved,
    copiesAvailable,
  };
}
