'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import {
  checkTableAvailability,
  checkGameAvailability,
  getOrCreateVenueBookingSettings,
  getBookingById,
  timeToMinutes,
  addMinutesToTime,
} from '@/lib/data/bookings';
import type {
  Booking,
  BookingWithDetails,
  BookingSource,
  BookingStatus,
  Session,
} from '@/lib/db/types';
import {
  endAllActiveSessionsForTable,
} from '@/lib/data/sessions';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Error codes for booking action failures.
 * These allow the UI to handle errors appropriately.
 */
export type BookingErrorCode =
  | 'CONFLICT'           // Table or game already booked at this time
  | 'VALIDATION'         // Input validation failed
  | 'NOT_FOUND'          // Venue, table, or game not found
  | 'UNAUTHORIZED'       // User not authorized
  | 'DISABLED'           // Bookings are disabled for this venue
  | 'CAPACITY'           // Party size exceeds table capacity
  | 'INVALID_TRANSITION' // Invalid state transition attempted
  | 'TOO_EARLY'          // Action attempted before allowed time (e.g., no-show before grace period)
  | 'UNKNOWN';           // Unexpected error

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

/**
 * Parameters for cancelling a booking.
 */
export interface CancelBookingParams {
  bookingId: string;
  cancelledBy: 'guest' | 'venue';
  reason?: string;
}

/**
 * Parameters for updating a booking.
 * All fields are optional for partial updates.
 */
export interface UpdateBookingActionParams {
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  party_size?: number;
  booking_date?: string;
  start_time?: string;
  duration_minutes?: number;
  table_id?: string;
  game_id?: string | null;
  notes?: string;
}

// -----------------------------------------------------------------------------
// State Machine Definitions
// -----------------------------------------------------------------------------

/**
 * Valid state transitions for booking status.
 * This defines the booking lifecycle state machine.
 *
 * State machine diagram:
 * pending ──┬──→ confirmed ──┬──→ arrived ──→ seated ──→ completed
 *           │                │                  ↑
 *           │                └──────────────────┘ (seatParty: direct seating)
 *           │                │
 *           └──→ cancelled   └──→ no_show
 *                (by_guest)
 *                (by_venue)
 */
const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled_by_guest', 'cancelled_by_venue'],
  confirmed: ['arrived', 'seated', 'cancelled_by_guest', 'cancelled_by_venue', 'no_show'],
  arrived: ['seated', 'cancelled_by_venue', 'no_show'],
  seated: ['completed'],
  completed: [],
  no_show: [],
  cancelled_by_guest: [],
  cancelled_by_venue: [],
};

/**
 * Checks if a state transition is valid according to the state machine.
 *
 * @param from - The current booking status
 * @param to - The target booking status
 * @returns true if the transition is allowed
 */
function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Human-readable action names for state transitions.
 * Used in error messages.
 */
const STATUS_ACTION_NAMES: Record<BookingStatus, string> = {
  pending: 'set to pending',
  confirmed: 'confirm',
  arrived: 'mark as arrived',
  seated: 'seat',
  completed: 'complete',
  no_show: 'mark as no-show',
  cancelled_by_guest: 'cancel',
  cancelled_by_venue: 'cancel',
};

/**
 * Default grace period in minutes for marking a booking as no-show.
 * The booking time + this grace period must have passed.
 */
const NO_SHOW_GRACE_PERIOD_MINUTES = 15;

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
function validateBookingParams(
  params: CreateBookingActionParams,
  settings: {
    min_advance_hours: number;
    max_advance_days: number;
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
      if (daysAhead > settings.max_advance_days) {
        errors.push(`Bookings can only be made up to ${settings.max_advance_days} days in advance`);
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
      const requiredMinutes = settings.min_advance_hours * 60;

      if (minutesUntilBooking < requiredMinutes) {
        if (minutesUntilBooking <= 0) {
          errors.push('Start time cannot be in the past');
        } else {
          errors.push(`Bookings require at least ${settings.min_advance_hours} hour(s) notice`);
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
    min_advance_hours: settings.min_advance_hours,
    max_advance_days: settings.max_advance_days,
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

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
 *     - booking in less than min_advance_hours
 *     - Returns "Bookings require at least X hour(s) notice"
 *
 * 11. Too far in advance → VALIDATION error
 *     - booking_date > max_advance_days from today
 *     - Returns "Bookings can only be made up to X days in advance"
 */

// -----------------------------------------------------------------------------
// State Transition Actions
// -----------------------------------------------------------------------------

/**
 * Confirms a pending booking.
 * Use case: After deposit paid, or manual confirmation.
 *
 * Valid from: pending
 * Sets: status='confirmed', confirmed_at=now()
 *
 * @param bookingId - The booking's UUID
 * @returns ActionResult with updated booking or error
 */
export async function confirmBooking(
  bookingId: string
): Promise<ActionResult<Booking>> {
  const supabase = getSupabaseAdmin();

  // Fetch the current booking
  const booking = await getBookingById(bookingId);

  if (!booking) {
    return {
      success: false,
      error: 'Booking not found.',
      code: 'NOT_FOUND',
    };
  }

  // Validate state transition
  const targetStatus: BookingStatus = 'confirmed';
  if (!canTransition(booking.status, targetStatus)) {
    return {
      success: false,
      error: `Cannot ${STATUS_ACTION_NAMES[targetStatus]} a booking that is ${booking.status.replace(/_/g, ' ')}.`,
      code: 'INVALID_TRANSITION',
    };
  }

  // Update the booking
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: targetStatus,
      confirmed_at: now,
    })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error) {
    console.error('Error confirming booking:', error);
    return {
      success: false,
      error: 'Failed to confirm booking. Please try again.',
      code: 'UNKNOWN',
    };
  }

  // Revalidate paths
  revalidatePath('/admin/bookings');
  revalidatePath('/admin/sessions');

  return {
    success: true,
    data: data as Booking,
  };
}

/**
 * Cancels a booking by guest or venue.
 *
 * Valid from: pending, confirmed, arrived
 * Sets: status='cancelled_by_guest' or 'cancelled_by_venue', cancelled_at=now(), cancellation_reason
 *
 * @param params - Cancel booking parameters including who cancelled and optional reason
 * @returns ActionResult with updated booking or error
 */
export async function cancelBooking(
  params: CancelBookingParams
): Promise<ActionResult<Booking>> {
  const { bookingId, cancelledBy, reason } = params;
  const supabase = getSupabaseAdmin();

  // Fetch the current booking
  const booking = await getBookingById(bookingId);

  if (!booking) {
    return {
      success: false,
      error: 'Booking not found.',
      code: 'NOT_FOUND',
    };
  }

  // Determine target status based on who is cancelling
  const targetStatus: BookingStatus = cancelledBy === 'guest'
    ? 'cancelled_by_guest'
    : 'cancelled_by_venue';

  // Validate state transition
  if (!canTransition(booking.status, targetStatus)) {
    // Provide specific error message for terminal states
    if (booking.status === 'cancelled_by_guest' || booking.status === 'cancelled_by_venue') {
      return {
        success: false,
        error: 'This booking has already been cancelled.',
        code: 'INVALID_TRANSITION',
      };
    }
    if (booking.status === 'seated' || booking.status === 'completed') {
      return {
        success: false,
        error: `Cannot cancel a booking that is ${booking.status.replace(/_/g, ' ')}.`,
        code: 'INVALID_TRANSITION',
      };
    }
    return {
      success: false,
      error: `Cannot ${STATUS_ACTION_NAMES[targetStatus]} a booking that is ${booking.status.replace(/_/g, ' ')}.`,
      code: 'INVALID_TRANSITION',
    };
  }

  // Update the booking
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: targetStatus,
      cancelled_at: now,
      cancellation_reason: reason ?? null,
    })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error) {
    console.error('Error cancelling booking:', error);
    return {
      success: false,
      error: 'Failed to cancel booking. Please try again.',
      code: 'UNKNOWN',
    };
  }

  // Revalidate paths
  revalidatePath('/admin/bookings');
  revalidatePath('/admin/sessions');

  return {
    success: true,
    data: data as Booking,
  };
}

