import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getVenueByOwnerId } from "@/lib/data/venues";
import { getVenueTables } from "@/lib/data/tables";
import { getVenueZones, getVenueTablesWithLayout } from "@/lib/data/zones";
import { getActiveSessionsForVenue } from "@/lib/data/sessions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TablesManager } from "@/components/admin/TablesManager";
import { FloorPlanCanvas } from "@/components/admin/floorplan/FloorPlanCanvas";
import type { TableSessionInfo } from "@/components/admin/floorplan/TableNode";
import type { Session, VenueZone, VenueTableWithLayout } from "@/lib/db/types";
import { AlertTriangle, List, Map as MapIcon } from "@/components/icons";

interface FloorPlanPageProps {
  searchParams?: { view?: string };
}

// Type for session with joined details
interface SessionWithDetails extends Session {
  games: { title: string } | null;
  venue_tables: { label: string } | null;
}

/**
 * Transform active sessions into the Map format expected by FloorPlanCanvas.
 * Deduplicates sessions per table, picking the winner based on:
 * 1. Sessions with a game selected (playing) take priority
 * 2. Most recent started_at/created_at wins ties
 */
function buildSessionsMap(sessions: SessionWithDetails[]): Map<string, TableSessionInfo> {
  const grouped = new Map<string, SessionWithDetails[]>();

  // Group sessions by table_id
  sessions.forEach((session) => {
    const existing = grouped.get(session.table_id) ?? [];
    grouped.set(session.table_id, [...existing, session]);
  });

  const sessionsMap = new Map<string, TableSessionInfo>();

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
      sessionsMap.set(tableId, {
        sessionId: winner.id,
        status: winner.game_id ? "playing" : "browsing",
        gameTitle: winner.games?.title ?? undefined,
        startedAt: winner.started_at ?? winner.created_at,
        hasDuplicates: sessionList.length > 1,
      });
    }
  });

  return sessionsMap;
}

export default async function FloorPlanPage({ searchParams }: FloorPlanPageProps) {
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

  // Transform sessions into the Map format expected by FloorPlanCanvas
  const sessionsMap = buildSessionsMap(activeSessions as SessionWithDetails[]);

  const activeView = searchParams?.view === "table-list" ? "table-list" : "visual-map";
  const activeZone: VenueZone | null = zones[0] ?? null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Floor Plan</p>
          <h1 className="text-3xl">Floor Plan</h1>
        </div>
      </div>

      {tables.length === 0 && (
        <Card className="panel-surface border-2 border-dashed border-structure">
          <CardContent className="py-5 sm:py-6">
            <div className="flex flex-col gap-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-semibold">Welcome to your Floor Plan!</span>
              </div>
              <p className="text-sm text-ink-secondary">
                It looks like you haven&apos;t set up any tables yet.
              </p>
              <p className="text-sm font-medium">
                Switch to the Table List tab to create your first table.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-structure bg-elevated p-1 w-fit">
        {[{ id: "visual-map", label: "Visual Map", icon: MapIcon }, { id: "table-list", label: "Table List", icon: List }].map(
          (tab) => {
            const isActive = activeView === tab.id;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                href={`?view=${tab.id}`}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-surface shadow-card text-ink-primary"
                    : "text-ink-secondary hover:text-ink-primary hover:bg-muted/60"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          }
        )}
      </div>

      {activeView === "visual-map" ? (
        <Card className="panel-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapIcon className="h-5 w-5 text-ink-secondary" />
              Visual map
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeZone ? (
              <FloorPlanCanvas
                zone={activeZone}
                tables={tablesWithLayout as VenueTableWithLayout[]}
                sessions={sessionsMap}
                isEditMode={true}
                selectedTableId={null}
                showGrid={true}
                onTableClick={() => {}}
                onTableMove={() => {}}
                onTableResize={() => {}}
              />
            ) : (
              <p className="text-sm text-ink-secondary">Add a zone to start placing tables on the map.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="panel-surface">
          <CardContent className="p-0">
            <TablesManager
              initialTables={tables}
              venueId={venue.id}
              venueName={venue.name}
              venueSlug={venue.slug}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
