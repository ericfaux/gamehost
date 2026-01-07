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
