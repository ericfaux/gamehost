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
