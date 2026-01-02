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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch venue(s) for the current user
  const venue = await getVenueByOwnerId(user.id);
  const userVenues = venue ? [{ id: venue.id, name: venue.name }] : [];

  return (
    <DensityProvider>
      <ToastProvider>
        <AdminShell userVenues={userVenues}>{children}</AdminShell>
      </ToastProvider>
    </DensityProvider>
  );
}
