import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getVenueByOwnerId } from '@/lib/data/venues';
import { getOpsHud } from '@/lib/data/dashboard';
import { getGamesForVenue } from '@/lib/data/games';
import { getActiveSessionsForVenue, getCopiesInUseByGame } from '@/lib/data/sessions';
import { getVenueTables } from '@/lib/data/tables';
import { DashboardClient } from '@/components/admin/DashboardClient';
import type { Game, VenueTable } from '@/lib/db/types';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the user's venue
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

  // Fetch dashboard data and games in parallel
  const [data, allGames, activeSessions, copiesInUse, tables] = await Promise.all([
    getOpsHud(venue.id),
    getGamesForVenue(venue.id),
    getActiveSessionsForVenue(venue.id),
    getCopiesInUseByGame(venue.id),
    getVenueTables(venue.id),
  ]);

  // Filter games to only include those available for assignment
  // (in rotation, not problematic, and has available copies)
  const availableGames = allGames.filter((game: Game) => {
    if (game.status !== 'in_rotation') return false;
    if (game.condition === 'problematic') return false;
    const copies = game.copies_in_rotation ?? 1;
    const inUse = copiesInUse[game.id] ?? 0;
    return copies > inUse; // Has available copies
  });

  // Build tables map
  const tablesMap: Record<string, VenueTable> = {};
  for (const table of tables) {
    tablesMap[table.id] = table;
  }

  // Build browsing sessions (sessions without game_id)
  const browsingSessions = activeSessions
    .filter((s) => s.game_id === null)
    .map((s) => ({
      ...s,
      tableLabel: tablesMap[s.table_id]?.label ?? 'Unknown Table',
    }));

  return (
    <DashboardClient
      data={data}
      availableGames={availableGames}
      browsingSessions={browsingSessions}
    />
  );
}
