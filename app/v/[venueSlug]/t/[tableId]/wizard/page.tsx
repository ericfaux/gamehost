/**
 * Game Recommendation Wizard Route - /v/[venueSlug]/t/[tableId]/wizard
 *
 * Collects preferences from guests (player count, time, complexity, vibes)
 * and displays recommended games based on their selections.
 */

import { getVenueAndTableBySlugAndTableId } from '@/lib/data';
import Link from 'next/link';
import { WizardForm } from './WizardForm';

interface PageProps {
  params: Promise<{
    venueSlug: string;
    tableId: string;
  }>;
}

export default async function WizardPage({ params }: PageProps) {
  const { venueSlug, tableId } = await params;

  // Fetch venue and table
  const result = await getVenueAndTableBySlugAndTableId(venueSlug, tableId);

  // If venue or table not found, show error
  if (!result || !result.table.is_active) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            This table link is not valid
          </h1>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </main>
    );
  }

  const { venue, table } = result;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link
            href={`/v/${venueSlug}/t/${tableId}`}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Find a Game
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {venue.name} · {table.label}
            </p>
          </div>
        </div>
      </header>

      {/* Wizard Form (Client Component) */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <WizardForm venueId={venue.id} venueSlug={venueSlug} tableId={tableId} />
      </div>
    </main>
  );
}
