/**
 * QR Landing Route - /v/[venueSlug]/t/[tableId]
 *
 * This is the entry point for guests who scan a QR code at a table.
 *
 * Session state flow (based on user's cookie):
 * 1. Scenario A (Playing): User has a session with a game -> Show "Now Playing" dashboard
 * 2. Scenario B (Browsing): User has a session but no game -> Show "Session Active" with game options
 * 3. Scenario C (No Session): No valid session cookie -> Show "Start Session" button
 */

import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  getVenueAndTableBySlugAndTableId,
  getSessionById,
  getGameById,
} from '@/lib/data';
import { StartSessionButton } from './StartSessionButton';
import { EndSessionButton } from './EndSessionButton';

interface PageProps {
  params: Promise<{
    venueSlug: string;
    tableId: string;
  }>;
}

export default async function TableLandingPage({ params }: PageProps) {
  const { venueSlug, tableId } = await params;

  console.log('TableLanding - params', { venueSlug, tableId });

  // Fetch venue and table using the data layer
  let result;
  try {
    result = await getVenueAndTableBySlugAndTableId(venueSlug, tableId);
    console.log('TableLanding - lookup result', {
      found: !!result,
      venueId: result?.venue?.id ?? null,
      tableId: result?.table?.id ?? null,
    });
  } catch (error) {
    console.error('TableLanding - error', error);
    throw error;
  }

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

  // Read the session cookie to check user's session state
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('gamehost_session_id')?.value;

  // Fetch the user's session if they have a cookie
  let userSession = null;
  let currentGame = null;

  if (sessionId) {
    userSession = await getSessionById(sessionId);

    // Only use session if it's not ended (feedback_submitted_at is null)
    if (userSession && userSession.feedback_submitted_at) {
      userSession = null; // Session has ended, treat as no session
    }

    // If session has a game, fetch the game details
    if (userSession?.game_id) {
      currentGame = await getGameById(userSession.game_id);
    }
  }

  // Determine session state
  const hasValidSession = !!userSession;
  const isPlaying = hasValidSession && currentGame !== null;

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

        {isPlaying && currentGame ? (
          // Scenario A: Playing - Show "Now Playing" dashboard
          <>
            {/* Now Playing card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden">
              {/* Cover image */}
              {currentGame.cover_image_url ? (
                <div className="relative w-full aspect-[16/9]">
                  <img
                    src={currentGame.cover_image_url}
                    alt={currentGame.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      Now Playing
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-[16/9] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Now Playing
                  </span>
                </div>
              )}

              {/* Game info */}
              <div className="p-6 space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentGame.title}
                </h2>

                {/* Game metadata */}
                <div className="flex flex-wrap gap-3 justify-center text-sm text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {currentGame.min_players}-{currentGame.max_players} players
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {currentGame.min_time_minutes}-{currentGame.max_time_minutes} min
                  </span>
                </div>

                {/* View rules link */}
                <Link
                  href={`/v/${venueSlug}/t/${tableId}/games/${currentGame.id}`}
                  className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  View Rules
                </Link>
              </div>
            </div>

            {/* Switch game option */}
            <div className="space-y-3">
              <Link
                href={`/v/${venueSlug}/t/${tableId}/wizard`}
                className="inline-flex items-center justify-center w-full px-6 py-4 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-lg shadow-blue-600/25 transition-colors"
              >
                Find a different game
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

              <EndSessionButton venueSlug={venueSlug} tableId={tableId} />
            </div>
          </>
        ) : hasValidSession ? (
          // Scenario B: Browsing - Session active but no game selected
          <>
            {/* Session active badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Session Active
            </div>

            <p className="text-gray-600 dark:text-gray-400">
              Ready to find the perfect game for your group? Let us help you discover
              something fun to play!
            </p>

            {/* Game selection buttons */}
            <div className="space-y-3">
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

              <Link
                href={`/v/${venueSlug}/t/${tableId}/library`}
                className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Browse full library
              </Link>

              <EndSessionButton venueSlug={venueSlug} tableId={tableId} />
            </div>
          </>
        ) : (
          // Scenario C: No Session - Show start session UI
          <>
            <p className="text-gray-600 dark:text-gray-400">
              Ready to start playing? Check in to begin your gaming session!
            </p>

            {/* Start Session button */}
            <StartSessionButton venueSlug={venueSlug} tableId={tableId} />
          </>
        )}

        {/* Subtle footer */}
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Powered by GameHost
        </p>
      </div>
    </main>
  );
}
