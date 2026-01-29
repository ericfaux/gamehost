-- Migration: Convert venue feedback from 3-tier (1,3,5) to 5-star (1-5) system
-- Existing data: 1 (negative), 3 (neutral), 5 (positive) already align with 1-5 scale
-- No data transformation needed

-- Add CHECK constraint to enforce 1-5 range for venue feedback ratings
ALTER TABLE sessions
ADD CONSTRAINT feedback_venue_rating_valid_range
CHECK (feedback_venue_rating IS NULL OR (feedback_venue_rating >= 1 AND feedback_venue_rating <= 5));

-- Update column comment to reflect new 5-star scale
COMMENT ON COLUMN sessions.feedback_venue_rating IS 'Venue feedback rating on 1-5 star scale. 1=Poor, 2=Fair, 3=Average, 4=Good, 5=Excellent. Previously was 3-tier (1,3,5).';
