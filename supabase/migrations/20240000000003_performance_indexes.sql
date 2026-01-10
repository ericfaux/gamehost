-- Performance Optimization: Add composite indexes for common query patterns
-- These indexes improve query performance for frequently accessed data

-- =============================================================================
-- SESSIONS TABLE INDEXES
-- =============================================================================

-- Index for feedback aggregation queries (venue dashboard, analytics)
-- Query pattern: sessions with feedback in a date range for a venue
CREATE INDEX IF NOT EXISTS idx_sessions_venue_feedback
ON sessions (venue_id, ended_at, feedback_submitted_at)
WHERE feedback_submitted_at IS NOT NULL;

-- Index for game play statistics (analytics, trending games)
-- Query pattern: sessions by venue, game, and time
CREATE INDEX IF NOT EXISTS idx_sessions_venue_game_started
ON sessions (venue_id, game_id, started_at);

-- Index for active sessions lookup (table status, dashboard)
-- Query pattern: find active sessions for a venue
CREATE INDEX IF NOT EXISTS idx_sessions_venue_active
ON sessions (venue_id)
WHERE ended_at IS NULL;

-- =============================================================================
-- BOOKINGS TABLE INDEXES
-- =============================================================================

-- Index for daily booking list queries (calendar view, arrivals board)
-- Query pattern: bookings for a venue on a specific date, filtered by status
CREATE INDEX IF NOT EXISTS idx_bookings_venue_date_status
ON bookings (venue_id, booking_date, status);

-- Index for conflict detection queries (availability check)
-- Query pattern: bookings on a table for a date within a time range
CREATE INDEX IF NOT EXISTS idx_bookings_table_date_times
ON bookings (table_id, booking_date, start_time, end_time);

-- Index for table availability checks
-- Query pattern: non-cancelled bookings on a table for a date
CREATE INDEX IF NOT EXISTS idx_bookings_table_date_active
ON bookings (table_id, booking_date)
WHERE status NOT IN ('cancelled_by_guest', 'cancelled_by_venue', 'no_show');

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON INDEX idx_sessions_venue_feedback IS 'Optimizes feedback aggregation queries for venue analytics';
COMMENT ON INDEX idx_sessions_venue_game_started IS 'Optimizes game play statistics and trending calculations';
COMMENT ON INDEX idx_sessions_venue_active IS 'Optimizes active session lookups for dashboard';
COMMENT ON INDEX idx_bookings_venue_date_status IS 'Optimizes daily booking list and calendar queries';
COMMENT ON INDEX idx_bookings_table_date_times IS 'Optimizes conflict detection for availability checks';
COMMENT ON INDEX idx_bookings_table_date_active IS 'Optimizes table availability queries excluding cancelled bookings';
