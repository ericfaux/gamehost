import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getVenueByOwnerId } from '@/lib/data/venues';
import { getGamesForVenue } from '@/lib/data/games';
import { getCopiesInUseByGame } from '@/lib/data/sessions';
import { LibraryClient } from '@/components/admin/LibraryClient';

export default async function LibraryPage() {
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

  // Fetch all games for the venue and copies in use
  const [games, copiesInUse] = await Promise.all([
    getGamesForVenue(venue.id),
    getCopiesInUseByGame(venue.id),
  ]);

  return <LibraryClient initialGames={games} copiesInUse={copiesInUse} />;
}