/**
 * Marks a booking as arrived (guest has walked in).
 *
 * Valid from: confirmed
 * Sets: status='arrived', arrived_at=now()
 *
 * @param bookingId - The booking's UUID
 * @returns ActionResult with updated booking or error
 */
export async function markArrived(
  bookingId: string
): Promise<ActionResult<Booking>> {
  const supabase = getSupabaseAdmin();

  // Fetch the current booking
  const booking = await getBookingById(bookingId);

  if (!booking) {
    return {
      success: false,
      error: 'Booking not found.',
      code: 'NOT_FOUND',
    };
  }

  // Validate state transition
  const targetStatus: BookingStatus = 'arrived';
  if (!canTransition(booking.status, targetStatus)) {
    return {
      success: false,
      error: `Cannot ${STATUS_ACTION_NAMES[targetStatus]} a booking that is ${booking.status.replace(/_/g, ' ')}.`,
      code: 'INVALID_TRANSITION',
    };
  }

  // Update the booking
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: targetStatus,
      arrived_at: now,
    })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error) {
    console.error('Error marking booking as arrived:', error);
    return {
      success: false,
      error: 'Failed to mark booking as arrived. Please try again.',
      code: 'UNKNOWN',
    };
  }

  // Revalidate paths
  revalidatePath('/admin/bookings');
  revalidatePath('/admin/sessions');

  return {
    success: true,
    data: data as Booking,
  };
}

/**
 * Marks a booking as no-show (guest never showed after grace period).
 *
 * Valid from: confirmed, arrived
 * Additional validation: booking time + grace period (15 min) must have passed
 * Sets: status='no_show', no_show_at=now()
 *
 * @param bookingId - The booking's UUID
 * @returns ActionResult with updated booking or error
 */
export async function markNoShow(
  bookingId: string
): Promise<ActionResult<Booking>> {
  const supabase = getSupabaseAdmin();

  // Fetch the current booking
  const booking = await getBookingById(bookingId);

  if (!booking) {
    return {
      success: false,
      error: 'Booking not found.',
      code: 'NOT_FOUND',
    };
  }

  // Validate state transition
  const targetStatus: BookingStatus = 'no_show';
  if (!canTransition(booking.status, targetStatus)) {
    return {
      success: false,
      error: `Cannot ${STATUS_ACTION_NAMES[targetStatus]} a booking that is ${booking.status.replace(/_/g, ' ')}.`,
      code: 'INVALID_TRANSITION',
    };
  }

  // Check if grace period has passed
  const now = new Date();
  const bookingDateStr = booking.booking_date;
  const bookingTimeStr = booking.start_time;

  // Parse the booking date and time
  const [year, month, day] = bookingDateStr.split('-').map(Number);
  const timeParts = bookingTimeStr.split(':').map(Number);
  const hours = timeParts[0];
  const minutes = timeParts[1];

  const bookingDateTime = new Date(year, month - 1, day, hours, minutes);
  const graceDeadline = new Date(bookingDateTime.getTime() + NO_SHOW_GRACE_PERIOD_MINUTES * 60 * 1000);

  if (now < graceDeadline) {
    const minutesRemaining = Math.ceil((graceDeadline.getTime() - now.getTime()) / (60 * 1000));
    return {
      success: false,
      error: `Cannot mark as no-show until ${NO_SHOW_GRACE_PERIOD_MINUTES} minutes after booking time. ${minutesRemaining} minute(s) remaining.`,
      code: 'TOO_EARLY',
    };
  }

  // Update the booking
  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: targetStatus,
      no_show_at: now.toISOString(),
    })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error) {
    console.error('Error marking booking as no-show:', error);
    return {
      success: false,
      error: 'Failed to mark booking as no-show. Please try again.',
      code: 'UNKNOWN',
    };
  }

  // Revalidate paths
  revalidatePath('/admin/bookings');
  revalidatePath('/admin/sessions');

  return {
    success: true,
    data: data as Booking,
  };
}

/**
 * Updates a booking with partial updates.
 * Only provided fields are updated.
 *
 * Valid from: pending, confirmed
 * If time/date/table changed: re-validates availability
 * If party_size changed: re-validates table capacity
 *
 * @param bookingId - The booking's UUID
 * @param updates - Partial update parameters
 * @returns ActionResult with updated booking or error
 */
