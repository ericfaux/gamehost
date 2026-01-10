/**
 * TypeScript types for the gamehost database schema.
 * These types reflect the existing Supabase tables in the public schema.
 */

// -----------------------------------------------------------------------------
// Enums (represented as string unions)
// -----------------------------------------------------------------------------

export type GameComplexity = 'simple' | 'medium' | 'complex';

export type GameStatus = 'in_rotation' | 'out_for_repair' | 'retired' | 'for_sale';

export type GameCondition = 'new' | 'good' | 'worn' | 'problematic';

export type FeedbackComplexity = 'too_simple' | 'just_right' | 'too_complex';

export type FeedbackReplay = 'definitely' | 'maybe' | 'no';

export type FeedbackSource = 'end_sheet' | 'staff_prompt' | 'timer_prompt';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'arrived'
  | 'seated'
  | 'completed'
  | 'no_show'
  | 'cancelled_by_guest'
  | 'cancelled_by_venue';

export type BookingSource = 'online' | 'phone' | 'walk_in';

export type BookingModificationType =
  | 'reschedule'
  | 'party_size'
  | 'table_change'
  | 'guest_info'
  | 'game_change'
  | 'notes'
  | 'general';

// -----------------------------------------------------------------------------
// Table Row Types
// -----------------------------------------------------------------------------

/**
 * Represents a row in the `venues` table.
 */
