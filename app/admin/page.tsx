export default function AdminDashboard() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        Dashboard Overview
      </h1>
      <p className="text-slate-600">
        Welcome to the GameHost Manager. Select an option from the sidebar.
      </p>

      {/* Quick stats placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Games in Library
          </h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">—</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Active Sessions
          </h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">—</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Total Sessions
          </h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">—</p>
        </div>
      </div>
    </div>
  );
}