export async function updateBooking(
  bookingId: string,
  updates: UpdateBookingActionParams
): Promise<ActionResult<Booking>> {
  const supabase = getSupabaseAdmin();

  // Fetch the current booking
  const booking = await getBookingById(bookingId);

  if (!booking) {
    return {
      success: false,
      error: 'Booking not found.',
      code: 'NOT_FOUND',
    };
  }

  // Validate that booking can be updated (only pending or confirmed)
  const editableStatuses: BookingStatus[] = ['pending', 'confirmed'];
  if (!editableStatuses.includes(booking.status)) {
    return {
      success: false,
      error: `Cannot update a booking that is ${booking.status.replace(/_/g, ' ')}. Only pending and confirmed bookings can be modified.`,
      code: 'INVALID_TRANSITION',
    };
  }

  // Build the update object
  const dbUpdates: Record<string, unknown> = {};

  // Guest info updates (no re-validation needed)
  if (updates.guest_name !== undefined) {
    if (!updates.guest_name.trim()) {
      return {
        success: false,
        error: 'Guest name is required.',
        code: 'VALIDATION',
      };
    }
    dbUpdates.guest_name = updates.guest_name.trim();
  }

  if (updates.guest_email !== undefined) {
    if (updates.guest_email && !isValidEmail(updates.guest_email)) {
      return {
        success: false,
        error: 'Invalid email address format.',
        code: 'VALIDATION',
      };
    }
    dbUpdates.guest_email = updates.guest_email?.trim() || null;
  }

  if (updates.guest_phone !== undefined) {
    if (updates.guest_phone && !isValidPhone(updates.guest_phone)) {
      return {
        success: false,
        error: 'Invalid phone number format.',
        code: 'VALIDATION',
      };
    }
    dbUpdates.guest_phone = updates.guest_phone?.trim() || null;
  }

  if (updates.notes !== undefined) {
    dbUpdates.notes = updates.notes?.trim() || null;
  }

  if (updates.game_id !== undefined) {
    dbUpdates.game_id = updates.game_id;
  }

  // Determine if we need to re-validate availability
  const hasTimeChange = updates.booking_date !== undefined ||
                        updates.start_time !== undefined ||
                        updates.duration_minutes !== undefined;
  const hasTableChange = updates.table_id !== undefined;
  const hasPartySizeChange = updates.party_size !== undefined;

  // Calculate new values for availability check
  const newBookingDate = updates.booking_date ?? booking.booking_date;
  const newStartTime = updates.start_time ?? normalizeTime(booking.start_time);

  // Calculate new end time
  let newEndTime: string;
  if (updates.duration_minutes !== undefined) {
    newEndTime = addMinutesToTime(newStartTime, updates.duration_minutes);
    dbUpdates.start_time = newStartTime;
    dbUpdates.end_time = newEndTime;
  } else if (updates.start_time !== undefined) {
    // Start time changed but not duration - keep same duration
    const currentDuration = timeToMinutes(normalizeTime(booking.end_time)) - timeToMinutes(normalizeTime(booking.start_time));
    newEndTime = addMinutesToTime(newStartTime, currentDuration);
    dbUpdates.start_time = newStartTime;
    dbUpdates.end_time = newEndTime;
  } else {
    newEndTime = normalizeTime(booking.end_time);
  }

  if (updates.booking_date !== undefined) {
    dbUpdates.booking_date = updates.booking_date;
  }

  const newTableId = updates.table_id ?? booking.table_id;
  const newPartySize = updates.party_size ?? booking.party_size;

  if (updates.party_size !== undefined) {
    if (!Number.isInteger(updates.party_size) || updates.party_size <= 0) {
      return {
        success: false,
        error: 'Party size must be a positive whole number.',
        code: 'VALIDATION',
      };
    }
    dbUpdates.party_size = updates.party_size;
  }

  if (updates.table_id !== undefined) {
    dbUpdates.table_id = updates.table_id;
  }

  // Re-validate table capacity if party size or table changed
  if ((hasPartySizeChange || hasTableChange) && newTableId) {
    const { data: table, error: tableError } = await supabase
      .from('venue_tables')
      .select('id, capacity, is_active')
      .eq('id', newTableId)
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

    if (table.capacity !== null && newPartySize > table.capacity) {
      return {
        success: false,
        error: `This table can accommodate up to ${table.capacity} guests. Please choose a larger table or reduce your party size.`,
        code: 'CAPACITY',
      };
    }
  }

  // Re-validate availability if time/date/table changed
  if ((hasTimeChange || hasTableChange) && newTableId) {
    const availabilityResult = await checkTableAvailability({
      tableId: newTableId,
      date: newBookingDate,
      startTime: newStartTime,
      endTime: newEndTime,
      excludeBookingId: bookingId, // Exclude current booking from conflict check
    });

    if (!availabilityResult.available) {
      return {
        success: false,
        error: 'The new time conflicts with another booking. Please choose a different time slot.',
        code: 'CONFLICT',
      };
    }
  }

  // Re-validate game availability if time/date changed and game is set
  const effectiveGameId = updates.game_id !== undefined ? updates.game_id : booking.game_id;
  if (hasTimeChange && effectiveGameId) {
    const gameAvailability = await checkGameAvailability({
      gameId: effectiveGameId,
      date: newBookingDate,
      startTime: newStartTime,
      endTime: newEndTime,
    });

    // Note: This doesn't exclude the current booking, so if the game was already
    // reserved for this booking, it will count against availability.
    // A more sophisticated check would exclude the current booking's game reservation.
    // For now, we allow updates if at least one copy is available.
    if (!gameAvailability.available) {
      const { data: game } = await supabase
        .from('games')
        .select('title')
        .eq('id', effectiveGameId)
        .single();

      return {
        success: false,
        error: `All copies of "${game?.title ?? 'the selected game'}" are reserved for this time slot.`,
        code: 'CONFLICT',
      };
    }
  }

  // Check that we have at least one update
  if (Object.keys(dbUpdates).length === 0) {
    return {
      success: false,
      error: 'No valid updates provided.',
      code: 'VALIDATION',
    };
  }

  // Perform the update
  const { data, error } = await supabase
    .from('bookings')
    .update(dbUpdates)
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating booking:', error);
    return {
      success: false,
      error: 'Failed to update booking. Please try again.',
      code: 'UNKNOWN',
    };
  }

  // Revalidate paths
  revalidatePath('/admin/bookings');
  revalidatePath('/admin/sessions');

  return {
    success: true,
    data: data as Booking,
  };
}

