-- Add venue address fields to venue_booking_settings
-- These fields store the venue's physical location for display on booking confirmations

ALTER TABLE venue_booking_settings
ADD COLUMN IF NOT EXISTS venue_address_street text,
ADD COLUMN IF NOT EXISTS venue_address_city text,
ADD COLUMN IF NOT EXISTS venue_address_state text,
ADD COLUMN IF NOT EXISTS venue_address_postal_code text,
ADD COLUMN IF NOT EXISTS venue_address_country text DEFAULT 'US';

-- Add comment for documentation
COMMENT ON COLUMN venue_booking_settings.venue_address_street IS 'Street address of the venue (e.g., "123 Main Street")';
COMMENT ON COLUMN venue_booking_settings.venue_address_city IS 'City where the venue is located';
COMMENT ON COLUMN venue_booking_settings.venue_address_state IS 'State/Province code (e.g., "PA", "ON")';
COMMENT ON COLUMN venue_booking_settings.venue_address_postal_code IS 'Postal/ZIP code';
COMMENT ON COLUMN venue_booking_settings.venue_address_country IS 'Country code (default: US)';
