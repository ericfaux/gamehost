import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Landing from '@/components/public/Landing';

export const metadata: Metadata = {
  title: 'Welcome — GameHost',
  description: 'Reserve a table and play great board games near you.',
};

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/admin/library');
  }

  return <Landing />;
}
