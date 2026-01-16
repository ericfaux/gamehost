import { createClient } from '@/utils/supabase/server';
import { getVenueByOwnerId } from '@/lib/data/venues';

/**
 * Result of API authentication check.
 */
export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  venueId?: string;
  error?: string;
}

/**
 * Verifies that the current user is authenticated and owns the specified venue.
 * Used by API routes to ensure only authorized users can access venue data.
 *
 * @param requestedVenueId - The venue ID being accessed
 * @returns AuthResult indicating success/failure with user and venue info
 */
export async function verifyVenueAccess(requestedVenueId: string): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        authenticated: false,
        error: 'Authentication required',
      };
    }

    // Get the user's venue
    const venue = await getVenueByOwnerId(user.id);

    if (!venue) {
      return {
        authenticated: false,
        userId: user.id,
        error: 'No venue associated with this account',
      };
    }

    // Verify the user owns the requested venue
    if (venue.id !== requestedVenueId) {
      return {
        authenticated: false,
        userId: user.id,
        venueId: venue.id,
        error: 'Access denied: You do not own this venue',
      };
    }

    return {
      authenticated: true,
      userId: user.id,
      venueId: venue.id,
    };
  } catch (error) {
    console.error('Error verifying venue access:', error);
    return {
      authenticated: false,
      error: 'Authentication failed',
    };
  }
}

/**
 * Verifies that the current user is authenticated (without venue check).
 * Used for routes that only need basic authentication.
 *
 * @returns AuthResult indicating success/failure with user info
 */
export async function verifyAuthenticated(): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        authenticated: false,
        error: 'Authentication required',
      };
    }

    // Optionally get venue info
    const venue = await getVenueByOwnerId(user.id);

    return {
      authenticated: true,
      userId: user.id,
      venueId: venue?.id,
    };
  } catch (error) {
    console.error('Error verifying authentication:', error);
    return {
      authenticated: false,
      error: 'Authentication failed',
    };
  }
}
