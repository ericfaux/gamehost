-- Migration: Enable Row Level Security policies for profiles table
-- This allows authenticated users to manage their own profile row

-- Policy: Allow users to read their own profile
CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Allow users to insert their own profile (for upsert)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy: Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
