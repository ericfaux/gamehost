import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { getVenueByOwnerId } from '@/lib/data/venues';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin));
  }

  try {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL('/login?error=auth_code_error', requestUrl.origin));
    }

    // Check if user has a venue - if not, redirect to onboarding
    if (data.user) {
      const venue = await getVenueByOwnerId(data.user.id);
      if (!venue) {
        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin));
      }
    }

    return NextResponse.redirect(new URL('/admin', requestUrl.origin));
  } catch {
    return NextResponse.redirect(new URL('/login?error=auth_code_error', requestUrl.origin));
  }
}