export interface Venue {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

/**
 * Represents a row in the `venue_tables` table.
 */
export interface VenueTable {
  id: string;
  venue_id: string;
  label: string;
  description: string | null;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Represents a row in the `games` table.
 */
export interface Game {
  id: string;
  venue_id: string;
  bgg_id: string | null;  // BGG's unique identifier for exact matching
  title: string;
  min_players: number;
  max_players: number;
  min_time_minutes: number;
  max_time_minutes: number;
  complexity: GameComplexity;
  vibes: string[];
  status: GameStatus;
  condition: GameCondition;
  shelf_location: string | null;
  pitch: string | null;
  setup_steps: string | null;
  rules_bullets: string | null;
  cover_image_url: string | null;
  bgg_rank: number | null;
  bgg_rating: number | null;
  copies_in_rotation: number;
  is_staff_pick: boolean;
  instructional_video_url: string | null;
  created_at: string;
}

/**
 * Represents a row in the `sessions` table.
 */
export interface Session {
  id: string;
  venue_id: string;
  table_id: string;
  game_id: string | null; // Null when session is in "browsing" state (check-in without game)
  started_at: string;
  wizard_params: unknown;
  created_at: string;
  // Session end marker (true session end)
  ended_at: string | null;
  // Game feedback fields
  feedback_rating: number | null;
  feedback_complexity: FeedbackComplexity | null;
  feedback_replay: FeedbackReplay | null;
  feedback_comment: string | null;
  feedback_submitted_at: string | null; // When feedback was submitted (not session end)
  // Venue feedback fields
  feedback_venue_rating: number | null;
  feedback_venue_comment: string | null;
  // Feedback metadata
  feedback_skipped: boolean;
  feedback_source: FeedbackSource | null;
}

/**
 * Represents a row in the `venue_booking_settings` table.
 * Venue-level configuration for the booking system.
 */
export interface VenueBookingSettings {
  id: string;
  venue_id: string;
  bookings_enabled: boolean;
  buffer_minutes: number;
  default_duration_minutes: number;
  min_advance_hours: number;
  max_advance_days: number;
  no_show_grace_minutes: number;
  deposit_required: boolean;
  deposit_amount_cents: number;
  send_confirmation_email: boolean;
  send_reminder_sms: boolean;
  reminder_hours_before: number;
  booking_page_message: string | null;
  // Venue timezone for accurate time calculations
  timezone: string;
  // Venue address fields for display on booking confirmations
  venue_address_street: string | null;
  venue_address_city: string | null;
  venue_address_state: string | null;
  venue_address_postal_code: string | null;
  venue_address_country: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Represents a row in the `bookings` table.
 * Reservation records with full lifecycle tracking.
 */
export interface Booking {
  id: string;
  venue_id: string;
  table_id: string | null;
  session_id: string | null;
  status: BookingStatus;
  source: BookingSource;
  booking_date: string; // YYYY-MM-DD format
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  party_size: number;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  notes: string | null;
  internal_notes: string | null;
  game_id: string | null;
  confirmation_code: string | null;
  confirmed_at: string | null;
  arrived_at: string | null;
  seated_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  no_show_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Represents a row in the `booking_modifications` table.
 * Tracks changes made to bookings for audit purposes.
 */
export interface BookingModification {
  id: string;
  booking_id: string;
  modification_type: BookingModificationType;
  modified_by: string | null;
  modified_by_role: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Wizard Params Type (for recommendation engine)
// -----------------------------------------------------------------------------

export type TimeBucket = '30-45' | '60-120' | '120+';

export type ComplexityTolerance = 'super_simple' | 'medium' | 'dont_mind_complex';

/**
 * Parameters for the game recommendation wizard.
 */
export interface RecommendationParams {
  venueId: string;
  playerCount: number;
  timeBucket: TimeBucket;
  complexityTolerance: ComplexityTolerance;
  vibes: string[];
}

// -----------------------------------------------------------------------------
// Venue Zones (Floor Plan)
// -----------------------------------------------------------------------------

/**
 * Represents a row in the `venue_zones` table.
 * Zones are spatial areas in a venue's floor plan (e.g., "Main", "Patio", "Booths").
 */
export interface VenueZone {
  id: string;
  venue_id: string;
  name: string;
  sort_order: number;
  background_image_url: string | null;
  canvas_width: number;
  canvas_height: number;
  is_active: boolean;
  created_at: string;
}

/**
 * Table shape for floor plan rendering.
 */
export type TableShape = 'rect' | 'round' | 'booth';

/**
 * Extended VenueTable with layout fields for floor plan positioning.
 */
export interface VenueTableWithLayout extends VenueTable {
  zone_id: string | null;
  layout_x: number | null;
  layout_y: number | null;
  layout_w: number | null;
  layout_h: number | null;
  rotation_deg: number;
  layout_shape: TableShape;
}

// -----------------------------------------------------------------------------
// Feedback History Types (for Feedback History Tile)
// -----------------------------------------------------------------------------

/** Row returned from feedback history query */
export interface FeedbackHistoryRow {
  id: string;                              // session id
  submittedAt: string;                     // feedback_submitted_at
  endedAt: string;                         // session ended_at
  startedAt: string;                       // session started_at
  // Related entities
  gameId: string | null;
  gameTitle: string | null;
  tableId: string | null;
  tableLabel: string | null;
  // Game feedback
  gameRating: number | null;               // 1, 3, or 5
  complexity: FeedbackComplexity | null;
  replay: FeedbackReplay | null;
  comment: string | null;
  // Venue feedback
  venueRating: number | null;              // 1, 3, or 5
  venueComment: string | null;
  // Meta
  source: FeedbackSource;
}

/** Aggregated stats for feedback summary header */
export interface FeedbackStats {
  totalResponses: number;
  avgGameRating: number | null;
  avgVenueRating: number | null;
  positiveCount: number;      // rating = 5
  neutralCount: number;       // rating = 3
  negativeCount: number;      // rating = 1
  commentCount: number;
  venueCommentCount: number;
}

/** Filter options for feedback queries */
export interface FeedbackFilters {
  dateRangePreset?: 'today' | '7d' | '30d' | '90d';
  startDate?: string;         // ISO string, overrides preset
  endDate?: string;           // ISO string, overrides preset
  sentiment?: 'positive' | 'neutral' | 'negative' | null;
  ratingType?: 'game' | 'venue' | 'all';
  hasComment?: boolean;
  source?: FeedbackSource | null;
  search?: string;            // searches comment text, game title, table label
}

/** Paginated result for feedback history */
export interface FeedbackHistoryResult {
  rows: FeedbackHistoryRow[];
  stats: FeedbackStats;
  nextCursor: string | null;  // ISO timestamp for cursor pagination
  totalCount: number;
}

// -----------------------------------------------------------------------------
// Booking Extended Types (for joins)
// -----------------------------------------------------------------------------

/**
 * Booking with venue_table relation.
 * Used when displaying booking with table info.
 */
export interface BookingWithTable extends Booking {
  venue_table: { id: string; label: string; capacity: number | null } | null;
}

/**
 * Booking with venue_table and game relations.
 * Used for detailed booking views.
 */
export interface BookingWithDetails extends Booking {
  venue_table: { id: string; label: string; capacity: number | null } | null;
  game: { id: string; title: string; cover_image_url: string | null } | null;
}

/**
 * Booking with session relation.
 * Used for seated bookings to access session data.
 */
export interface BookingWithSession extends Booking {
  session: Session | null;
}

// -----------------------------------------------------------------------------
// Booking API Input Types
// -----------------------------------------------------------------------------

/**
 * Parameters for creating a new booking.
 */
export interface CreateBookingParams {
  venue_id: string;
  table_id?: string;
  source: BookingSource;
  booking_date: string; // YYYY-MM-DD format
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  party_size: number;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  notes?: string;
  internal_notes?: string;
  game_id?: string;
}

/**
 * Parameters for updating an existing booking.
 * All fields optional for partial updates.
 */
export interface UpdateBookingParams {
  table_id?: string | null;
  status?: BookingStatus;
  booking_date?: string;
  start_time?: string;
  end_time?: string;
  party_size?: number;
  guest_name?: string;
  guest_email?: string | null;
  guest_phone?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  game_id?: string | null;
  cancellation_reason?: string;
}

/**
 * Parameters for checking slot availability.
 */
export interface AvailabilityQueryParams {
  venue_id: string;
  date: string; // YYYY-MM-DD format
  party_size: number;
  start_time?: string; // HH:MM:SS format, optional filter
  end_time?: string; // HH:MM:SS format, optional filter
  duration_minutes?: number;
  exclude_booking_id?: string; // Exclude when rescheduling
}

// -----------------------------------------------------------------------------
// Booking Response/Result Types
// -----------------------------------------------------------------------------

/**
 * Result from availability check: a table that can accommodate the booking.
 */
export interface AvailableTable {
  table_id: string;
  table_label: string;
  capacity: number | null;
  available_from: string; // HH:MM:SS format
  available_until: string; // HH:MM:SS format
}

/**
 * A time slot with available tables.
 */
export interface AvailableSlot {
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  tables: AvailableTable[];
}

/**
 * Represents a scheduling conflict for a booking.
 */
export interface BookingConflict {
  booking_id: string;
  table_id: string;
  table_label: string;
  guest_name: string;
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  conflict_type: 'overlap' | 'insufficient_buffer';
}

// -----------------------------------------------------------------------------
// Booking Timeline/UI Types
// -----------------------------------------------------------------------------

/**
 * Block type for timeline rendering.
 */
export type TimelineBlockType = 'booking' | 'session' | 'buffer';

/**
 * Represents a booking or session on the Gantt timeline view.
 */
export interface TimelineBlock {
  id: string;
  type: TimelineBlockType;
  table_id: string;
  table_label: string;
  start_time: string; // HH:MM:SS or ISO string
  end_time: string; // HH:MM:SS or ISO string
  // Booking-specific fields
  booking_id: string | null;
  booking_status: BookingStatus | null;
  guest_name: string | null;
  party_size: number | null;
  // Session-specific fields
  session_id: string | null;
  game_title: string | null;
}

/**
 * Risk level for turnover alerts.
 */
export type TurnoverRiskLevel = 'low' | 'medium' | 'high';

/**
 * Alert data for turnover/conflict detection.
 */
export interface TurnoverRisk {
  table_id: string;
  table_label: string;
  risk_level: TurnoverRiskLevel;
  current_booking_id: string | null;
  current_session_id: string | null;
  next_booking_id: string;
  current_end_time: string; // HH:MM:SS format
  next_start_time: string; // HH:MM:SS format
  gap_minutes: number;
  message: string;
}

/**
 * Data for the arrivals board display.
 */
export interface UpcomingArrival {
  booking_id: string;
  guest_name: string;
  party_size: number;
  booking_date: string; // YYYY-MM-DD format
  start_time: string; // HH:MM:SS format
  status: BookingStatus;
  table_id: string | null;
  table_label: string | null;
  game_id: string | null;
  game_title: string | null;
  notes: string | null;
  minutes_until_arrival: number;
}

// -----------------------------------------------------------------------------
// Waitlist Types
// -----------------------------------------------------------------------------

/**
 * Status for waitlist entries.
 */
export type WaitlistStatus = 'pending' | 'notified' | 'converted' | 'expired' | 'cancelled';

/**
 * Represents a row in the `booking_waitlist` table.
 * Guests can be added to the waitlist when no slots are available.
 */
export interface BookingWaitlistEntry {
  id: string;
  venue_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  party_size: number;
  requested_date: string; // YYYY-MM-DD format
  preferred_time_start: string | null; // HH:MM:SS format
  preferred_time_end: string | null; // HH:MM:SS format
  flexibility_minutes: number;
  notes: string | null;
  status: WaitlistStatus;
  notified_at: string | null;
  converted_booking_id: string | null;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Venue Operating Hours
// -----------------------------------------------------------------------------

/**
 * Represents a row in the `venue_operating_hours` table.
 * Defines when a venue is open for bookings on each day of the week.
 */
export interface VenueOperatingHours {
  id: string;
  venue_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  is_closed: boolean;
  open_time: string | null; // HH:MM:SS format
  close_time: string | null; // HH:MM:SS format
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// RPC Return Types (Conflict Engine)
// -----------------------------------------------------------------------------

/**
 * Return type from get_available_slots RPC.
 * Represents a single time slot with availability info.
 */
export interface AvailableSlotRPC {
  slot_start: string; // HH:MM:SS format
  slot_end: string; // HH:MM:SS format
  available_table_count: number;
  best_table_id: string | null;
  best_table_label: string | null;
}

/**
 * Return type from get_available_tables RPC.
 * Represents a table available for a specific time slot.
 */
export interface AvailableTableRPC {
  table_id: string;
  label: string;
  capacity: number | null;
  zone_id: string | null;
  is_exact_fit: boolean;
  is_tight_fit: boolean;
}

/**
 * Return type from check_booking_conflicts RPC.
 * Represents a conflict with an existing booking.
 */
export interface BookingConflictRPC {
  conflict_type: string;
  conflict_booking_id: string;
  conflict_guest_name: string;
  conflict_start_time: string; // HH:MM:SS format
  conflict_end_time: string; // HH:MM:SS format
  overlap_minutes: number;
}
