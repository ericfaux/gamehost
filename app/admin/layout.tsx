import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { getVenueByOwnerId } from '@/lib/data/venues';
import { DensityProvider } from '@/components/providers/DensityProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Fetch profile for the current user (graceful fallback if missing)
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', authUser.id)
    .single();

  // Build user object with graceful fallback
  const userEmail = authUser.email ?? '';
  const userName = profile?.name ?? authUser.user_metadata?.full_name ?? null;

  const user = {
    email: userEmail,
    name: userName,
  };

  // Fetch venue(s) for the current user
  const venue = await getVenueByOwnerId(authUser.id);
  const userVenues = venue ? [{ id: venue.id, name: venue.name }] : [];

  return (
    <DensityProvider>
      <ToastProvider>
        <AdminShell userVenues={userVenues} user={user}>{children}</AdminShell>
      </ToastProvider>
    </DensityProvider>
  );
}
