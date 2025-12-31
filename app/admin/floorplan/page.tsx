import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getVenueByOwnerId } from "@/lib/data/venues";
import { getVenueTables } from "@/lib/data/tables";
import { getVenueZones, getVenueTablesWithLayout } from "@/lib/data/zones";
import { Card, CardContent } from "@/components/ui/card";
import { FloorPlanPageContent } from "./FloorPlanPageContent";

export default async function FloorPlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  // Fetch tables and zones concurrently for performance
  const [tables, zones, tablesWithLayout] = await Promise.all([
    getVenueTables(venue.id),
    getVenueZones(venue.id),
    getVenueTablesWithLayout(venue.id),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Floor Plan</p>
          <h1 className="text-3xl">Floor Plan</h1>
        </div>
      </div>

      <FloorPlanPageContent
        venueId={venue.id}
        venueName={venue.name}
        venueSlug={venue.slug}
        initialTables={tables}
        zones={zones}
        tablesWithLayout={tablesWithLayout}
      />
    </>
  );
}
