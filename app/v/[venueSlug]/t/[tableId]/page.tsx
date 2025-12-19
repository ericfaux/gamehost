/**
 * QR Landing Route - /v/[venueSlug]/t/[tableId]
 *
 * This is the entry point for guests who scan a QR code at a table.
 * It displays the venue name and table label, with a CTA to start the
 * game recommendation wizard.
 */

import Link from 'next/link';
import { getVenueAndTableBySlugAndTableId } from '@/lib/data';

interface PageProps {
  params: Promise<{
    venueSlug: string;
    tableId: string;
  }>;
}

export default async function TableLandingPage({ params }: PageProps) {
  const { venueSlug, tableId } = await params;

  // Fetch venue and table using the data layer
  const result = await getVenueAndTableBySlugAndTableId(venueSlug, tableId);

  // If venue or table not found, or table is inactive, show error state
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
          <p className="text-gray-600 dark:text-gray-400">
            The QR code you scanned may be outdated or the table is no longer active.
            Please ask a staff member for assistance.
          </p>
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
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Venue icon/logo placeholder */}
        <div className="w-20 h-20 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
          <svg
            className="w-10 h-10 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Welcome text */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome to {venue.name}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            You&apos;re at <span className="font-semibold">{table.label}</span>
          </p>
        </div>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400">
          Ready to find the perfect game for your group? Let us help you discover
          something fun to play!
        </p>

        {/* CTA Button */}
        <Link
          href={`/v/${venueSlug}/t/${tableId}/wizard`}
          className="inline-flex items-center justify-center w-full px-6 py-4 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-lg shadow-blue-600/25 transition-colors"
        >
          Find a game
          <svg
            className="w-5 h-5 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Link>

        {/* Subtle footer */}
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Powered by GameHost
        </p>
      </div>
    </main>
  );
}