// -----------------------------------------------------------------------------
// Seat Party Action (Bridge Reservations to Sessions)
// -----------------------------------------------------------------------------

/**
 * Result type for the seatParty action.
 * Contains both the updated booking and the created session.
 */
export interface SeatPartyResult {
  booking: Booking;
  session: Session;
  warning?: string;
}

/**
 * Early seating threshold in minutes.
 * If booking starts more than this many minutes in the future, a warning is included.
 */
const EARLY_SEATING_THRESHOLD_MINUTES = 15;

/**
 * Seats a party by bridging a booking to a live session.
 * This is the core "one-click" action that:
 * 1. Marks the guest as seated
 * 2. Creates a new Session on that table
 * 3. Links the booking to the session
 * 4. Optionally pre-loads the reserved game
 *
 * Valid from: 'confirmed' or 'arrived'
 * Sets: status='seated', seated_at=now(), session_id=new session ID
 * If was 'confirmed', also sets arrived_at=now()
 *
 * Edge cases handled:
 * - If table has active session: Ends it first
 * - If booking is for future time (>15 min away): Allows with warning
 *
 * @param bookingId - The booking's UUID
 * @returns ActionResult with SeatPartyResult (booking + session) or error
 */
export async function seatParty(
  bookingId: string
): Promise<ActionResult<SeatPartyResult>> {
  const supabase = getSupabaseAdmin();

  // --- Step 1: Fetch the booking with table and game info ---
  const booking = await getBookingById(bookingId);

  if (!booking) {
    return {
      success: false,
      error: 'Booking not found.',
      code: 'NOT_FOUND',
    };
  }

  // --- Step 2: Validate state transition ---
  // seatParty can transition from 'confirmed' or 'arrived' to 'seated'
  const targetStatus: BookingStatus = 'seated';
  if (!canTransition(booking.status, targetStatus)) {
    // Provide specific error messages for common cases
    if (booking.status === 'seated') {
      return {
        success: false,
        error: 'This booking has already been seated.',
        code: 'INVALID_TRANSITION',
      };
    }
    if (booking.status === 'completed') {
      return {
        success: false,
        error: 'This booking has already been completed.',
        code: 'INVALID_TRANSITION',
      };
    }
    if (booking.status === 'pending') {
      return {
        success: false,
        error: 'This booking must be confirmed before seating. Please confirm the booking first.',
        code: 'INVALID_TRANSITION',
      };
    }
    return {
      success: false,
      error: `Cannot ${STATUS_ACTION_NAMES[targetStatus]} a booking that is ${booking.status.replace(/_/g, ' ')}.`,
      code: 'INVALID_TRANSITION',
    };
  }

  // --- Step 3: Validate table exists and is active ---
  if (!booking.table_id) {
    return {
      success: false,
      error: 'This booking has no table assigned. Please assign a table before seating.',
      code: 'VALIDATION',
    };
  }

  const { data: table, error: tableError } = await supabase
    .from('venue_tables')
    .select('id, venue_id, label, is_active')
    .eq('id', booking.table_id)
    .single();

  if (tableError || !table) {
    return {
      success: false,
      error: 'The assigned table was not found.',
      code: 'NOT_FOUND',
    };
  }

  if (!table.is_active) {
    return {
      success: false,
      error: `Table "${table.label}" is not currently active. Please assign a different table.`,
      code: 'VALIDATION',
    };
  }

  // --- Step 4: Check for early seating and generate warning ---
  let warning: string | undefined;
  const now = new Date();
  const bookingDateStr = booking.booking_date;
  const bookingTimeStr = booking.start_time;

  // Parse the booking date and time
  const [year, month, day] = bookingDateStr.split('-').map(Number);
  const timeParts = bookingTimeStr.split(':').map(Number);
  const hours = timeParts[0];
  const minutes = timeParts[1];

  const bookingDateTime = new Date(year, month - 1, day, hours, minutes);
  const minutesUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (60 * 1000);

  if (minutesUntilBooking > EARLY_SEATING_THRESHOLD_MINUTES) {
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    warning = `Early seating: This booking is scheduled for ${formattedTime} (${Math.round(minutesUntilBooking)} minutes from now).`;
  }

  // --- Step 5: Handle existing active session on table ---
  // End any active sessions to make room for this booking
  const endedCount = await endAllActiveSessionsForTable(booking.table_id);
  if (endedCount > 0) {
    console.log(`[seatParty] Ended ${endedCount} active session(s) on table ${booking.table_id} for booking ${bookingId}`);
  }

  // --- Step 6: Create new session ---
  // Insert session directly since we have venue_id from booking
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      venue_id: booking.venue_id,
      table_id: booking.table_id,
      game_id: booking.game_id ?? null,
    })
    .select('*')
    .single();

  if (sessionError || !session) {
    console.error('Error creating session for seatParty:', sessionError);
    return {
      success: false,
      error: 'Failed to create session. Please try again.',
      code: 'UNKNOWN',
    };
  }

  // --- Step 7: Update booking ---
  const updatePayload: Record<string, unknown> = {
    status: targetStatus,
    seated_at: now.toISOString(),
    session_id: session.id,
  };

  // If transitioning from 'confirmed', also set arrived_at
  if (booking.status === 'confirmed') {
    updatePayload.arrived_at = now.toISOString();
  }

  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', bookingId)
    .select('*')
    .single();

  if (updateError || !updatedBooking) {
    // Attempt to clean up the session we just created
    console.error('Error updating booking for seatParty:', updateError);
    await supabase
      .from('sessions')
      .update({ ended_at: now.toISOString() })
      .eq('id', session.id);

    return {
      success: false,
      error: 'Failed to update booking. Please try again.',
      code: 'UNKNOWN',
    };
  }

  // --- Step 8: Revalidate paths ---
  revalidatePath('/admin/bookings');
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/floorplan');
  revalidatePath('/admin/sessions');

  // --- Success! ---
  const result: SeatPartyResult = {
    booking: updatedBooking as Booking,
    session: session as Session,
  };

  if (warning) {
    result.warning = warning;
  }

  return {
    success: true,
    data: result,
  };
}

