import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { AppShell } from '@/components/AppShell';
import { getVenueByOwnerId } from '@/lib/data/venues';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch venue(s) for the current user
  const venue = await getVenueByOwnerId(user.id);
  const userVenues = venue ? [{ id: venue.id, name: venue.name }] : [];

  return <AppShell userVenues={userVenues}>{children}</AppShell>;
}
