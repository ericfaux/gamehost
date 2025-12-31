import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getVenueByOwnerId } from "@/lib/data/venues";
import { getVenueTables } from "@/lib/data/tables";
import { getVenueZones, getVenueTablesWithLayout } from "@/lib/data/zones";
import { getActiveSessionsForVenue } from "@/lib/data/sessions";
import { Card, CardContent } from "@/components/ui/card";
import { FloorPlanPageClient } from "@/components/admin/floorplan/FloorPlanPageClient";
import type { TableSessionInfo } from "@/components/admin/floorplan/TableNode";
import type { Session, VenueZone, VenueTableWithLayout } from "@/lib/db/types";

// Type for session with joined details
interface SessionWithDetails extends Session {
  games: { title: string } | null;
  venue_tables: { label: string } | null;
}

/**
 * Transform active sessions into an array of [tableId, sessionInfo] entries.
 * Deduplicates sessions per table, picking the winner based on:
 * 1. Sessions with a game selected (playing) take priority
 * 2. Most recent started_at/created_at wins ties
 *
 * Returns an array instead of Map for Server -> Client serialization.
 */
function buildSessionsArray(sessions: SessionWithDetails[]): [string, TableSessionInfo][] {
  const grouped = new Map<string, SessionWithDetails[]>();

  // Group sessions by table_id
  sessions.forEach((session) => {
    const existing = grouped.get(session.table_id) ?? [];
    grouped.set(session.table_id, [...existing, session]);
  });

  const result: [string, TableSessionInfo][] = [];

  grouped.forEach((sessionList, tableId) => {
    // Sort to pick winner: prefer game_id not null, then newest started_at
    const sorted = [...sessionList].sort((a, b) => {
      const aHasGame = a.game_id !== null;
      const bHasGame = b.game_id !== null;
      if (aHasGame !== bHasGame) return aHasGame ? -1 : 1;
      const aTime = new Date(a.started_at ?? a.created_at).getTime();
      const bTime = new Date(b.started_at ?? b.created_at).getTime();
      return bTime - aTime;
    });

    const winner = sorted[0];
    if (winner) {
      result.push([
        tableId,
        {
          sessionId: winner.id,
          status: winner.game_id ? "playing" : "browsing",
          gameTitle: winner.games?.title ?? undefined,
          startedAt: winner.started_at ?? winner.created_at,
          hasDuplicates: sessionList.length > 1,
        },
      ]);
    }
  });

  return result;
}

export default async function FloorPlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch venue for the current user
  const venue = await getVenueByOwnerId(user.id);

  if (!venue) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Floor Plan</p>
            <h1 className="text-3xl">Floor Plan</h1>
          </div>
        </div>
        <Card className="panel-surface">
          <CardContent className="py-6">
            <p className="text-center text-[color:var(--color-ink-secondary)]">
              Venue not found. Please contact support.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  // Fetch tables, zones, layouts, and active sessions concurrently for performance
  const [tables, zones, tablesWithLayout, activeSessions] = await Promise.all([
    getVenueTables(venue.id),
    getVenueZones(venue.id),
    getVenueTablesWithLayout(venue.id),
    getActiveSessionsForVenue(venue.id),
  ]);

  // Transform sessions into serializable array format for Client Component
  const sessionsArray = buildSessionsArray(activeSessions as SessionWithDetails[]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Floor Plan</p>
          <h1 className="text-3xl">Floor Plan</h1>
        </div>
      </div>

      <FloorPlanPageClient
        venueId={venue.id}
        venueName={venue.name}
        venueSlug={venue.slug}
        initialZones={zones}
        initialTables={tables}
        initialTablesWithLayout={tablesWithLayout as VenueTableWithLayout[]}
        initialSessions={sessionsArray}
      />
    </>
  );
}
