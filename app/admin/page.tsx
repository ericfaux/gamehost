import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getVenueByOwnerId } from '@/lib/data/venues';
import { getDashboardData } from '@/lib/data/dashboard';
import { getActiveSessionsForVenue } from '@/lib/data/sessions';
import { getGamesForVenue } from '@/lib/data/games';
import { DashboardClient } from '@/components/admin/DashboardClient';
import type { BrowsingSession } from '@/components/admin/AssignGameToSessionModal';

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const venue = await getVenueByOwnerId(user.id);

  if (!venue) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">No Venue Found</h1>
        <p className="text-slate-600">
          You don&apos;t have a venue associated with your account yet.
        </p>
      </div>
    );
  }

  // Fetch all dashboard data in parallel
  const [dashboardData, activeSessions, allGames] = await Promise.all([
    getDashboardData(venue.id),
    getActiveSessionsForVenue(venue.id),
    getGamesForVenue(venue.id),
  ]);

  // Extract browsing sessions (no game assigned) with table labels
  const browsingSessions: BrowsingSession[] = activeSessions
    .filter((session) => session.game_id === null)
    .map((session) => {
      // Supabase relations return as arrays - access first element
      const venueTables = (session as unknown as { venue_tables?: { label: string }[] }).venue_tables;
      return {
        ...session,
        tableLabel: venueTables?.[0]?.label ?? 'Unknown Table',
      };
    });

  // Get available games (in rotation)
  const availableGames = allGames.filter((game) => game.status === 'in_rotation');

  return (
    <DashboardClient
      dashboardData={dashboardData}
      availableGames={availableGames}
      browsingSessions={browsingSessions}
    />
  );
}
