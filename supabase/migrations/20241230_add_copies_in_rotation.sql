-- Migration: Add copies_in_rotation to games table
-- Description: Tracks how many physical copies of each game are in rotation
-- Date: 2024-12-30

-- Add the copies_in_rotation column with default of 1
ALTER TABLE games
ADD COLUMN IF NOT EXISTS copies_in_rotation INTEGER NOT NULL DEFAULT 1;

-- Add constraint to ensure copies_in_rotation >= 1
ALTER TABLE games
ADD CONSTRAINT games_copies_in_rotation_check CHECK (copies_in_rotation >= 1);

-- Backfill existing games to have 1 copy (already handled by DEFAULT, but explicit for clarity)
UPDATE games SET copies_in_rotation = 1 WHERE copies_in_rotation IS NULL;

-- Add a comment for documentation
COMMENT ON COLUMN games.copies_in_rotation IS 'Number of physical copies of this game in rotation. Minimum 1.';
