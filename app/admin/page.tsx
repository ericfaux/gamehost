import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getVenueByOwnerId } from '@/lib/data/venues';
import { getDashboardData } from '@/lib/data/dashboard';
import { VenueFeedbackWidget } from '@/components/admin/VenueFeedbackWidget';

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const venue = await getVenueByOwnerId(user.id);

  if (!venue) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">No Venue Found</h1>
        <p className="text-slate-600">
          You don&apos;t have a venue associated with your account yet.
        </p>
      </div>
    );
  }

  const dashboardData = await getDashboardData(venue.id);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Dashboard</p>
        <h1 className="text-3xl">Overview</h1>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Games in Library
          </h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {dashboardData.gamesInLibrary}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Active Sessions
          </h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {dashboardData.activeSessions}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Sessions Today
          </h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {dashboardData.totalSessionsToday}
          </p>
        </div>
      </div>

      {/* Venue Feedback Widget */}
      <VenueFeedbackWidget feedback={dashboardData.venueFeedback} />
    </div>
  );
}
