import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getVenueByOwnerId } from "@/lib/data/venues";
import { getAnalyticsDashboardData } from "@/lib/data/analytics";
import { AnalyticsDashboard } from "@/components/admin/analytics/AnalyticsDashboard";

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
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

  // Fetch analytics data
  const analyticsData = await getAnalyticsDashboardData(venue.id);

  return <AnalyticsDashboard data={analyticsData} />;
}
