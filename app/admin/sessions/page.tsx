import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getVenueByOwnerId } from "@/lib/data/venues";
import { getVenueTables } from "@/lib/data/tables";
import { getActiveSessionsForVenue } from "@/lib/data/sessions";
import { SessionsClient, type SessionWithDetails } from "@/components/admin/SessionsClient";

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

  // FIX: Use data layer function with admin client (bypasses RLS)
  // This ensures Admin UI can see all guest-created sessions
  const sessions = await getActiveSessionsForVenue(venue.id);

  // Fetch available tables for the venue
  const tables = await getVenueTables(venue.id);

  const sessionsData: SessionWithDetails[] = sessions as SessionWithDetails[];

  return (
    <SessionsClient
      initialSessions={sessionsData}
      availableTables={tables}
    />
  );
}
