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

// Zone queries (floor plan)
export {
  getVenueZones,
  getZoneById,
  createZone,
  updateZone,
  deleteZone,
  saveVenueZones,
  getVenueTablesWithLayout,
  updateTableLayout,
  saveTableLayouts,
  uploadZoneBackground,
} from './zones';

// Game queries
export {
  getGameById,
  getGamesForVenue,
  searchGamesInVenue,
  getRecommendedGames,
  getQuickPickGames,
  getStaffPickGames,
  getTrendingGamesForVenue,
} from './games';

// Session operations
export {
  createSession,
  updateSessionGame,
  getActiveSessionId,
  getActiveSession,
  getSessionById,
  validateSessionForTable,
  endSession,
  sanitizeActiveSessionsForTable,
  endAllActiveSessionsForTable,
  getActiveSessionsForVenue,
  getCopiesInUseByGame,
  getEndedSessionsForVenue,
  submitFeedbackAndEndSession,
  // Feedback aggregation
  getFeedbackSummariesByGame,
  getGameFeedbackDetail,
  getVenueExperienceSummary,
  getVenueExperienceComments,
  FEEDBACK_TIMEFRAME_DAYS,
  type CreateSessionParams,
  type DateRangePreset,
  type EndedSessionsOptions,
  type EndedSession,
  type EndedSessionsResult,
  type SubmitFeedbackParams,
  type GameFeedbackSummary,
  type GameFeedbackDetail,
  type VenueExperienceSummary,
  type VenueExperienceComment,
} from './sessions';

// Analytics queries
export {
  getAnalyticsDashboardData,
  type AnalyticsSummary,
  type GamePlayStats,
  type GraveyardGame,
  type HiddenGemGame,
} from './analytics';

// Live Ops HUD
export {
  getOpsHud,
  type OpsHudData,
  type Alert,
  type AlertType,
  type AlertCategory,
  type AlertSeverity,
  type AlertContextChip,
  type AlertAction,
  type ChipTone,
  type RecentEndedSession,
  type RecentFeedback,
  type BottleneckedGame,
  type TurnoverRiskAlertData,
} from './dashboard';

// Dashboard data
export {
  getDashboardData,
  getAlerts,
  getBottleneckedGames,
  getRecentActivity,
  getBrowsingSessionsCount,
  type DashboardData,
  type VenueFeedback,
} from './dashboard';

// Booking queries
export {
  // Core queries
  getBookingById,
  getBookingsForVenue,
  getBookingsByTable,
  getUpcomingBookings,
  getBookingsByGuestEmail,
  // Conflict Engine RPC wrappers
  getAvailableSlotsRPC,
  getAvailableTablesRPC,
  checkTableAvailabilityRPC,
  checkBookingConflictsRPC,
  // Local availability functions
  checkTableAvailability,
  getAvailableTables,
  getAvailableSlots,
  checkGameAvailability,
  // Atomic CRUD operations
  createBookingAtomic,
  seatParty,
  updateBookingStatus,
  cancelBooking,
  markNoShow,
  markArrived,
  // Host queries
  getBookingsForDate,
  getBookingsForDateRange,
  getNoShowCandidates,
  getTodaysBookingStats,
  // Guest queries
  getBookingByIdAndEmail,
  getGuestBookingHistory,
  // Settings
  getVenueBookingSettings,
  createVenueBookingSettings,
  updateVenueBookingSettings,
  getOrCreateVenueBookingSettings,
  upsertVenueBookingSettings,
  getVenueOperatingHours,
  upsertVenueOperatingHours,
  // Waitlist
  addToWaitlist,
  getPendingWaitlistEntries,
  updateWaitlistStatus,
  // Turnover risks
  getTurnoverRisks,
  turnoverRiskToAlert,
  // Constants
  BOOKING_SETTINGS_DEFAULTS,
  // Types
  type BookingQueryOptions,
  type CreateBookingAtomicParams,
  type WaitlistEntryParams,
  type BookingStats,
  type OperatingHoursInput,
  type CheckAvailabilityParams,
  type AvailabilityResult,
  type TableAvailabilityParams,
  type AvailableTableWithFit,
  type SlotQueryParams,
  type AvailableSlotWithTables,
  type GameAvailabilityParams,
  type GameAvailabilityResult,
  type TurnoverRisk,
  type TurnoverRiskSeverity,
  type TurnoverRiskAlertAction,
  type TurnoverRiskAlertItem,
} from './bookings';

// Timeline data (for Gantt view)
export {
  getTimelineData,
  subscribeToTimelineChanges,
  bookingToTimelineBlock,
  sessionToTimelineBlock,
  getTimeRangeForDate,
  blocksOverlap,
  type TimelineOptions,
  type TimelineData,
  type TimelineTable,
  type TimelineConflict,
  type TimeRange,
  type ConflictSeverity,
  type TimelineBlockStatus,
} from './timeline';

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
  FeedbackComplexity,
  FeedbackReplay,
  FeedbackSource,
  VenueZone,
  VenueTableWithLayout,
  TableShape,
  // Booking types
  Booking,
  BookingWithTable,
  BookingWithDetails,
  BookingStatus,
  BookingSource,
  BookingConflict,
  VenueBookingSettings,
  VenueOperatingHours,
  BookingWaitlistEntry,
  WaitlistStatus,
  // RPC return types
  AvailableSlotRPC,
  AvailableTableRPC,
  BookingConflictRPC,
} from '@/lib/db/types';