// -----------------------------------------------------------------------------
// Complete Booking Action
// -----------------------------------------------------------------------------

/**
 * Completes a booking after the session ends.
 * Can be triggered when a session ends, or manually by staff.
 *
 * Valid from: 'seated'
 * Sets: status='completed', completed_at=now()
 *
 * @param bookingId - The booking's UUID
 * @returns ActionResult with updated booking or error
 */
export async function completeBooking(
  bookingId: string
): Promise<ActionResult<Booking>> {
  const supabase = getSupabaseAdmin();

  // Fetch the current booking
  const booking = await getBookingById(bookingId);

  if (!booking) {
    return {
      success: false,
      error: 'Booking not found.',
      code: 'NOT_FOUND',
    };
  }

  // Validate state transition
  const targetStatus: BookingStatus = 'completed';
  if (!canTransition(booking.status, targetStatus)) {
    if (booking.status === 'completed') {
      return {
        success: false,
        error: 'This booking has already been completed.',
        code: 'INVALID_TRANSITION',
      };
    }
    return {
      success: false,
      error: `Cannot ${STATUS_ACTION_NAMES[targetStatus]} a booking that is ${booking.status.replace(/_/g, ' ')}.`,
      code: 'INVALID_TRANSITION',
    };
  }

  // Update the booking
  const nowStr = new Date().toISOString();
  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: targetStatus,
      completed_at: nowStr,
    })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error) {
    console.error('Error completing booking:', error);
    return {
      success: false,
      error: 'Failed to complete booking. Please try again.',
      code: 'UNKNOWN',
    };
  }

  // Revalidate paths
  revalidatePath('/admin/bookings');
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/sessions');

  return {
    success: true,
    data: data as Booking,
  };
}

// -----------------------------------------------------------------------------
// End Session and Complete Booking Integration
// -----------------------------------------------------------------------------

/**
 * Result type for the endSessionAndCompleteBooking action.
 */
export interface EndSessionAndCompleteBookingResult {
  session: Session;
  booking: Booking | null;
}

/**
 * Ends a session and automatically completes any associated booking.
 * This provides a clean integration hook for when a session ends.
 *
 * Steps:
 * 1. End the session (set ended_at)
 * 2. Find booking with this session_id
 * 3. If found and status is 'seated', mark as completed
 *
 * @param sessionId - The session's UUID
 * @returns ActionResult with session and optional booking, or error
 */
export async function endSessionAndCompleteBooking(
  sessionId: string
): Promise<ActionResult<EndSessionAndCompleteBookingResult>> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // --- Step 1: End the session ---
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .update({ ended_at: now })
    .eq('id', sessionId)
    .is('ended_at', null) // Only update if not already ended
    .select('*')
    .single();

  if (sessionError) {
    // Check if session was already ended or doesn't exist
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('id, ended_at')
      .eq('id', sessionId)
      .single();

    if (!existingSession) {
      return {
        success: false,
        error: 'Session not found.',
        code: 'NOT_FOUND',
      };
    }

    if (existingSession.ended_at) {
      return {
        success: false,
        error: 'Session has already ended.',
        code: 'INVALID_TRANSITION',
      };
    }

    console.error('Error ending session:', sessionError);
    return {
      success: false,
      error: 'Failed to end session. Please try again.',
      code: 'UNKNOWN',
    };
  }

  // --- Step 2: Find booking associated with this session ---
  const { data: bookings, error: bookingQueryError } = await supabase
    .from('bookings')
    .select('*')
    .eq('session_id', sessionId)
    .limit(1);

  if (bookingQueryError) {
    console.error('Error finding booking for session:', bookingQueryError);
    // Session was ended, so return success but note we couldn't find booking
    return {
      success: true,
      data: {
        session: session as Session,
        booking: null,
      },
    };
  }

  let updatedBooking: Booking | null = null;

  // --- Step 3: Complete booking if found and in 'seated' status ---
  if (bookings && bookings.length > 0) {
    const booking = bookings[0];

    if (booking.status === 'seated') {
      const { data: completedBooking, error: completeError } = await supabase
        .from('bookings')
        .update({
          status: 'completed',
          completed_at: now,
        })
        .eq('id', booking.id)
        .select('*')
        .single();

      if (completeError) {
        console.error('Error completing booking after session end:', completeError);
        // Session was ended, so still return success
      } else {
        updatedBooking = completedBooking as Booking;
      }
    } else {
      // Booking exists but is not in 'seated' status - just return it as-is
      updatedBooking = booking as Booking;
    }
  }

  // --- Step 4: Revalidate paths ---
  revalidatePath('/admin/bookings');
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/floorplan');
  revalidatePath('/admin/sessions');

  return {
    success: true,
    data: {
      session: session as Session,
      booking: updatedBooking,
    },
  };
}

// -----------------------------------------------------------------------------
// Fetch Games for Booking Modal
// -----------------------------------------------------------------------------

/**
 * Fetches available games for a venue (for the booking modal game selector).
 * Only returns games that are in_rotation status.
 *
 * @param venueId - The venue's UUID
 * @returns ActionResult with array of games or error
 */
export async function getGamesForBooking(
  venueId: string
): Promise<ActionResult<Array<{ id: string; title: string; min_players: number; max_players: number }>>> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('games')
    .select('id, title, min_players, max_players')
    .eq('venue_id', venueId)
    .eq('status', 'in_rotation')
    .order('title', { ascending: true });

  if (error) {
    console.error('Error fetching games for booking:', error);
    return {
      success: false,
      error: 'Failed to load games',
      code: 'UNKNOWN',
    };
  }

  return {
    success: true,
    data: data ?? [],
  };
}

// -----------------------------------------------------------------------------
// Check Table Availability for Booking Modal
// -----------------------------------------------------------------------------

/**
 * Checks available tables for a booking (for the booking modal).
 * This is a server action wrapper around the data layer function.
 *
 * @param params - Availability check parameters
 * @returns ActionResult with array of available tables or error
 */
