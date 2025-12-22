'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function signup(formData: FormData): Promise<{ error?: string; message?: string } | void> {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Check if email confirmation is required
  // If the user session exists immediately, email confirmation is disabled
  if (data.session) {
    // Email confirmation is disabled, redirect to admin
    redirect('/admin');
  } else {
    // Email confirmation is enabled, show message
    return { 
      message: 'Check your email for a confirmation link to complete your registration.' 
    };
  }
}
