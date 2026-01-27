/**
 * Debug Page - /debug
 *
 * Simple page to verify the App Router is running and display build info.
 */

export default function DebugPage() {
  const commitSha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'local-dev';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">GameLedger debug</h1>
        <p>App Router running</p>
        <p className="text-sm text-gray-500">
          Commit: <code className="bg-gray-100 px-2 py-1 rounded">{commitSha}</code>
        </p>
      </div>
    </main>
  );
}
