import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * ⚠️ WARNING: DO NOT expose SERVICE_ROLE_KEY to browser.
 * This client bypasses Row Level Security and should only be used in server-side code.
 */

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

/**
 * Creates a new Supabase client for server-side use.
 * Uses SERVICE_ROLE_KEY - bypasses RLS, never use in client code.
 */
export function createSupabaseServerClient(): SupabaseClient {
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseServiceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Lazy singleton getter
let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Returns a server-side Supabase client with admin privileges (singleton).
 * Uses SERVICE_ROLE_KEY - DO NOT use in client-side code.
 * Client is lazily initialized on first call to avoid build-time errors.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createSupabaseServerClient();
  }
  return _supabaseAdmin;
}