export async function checkAvailableTablesAction(
  params: {
    venueId: string;
    date: string;
    startTime: string;
    endTime: string;
    partySize: number;
  }
): Promise<ActionResult<Array<{
  table_id: string;
  table_label: string;
  capacity: number | null;
  is_exact_fit: boolean;
  is_tight_fit: boolean;
}>>> {
  try {
    const { getAvailableTables } = await import('@/lib/data/bookings');

    const tables = await getAvailableTables({
      venueId: params.venueId,
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
      partySize: params.partySize,
    });

    return {
      success: true,
      data: tables,
    };
  } catch (error) {
    console.error('Error checking table availability:', error);
    return {
      success: false,
      error: 'Failed to check availability',
      code: 'UNKNOWN',
    };
  }
}

// -----------------------------------------------------------------------------
// Get All Time Slots with Availability Status
// -----------------------------------------------------------------------------

/**
 * Time slot with availability status for public booking flow.
 */
export interface TimeSlotWithAvailability {
  start_time: string;
  end_time: string;
  status: 'available' | 'limited' | 'unavailable';
  available_tables: number;
  total_tables: number;
  tables: Array<{
    table_id: string;
    table_label: string;
    capacity: number | null;
  }>;
}

/**
 * Gets all time slots for a date with their availability status.
 * This allows the UI to show unavailable slots as disabled and limited slots with urgency indicators.
 *
 * @param params - Slot availability parameters
 * @returns ActionResult with array of time slots including availability status
 */
export async function getTimeSlotsWithAvailabilityAction(
  params: {
    venueId: string;
    date: string;
    partySize: number;
    durationMinutes: number;
    limitedThreshold?: number; // Default: 2 - show "limited" when this many or fewer tables remain
  }
): Promise<ActionResult<TimeSlotWithAvailability[]>> {
  try {
    const { getAvailableTables, getTotalTablesForPartySize } = await import('@/lib/data/bookings');
    const { DEFAULT_SLOT_INTERVAL_MINUTES } = await import('@/lib/data/bookings');

    const limitedThreshold = params.limitedThreshold ?? 2;

    // Get total number of tables that can fit the party size
    const totalTables = await getTotalTablesForPartySize(params.venueId, params.partySize);

    // Generate all possible time slots for the day
    const slots: TimeSlotWithAvailability[] = [];
    const startMinutes = 10 * 60; // 10:00 AM
    const endMinutes = 22 * 60; // 10:00 PM

    for (let minutes = startMinutes; minutes < endMinutes; minutes += DEFAULT_SLOT_INTERVAL_MINUTES) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const startTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

      // Calculate end time
      const endTotalMinutes = minutes + params.durationMinutes;
      const endHours = Math.floor(endTotalMinutes / 60) % 24;
      const endMins = endTotalMinutes % 60;
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

      // Check availability for this slot
      const tables = await getAvailableTables({
        venueId: params.venueId,
        date: params.date,
        startTime,
        endTime,
        partySize: params.partySize,
      });

      const availableCount = tables.length;

      // Determine status
      let status: 'available' | 'limited' | 'unavailable';
      if (availableCount === 0) {
        status = 'unavailable';
      } else if (availableCount <= limitedThreshold) {
        status = 'limited';
      } else {
        status = 'available';
      }

      slots.push({
        start_time: startTime,
        end_time: endTime,
        status,
        available_tables: availableCount,
        total_tables: totalTables,
        tables: tables.map(t => ({
          table_id: t.table_id,
          table_label: t.table_label,
          capacity: t.capacity,
        })),
      });
    }

    return {
      success: true,
      data: slots,
    };
  } catch (error) {
    console.error('Error getting time slots with availability:', error);
    return {
      success: false,
      error: 'Failed to load availability',
      code: 'UNKNOWN',
    };
  }
}

// -----------------------------------------------------------------------------
// Venue Booking Settings Actions
// -----------------------------------------------------------------------------

/**
 * Parameters for updating venue booking settings.
 */
export interface UpdateVenueBookingSettingsParams {
  bookings_enabled?: boolean;
  buffer_minutes?: number;
  default_duration_minutes?: number;
  min_advance_hours?: number;
  max_advance_days?: number;
  no_show_grace_minutes?: number;
  deposit_required?: boolean;
  deposit_amount_cents?: number;
  send_confirmation_email?: boolean;
  send_reminder_sms?: boolean;
  reminder_hours_before?: number;
  booking_page_message?: string | null;
  // Venue address fields
  venue_address_street?: string | null;
  venue_address_city?: string | null;
  venue_address_state?: string | null;
  venue_address_postal_code?: string | null;
  venue_address_country?: string | null;
}

/**
 * Updates booking settings for a venue.
 * Only provided fields are updated; unspecified fields remain unchanged.
 *
 * @param venueId - The venue's UUID
 * @param updates - Partial settings to update
 * @returns ActionResult with updated settings or error
 */
