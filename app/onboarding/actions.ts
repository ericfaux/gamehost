'use server';

import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { isSlugAvailable } from '@/lib/data/venues';

/**
 * Input data for completing onboarding.
 */
export interface OnboardingInput {
  // Profile
  name: string;
  phone: string | null;
  jobTitle: string | null;
  // Venue basics
  venueName: string;
  venueSlug: string;
  venueDescription: string | null;
  // Venue contact
  venuePhone: string | null;
  venueEmail: string | null;
  venueWebsite: string | null;
  // Venue social
  socialInstagram: string | null;
  socialFacebook: string | null;
  // Location (optional)
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
  timezone: string;
}

/**
 * Result from completing onboarding.
 */
export interface OnboardingResult {
  success: boolean;
  error?: string;
  venueId?: string;
}

/**
 * Check if a venue slug is available.
 */
export async function checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
  const available = await isSlugAvailable(slug);
  return { available };
}

/**
 * Complete the onboarding process - creates/updates profile and creates venue.
 */
export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const admin = getSupabaseAdmin();

  // Validate slug is still available
  const slugAvailable = await isSlugAvailable(input.venueSlug);
  if (!slugAvailable) {
    return { success: false, error: 'This URL is no longer available. Please choose another.' };
  }

  try {
    // 1. Upsert profile
    const { error: profileError } = await admin
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        name: input.name,
        phone: input.phone,
        job_title: input.jobTitle,
        onboarding_completed_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Profile upsert error:', profileError);
      throw new Error(`Failed to save profile: ${profileError.message}`);
    }

    // 2. Create venue
    const { data: venue, error: venueError } = await admin
      .from('venues')
      .insert({
        owner_id: user.id,
        name: input.venueName,
        slug: input.venueSlug,
        description: input.venueDescription,
        phone: input.venuePhone,
        email: input.venueEmail,
        website_url: input.venueWebsite,
        social_instagram: input.socialInstagram,
        social_facebook: input.socialFacebook,
      })
      .select('id')
      .single();

    if (venueError) {
      console.error('Venue creation error:', venueError);
      throw new Error(`Failed to create venue: ${venueError.message}`);
    }

    // 3. Create booking settings with location and timezone
    const { error: settingsError } = await admin
      .from('venue_booking_settings')
      .insert({
        venue_id: venue.id,
        timezone: input.timezone,
        venue_address_street: input.addressStreet,
        venue_address_city: input.addressCity,
        venue_address_state: input.addressState,
        venue_address_postal_code: input.addressPostalCode,
        venue_address_country: input.addressCountry || 'US',
        bookings_enabled: false, // Start with bookings disabled
      });

    if (settingsError) {
      console.error('Booking settings error:', settingsError);
      throw new Error(`Failed to create booking settings: ${settingsError.message}`);
    }

    // 4. Create default operating hours (Mon-Sun, 10am-10pm, closed on Mondays)
    const defaultHours = [
      { day_of_week: 0, is_closed: false, open_time: '10:00:00', close_time: '22:00:00' }, // Sunday
      { day_of_week: 1, is_closed: true, open_time: null, close_time: null },              // Monday (closed)
      { day_of_week: 2, is_closed: false, open_time: '10:00:00', close_time: '22:00:00' }, // Tuesday
      { day_of_week: 3, is_closed: false, open_time: '10:00:00', close_time: '22:00:00' }, // Wednesday
      { day_of_week: 4, is_closed: false, open_time: '10:00:00', close_time: '22:00:00' }, // Thursday
      { day_of_week: 5, is_closed: false, open_time: '10:00:00', close_time: '23:00:00' }, // Friday
      { day_of_week: 6, is_closed: false, open_time: '10:00:00', close_time: '23:00:00' }, // Saturday
    ];

    const hoursToInsert = defaultHours.map(h => ({
      venue_id: venue.id,
      ...h,
    }));

    const { error: hoursError } = await admin
      .from('venue_operating_hours')
      .insert(hoursToInsert);

    if (hoursError) {
      console.error('Operating hours error:', hoursError);
      // Non-critical, don't throw
    }

    // 5. Create a default zone for floor plan
    const { error: zoneError } = await admin
      .from('venue_zones')
      .insert({
        venue_id: venue.id,
        name: 'Main Floor',
        sort_order: 0,
      });

    if (zoneError) {
      console.error('Zone creation error:', zoneError);
      // Non-critical, don't throw
    }

    revalidatePath('/admin');

    return { success: true, venueId: venue.id };
  } catch (error) {
    console.error('Onboarding error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete setup'
    };
  }
}
