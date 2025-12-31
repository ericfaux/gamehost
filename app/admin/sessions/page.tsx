import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getVenueByOwnerId } from "@/lib/data/venues";
import { getVenueTables } from "@/lib/data/tables";
import { getActiveSessionsForVenue, getEndedSessionsForVenue, getVenueExperienceSummary } from "@/lib/data/sessions";
import { getGamesForVenue } from "@/lib/data/games";
import { getVenueZones, getVenueTablesWithLayout } from "@/lib/data/zones";
import { SessionsClient, type SessionWithDetails } from "@/components/admin/SessionsClient";
import type { Game } from "@/lib/db/types";
import type { EndedSession } from "@/lib/data";

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
  const [sessions, tables, tablesWithLayout, zones, allGames, endedSessionsResult, venuePulse] = await Promise.all([
    // FIX: Use data layer function with admin client (bypasses RLS)
    // This ensures Admin UI can see all guest-created sessions
    getActiveSessionsForVenue(venue.id),
    getVenueTables(venue.id),
    getVenueTablesWithLayout(venue.id),
    getVenueZones(venue.id),
    getGamesForVenue(venue.id),
    // Fetch first page of ended sessions (default: last 7 days)
    getEndedSessionsForVenue(venue.id, { limit: 50, dateRangePreset: '7d' }),
    // Venue experience summary (last 7 days)
    getVenueExperienceSummary(venue.id, 7),
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
  const initialEndedSessions: EndedSession[] = endedSessionsResult.sessions;
  const initialEndedCursor = endedSessionsResult.nextCursor;

  return (
    <SessionsClient
      initialSessions={sessionsData}
      availableTables={tables}
      tablesWithLayout={tablesWithLayout}
      zones={zones}
      availableGames={availableGames}
      venueId={venue.id}
      initialEndedSessions={initialEndedSessions}
      initialEndedCursor={initialEndedCursor}
      venuePulse={venuePulse}
    />
  );
}