export async function updateVenueBookingSettingsAction(
  venueId: string,
  updates: UpdateVenueBookingSettingsParams
): Promise<ActionResult<{ updated: true }>> {
  // --- Step 1: Verify user is authenticated and owns the venue ---
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: 'You must be logged in to update settings.',
      code: 'UNAUTHORIZED',
    };
  }

  // Verify the venue belongs to this user
  const supabase = getSupabaseAdmin();
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, owner_id')
    .eq('id', venueId)
    .single();

  if (venueError || !venue) {
    return {
      success: false,
      error: 'Venue not found.',
      code: 'NOT_FOUND',
    };
  }

  if (venue.owner_id !== user.id) {
    return {
      success: false,
      error: 'You do not have permission to update this venue.',
      code: 'UNAUTHORIZED',
    };
  }

  // --- Step 2: Validate the update parameters ---
  if (updates.default_duration_minutes !== undefined) {
    if (!Number.isInteger(updates.default_duration_minutes) || updates.default_duration_minutes <= 0) {
      return {
        success: false,
        error: 'Default duration must be a positive number.',
        code: 'VALIDATION',
      };
    }
  }

  if (updates.min_advance_hours !== undefined) {
    if (!Number.isInteger(updates.min_advance_hours) || updates.min_advance_hours < 0) {
      return {
        success: false,
        error: 'Minimum notice hours must be 0 or greater.',
        code: 'VALIDATION',
      };
    }
  }

  if (updates.max_advance_days !== undefined) {
    if (!Number.isInteger(updates.max_advance_days) || updates.max_advance_days <= 0) {
      return {
        success: false,
        error: 'Maximum advance days must be a positive number.',
        code: 'VALIDATION',
      };
    }
  }

  if (updates.buffer_minutes !== undefined) {
    if (!Number.isInteger(updates.buffer_minutes) || updates.buffer_minutes < 0) {
      return {
        success: false,
        error: 'Buffer minutes must be 0 or greater.',
        code: 'VALIDATION',
      };
    }
  }

  if (updates.no_show_grace_minutes !== undefined) {
    if (!Number.isInteger(updates.no_show_grace_minutes) || updates.no_show_grace_minutes < 0) {
      return {
        success: false,
        error: 'No-show grace minutes must be 0 or greater.',
        code: 'VALIDATION',
      };
    }
  }

  if (updates.reminder_hours_before !== undefined) {
    if (!Number.isInteger(updates.reminder_hours_before) || updates.reminder_hours_before < 0) {
      return {
        success: false,
        error: 'Reminder hours must be 0 or greater.',
        code: 'VALIDATION',
      };
    }
  }

  if (updates.deposit_amount_cents !== undefined) {
    if (!Number.isInteger(updates.deposit_amount_cents) || updates.deposit_amount_cents < 0) {
      return {
        success: false,
        error: 'Deposit amount must be 0 or greater.',
        code: 'VALIDATION',
      };
    }
  }

  // --- Step 3: Update the settings ---
  const { updateVenueBookingSettings } = await import('@/lib/data/bookings');

  const result = await updateVenueBookingSettings(venueId, updates);

  if (!result) {
    return {
      success: false,
      error: 'Failed to update booking settings. Please try again.',
      code: 'UNKNOWN',
    };
  }

  // --- Step 4: Revalidate paths ---
  revalidatePath('/admin/settings/bookings');
  revalidatePath('/admin/bookings');

  return {
    success: true,
    data: { updated: true },
  };
}

// -----------------------------------------------------------------------------
// Venue Operating Hours Actions
// -----------------------------------------------------------------------------

/**
 * Parameters for updating venue operating hours.
 */
export interface OperatingHoursInput {
  day_of_week: number; // 0-6, Sunday = 0
  is_closed: boolean;
  open_time: string | null; // HH:MM:SS format
  close_time: string | null; // HH:MM:SS format
}

/**
 * Updates operating hours for a venue.
 * Replaces all existing operating hours with the new values.
 *
 * @param venueId - The venue's UUID
 * @param hours - Array of operating hours for each day of the week
 * @returns ActionResult with success or error
 */
export async function updateVenueOperatingHoursAction(
  venueId: string,
  hours: OperatingHoursInput[]
): Promise<ActionResult<{ updated: true }>> {
  // --- Step 1: Verify user is authenticated and owns the venue ---
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: 'You must be logged in to update operating hours.',
      code: 'UNAUTHORIZED',
    };
  }

  // Verify the venue belongs to this user
  const supabase = getSupabaseAdmin();
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, owner_id')
    .eq('id', venueId)
    .single();

  if (venueError || !venue) {
    return {
      success: false,
      error: 'Venue not found.',
      code: 'NOT_FOUND',
    };
  }

  if (venue.owner_id !== user.id) {
    return {
      success: false,
      error: 'You do not have permission to update this venue.',
      code: 'UNAUTHORIZED',
    };
  }

  // --- Step 2: Validate the operating hours ---
  if (!Array.isArray(hours) || hours.length === 0) {
    return {
      success: false,
      error: 'Operating hours must be provided.',
      code: 'VALIDATION',
    };
  }

  // Validate each day's hours
  for (const day of hours) {
    if (day.day_of_week < 0 || day.day_of_week > 6) {
      return {
        success: false,
        error: 'Invalid day of week. Must be 0-6 (Sunday-Saturday).',
        code: 'VALIDATION',
      };
    }

    if (!day.is_closed) {
      if (!day.open_time || !day.close_time) {
        return {
          success: false,
          error: 'Open and close times are required for open days.',
          code: 'VALIDATION',
        };
      }

      // Basic time format validation (HH:MM:SS or HH:MM)
      const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
      if (!timeRegex.test(day.open_time) || !timeRegex.test(day.close_time)) {
        return {
          success: false,
          error: 'Invalid time format. Use HH:MM or HH:MM:SS.',
          code: 'VALIDATION',
        };
      }
    }
  }

  // --- Step 3: Update the operating hours ---
  const { upsertVenueOperatingHours } = await import('@/lib/data/bookings');

  try {
    await upsertVenueOperatingHours(venueId, hours);
  } catch (error) {
    console.error('Error updating operating hours:', error);
    return {
      success: false,
      error: 'Failed to update operating hours. Please try again.',
      code: 'UNKNOWN',
    };
  }

  // --- Step 4: Revalidate paths ---
  revalidatePath('/admin/bookings');
  revalidatePath('/admin/settings/bookings');

  return {
    success: true,
    data: { updated: true },
  };
}

// -----------------------------------------------------------------------------
// Check Bookings Outside Operating Hours (Conflict Detection)
// -----------------------------------------------------------------------------

/**
 * Booking conflict information for operating hours changes.
 */
export interface OperatingHoursConflict {
  id: string;
  guest_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  table_label: string;
  conflict_reason: string;
}

/**
 * Checks for existing bookings that would fall outside proposed operating hours.
 * This helps warn venue owners before they change hours in a way that affects
 * existing reservations.
 *
 * @param venueId - The venue's UUID
 * @param proposedHours - The proposed new operating hours
 * @returns ActionResult with array of conflicting bookings or error
 */
