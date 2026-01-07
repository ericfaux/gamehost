'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import {
  checkTableAvailability,
  checkGameAvailability,
  getOrCreateVenueBookingSettings,
  timeToMinutes,
  addMinutesToTime,
} from '@/lib/data/bookings';
import type {
  Booking,
  BookingWithDetails,
  BookingSource,
} from '@/lib/db/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Error codes for booking action failures.
 * These allow the UI to handle errors appropriately.
 */
export type BookingErrorCode =
  | 'CONFLICT'       // Table or game already booked at this time
  | 'VALIDATION'     // Input validation failed
  | 'NOT_FOUND'      // Venue, table, or game not found
  | 'UNAUTHORIZED'   // User not authorized
  | 'DISABLED'       // Bookings are disabled for this venue
  | 'CAPACITY'       // Party size exceeds table capacity
  | 'UNKNOWN';       // Unexpected error

/**
 * Result type for booking actions.
 * Provides structured success/failure information.
 */
export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: BookingErrorCode;
}

/**
 * Parameters for the createBooking action.
 * Extends CreateBookingParams with optional duration for calculating end_time.
 */
export interface CreateBookingActionParams {
  venue_id: string;
  table_id: string;
  booking_date: string;      // YYYY-MM-DD format
  start_time: string;        // HH:MM or HH:MM:SS format
  duration_minutes?: number; // If provided, calculates end_time; otherwise end_time required
  end_time?: string;         // HH:MM or HH:MM:SS format
  party_size: number;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  notes?: string;
  internal_notes?: string;
  game_id?: string;
  source?: BookingSource;    // Defaults to 'online'
}

/**
 * Validation result for booking parameters.
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// -----------------------------------------------------------------------------
// Validation Helpers
// -----------------------------------------------------------------------------

/**
 * Validates an email address format.
 */
function isValidEmail(email: string): boolean {
  // Simple email regex that covers most common cases
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a phone number format.
 * Accepts various formats with digits, spaces, dashes, and parentheses.
 */
function isValidPhone(phone: string): boolean {
  // Remove common formatting characters and check for at least 7 digits
  const digitsOnly = phone.replace(/[\s\-().+]/g, '');
  return /^\d{7,15}$/.test(digitsOnly);
}

/**
 * Parses a date string and returns a Date object, or null if invalid.
 */
function parseDate(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
  const day = parseInt(match[3], 10);

  const date = new Date(year, month, day);

  // Validate that the date components match (handles invalid dates like Feb 30)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Normalizes a time string to HH:MM format.
 * Accepts HH:MM or HH:MM:SS format.
 */
function normalizeTime(time: string): string {
  const parts = time.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return time;
}

/**
 * Validates time format (HH:MM or HH:MM:SS).
 */
function isValidTime(time: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time);
}

/**
 * Calculates the number of days between two dates.
 */
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.round((d2.getTime() - d1.getTime()) / oneDay);
}

/**
 * Validates all booking parameters before attempting to create.
 * Returns validation result with array of error messages.
 */
