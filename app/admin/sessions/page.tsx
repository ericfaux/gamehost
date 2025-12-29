import { createClient } from "@/utils/supabase/server";
import { SessionsClient, type SessionWithDetails } from "@/components/admin/SessionsClient";

export default async function AdminSessionsPage() {
  const supabase = await createClient();

  // Fetch all active sessions (where feedback has not been submitted yet)
  // Join with games and venue_tables to get related data
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("*, games(title), venue_tables(label)")
    .is("feedback_submitted_at", null)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("Error fetching sessions:", error);
  }

  const sessionsData: SessionWithDetails[] = (sessions ?? []) as SessionWithDetails[];

  return <SessionsClient initialSessions={sessionsData} />;
}
