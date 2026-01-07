import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getVenueByOwnerId } from "@/lib/data/venues";
import { getFeedbackHistory } from "@/lib/data/feedback";
import { FeedbackPageClient } from "@/components/admin/FeedbackPageClient";

export const dynamic = 'force-dynamic';

export default async function FeedbackPage() {
  // 1. Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Venue fetch
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

  // 3. Initial data fetch (default: last 30 days)
  const initialData = await getFeedbackHistory(venue.id, { dateRangePreset: '30d' });

  // 4. Render page with client component
  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Feedback</p>
          <h1 className="text-3xl">Feedback History</h1>
        </div>
      </div>

      {/* Client component */}
      <FeedbackPageClient
        venueId={venue.id}
        initialData={initialData}
      />
    </>
  );
}