export function validateBookingParams(
  params: CreateBookingActionParams,
  settings: {
    require_phone: boolean;
    require_email: boolean;
    min_booking_notice_hours: number;
    max_advance_booking_days: number;
  }
): ValidationResult {
  const errors: string[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // --- Required Fields ---
  if (!params.venue_id?.trim()) {
    errors.push('Venue ID is required');
  }

  if (!params.table_id?.trim()) {
    errors.push('Table selection is required');
  }

  if (!params.guest_name?.trim()) {
    errors.push('Guest name is required');
  }

  if (!params.booking_date?.trim()) {
    errors.push('Booking date is required');
  }

  if (!params.start_time?.trim()) {
    errors.push('Start time is required');
  }

  // Duration or end_time required
  if (!params.duration_minutes && !params.end_time) {
    errors.push('Duration or end time is required');
  }

  // --- Party Size ---
  if (params.party_size === undefined || params.party_size === null) {
    errors.push('Party size is required');
  } else if (!Number.isInteger(params.party_size) || params.party_size <= 0) {
    errors.push('Party size must be a positive whole number');
  }

  // --- Duration ---
  if (params.duration_minutes !== undefined) {
    if (!Number.isInteger(params.duration_minutes) || params.duration_minutes <= 0) {
      errors.push('Duration must be a positive whole number of minutes');
    }
  }

  // --- Contact Info ---
  // At least one of email or phone must be provided
  const hasEmail = params.guest_email?.trim();
  const hasPhone = params.guest_phone?.trim();

  if (!hasEmail && !hasPhone) {
    errors.push('At least one contact method (email or phone) is required');
  }

  // Venue-specific requirements
  if (settings.require_email && !hasEmail) {
    errors.push('Email address is required');
  }

  if (settings.require_phone && !hasPhone) {
    errors.push('Phone number is required');
  }

  // Validate formats if provided
  if (hasEmail && !isValidEmail(params.guest_email!)) {
    errors.push('Invalid email address format');
  }

  if (hasPhone && !isValidPhone(params.guest_phone!)) {
    errors.push('Invalid phone number format');
  }

  // --- Date Validation ---
  if (params.booking_date) {
    const bookingDate = parseDate(params.booking_date);

    if (!bookingDate) {
      errors.push('Invalid date format. Use YYYY-MM-DD');
    } else {
      // Check if date is in the past
      if (bookingDate < today) {
        errors.push('Booking date cannot be in the past');
      }

      // Check max advance booking days
      const daysAhead = daysBetween(today, bookingDate);
      if (daysAhead > settings.max_advance_booking_days) {
        errors.push(`Bookings can only be made up to ${settings.max_advance_booking_days} days in advance`);
      }
    }
  }

  // --- Time Validation ---
  if (params.start_time && !isValidTime(params.start_time)) {
    errors.push('Invalid start time format. Use HH:MM');
  }

  if (params.end_time && !isValidTime(params.end_time)) {
    errors.push('Invalid end time format. Use HH:MM');
  }

  // Check if time is in the past (for today's bookings)
  if (params.booking_date && params.start_time) {
    const bookingDate = parseDate(params.booking_date);
    const isToday = bookingDate && daysBetween(today, bookingDate) === 0;

    if (isToday && isValidTime(params.start_time)) {
      const normalizedTime = normalizeTime(params.start_time);

      // Check minimum notice requirement
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const bookingMinutes = timeToMinutes(normalizedTime);
      const minutesUntilBooking = bookingMinutes - currentMinutes;
      const requiredMinutes = settings.min_booking_notice_hours * 60;

      if (minutesUntilBooking < requiredMinutes) {
        if (minutesUntilBooking <= 0) {
          errors.push('Start time cannot be in the past');
        } else {
          errors.push(`Bookings require at least ${settings.min_booking_notice_hours} hour(s) notice`);
        }
      }
    }
  }

  // --- End Time Logic ---
  if (params.start_time && params.end_time && isValidTime(params.start_time) && isValidTime(params.end_time)) {
    const startMinutes = timeToMinutes(normalizeTime(params.start_time));
    const endMinutes = timeToMinutes(normalizeTime(params.end_time));

    if (endMinutes <= startMinutes) {
      errors.push('End time must be after start time');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// -----------------------------------------------------------------------------
// Confirmation Code Generation
// -----------------------------------------------------------------------------

/**
 * Generates a unique confirmation code for a booking.
 * Format: 6 alphanumeric characters (uppercase, no ambiguous chars like O/0, I/1)
 */
function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// -----------------------------------------------------------------------------
// Create Booking Action
// -----------------------------------------------------------------------------

/**
 * Creates a new booking with comprehensive validation and conflict prevention.
 *
 * This action performs the following steps:
 * 1. Validates all input parameters
 * 2. Fetches and validates venue booking settings
 * 3. Verifies table exists and has sufficient capacity
 * 4. Checks table availability for the requested time slot
 * 5. Checks game availability if a game is requested
 * 6. Creates the booking with conflict prevention
 * 7. Revalidates affected paths
 *
 * Race Condition Prevention Strategy:
 * - Uses optimistic locking with check-then-insert pattern
 * - Retries with fresh availability check on conflict
 * - Database constraints provide final safety net
 *
 * @param params - The booking creation parameters
 * @returns ActionResult with created booking or error
 */
export async function createBooking(
  params: CreateBookingActionParams
): Promise<ActionResult<BookingWithDetails>> {
  const supabase = getSupabaseAdmin();

  // --- Step 1: Get Authenticated User (Optional) ---
  // User authentication is optional for public booking forms
  let userId: string | null = null;
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Anonymous booking is allowed
    userId = null;
  }

  // --- Step 2: Fetch Venue Settings ---
  let settings;
  try {
    settings = await getOrCreateVenueBookingSettings(params.venue_id);
  } catch (error) {
    console.error('Failed to fetch venue settings:', error);
    return {
      success: false,
      error: 'Venue not found.',
      code: 'NOT_FOUND',
    };
  }

  // --- Step 3: Validate Parameters ---
  const validation = validateBookingParams(params, {
    require_phone: settings.require_phone,
    require_email: settings.require_email,
    min_booking_notice_hours: settings.min_booking_notice_hours,
    max_advance_booking_days: settings.max_advance_booking_days,
  });

  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors[0], // Return first error for simplicity
      code: 'VALIDATION',
    };
  }

  // --- Step 4: Normalize Times ---
  const normalizedStartTime = normalizeTime(params.start_time);

  // Calculate end_time from duration if not provided
  let normalizedEndTime: string;
  if (params.end_time) {
    normalizedEndTime = normalizeTime(params.end_time);
  } else if (params.duration_minutes) {
    normalizedEndTime = addMinutesToTime(normalizedStartTime, params.duration_minutes);
  } else {
    // This shouldn't happen due to validation, but handle it
    normalizedEndTime = addMinutesToTime(normalizedStartTime, settings.default_duration_minutes);
  }

  // --- Step 5: Verify Table Exists and Check Capacity ---
  const { data: table, error: tableError } = await supabase
    .from('venue_tables')
    .select('id, venue_id, label, capacity, is_active')
    .eq('id', params.table_id)
    .single();

  if (tableError || !table) {
    return {
      success: false,
      error: 'Table not found.',
      code: 'NOT_FOUND',
    };
  }

  if (!table.is_active) {
    return {
      success: false,
      error: 'This table is not currently available for booking.',
      code: 'NOT_FOUND',
    };
  }

  if (table.venue_id !== params.venue_id) {
    return {
      success: false,
      error: 'Table does not belong to the specified venue.',
      code: 'VALIDATION',
    };
  }

  // Check table capacity
  if (table.capacity !== null && params.party_size > table.capacity) {
    return {
      success: false,
      error: `This table can accommodate up to ${table.capacity} guests. Please choose a larger table or reduce your party size.`,
      code: 'CAPACITY',
    };
  }

  // --- Step 6: Check Table Availability ---
  const availabilityResult = await checkTableAvailability({
    tableId: params.table_id,
    date: params.booking_date,
    startTime: normalizedStartTime,
    endTime: normalizedEndTime,
  });

  if (!availabilityResult.available) {
    // Provide helpful conflict information
    const conflictInfo = availabilityResult.conflicts.length > 0
      ? ` Conflicting booking: ${availabilityResult.conflicts[0].guest_name} (${availabilityResult.conflicts[0].start_time}-${availabilityResult.conflicts[0].end_time})`
      : '';

    return {
      success: false,
      error: `This table is no longer available for the selected time. Please choose another slot.${conflictInfo}`,
      code: 'CONFLICT',
    };
  }

  // --- Step 7: Check Game Availability (if game_id provided) ---
  if (params.game_id) {
    // First verify the game exists
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, venue_id, title, copies_in_rotation')
      .eq('id', params.game_id)
      .single();

    if (gameError || !game) {
      return {
        success: false,
        error: 'The selected game was not found.',
        code: 'NOT_FOUND',
      };
    }

    if (game.venue_id !== params.venue_id) {
      return {
        success: false,
        error: 'This game is not available at the selected venue.',
        code: 'VALIDATION',
      };
    }

    // Check game copy availability
    const gameAvailability = await checkGameAvailability({
      gameId: params.game_id,
      date: params.booking_date,
      startTime: normalizedStartTime,
      endTime: normalizedEndTime,
    });

    if (!gameAvailability.available) {
      return {
        success: false,
        error: `Sorry, all ${gameAvailability.copiesTotal} copies of "${game.title}" are reserved for this time slot. ${gameAvailability.copiesReserved} copy/copies already booked.`,
        code: 'CONFLICT',
      };
    }
  }

  // --- Step 8: Generate Confirmation Code ---
  // Generate a unique confirmation code with retry for collisions
  let confirmationCode = generateConfirmationCode();
  let codeAttempts = 0;
  const maxCodeAttempts = 5;

  while (codeAttempts < maxCodeAttempts) {
    const { data: existingCode } = await supabase
      .from('bookings')
      .select('id')
      .eq('confirmation_code', confirmationCode)
      .single();

    if (!existingCode) {
      break; // Code is unique
    }

    confirmationCode = generateConfirmationCode();
    codeAttempts++;
  }

  // --- Step 9: Determine Initial Status ---
  // For now, all online bookings start as 'confirmed'
  // TODO: Add deposit_required logic when payment integration is added
  const initialStatus = 'confirmed';
  const confirmedAt = new Date().toISOString();

  // --- Step 10: Create the Booking ---
  // Prepare the booking record
  const bookingRecord: Omit<Booking, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string } = {
    venue_id: params.venue_id,
    table_id: params.table_id,
    session_id: null,
    status: initialStatus,
    source: params.source ?? 'online',
    booking_date: params.booking_date,
    start_time: normalizedStartTime,
    end_time: normalizedEndTime,
    party_size: params.party_size,
    guest_name: params.guest_name.trim(),
    guest_email: params.guest_email?.trim() || null,
    guest_phone: params.guest_phone?.trim() || null,
    notes: params.notes?.trim() || null,
    internal_notes: params.internal_notes?.trim() || null,
    game_id: params.game_id || null,
    confirmation_code: confirmationCode,
    confirmed_at: confirmedAt,
    arrived_at: null,
    seated_at: null,
    completed_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    no_show_at: null,
    created_by: userId,
  };

  // Attempt to insert with retry for race conditions
  let insertAttempt = 0;
  const maxInsertAttempts = 3;
  let createdBooking: BookingWithDetails | null = null;

  while (insertAttempt < maxInsertAttempts) {
    insertAttempt++;

    // Re-check availability on retry (race condition protection)
    if (insertAttempt > 1) {
      const retryAvailability = await checkTableAvailability({
        tableId: params.table_id,
        date: params.booking_date,
        startTime: normalizedStartTime,
        endTime: normalizedEndTime,
      });

      if (!retryAvailability.available) {
        return {
          success: false,
          error: 'This table is no longer available for the selected time. Please choose another slot.',
          code: 'CONFLICT',
        };
      }
    }

    // Insert the booking
    const { data, error: insertError } = await supabase
      .from('bookings')
      .insert(bookingRecord)
      .select(`
        *,
        venue_tables:table_id (id, label, capacity),
        games:game_id (id, title, cover_image_url)
      `)
      .single();

    if (insertError) {
      console.error(`Booking insert attempt ${insertAttempt} failed:`, insertError);

      // Check for unique constraint violation (race condition)
      if (insertError.code === '23505') {
        // Unique constraint violation - another booking was created
        if (insertAttempt < maxInsertAttempts) {
          // Wait briefly and retry
          await new Promise(resolve => setTimeout(resolve, 100 * insertAttempt));
          continue;
        }
        return {
          success: false,
          error: 'This table is no longer available for the selected time. Please choose another slot.',
          code: 'CONFLICT',
        };
      }

      // Other database error
      return {
        success: false,
        error: 'Failed to create booking. Please try again.',
        code: 'UNKNOWN',
      };
    }

    // Transform the result
    if (data) {
      // Handle Supabase foreign key array format
      const rawData = data as Record<string, unknown>;

      const venueTablesArray = rawData.venue_tables as Array<{
        id: string;
        label: string;
        capacity: number | null;
      }> | null;
      const venue_table = Array.isArray(venueTablesArray) && venueTablesArray.length > 0
        ? venueTablesArray[0]
        : venueTablesArray && !Array.isArray(venueTablesArray)
          ? venueTablesArray
          : null;

      const gamesArray = rawData.games as Array<{
        id: string;
        title: string;
        cover_image_url: string | null;
      }> | null;
      const game = Array.isArray(gamesArray) && gamesArray.length > 0
        ? gamesArray[0]
        : gamesArray && !Array.isArray(gamesArray)
          ? gamesArray
          : null;

      const { venue_tables: _vt, games: _g, ...bookingData } = rawData;

      createdBooking = {
        ...bookingData,
        venue_table,
        game,
      } as BookingWithDetails;

      break; // Success!
    }
  }

  if (!createdBooking) {
    return {
      success: false,
      error: 'Failed to create booking after multiple attempts. Please try again.',
      code: 'UNKNOWN',
    };
  }

  // --- Step 11: Post-Insert Verification ---
  // Verify no conflicting bookings were created (final race condition check)
  const { data: conflictCheck } = await supabase
    .from('bookings')
    .select('id')
    .eq('table_id', params.table_id)
    .eq('booking_date', params.booking_date)
    .neq('id', createdBooking.id)
    .not('status', 'in', '(cancelled_by_guest,cancelled_by_venue,no_show)')
    .lt('start_time', normalizedEndTime)
    .gt('end_time', normalizedStartTime);

  if (conflictCheck && conflictCheck.length > 0) {
    // Conflict detected! Roll back our booking
    await supabase
      .from('bookings')
      .delete()
      .eq('id', createdBooking.id);

    return {
      success: false,
      error: 'This table is no longer available for the selected time. Please choose another slot.',
      code: 'CONFLICT',
    };
  }

  // --- Step 12: Revalidate Paths ---
  revalidatePath('/admin/bookings');
  revalidatePath('/admin/sessions');

  // Revalidate public booking page if venue has one
  // Note: We'd need the venue slug for this, which we can fetch if needed
  // For now, revalidate a generic pattern
  try {
    const { data: venue } = await supabase
      .from('venues')
      .select('slug')
      .eq('id', params.venue_id)
      .single();

    if (venue?.slug) {
      revalidatePath(`/v/${venue.slug}/book`);
    }
  } catch {
    // Non-critical, continue
  }

  // --- Success! ---
  return {
    success: true,
    data: createdBooking,
  };
}