export async function checkBookingsOutsideHoursAction(
  venueId: string,
  proposedHours: OperatingHoursInput[]
): Promise<ActionResult<OperatingHoursConflict[]>> {
  // --- Step 1: Verify user is authenticated ---
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: 'You must be logged in.',
      code: 'UNAUTHORIZED',
    };
  }

  const supabase = getSupabaseAdmin();

  // --- Step 2: Fetch upcoming bookings for this venue ---
  // Only check confirmed/pending bookings in the future
  const today = new Date().toISOString().split('T')[0];

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      guest_name,
      booking_date,
      start_time,
      end_time,
      venue_tables:table_id (label)
    `)
    .eq('venue_id', venueId)
    .gte('booking_date', today)
    .in('status', ['pending', 'confirmed'])
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (bookingsError) {
    console.error('Error fetching bookings for conflict check:', bookingsError);
    return {
      success: false,
      error: 'Failed to check for conflicts.',
      code: 'UNKNOWN',
    };
  }

  if (!bookings || bookings.length === 0) {
    return {
      success: true,
      data: [],
    };
  }

  // --- Step 3: Build hours lookup by day of week ---
  const hoursByDay = new Map<number, OperatingHoursInput>();
  for (const h of proposedHours) {
    hoursByDay.set(h.day_of_week, h);
  }

  // --- Step 4: Check each booking against proposed hours ---
  const conflicts: OperatingHoursConflict[] = [];

  for (const booking of bookings) {
    const bookingDate = new Date(booking.booking_date + 'T00:00:00');
    const dayOfWeek = bookingDate.getDay(); // 0 = Sunday
    const dayHours = hoursByDay.get(dayOfWeek);

    // Handle table label from join
    const tableData = booking.venue_tables as unknown;
    let tableLabel = 'Unknown table';
    if (Array.isArray(tableData) && tableData.length > 0) {
      tableLabel = (tableData[0] as { label: string }).label;
    } else if (tableData && typeof tableData === 'object' && 'label' in tableData) {
      tableLabel = (tableData as { label: string }).label;
    }

    // Check if day is closed
    if (!dayHours || dayHours.is_closed) {
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
      conflicts.push({
        id: booking.id,
        guest_name: booking.guest_name,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        table_label: tableLabel,
        conflict_reason: `Falls on ${dayName}, which will be closed`,
      });
      continue;
    }

    // Check if booking times fall outside operating hours
    const bookingStart = booking.start_time.substring(0, 5); // HH:MM
    const bookingEnd = booking.end_time.substring(0, 5); // HH:MM
    const openTime = dayHours.open_time?.substring(0, 5) ?? '00:00';
    const closeTime = dayHours.close_time?.substring(0, 5) ?? '23:59';

    // Convert to comparable format
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const bookingStartMins = toMinutes(bookingStart);
    const bookingEndMins = toMinutes(bookingEnd);
    const openMins = toMinutes(openTime);
    const closeMins = toMinutes(closeTime);

    if (bookingStartMins < openMins) {
      conflicts.push({
        id: booking.id,
        guest_name: booking.guest_name,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        table_label: tableLabel,
        conflict_reason: `Starts at ${bookingStart}, before opening time ${openTime}`,
      });
    } else if (bookingEndMins > closeMins) {
      conflicts.push({
        id: booking.id,
        guest_name: booking.guest_name,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        table_label: tableLabel,
        conflict_reason: `Ends at ${bookingEnd}, after closing time ${closeTime}`,
      });
    }
  }

  return {
    success: true,
    data: conflicts,
  };
}

// -----------------------------------------------------------------------------
// Reservation Lookup (Self-Service)
// -----------------------------------------------------------------------------

/**
 * Parameters for looking up a reservation.
 */
export interface LookupReservationParams {
  venueId: string;
  confirmationCode: string;
  email: string;
}

/**
 * Result type for reservation lookup.
 */
export interface LookupReservationResult {
  bookingId: string;
}

// Simple in-memory rate limiting for lookup attempts
// In production, this should use Redis or similar
const lookupAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOOKUP_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Checks and updates rate limit for lookup attempts.
 * Returns true if the request should be rate limited.
 */
function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = lookupAttempts.get(key);

  if (!record || now > record.resetAt) {
    // No record or expired - create new window
    lookupAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= MAX_LOOKUP_ATTEMPTS) {
    return true;
  }

  // Increment count
  record.count++;
  return false;
}

/**
 * Looks up a reservation by confirmation code and email.
 * Used for self-service reservation management.
 *
 * Security measures:
 * - Rate limiting: Max 5 attempts per email per 15 minutes
 * - Generic error messages to prevent enumeration
 * - Case-insensitive email comparison
 *
 * @param params - Lookup parameters (venueId, confirmationCode, email)
 * @returns ActionResult with booking ID or error
 */
export async function lookupReservation(
  params: LookupReservationParams
): Promise<ActionResult<LookupReservationResult>> {
  const { venueId, confirmationCode, email } = params;

  // --- Step 1: Validate inputs ---
  if (!confirmationCode?.trim()) {
    return {
      success: false,
      error: 'Please enter your confirmation code.',
      code: 'VALIDATION',
    };
  }

  if (!email?.trim()) {
    return {
      success: false,
      error: 'Please enter your email address.',
      code: 'VALIDATION',
    };
  }

  // --- Step 2: Check rate limit ---
  const rateLimitKey = `${venueId}:${email.toLowerCase().trim()}`;
  if (isRateLimited(rateLimitKey)) {
    return {
      success: false,
      error: 'Too many lookup attempts. Please try again in 15 minutes.',
      code: 'VALIDATION',
    };
  }

  // --- Step 3: Look up the booking ---
  const supabase = getSupabaseAdmin();

  const { data: booking, error: lookupError } = await supabase
    .from('bookings')
    .select('id, guest_email')
    .eq('venue_id', venueId)
    .eq('confirmation_code', confirmationCode.trim().toUpperCase())
    .single();

  if (lookupError || !booking) {
    // Generic error message to prevent enumeration
    return {
      success: false,
      error: 'Reservation not found. Please check your confirmation code and email address.',
      code: 'NOT_FOUND',
    };
  }

  // --- Step 4: Verify email matches ---
  // Case-insensitive comparison
  if (!booking.guest_email || booking.guest_email.toLowerCase() !== email.toLowerCase().trim()) {
    // Same generic error message to prevent enumeration
    return {
      success: false,
      error: 'Reservation not found. Please check your confirmation code and email address.',
      code: 'NOT_FOUND',
    };
  }

  // --- Success ---
  return {
    success: true,
    data: {
      bookingId: booking.id,
    },
  };
}
