import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getVenueByOwnerId } from "@/lib/data/venues";
import { getVenueTables } from "@/lib/data/tables";
import { getActiveSessionsForVenue } from "@/lib/data/sessions";
import { getGamesForVenue } from "@/lib/data/games";
import { SessionsClient, type SessionWithDetails } from "@/components/admin/SessionsClient";
import type { Game } from "@/lib/db/types";

export const dynamic = 'force-dynamic';

export default async function AdminSessionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch venue for the current user
  const venue = await getVenueByOwnerId(user.id);

  if (!venue) {
    return (
      <div className="text-center py-12">
        <p className="text-[color:var(--color-ink-secondary)]">
          No venue found for your account. Please contact support.
        </p>
      </div>
    );
  }

  // Fetch all data in parallel for better performance
  const [sessions, tables, allGames] = await Promise.all([
    // FIX: Use data layer function with admin client (bypasses RLS)
    // This ensures Admin UI can see all guest-created sessions
    getActiveSessionsForVenue(venue.id),
    getVenueTables(venue.id),
    getGamesForVenue(venue.id),
  ]);

  // Filter games to only include those in rotation and not problematic
  // (matching guest recommendation filters)
  const availableGames = allGames.filter(
    (game: Game) =>
      game.status === "in_rotation" &&
      game.condition !== "problematic" &&
      (game.copies_in_rotation ?? 1) > 0
  );

  const sessionsData: SessionWithDetails[] = sessions as SessionWithDetails[];

  return (
    <SessionsClient
      initialSessions={sessionsData}
      availableTables={tables}
      availableGames={availableGames}
    />
  );
}
