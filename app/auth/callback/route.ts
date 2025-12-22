import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL('/login?error=auth_code_error', requestUrl.origin));
    }

    return NextResponse.redirect(new URL('/admin', requestUrl.origin));
  } catch {
    return NextResponse.redirect(new URL('/login?error=auth_code_error', requestUrl.origin));
  }
}
