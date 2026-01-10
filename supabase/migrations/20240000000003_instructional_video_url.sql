-- Add instructional_video_url column to games table
-- Stores YouTube URL for how-to-play tutorial videos (fetched from BGG or manually entered)
ALTER TABLE games ADD COLUMN IF NOT EXISTS instructional_video_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN games.instructional_video_url IS 'YouTube URL for how-to-play tutorial video';
