import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getVenueByOwnerId } from "@/lib/data/venues";
import { getVenueTables } from "@/lib/data/tables";
import { SessionsClient, type SessionWithDetails } from "@/components/admin/SessionsClient";

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

  // Fetch all active sessions for this venue (where feedback has not been submitted yet)
  // Join with games and venue_tables to get related data
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("*, games(title), venue_tables(label)")
    .eq("venue_id", venue.id)
    .is("feedback_submitted_at", null)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("Error fetching sessions:", error);
  }

  // Fetch available tables for the venue
  const tables = await getVenueTables(venue.id);

  const sessionsData: SessionWithDetails[] = (sessions ?? []) as SessionWithDetails[];

  return (
    <SessionsClient
      initialSessions={sessionsData}
      availableTables={tables}
    />
  );
}
