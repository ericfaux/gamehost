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
