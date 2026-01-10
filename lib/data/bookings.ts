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

import { formatInTimeZone } from 'date-fns-tz';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import type {
  Booking,
  BookingWithTable,
  BookingWithDetails,
  BookingStatus,
  BookingSource,
  BookingConflict,
  BookingModificationType,
  VenueBookingSettings,
  VenueOperatingHours,
  BookingWaitlistEntry,
  WaitlistStatus,
  AvailableSlotRPC,
  AvailableTableRPC,
  BookingConflictRPC,
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
  const { venue_tables: _venue_tables, games: _games, ...booking } = raw;

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
  const { venue_tables: _venue_tables, ...booking } = raw;

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
 * Fetches the count of upcoming bookings starting within the next N minutes.
 * Used for the sidebar badge display.
 *
 * @param venueId - The venue's UUID
 * @param minutesAhead - How many minutes ahead to look (default: 60)
 * @param timezone - IANA timezone string for correct local time filtering (default: America/Los_Angeles)
 * @returns Count of upcoming bookings
 */
export async function getUpcomingBookingsCount(
  venueId: string,
  minutesAhead: number = 60,
  timezone: string = 'America/Los_Angeles'
): Promise<number> {
  const now = new Date();

  // Calculate time range in the venue's local timezone
  // This ensures we compare against booking times which are stored in local time
  const today = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
  const currentTime = formatInTimeZone(now, timezone, 'HH:mm:ss');
  const cutoffDate = new Date(now.getTime() + minutesAhead * 60 * 1000);
  const cutoffTime = formatInTimeZone(cutoffDate, timezone, 'HH:mm:ss');

  // Only include confirmed or arrived bookings
  const validStatuses: BookingStatus[] = ['confirmed', 'arrived'];

  const { count, error } = await getSupabaseAdmin()
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('venue_id', venueId)
    .eq('booking_date', today)
    .in('status', validStatuses)
    .gte('start_time', currentTime)
    .lte('start_time', cutoffTime);

  if (error) {
    console.error('Error fetching upcoming bookings count:', error);
    return 0;
  }

  return count ?? 0;
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
  bookings_enabled: true,
  buffer_minutes: 15,
  default_duration_minutes: 120,
  min_advance_hours: 1,
  max_advance_days: 30,
  no_show_grace_minutes: 15,
  deposit_required: false,
  deposit_amount_cents: 0,
  send_confirmation_email: true,
  send_reminder_sms: false,
  reminder_hours_before: 2,
  booking_page_message: null,
  // Venue timezone for accurate time calculations
  timezone: 'America/Los_Angeles',
  // Venue address fields for display on booking confirmations
  venue_address_street: null,
  venue_address_city: null,
  venue_address_state: null,
  venue_address_postal_code: null,
  venue_address_country: null,
};

/**
 * Default slot interval in minutes for generating time slots.
 * This is used when the database doesn't have a slot_interval column.
 */
export const DEFAULT_SLOT_INTERVAL_MINUTES = 30;

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

  // Supabase returns foreign key relations as arrays even for many-to-one
  interface ConflictingBookingRow {
    id: string;
    table_id: string;
    guest_name: string;
    start_time: string;
    end_time: string;
    venue_tables: Array<{ label: string }> | null;
  }

  return (data ?? []).map((booking: ConflictingBookingRow) => {
    const tableLabel = Array.isArray(booking.venue_tables) && booking.venue_tables.length > 0
      ? booking.venue_tables[0].label
      : 'Unknown';
    return {
      booking_id: booking.id,
      table_id: booking.table_id,
      table_label: tableLabel,
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
  _partySize: number
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
 * Gets the total number of active tables that can accommodate a party size.
 * Used to calculate availability status (e.g., "limited" when only 1-2 tables remain).
 *
 * @param venueId - The venue ID
 * @param partySize - Minimum capacity required
 * @returns Total number of tables that can fit the party size
 */
export async function getTotalTablesForPartySize(
  venueId: string,
  partySize: number
): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { count, error } = await supabase
    .from('venue_tables')
    .select('*', { count: 'exact', head: true })
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .gte('capacity', partySize);

  if (error) {
    console.error('Error getting total tables for party size:', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Generates available time slots for a venue on a given date.
 * Checks availability at each interval and returns slots with their available tables.
 *
 * Features:
 * - Filters out slots in the past (for today)
 * - Respects venue's min_advance_hours setting
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

  // Get venue settings for min_advance_hours and timezone
  const settings = await getVenueBookingSettings(venueId);
  const minNoticeHours = settings?.min_advance_hours ?? BOOKING_SETTINGS_DEFAULTS.min_advance_hours;
  const timezone = settings?.timezone ?? BOOKING_SETTINGS_DEFAULTS.timezone;

  const slots: AvailableSlotWithTables[] = [];
  const now = new Date();

  // Use venue's timezone for date/time comparisons
  const todayInVenue = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
  const isToday = date === todayInVenue;

  // Calculate the earliest allowed booking time based on notice requirement
  let earliestMinutes = startHour * 60;
  if (isToday) {
    // Get current time in venue's timezone for accurate comparison
    const currentTimeInVenue = formatInTimeZone(now, timezone, 'HH:mm');
    const [hours, mins] = currentTimeInVenue.split(':').map(Number);
    const currentMinutes = hours * 60 + mins;
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

// -----------------------------------------------------------------------------
// Turnover Risk Detection
// -----------------------------------------------------------------------------

/**
 * Default session duration in minutes when no game is selected.
 * Used for estimating when an active session might end.
 */
const DEFAULT_SESSION_DURATION_MINUTES = 120;

/**
 * Severity thresholds for turnover risk calculation.
 * Buffer time is the difference between estimated session end and booking start.
 */
const TURNOVER_RISK_THRESHOLDS = {
  HIGH: 15,    // < 15 min buffer = HIGH severity
  MEDIUM: 30,  // 15-30 min buffer = MEDIUM severity
  LOW: 60,     // 30-60 min buffer = LOW severity (> 60 min = no risk)
};

/**
 * Severity levels for turnover risk alerts.
 */
export type TurnoverRiskSeverity = 'high' | 'medium' | 'low';

/**
 * Represents a potential turnover conflict between an active session and an upcoming booking.
 * Used to alert hosts before a table conflict occurs.
 */
export interface TurnoverRisk {
  /** Unique ID: `risk-${session.id}-${booking.id}` */
  id: string;
  /** Alert type identifier for integration with Alert Queue */
  type: 'turnover_risk';
  /** Risk severity based on buffer time */
  severity: TurnoverRiskSeverity;

  // Table info
  table_id: string;
  table_label: string;

  // Session info
  session_id: string;
  session_started_at: string;
  session_game_title: string | null;
  estimated_end_time: string;

  // Booking info
  booking_id: string;
  booking_start_time: string;
  guest_name: string;
  party_size: number;

  // Calculated values
  /** Minutes from now until the booking starts */
  minutes_until_conflict: number;
  /** Time between estimated session end and booking start (can be negative if overlap) */
  buffer_minutes: number;

  // Human-readable message
  message: string;
}

/**
 * Alert action for Alert Queue integration.
 */
export interface TurnoverRiskAlertAction {
  label: string;
  action: 'view_booking' | 'reassign_booking' | 'view_session';
  bookingId?: string;
  sessionId?: string;
}

/**
 * Adapter type for integrating turnover risks with the Alert Queue.
 */
export interface TurnoverRiskAlertItem {
  id: string;
  type: 'turnover_risk';
  severity: TurnoverRiskSeverity;
  title: string;
  message: string;
  actions: TurnoverRiskAlertAction[];
  timestamp: string;
}

/**
 * Calculates the severity of a turnover risk based on buffer time.
 *
 * @param bufferMinutes - Minutes between estimated session end and booking start
 * @returns Risk severity level
 *
 * @example
 * // calculateRiskSeverity(10) returns 'high' (< 15 min buffer)
 * // calculateRiskSeverity(20) returns 'medium' (15-30 min buffer)
 * // calculateRiskSeverity(45) returns 'low' (30-60 min buffer)
 */
function calculateRiskSeverity(bufferMinutes: number): TurnoverRiskSeverity {
  if (bufferMinutes < TURNOVER_RISK_THRESHOLDS.HIGH) return 'high';
  if (bufferMinutes < TURNOVER_RISK_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

/**
 * Generates a human-readable message for a turnover risk based on severity.
 *
 * @param severity - Risk severity level
 * @param tableLabel - Table identifier (e.g., "A1", "Table 5")
 * @param guestName - Name of the guest with the booking
 * @param bookingTime - Formatted time of the booking (e.g., "6:30 PM")
 * @param sessionStartTime - Formatted time when the session started
 * @returns Human-readable alert message
 */
function generateRiskMessage(
  severity: TurnoverRiskSeverity,
  tableLabel: string,
  guestName: string,
  bookingTime: string,
  sessionStartTime: string
): string {
  switch (severity) {
    case 'high':
      return `Table ${tableLabel} may not be ready for ${guestName}'s party at ${bookingTime}. Current session started at ${sessionStartTime} and may run over.`;
    case 'medium':
      return `Table ${tableLabel} has a session that might extend into ${guestName}'s ${bookingTime} booking.`;
    case 'low':
      return `Keep an eye on Table ${tableLabel} - booking at ${bookingTime}, session has been active since ${sessionStartTime}.`;
  }
}

/**
 * Formats a time string for display in messages.
 * Converts "HH:MM:SS" or "HH:MM" to "H:MM AM/PM" format.
 *
 * @param time - Time string in HH:MM or HH:MM:SS format
 * @returns Formatted time string (e.g., "6:30 PM")
 */
function formatTimeForDisplay(time: string): string {
  const parts = time.split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';

  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;

  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Raw session type from Supabase for turnover risk queries.
 * Relations are returned as arrays.
 */
interface TurnoverSessionRaw {
  id: string;
  table_id: string;
  game_id: string | null;
  started_at: string;
  games: Array<{ title: string; max_time_minutes: number }> | null;
  venue_tables: Array<{ id: string; label: string }> | null;
}

/**
 * Raw booking type from Supabase for turnover risk queries.
 */
interface TurnoverBookingRaw {
  id: string;
  table_id: string;
  start_time: string;
  guest_name: string;
  party_size: number;
}

/**
 * Fetches turnover risks for a venue.
 * Identifies active sessions that may conflict with upcoming bookings on the same table.
 *
 * Query logic:
 * 1. Get all active sessions for venue (ended_at IS NULL)
 * 2. For each session, find bookings on same table starting in next 2 hours
 * 3. Estimate session end time using game's max_time_minutes or 120 min default
 * 4. Calculate buffer time between estimated end and booking start
 * 5. Generate risk if buffer < 60 minutes
 *
 * Performance notes:
 * - This query runs frequently (every 30-60 seconds on dashboard)
 * - Only queries sessions started in last 4 hours (ignores stale data)
 * - Uses parallel queries for sessions and bookings
 *
 * Edge cases handled:
 * - No active sessions: returns empty array
 * - No upcoming bookings: returns empty array
 * - Booking start time in past: filtered out
 * - Session without game: uses default 120-minute duration
 *
 * @param venueId - The venue's UUID
 * @returns Array of turnover risks sorted by severity (high first) then by time
 */
export async function getTurnoverRisks(venueId: string): Promise<TurnoverRisk[]> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

  // Calculate 2 hours ahead for booking lookups
  const twoHoursAhead = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const twoHoursAheadTime = twoHoursAhead.toTimeString().split(' ')[0];

  // Calculate 4 hours ago for session filtering (ignore stale sessions)
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const fourHoursAgoIso = fourHoursAgo.toISOString();

  // Statuses to exclude from booking queries
  const excludeStatuses: BookingStatus[] = ['cancelled_by_guest', 'cancelled_by_venue', 'no_show', 'completed'];

  // ---------------------------------------------------------------------------
  // Fetch active sessions with game and table info
  // ---------------------------------------------------------------------------
  const { data: sessionsRaw, error: sessionsError } = await supabase
    .from('sessions')
    .select(`
      id,
      table_id,
      game_id,
      started_at,
      games:game_id (title, max_time_minutes),
      venue_tables:table_id (id, label)
    `)
    .eq('venue_id', venueId)
    .is('ended_at', null)
    .gte('started_at', fourHoursAgoIso);

  if (sessionsError) {
    console.error('Error fetching active sessions for turnover risks:', sessionsError);
    return [];
  }

  const sessions = sessionsRaw as TurnoverSessionRaw[] | null;
  if (!sessions || sessions.length === 0) {
    return [];
  }

  // Get unique table IDs from active sessions
  const activeTableIds = [...new Set(sessions.map((s) => s.table_id))];

  // ---------------------------------------------------------------------------
  // Fetch upcoming bookings for active tables (next 2 hours)
  // ---------------------------------------------------------------------------
  const { data: bookingsRaw, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, table_id, start_time, guest_name, party_size')
    .eq('booking_date', today)
    .in('table_id', activeTableIds)
    .not('status', 'in', `(${excludeStatuses.join(',')})`)
    .gte('start_time', currentTime)
    .lte('start_time', twoHoursAheadTime)
    .order('start_time', { ascending: true });

  if (bookingsError) {
    console.error('Error fetching upcoming bookings for turnover risks:', bookingsError);
    return [];
  }

  const bookings = bookingsRaw as TurnoverBookingRaw[] | null;
  if (!bookings || bookings.length === 0) {
    return [];
  }

  // ---------------------------------------------------------------------------
  // Group bookings by table for efficient lookup
  // ---------------------------------------------------------------------------
  const bookingsByTable = new Map<string, TurnoverBookingRaw[]>();
  for (const booking of bookings) {
    const existing = bookingsByTable.get(booking.table_id) ?? [];
    existing.push(booking);
    bookingsByTable.set(booking.table_id, existing);
  }

  // ---------------------------------------------------------------------------
  // Calculate turnover risks
  // ---------------------------------------------------------------------------
  const risks: TurnoverRisk[] = [];

  for (const session of sessions) {
    // Get table info
    const venueTable = Array.isArray(session.venue_tables) && session.venue_tables.length > 0
      ? session.venue_tables[0]
      : null;
    if (!venueTable) continue;

    // Get bookings for this table
    const tableBookings = bookingsByTable.get(session.table_id);
    if (!tableBookings || tableBookings.length === 0) continue;

    // Estimate session end time
    const game = Array.isArray(session.games) && session.games.length > 0
      ? session.games[0]
      : null;
    const sessionDurationMinutes = game?.max_time_minutes ?? DEFAULT_SESSION_DURATION_MINUTES;

    const sessionStart = new Date(session.started_at);
    const estimatedEnd = new Date(sessionStart.getTime() + sessionDurationMinutes * 60 * 1000);
    const estimatedEndTime = estimatedEnd.toTimeString().split(' ')[0].slice(0, 5); // HH:MM

    // Check each booking for potential conflict
    for (const booking of tableBookings) {
      // Parse booking start time (HH:MM:SS from database)
      const bookingStartParts = booking.start_time.split(':');
      const bookingStartMinutes = parseInt(bookingStartParts[0], 10) * 60 + parseInt(bookingStartParts[1], 10);

      // Parse estimated end time (HH:MM)
      const estimatedEndParts = estimatedEndTime.split(':');
      const estimatedEndMinutes = parseInt(estimatedEndParts[0], 10) * 60 + parseInt(estimatedEndParts[1], 10);

      // Calculate buffer (can be negative if session is estimated to run past booking start)
      const bufferMinutes = bookingStartMinutes - estimatedEndMinutes;

      // Only create risk if buffer is less than threshold (60 minutes)
      if (bufferMinutes >= TURNOVER_RISK_THRESHOLDS.LOW) continue;

      // Calculate minutes from now until booking
      const bookingStartToday = new Date(now);
      bookingStartToday.setHours(parseInt(bookingStartParts[0], 10), parseInt(bookingStartParts[1], 10), 0, 0);
      const minutesUntilConflict = Math.round((bookingStartToday.getTime() - now.getTime()) / (1000 * 60));

      // Skip if booking is somehow in the past
      if (minutesUntilConflict < 0) continue;

      const severity = calculateRiskSeverity(bufferMinutes);
      const formattedBookingTime = formatTimeForDisplay(booking.start_time);
      const formattedSessionStart = formatTimeForDisplay(session.started_at.split('T')[1]);

      const message = generateRiskMessage(
        severity,
        venueTable.label,
        booking.guest_name,
        formattedBookingTime,
        formattedSessionStart
      );

      risks.push({
        id: `risk-${session.id}-${booking.id}`,
        type: 'turnover_risk',
        severity,
        table_id: session.table_id,
        table_label: venueTable.label,
        session_id: session.id,
        session_started_at: session.started_at,
        session_game_title: game?.title ?? null,
        estimated_end_time: estimatedEnd.toISOString(),
        booking_id: booking.id,
        booking_start_time: booking.start_time,
        guest_name: booking.guest_name,
        party_size: booking.party_size,
        minutes_until_conflict: minutesUntilConflict,
        buffer_minutes: bufferMinutes,
        message,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Sort by severity (high first) then by minutes until conflict (soonest first)
  // ---------------------------------------------------------------------------
  const severityOrder: Record<TurnoverRiskSeverity, number> = { high: 0, medium: 1, low: 2 };
  risks.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.minutes_until_conflict - b.minutes_until_conflict;
  });

  return risks;
}

/**
 * Converts a TurnoverRisk to an AlertQueueItem for integration with the Alert Queue.
 * This adapter allows turnover risks to be displayed alongside other operational alerts.
 *
 * @param risk - The turnover risk to convert
 * @returns AlertQueueItem compatible with the Alert Queue component
 */
export function turnoverRiskToAlert(risk: TurnoverRisk): TurnoverRiskAlertItem {
  return {
    id: risk.id,
    type: 'turnover_risk',
    severity: risk.severity,
    title: `Turnover Risk: ${risk.table_label}`,
    message: risk.message,
    actions: [
      { label: 'View Booking', action: 'view_booking', bookingId: risk.booking_id },
      { label: 'Reassign Table', action: 'reassign_booking', bookingId: risk.booking_id },
      { label: 'View Session', action: 'view_session', sessionId: risk.session_id },
    ],
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// RPC WRAPPERS - Conflict Engine
// =============================================================================

/**
 * Gets available time slots for guest booking wizard using the database RPC.
 * Returns slots with best table recommendations.
 *
 * @param venueId - The venue UUID
 * @param date - Date in YYYY-MM-DD format
 * @param partySize - Number of guests (default: 2)
 * @param durationMinutes - Booking duration in minutes (default: 120)
 * @param slotIntervalMinutes - Minutes between slot starts (default: 30)
 * @returns Array of available slots from the RPC
 */
export async function getAvailableSlotsRPC(
  venueId: string,
  date: string,
  partySize: number = 2,
  durationMinutes: number = 120,
  slotIntervalMinutes: number = 30
): Promise<AvailableSlotRPC[]> {
  const { data, error } = await getSupabaseAdmin().rpc('get_available_slots', {
    p_venue_id: venueId,
    p_date: date,
    p_party_size: partySize,
    p_duration_minutes: durationMinutes,
    p_slot_interval_minutes: slotIntervalMinutes,
  });

  if (error) {
    console.error('Error calling get_available_slots RPC:', error);
    return [];
  }

  return (data ?? []) as AvailableSlotRPC[];
}

/**
 * Gets available tables for a specific time slot using the database RPC.
 * Tables are sorted by best fit (exact fit, then tight fit, then by capacity).
 *
 * @param venueId - The venue UUID
 * @param date - Date in YYYY-MM-DD format
 * @param startTime - Start time in HH:MM or HH:MM:SS format
 * @param endTime - End time in HH:MM or HH:MM:SS format
 * @param partySize - Number of guests (default: 1)
 * @returns Array of available tables from the RPC
 */
export async function getAvailableTablesRPC(
  venueId: string,
  date: string,
  startTime: string,
  endTime: string,
  partySize: number = 1
): Promise<AvailableTableRPC[]> {
  const { data, error } = await getSupabaseAdmin().rpc('get_available_tables', {
    p_venue_id: venueId,
    p_date: date,
    p_start_time: startTime,
    p_end_time: endTime,
    p_party_size: partySize,
  });

  if (error) {
    console.error('Error calling get_available_tables RPC:', error);
    return [];
  }

  return (data ?? []) as AvailableTableRPC[];
}

/**
 * Quick boolean check if a table is available using the database RPC.
 *
 * @param tableId - The table UUID
 * @param date - Date in YYYY-MM-DD format
 * @param startTime - Start time in HH:MM or HH:MM:SS format
 * @param endTime - End time in HH:MM or HH:MM:SS format
 * @param excludeBookingId - Optional booking ID to exclude (for editing)
 * @returns true if table is available, false otherwise
 */
export async function checkTableAvailabilityRPC(
  tableId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin().rpc('check_table_availability', {
    p_table_id: tableId,
    p_date: date,
    p_start_time: startTime,
    p_end_time: endTime,
    p_exclude_booking_id: excludeBookingId ?? null,
  });

  if (error) {
    console.error('Error calling check_table_availability RPC:', error);
    return false;
  }

  return data === true;
}

/**
 * Gets detailed conflict info for host UI using the database RPC.
 *
 * @param tableId - The table UUID
 * @param date - Date in YYYY-MM-DD format
 * @param startTime - Start time in HH:MM or HH:MM:SS format
 * @param endTime - End time in HH:MM or HH:MM:SS format
 * @param excludeBookingId - Optional booking ID to exclude (for editing)
 * @returns Array of conflicts with booking details
 */
export async function checkBookingConflictsRPC(
  tableId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<BookingConflictRPC[]> {
  const { data, error } = await getSupabaseAdmin().rpc('check_booking_conflicts', {
    p_table_id: tableId,
    p_date: date,
    p_start_time: startTime,
    p_end_time: endTime,
    p_exclude_booking_id: excludeBookingId ?? null,
  });

  if (error) {
    console.error('Error calling check_booking_conflicts RPC:', error);
    return [];
  }

  return (data ?? []) as BookingConflictRPC[];
}

// =============================================================================
// BOOKING CRUD - Atomic Operations
// =============================================================================

/**
 * Parameters for creating a new booking atomically.
 */
export interface CreateBookingAtomicParams {
  venueId: string;
  tableId: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  partySize: number;
  bookingDate: string; // YYYY-MM-DD format
  startTime: string; // HH:MM or HH:MM:SS format
  durationMinutes: number;
  notes?: string | null;
  gameId?: string | null;
  source?: BookingSource;
  createdBy?: string | null;
}

/**
 * Creates a booking with atomic locking to prevent race conditions.
 * Uses the database RPC which acquires a lock on the table before inserting.
 *
 * @param params - Booking creation parameters
 * @returns The created booking ID
 * @throws Error with user-friendly message if slot is no longer available
 */
export async function createBookingAtomic(
  params: CreateBookingAtomicParams
): Promise<string> {
  const {
    venueId,
    tableId,
    guestName,
    guestEmail,
    guestPhone,
    partySize,
    bookingDate,
    startTime,
    durationMinutes,
    notes,
    gameId,
    source = 'online',
    createdBy,
  } = params;

  const { data, error } = await getSupabaseAdmin().rpc('create_booking_atomic', {
    p_venue_id: venueId,
    p_table_id: tableId,
    p_guest_name: guestName,
    p_guest_email: guestEmail ?? null,
    p_guest_phone: guestPhone ?? null,
    p_party_size: partySize,
    p_booking_date: bookingDate,
    p_start_time: startTime,
    p_duration_minutes: durationMinutes,
    p_notes: notes ?? null,
    p_game_id: gameId ?? null,
    p_source: source,
    p_created_by: createdBy ?? null,
  });

  if (error) {
    // Handle specific error codes
    if (error.code === 'P0001') {
      throw new Error('Sorry, this time slot is no longer available. Please select a different time.');
    }
    console.error('Error creating booking:', error);
    throw new Error(`Failed to create booking: ${error.message}`);
  }

  return data as string;
}

/**
 * Transitions a booking to seated status and creates a session.
 * Uses the database RPC for atomic state transition.
 *
 * @param bookingId - The booking UUID
 * @returns The created session ID
 * @throws Error if booking not found or in invalid status
 */
export async function seatParty(bookingId: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin().rpc('seat_party', {
    p_booking_id: bookingId,
  });

  if (error) {
    // Handle specific error codes
    if (error.code === 'P0002') {
      throw new Error('Booking not found.');
    }
    if (error.code === 'P0003') {
      throw new Error('Booking is not in a valid status to be seated. Expected confirmed or arrived.');
    }
    console.error('Error seating party:', error);
    throw new Error(`Failed to seat party: ${error.message}`);
  }

  return data as string;
}

/**
 * Updates a booking's status with the appropriate timestamp.
 *
 * @param bookingId - The booking UUID
 * @param status - The new booking status
 * @param reason - Optional cancellation reason (for cancelled statuses)
 * @returns The updated booking
 * @throws Error if update fails
 */
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  reason?: string
): Promise<Booking> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Build update payload with appropriate timestamp
  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: now,
  };

  // Set the appropriate timestamp based on status
  switch (status) {
    case 'confirmed':
      updatePayload.confirmed_at = now;
      break;
    case 'arrived':
      updatePayload.arrived_at = now;
      break;
    case 'seated':
      updatePayload.seated_at = now;
      break;
    case 'completed':
      updatePayload.completed_at = now;
      break;
    case 'no_show':
      updatePayload.no_show_at = now;
      break;
    case 'cancelled_by_guest':
    case 'cancelled_by_venue':
      updatePayload.cancelled_at = now;
      if (reason) {
        updatePayload.cancellation_reason = reason;
      }
      break;
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating booking status:', error);
    throw new Error(`Failed to update booking status: ${error.message}`);
  }

  return data as Booking;
}

/**
 * Cancels a booking.
 *
 * @param bookingId - The booking UUID
 * @param cancelledBy - Who cancelled ('guest' | 'venue')
 * @param reason - Optional cancellation reason
 * @returns The updated booking
 */
export async function cancelBooking(
  bookingId: string,
  cancelledBy: 'guest' | 'venue',
  reason?: string
): Promise<Booking> {
  const status: BookingStatus = cancelledBy === 'guest' ? 'cancelled_by_guest' : 'cancelled_by_venue';
  return updateBookingStatus(bookingId, status, reason);
}

/**
 * Marks a booking as no-show.
 *
 * @param bookingId - The booking UUID
 * @returns The updated booking
 */
export async function markNoShow(bookingId: string): Promise<Booking> {
  return updateBookingStatus(bookingId, 'no_show');
}

/**
 * Marks a guest as arrived (holding state before seating).
 *
 * @param bookingId - The booking UUID
 * @returns The updated booking
 */
export async function markArrived(bookingId: string): Promise<Booking> {
  return updateBookingStatus(bookingId, 'arrived');
}

// =============================================================================
// HOST QUERIES
// =============================================================================

/**
 * Gets all bookings for a specific date.
 * Used for Timeline/Gantt view.
 *
 * @param venueId - The venue UUID
 * @param date - Date in YYYY-MM-DD format
 * @returns Array of bookings with table and game details
 */
export async function getBookingsForDate(
  venueId: string,
  date: string
): Promise<BookingWithDetails[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('bookings')
    .select(`
      *,
      venue_tables:table_id (id, label, capacity),
      games:game_id (id, title, cover_image_url)
    `)
    .eq('venue_id', venueId)
    .eq('booking_date', date)
    .not('status', 'in', `(${CANCELLED_STATUSES.join(',')})`)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching bookings for date:', error);
    return [];
  }

  return (data ?? []).map((row) => transformBookingWithDetails(row as Record<string, unknown>));
}

/**
 * Gets all bookings for a date range.
 * Used for multi-day views.
 *
 * @param venueId - The venue UUID
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Array of bookings with table and game details
 */
export async function getBookingsForDateRange(
  venueId: string,
  startDate: string,
  endDate: string
): Promise<BookingWithDetails[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('bookings')
    .select(`
      *,
      venue_tables:table_id (id, label, capacity),
      games:game_id (id, title, cover_image_url)
    `)
    .eq('venue_id', venueId)
    .gte('booking_date', startDate)
    .lte('booking_date', endDate)
    .not('status', 'in', `(${CANCELLED_STATUSES.join(',')})`)
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching bookings for date range:', error);
    return [];
  }

  return (data ?? []).map((row) => transformBookingWithDetails(row as Record<string, unknown>));
}

/**
 * Finds confirmed bookings that are overdue (no-show candidates).
 *
 * @param venueId - The venue UUID
 * @param graceMinutes - Minutes past start time before flagging (default: 15)
 * @returns Array of overdue bookings
 */
export async function getNoShowCandidates(
  venueId: string,
  graceMinutes: number = 15
): Promise<BookingWithDetails[]> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Calculate cutoff time (current time minus grace period)
  const cutoffDate = new Date(now.getTime() - graceMinutes * 60 * 1000);
  const cutoffTime = cutoffDate.toTimeString().split(' ')[0]; // HH:MM:SS

  const { data, error } = await getSupabaseAdmin()
    .from('bookings')
    .select(`
      *,
      venue_tables:table_id (id, label, capacity),
      games:game_id (id, title, cover_image_url)
    `)
    .eq('venue_id', venueId)
    .eq('booking_date', today)
    .eq('status', 'confirmed')
    .lt('start_time', cutoffTime)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching no-show candidates:', error);
    return [];
  }

  return (data ?? []).map((row) => transformBookingWithDetails(row as Record<string, unknown>));
}

/**
 * Statistics for today's bookings.
 */
export interface BookingStats {
  total: number;
  confirmed: number;
  arrived: number;
  seated: number;
  completed: number;
  noShow: number;
  cancelled: number;
}

/**
 * Gets quick stats for today's bookings.
 *
 * @param venueId - The venue UUID
 * @returns Booking statistics for today
 */
export async function getTodaysBookingStats(venueId: string): Promise<BookingStats> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await getSupabaseAdmin()
    .from('bookings')
    .select('status')
    .eq('venue_id', venueId)
    .eq('booking_date', today);

  if (error) {
    console.error('Error fetching booking stats:', error);
    return {
      total: 0,
      confirmed: 0,
      arrived: 0,
      seated: 0,
      completed: 0,
      noShow: 0,
      cancelled: 0,
    };
  }

  const stats: BookingStats = {
    total: data?.length ?? 0,
    confirmed: 0,
    arrived: 0,
    seated: 0,
    completed: 0,
    noShow: 0,
    cancelled: 0,
  };

  for (const booking of data ?? []) {
    switch (booking.status as BookingStatus) {
      case 'confirmed':
        stats.confirmed++;
        break;
      case 'arrived':
        stats.arrived++;
        break;
      case 'seated':
        stats.seated++;
        break;
      case 'completed':
        stats.completed++;
        break;
      case 'no_show':
        stats.noShow++;
        break;
      case 'cancelled_by_guest':
      case 'cancelled_by_venue':
        stats.cancelled++;
        break;
    }
  }

  return stats;
}

// =============================================================================
// LIST VIEW QUERIES - Flat List with Filtering
// =============================================================================

/**
 * Filter options for the booking list view.
 */
export interface BookingListFilters {
  venueId: string;
  /** Start date for date range filter (YYYY-MM-DD) */
  startDate?: string;
  /** End date for date range filter (YYYY-MM-DD) */
  endDate?: string;
  /** Filter by status(es) */
  status?: BookingStatus[];
  /** Filter by table ID */
  tableId?: string;
  /** Search by guest name (case-insensitive partial match) */
  search?: string;
  /** Include historical (past) bookings */
  includeHistorical?: boolean;
  /** Sort field */
  sortField?: 'booking_date' | 'start_time' | 'guest_name' | 'status' | 'created_at';
  /** Sort direction */
  sortDir?: 'asc' | 'desc';
  /** Cursor for pagination (booking ID) */
  cursor?: string;
  /** Number of items to fetch */
  limit?: number;
}

/**
 * Result from getBookingsWithFilters for pagination.
 */
export interface BookingListResult {
  bookings: BookingWithDetails[];
  nextCursor: string | null;
  totalCount: number;
}

/**
 * Fetches bookings with flexible filtering for the list view.
 * Supports date range, status, table, guest search, and cursor-based pagination.
 *
 * Default behavior:
 * - Returns future bookings (next 7 days) by default
 * - Excludes cancelled bookings unless explicitly filtered
 * - Sorted by date/time descending (newest first)
 *
 * @param filters - Filter and pagination options
 * @returns Paginated bookings with cursor for next page
 */
export async function getBookingsWithFilters(
  filters: BookingListFilters
): Promise<BookingListResult> {
  const {
    venueId,
    startDate,
    endDate,
    status,
    tableId,
    search,
    includeHistorical = false,
    sortField = 'booking_date',
    sortDir = 'desc',
    cursor,
    limit = 25,
  } = filters;

  const supabase = getSupabaseAdmin();
  const today = getTodayDate();

  // Build the base query
  let query = supabase
    .from('bookings')
    .select(`
      *,
      venue_tables:table_id (id, label, capacity),
      games:game_id (id, title, cover_image_url)
    `, { count: 'exact' })
    .eq('venue_id', venueId);

  // Date range filtering
  if (startDate) {
    query = query.gte('booking_date', startDate);
  } else if (!includeHistorical) {
    // Default: only future bookings (today onwards)
    query = query.gte('booking_date', today);
  }

  if (endDate) {
    query = query.lte('booking_date', endDate);
  }

  // Status filtering
  if (status && status.length > 0) {
    query = query.in('status', status);
  }

  // Table filtering
  if (tableId) {
    query = query.eq('table_id', tableId);
  }

  // Guest name search (case-insensitive partial match)
  if (search && search.trim()) {
    query = query.ilike('guest_name', `%${search.trim()}%`);
  }

  // Sorting - always sort by date first, then by time
  const ascending = sortDir === 'asc';
  if (sortField === 'booking_date' || sortField === 'start_time') {
    query = query
      .order('booking_date', { ascending })
      .order('start_time', { ascending });
  } else if (sortField === 'guest_name') {
    query = query
      .order('guest_name', { ascending })
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false });
  } else if (sortField === 'status') {
    query = query
      .order('status', { ascending })
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false });
  } else if (sortField === 'created_at') {
    query = query.order('created_at', { ascending });
  }

  // Cursor-based pagination
  // We use the booking ID as the cursor for simplicity
  // Note: For proper cursor pagination, we'd need composite cursor with sort values
  if (cursor) {
    // Get the cursor booking to find its position
    const { data: cursorBooking } = await supabase
      .from('bookings')
      .select('booking_date, start_time, created_at')
      .eq('id', cursor)
      .single();

    if (cursorBooking) {
      // Apply cursor filter based on sort direction
      if (sortDir === 'desc') {
        query = query.or(
          `booking_date.lt.${cursorBooking.booking_date},` +
          `and(booking_date.eq.${cursorBooking.booking_date},start_time.lt.${cursorBooking.start_time}),` +
          `and(booking_date.eq.${cursorBooking.booking_date},start_time.eq.${cursorBooking.start_time},id.lt.${cursor})`
        );
      } else {
        query = query.or(
          `booking_date.gt.${cursorBooking.booking_date},` +
          `and(booking_date.eq.${cursorBooking.booking_date},start_time.gt.${cursorBooking.start_time}),` +
          `and(booking_date.eq.${cursorBooking.booking_date},start_time.eq.${cursorBooking.start_time},id.gt.${cursor})`
        );
      }
    }
  }

  // Limit + 1 to check if there are more results
  query = query.limit(limit + 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching bookings with filters:', error);
    return { bookings: [], nextCursor: null, totalCount: 0 };
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const bookings = rows.slice(0, limit).map((row) =>
    transformBookingWithDetails(row as Record<string, unknown>)
  );

  // Get next cursor from the last item if there are more
  const nextCursor = hasMore && bookings.length > 0
    ? bookings[bookings.length - 1].id
    : null;

  return {
    bookings,
    nextCursor,
    totalCount: count ?? 0,
  };
}

/**
 * Gets all bookings for CSV export (no pagination limit).
 * Uses the same filtering as getBookingsWithFilters but returns all results.
 *
 * @param filters - Filter options (limit and cursor are ignored)
 * @returns All matching bookings
 */
export async function getBookingsForExport(
  filters: Omit<BookingListFilters, 'cursor' | 'limit'>
): Promise<BookingWithDetails[]> {
  const {
    venueId,
    startDate,
    endDate,
    status,
    tableId,
    search,
    includeHistorical = false,
    sortField: _sortField = 'booking_date',
    sortDir = 'desc',
  } = filters;

  const supabase = getSupabaseAdmin();
  const today = getTodayDate();

  let query = supabase
    .from('bookings')
    .select(`
      *,
      venue_tables:table_id (id, label, capacity),
      games:game_id (id, title, cover_image_url)
    `)
    .eq('venue_id', venueId);

  // Date range filtering
  if (startDate) {
    query = query.gte('booking_date', startDate);
  } else if (!includeHistorical) {
    query = query.gte('booking_date', today);
  }

  if (endDate) {
    query = query.lte('booking_date', endDate);
  }

  // Status filtering
  if (status && status.length > 0) {
    query = query.in('status', status);
  }

  // Table filtering
  if (tableId) {
    query = query.eq('table_id', tableId);
  }

  // Guest name search
  if (search && search.trim()) {
    query = query.ilike('guest_name', `%${search.trim()}%`);
  }

  // Sorting
  const ascending = sortDir === 'asc';
  query = query
    .order('booking_date', { ascending })
    .order('start_time', { ascending });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching bookings for export:', error);
    return [];
  }

  return (data ?? []).map((row) =>
    transformBookingWithDetails(row as Record<string, unknown>)
  );
}

// =============================================================================
// GUEST QUERIES
// =============================================================================

/**
 * Gets a booking by ID and email for guest verification.
 * Used on manage-booking pages to ensure guests can only access their own bookings.
 *
 * @param bookingId - The booking UUID
 * @param email - The guest's email address (case-insensitive)
 * @returns The booking if found and email matches, null otherwise
 */
export async function getBookingByIdAndEmail(
  bookingId: string,
  email: string
): Promise<BookingWithDetails | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('bookings')
    .select(`
      *,
      venue_tables:table_id (id, label, capacity),
      games:game_id (id, title, cover_image_url)
    `)
    .eq('id', bookingId)
    .ilike('guest_email', email)
    .maybeSingle();

  if (error) {
    console.error('Error fetching booking by ID and email:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return transformBookingWithDetails(data as Record<string, unknown>);
}

/**
 * Gets a guest's booking history.
 *
 * @param email - The guest's email address
 * @param venueId - Optional venue filter
 * @returns Array of bookings ordered by date DESC
 */
export async function getGuestBookingHistory(
  email: string,
  venueId?: string
): Promise<BookingWithDetails[]> {
  let query = getSupabaseAdmin()
    .from('bookings')
    .select(`
      *,
      venue_tables:table_id (id, label, capacity),
      games:game_id (id, title, cover_image_url)
    `)
    .ilike('guest_email', email)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (venueId) {
    query = query.eq('venue_id', venueId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching guest booking history:', error);
    return [];
  }

  return (data ?? []).map((row) => transformBookingWithDetails(row as Record<string, unknown>));
}

// =============================================================================
// VENUE SETTINGS - Operating Hours
// =============================================================================

/**
 * Gets operating hours for a venue.
 *
 * @param venueId - The venue UUID
 * @returns Array of operating hours for each day of the week
 */
export async function getVenueOperatingHours(
  venueId: string
): Promise<VenueOperatingHours[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('venue_operating_hours')
    .select('*')
    .eq('venue_id', venueId)
    .order('day_of_week', { ascending: true });

  if (error) {
    console.error('Error fetching venue operating hours:', error);
    return [];
  }

  return (data ?? []) as VenueOperatingHours[];
}

/**
 * Operating hours input for upsert.
 */
export interface OperatingHoursInput {
  day_of_week: number; // 0-6, Sunday = 0
  is_closed: boolean;
  open_time: string | null; // HH:MM or HH:MM:SS
  close_time: string | null; // HH:MM or HH:MM:SS
}

/**
 * Sets operating hours for a venue.
 * Deletes existing hours and inserts new ones atomically.
 *
 * @param venueId - The venue UUID
 * @param hours - Array of operating hours for each day
 * @returns The inserted operating hours
 */
export async function upsertVenueOperatingHours(
  venueId: string,
  hours: OperatingHoursInput[]
): Promise<VenueOperatingHours[]> {
  const supabase = getSupabaseAdmin();

  // Delete existing hours
  const { error: deleteError } = await supabase
    .from('venue_operating_hours')
    .delete()
    .eq('venue_id', venueId);

  if (deleteError) {
    console.error('Error deleting existing operating hours:', deleteError);
    throw new Error(`Failed to update operating hours: ${deleteError.message}`);
  }

  // Insert new hours
  const insertData = hours.map((h) => ({
    venue_id: venueId,
    day_of_week: h.day_of_week,
    is_closed: h.is_closed,
    open_time: h.open_time,
    close_time: h.close_time,
  }));

  const { data, error: insertError } = await supabase
    .from('venue_operating_hours')
    .insert(insertData)
    .select('*')
    .order('day_of_week', { ascending: true });

  if (insertError) {
    console.error('Error inserting operating hours:', insertError);
    throw new Error(`Failed to update operating hours: ${insertError.message}`);
  }

  return (data ?? []) as VenueOperatingHours[];
}

/**
 * Default operating hours for initialization.
 * Mon-Fri: 10am-10pm, Sat-Sun: 11am-11pm
 */
const DEFAULT_OPERATING_HOURS: OperatingHoursInput[] = [
  { day_of_week: 0, is_closed: false, open_time: '11:00:00', close_time: '21:00:00' }, // Sunday
  { day_of_week: 1, is_closed: false, open_time: '10:00:00', close_time: '22:00:00' }, // Monday
  { day_of_week: 2, is_closed: false, open_time: '10:00:00', close_time: '22:00:00' }, // Tuesday
  { day_of_week: 3, is_closed: false, open_time: '10:00:00', close_time: '22:00:00' }, // Wednesday
  { day_of_week: 4, is_closed: false, open_time: '10:00:00', close_time: '22:00:00' }, // Thursday
  { day_of_week: 5, is_closed: false, open_time: '10:00:00', close_time: '23:00:00' }, // Friday
  { day_of_week: 6, is_closed: false, open_time: '11:00:00', close_time: '23:00:00' }, // Saturday
];

/**
 * Gets operating hours for a venue, creating default hours if none exist.
 * This ensures venues always have operating hours to display and edit.
 *
 * @param venueId - The venue UUID
 * @returns Array of operating hours for each day of the week
 */
export async function getOrCreateVenueOperatingHours(
  venueId: string
): Promise<VenueOperatingHours[]> {
  // First, try to get existing hours
  const existingHours = await getVenueOperatingHours(venueId);

  // If hours exist, return them
  if (existingHours.length > 0) {
    return existingHours;
  }

  // No hours exist, create defaults
  console.log(`Creating default operating hours for venue ${venueId}`);
  try {
    const newHours = await upsertVenueOperatingHours(venueId, DEFAULT_OPERATING_HOURS);
    return newHours;
  } catch (error) {
    console.error('Error creating default operating hours:', error);
    // Return empty array if creation fails - the UI can handle this
    return [];
  }
}

/**
 * Creates or updates booking settings for a venue using upsert.
 *
 * @param venueId - The venue UUID
 * @param settings - Partial settings to upsert
 * @returns The upserted settings
 */
export async function upsertVenueBookingSettings(
  venueId: string,
  settings: Partial<Omit<VenueBookingSettings, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>
): Promise<VenueBookingSettings> {
  const { data, error } = await getSupabaseAdmin()
    .from('venue_booking_settings')
    .upsert(
      {
        venue_id: venueId,
        ...settings,
      },
      { onConflict: 'venue_id' }
    )
    .select('*')
    .single();

  if (error) {
    console.error('Error upserting venue booking settings:', error);
    throw new Error(`Failed to update booking settings: ${error.message}`);
  }

  return data as VenueBookingSettings;
}

// =============================================================================
// WAITLIST
// =============================================================================

/**
 * Parameters for adding a guest to the waitlist.
 */
export interface WaitlistEntryParams {
  venueId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  partySize: number;
  requestedDate: string; // YYYY-MM-DD format
  preferredTimeStart?: string | null; // HH:MM format
  preferredTimeEnd?: string | null; // HH:MM format
  flexibilityMinutes?: number;
  notes?: string | null;
}

/**
 * Adds a guest to the waitlist when no slots are available.
 *
 * @param params - Waitlist entry parameters
 * @returns The created waitlist entry ID
 */
export async function addToWaitlist(params: WaitlistEntryParams): Promise<string> {
  const {
    venueId,
    guestName,
    guestEmail,
    guestPhone,
    partySize,
    requestedDate,
    preferredTimeStart,
    preferredTimeEnd,
    flexibilityMinutes = 30,
    notes,
  } = params;

  const { data, error } = await getSupabaseAdmin()
    .from('booking_waitlist')
    .insert({
      venue_id: venueId,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone ?? null,
      party_size: partySize,
      requested_date: requestedDate,
      preferred_time_start: preferredTimeStart ?? null,
      preferred_time_end: preferredTimeEnd ?? null,
      flexibility_minutes: flexibilityMinutes,
      notes: notes ?? null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding to waitlist:', error);
    throw new Error(`Failed to add to waitlist: ${error.message}`);
  }

  return data.id as string;
}

/**
 * Gets pending waitlist entries for a venue and date.
 *
 * @param venueId - The venue UUID
 * @param date - Date in YYYY-MM-DD format
 * @returns Array of pending waitlist entries
 */
export async function getPendingWaitlistEntries(
  venueId: string,
  date: string
): Promise<BookingWaitlistEntry[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('booking_waitlist')
    .select('*')
    .eq('venue_id', venueId)
    .eq('requested_date', date)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching pending waitlist entries:', error);
    return [];
  }

  return (data ?? []) as BookingWaitlistEntry[];
}

/**
 * Updates a waitlist entry's status.
 *
 * @param entryId - The waitlist entry UUID
 * @param status - The new status
 * @param convertedBookingId - Optional booking ID if converted
 * @returns The updated waitlist entry
 */
export async function updateWaitlistStatus(
  entryId: string,
  status: WaitlistStatus,
  convertedBookingId?: string
): Promise<BookingWaitlistEntry> {
  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'notified') {
    updatePayload.notified_at = new Date().toISOString();
  }

  if (status === 'converted' && convertedBookingId) {
    updatePayload.converted_booking_id = convertedBookingId;
  }

  const { data, error } = await getSupabaseAdmin()
    .from('booking_waitlist')
    .update(updatePayload)
    .eq('id', entryId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating waitlist status:', error);
    throw new Error(`Failed to update waitlist status: ${error.message}`);
  }

  return data as BookingWaitlistEntry;
}

// -----------------------------------------------------------------------------
// Booking Modification Logging
// -----------------------------------------------------------------------------

/**
 * Parameters for logging a booking modification.
 */
export interface LogModificationParams {
  bookingId: string;
  modificationType: BookingModificationType;
  modifiedBy: string | null;
  modifiedByRole: 'admin' | 'guest' | 'system';
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  reason?: string;
}

/**
 * Logs a booking modification to the booking_modifications table.
 * This creates an audit trail of all changes made to bookings.
 *
 * @param params - The modification details to log
 */
export async function logBookingModification(params: LogModificationParams): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('booking_modifications').insert({
    booking_id: params.bookingId,
    modification_type: params.modificationType,
    modified_by: params.modifiedBy,
    modified_by_role: params.modifiedByRole,
    previous_value: params.previousValue,
    new_value: params.newValue,
    reason: params.reason ?? null,
  });

  if (error) {
    // Log error but don't throw - modification logging shouldn't break the update
    console.error('Error logging booking modification:', error);
  }
}

/**
 * Determines the modification type based on what fields changed.
 * Prioritizes more significant changes (reschedule > table > party_size, etc.)
 *
 * @param changedFields - Array of field names that changed
 * @returns The appropriate modification type
 */
export function determineModificationType(
  changedFields: string[]
): BookingModificationType {
  // Reschedule takes priority
  if (
    changedFields.includes('booking_date') ||
    changedFields.includes('start_time') ||
    changedFields.includes('duration_minutes') ||
    changedFields.includes('end_time')
  ) {
    return 'reschedule';
  }

  if (changedFields.includes('table_id')) {
    return 'table_change';
  }

  if (changedFields.includes('party_size')) {
    return 'party_size';
  }

  if (changedFields.includes('game_id')) {
    return 'game_change';
  }

  if (
    changedFields.includes('guest_name') ||
    changedFields.includes('guest_email') ||
    changedFields.includes('guest_phone')
  ) {
    return 'guest_info';
  }

  if (changedFields.includes('notes') || changedFields.includes('internal_notes')) {
    return 'notes';
  }

  return 'general';
}
