-- Enhanced profiles table for onboarding flow
-- Adds additional fields to support multi-step onboarding wizard

-- Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Add index for faster lookups on onboarding status
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding
ON public.profiles(onboarding_completed_at);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.phone IS 'Contact phone number for the user';
COMMENT ON COLUMN public.profiles.job_title IS 'Job title/role (Owner, Manager, Staff, etc.)';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user avatar image';
COMMENT ON COLUMN public.profiles.onboarding_completed_at IS 'Timestamp when user completed onboarding wizard';
