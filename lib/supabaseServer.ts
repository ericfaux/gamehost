import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * ⚠️ WARNING: DO NOT expose SERVICE_ROLE_KEY to browser.
 * This client bypasses Row Level Security and should only be used in server-side code.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseServiceRoleKey) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Server-side Supabase client with admin privileges.
 * Uses SERVICE_ROLE_KEY - DO NOT use in client-side code.
 */
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabaseAdmin;
