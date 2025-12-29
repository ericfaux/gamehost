/**
 * Canonical data-access layer for the gamehost application.
 *
 * This module provides the primary data access functions used by:
 * - QR table app (/v/[venueSlug]/t/[tableId])
 * - Host dashboard
 *
 * All functions use the server-side Supabase client with service role
 * privileges, bypassing RLS. These should only be used in server
 * components, API routes, and server actions.
 *
 * Usage:
 *   import { getVenueBySlug, getRecommendedGames } from '@/lib/data';
 */

// Venue queries
export { getVenueBySlug, getVenueByOwnerId, getVenueAndTableBySlugAndTableId } from './venues';

// Table queries
export { getVenueTables, getVenueTableById } from './tables';

// Game queries
export { getGameById, getGamesForVenue, getRecommendedGames } from './games';

// Session operations
export {
  createSession,
  updateSessionGame,
  getActiveSessionId,
  getActiveSession,
  endSession,
  type CreateSessionParams,
} from './sessions';

// Re-export types for convenience
export type {
  Venue,
  VenueTable,
  Game,
  Session,
  RecommendationParams,
  TimeBucket,
  ComplexityTolerance,
  GameComplexity,
  GameStatus,
  GameCondition,
} from '@/lib/db/types';
