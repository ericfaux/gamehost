import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getVenueByOwnerId } from '@/lib/data/venues';
import { getVenueTables } from '@/lib/data/tables';
import { getVenueZones, getVenueTablesWithLayout } from '@/lib/data/zones';
import { getActiveSessionsForVenue } from '@/lib/data/sessions';
import { Card, CardContent } from '@/components/ui/card';
import { FloorPlanPageClient } from '@/components/admin/floorplan/FloorPlanPageClient';
import type { TableSessionInfo } from '@/components/admin/floorplan/TableNode';
import type { Session, VenueZone, VenueTableWithLayout } from '@/lib/db/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Extended Session type with joined game and table details.
 * Used for building the serializable sessions array.
 */
interface SessionWithDetails extends Session {
  games: { title: string } | null;
  venue_tables: { label: string } | null;
}

// =============================================================================
// DATA TRANSFORMATION
// =============================================================================

/**
 * Transform active sessions into a serializable [tableId, SessionInfo][] array.
 *
 * Crucial Step: Maps and complex objects cannot cross the Server -> Client boundary.
 * We transform them here into a simple array of tuples that can be serialized as JSON.
 *
 * Deduplication logic:
 * 1. Sessions with a game selected (status: 'playing') take priority over browsing
 * 2. Most recent started_at/created_at wins ties
 *
 * @param sessions - Raw sessions with joined details from database
 * @returns Array of [tableId, TableSessionInfo] tuples for serialization
 */
function buildSessionsArray(sessions: SessionWithDetails[]): [string, TableSessionInfo][] {
  // Group sessions by table_id
  const grouped = new Map<string, SessionWithDetails[]>();

  for (const session of sessions) {
    const existing = grouped.get(session.table_id) ?? [];
    grouped.set(session.table_id, [...existing, session]);
  }

  // Build the result array
  const result: [string, TableSessionInfo][] = [];

  grouped.forEach((sessionList, tableId) => {
    // Sort to find the "winner" session for this table:
    // - Prefer sessions with game_id (playing state)
    // - Then prefer most recent by started_at
    const sorted = [...sessionList].sort((a, b) => {
      const aHasGame = a.game_id !== null;
      const bHasGame = b.game_id !== null;

      // Sessions with games take priority
      if (aHasGame !== bHasGame) {
        return aHasGame ? -1 : 1;
      }

      // Otherwise, most recent wins
      const aTime = new Date(a.started_at ?? a.created_at).getTime();
      const bTime = new Date(b.started_at ?? b.created_at).getTime();
      return bTime - aTime;
    });

    const winner = sorted[0];
    if (winner) {
      // Build the serializable TableSessionInfo
      const sessionInfo: TableSessionInfo = {
        sessionId: winner.id,
        status: winner.game_id ? 'playing' : 'browsing',
        gameTitle: winner.games?.title ?? undefined,
        startedAt: winner.started_at ?? winner.created_at,
        hasDuplicates: sessionList.length > 1,
      };

      result.push([tableId, sessionInfo]);
    }
  });

  return result;
}

// =============================================================================
// PAGE COMPONENT (Server Component)
// =============================================================================

/**
 * FloorPlanPage - Server Component for the Floor Plan admin page.
 *
 * Architecture: "Clean Handoff" Pattern
 * 1. Authenticate user and get venue
 * 2. Fetch all required data in parallel for performance
 * 3. Transform complex objects (like sessions Map) into serializable formats
 * 4. Hand off to FloorPlanPageClient for all interactivity
 */
export default async function FloorPlanPage() {
  // ---------------------------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------------------------

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // ---------------------------------------------------------------------------
  // VENUE LOOKUP
  // ---------------------------------------------------------------------------

  const venue = await getVenueByOwnerId(user.id);

  if (!venue) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-rulebook text-ink-secondary">
              Floor Plan
            </p>
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

  // ---------------------------------------------------------------------------
  // PARALLEL DATA FETCHING
  // ---------------------------------------------------------------------------

  // Fetch all required data concurrently for optimal performance
  const [tables, zones, tablesWithLayout, activeSessions] = await Promise.all([
    getVenueTables(venue.id),
    getVenueZones(venue.id),
    getVenueTablesWithLayout(venue.id),
    getActiveSessionsForVenue(venue.id),
  ]);

  // ---------------------------------------------------------------------------
  // DATA TRANSFORMATION: Server -> Client Serialization
  // ---------------------------------------------------------------------------

  // Transform sessions into serializable [tableId, SessionInfo][] array
  // This is crucial - Maps cannot be passed to Client Components
  const sessionsArray = buildSessionsArray(activeSessions as SessionWithDetails[]);

  // Ensure proper typing for tables with layout
  const typedTablesWithLayout = tablesWithLayout as VenueTableWithLayout[];
  const typedZones = zones as VenueZone[];

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">
            Floor Plan
          </p>
          <h1 className="text-3xl">Floor Plan</h1>
        </div>
      </div>

      {/* Client Component - The Layout Engine */}
      <Suspense fallback={<div>Loading...</div>}>
        <FloorPlanPageClient
          venueId={venue.id}
          venueName={venue.name}
          venueSlug={venue.slug}
          venueLogo={venue.logo_url}
          initialZones={typedZones}
          initialTables={tables}
          initialTablesWithLayout={typedTablesWithLayout}
          initialSessions={sessionsArray}
        />
      </Suspense>
    </>
  );
}