// -----------------------------------------------------------------------------
// Test Scenarios Documentation
// -----------------------------------------------------------------------------

/**
 * Test Scenarios for createBooking:
 *
 * 1. Happy path: valid booking created
 *    - All required fields provided
 *    - Table available
 *    - Returns success: true with booking data
 *
 * 2. Missing required field → VALIDATION error
 *    - Missing guest_name → "Guest name is required"
 *    - Missing table_id → "Table selection is required"
 *    - Missing contact info → "At least one contact method required"
 *
 * 3. Table already booked → CONFLICT error
 *    - checkTableAvailability returns available: false
 *    - Returns "This table is no longer available..."
 *
 * 4. Date in past → VALIDATION error
 *    - booking_date < today
 *    - Returns "Booking date cannot be in the past"
 *
 * 5. Party size exceeds table capacity → CAPACITY error
 *    - party_size > table.capacity
 *    - Returns "This table can accommodate up to X guests..."
 *
 * 6. Game not available → CONFLICT error
 *    - checkGameAvailability returns available: false
 *    - Returns copy count info: "all X copies reserved"
 *
 * 7. Race condition: two simultaneous requests → one succeeds, one fails
 *    - First insert succeeds
 *    - Second insert hits post-insert verification
 *    - Second booking rolled back, returns CONFLICT
 *
 * 8. Invalid email format → VALIDATION error
 *    - guest_email doesn't match email regex
 *    - Returns "Invalid email address format"
 *
 * 9. Start time in past (for today) → VALIDATION error
 *    - booking_date is today, start_time < current time
 *    - Returns "Start time cannot be in the past"
 *
 * 10. Insufficient booking notice → VALIDATION error
 *     - booking in less than min_booking_notice_hours
 *     - Returns "Bookings require at least X hour(s) notice"
 *
 * 11. Too far in advance → VALIDATION error
 *     - booking_date > max_advance_booking_days from today
 *     - Returns "Bookings can only be made up to X days in advance"
 */
