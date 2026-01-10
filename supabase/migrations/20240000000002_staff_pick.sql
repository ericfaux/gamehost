-- Add is_staff_pick column to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_staff_pick BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN games.is_staff_pick IS 'Staff recommendation flag for the game wizard';
