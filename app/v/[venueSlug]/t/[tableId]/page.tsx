/**
 * QR Landing Route - /v/[venueSlug]/t/[tableId]
 *
 * This is the entry point for guests who scan a QR code at a table.
 *
 * Session state flow (based on user's cookie):
 * 1. Scenario A (Playing): User has a session with a game -> Show "Now Playing" dashboard
 * 2. Scenario B (Browsing): User has a session but no game -> Show "Session Active" with Quick Picks
 * 3. Scenario C (No Session): No valid session cookie -> Show "Start Session" button
 */

import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import {
  getVenueAndTableBySlugAndTableId,
  getSessionById,
  getGameById,
  getActiveSession,
  getQuickPickGames,
  getTrendingGamesForVenue,
} from '@/lib/data';
import { TrendingUp } from 'lucide-react';
import { StartSessionButton } from './StartSessionButton';
import { EndSessionButton } from './EndSessionButton';
import { QuickPickCard } from '@/components/table-app';

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
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 rulebook-grid">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-[#f5e8e8] border border-[color:var(--color-danger)]/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[color:var(--color-danger)]"
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
          <h1 className="text-2xl font-bold text-[color:var(--color-ink-primary)]">
            This table link is not valid
          </h1>
          <p className="text-[color:var(--color-ink-secondary)]">
            The QR code you scanned may be outdated or the table is no longer active.
            Please ask a staff member for assistance.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-[color:var(--color-ink-primary)] bg-[color:var(--color-muted)] hover:bg-[color:var(--color-structure)] border border-[color:var(--color-structure)] rounded-xl transition-colors focus-ring"
          >
            Go to Home
          </Link>
        </div>
      </main>
    );
  }

  const { venue, table } = result;

  // FIX: Use the table's active session as the source of truth.
  // The cookie is a convenience pointer but must be validated against the table.
  // This ensures:
  // 1. After ending a session, a new session starts fresh (no stale "Now Playing").
  // 2. A cookie pointing to a different table doesn't affect this table's UI.
  // 3. The UI always reflects the actual table state.

  // First, get the table's active session (source of truth)
  let userSession = await getActiveSession(table.id);
  let currentGame = null;

  // Read cookie to check if user has a session pointer
  const cookieStore = await cookies();
  const cookieSessionId = cookieStore.get('gamehost_session_id')?.value;

  // If there's an active session for this table, use it
  if (userSession) {
    // Verify cookie points to this session, if not, it will be corrected on next action
    // (The user is still shown the table's active session regardless of cookie mismatch)
    if (userSession.game_id) {
      currentGame = await getGameById(userSession.game_id);
    }
  } else if (cookieSessionId) {
    // No active session for table, but cookie exists - check if it's stale/ended/mismatched
    const cookieSession = await getSessionById(cookieSessionId);

    // Only use cookie session if it:
    // 1. Exists
    // 2. Is not ended (ended_at is null)
    // 3. Belongs to THIS table
    if (
      cookieSession &&
      !cookieSession.ended_at &&
      cookieSession.table_id === table.id
    ) {
      userSession = cookieSession;
      if (userSession.game_id) {
        currentGame = await getGameById(userSession.game_id);
      }
    }
    // If cookie is invalid/mismatched/ended, userSession remains null (no session UI)
  }

  // Determine session state
  const hasValidSession = !!userSession;
  const isPlaying = hasValidSession && currentGame !== null;

  // Fetch quick picks for browsing state
  let quickPicks: Awaited<ReturnType<typeof getQuickPickGames>> = [];
  if (hasValidSession && !isPlaying) {
    quickPicks = await getQuickPickGames(venue.id, 6);
  }

  // Fetch trending games for browsing state
  // Only fetch if we're in browsing state to avoid unnecessary API calls
  const trendingGames =
    hasValidSession && !isPlaying ? await getTrendingGamesForVenue(venue.id) : [];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 rulebook-grid">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Venue icon/logo placeholder */}
        <div className="w-20 h-20 mx-auto bg-[color:var(--color-accent-soft)] border border-[color:var(--color-accent)]/20 rounded-2xl flex items-center justify-center shadow-[var(--shadow-token)]">
          <svg
            className="w-10 h-10 text-[color:var(--color-accent)]"
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
          <h1 className="text-3xl font-bold text-[color:var(--color-ink-primary)]">
            Welcome to {venue.name}
          </h1>
          <p className="text-lg text-[color:var(--color-ink-secondary)]">
            You&apos;re at <span className="font-semibold">{table.label}</span>
          </p>
        </div>

        {isPlaying && currentGame ? (
          // Scenario A: Playing - Show "Now Playing" dashboard
          <>
            {/* Now Playing card */}
            <div className="panel-surface overflow-hidden">
              {/* Cover image */}
              {currentGame.cover_image_url ? (
                <div className="relative w-full aspect-[16/9]">
                  <Image
                    src={currentGame.cover_image_url}
                    alt={currentGame.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[color:var(--color-success)] text-white text-xs font-semibold rounded-full shadow-[var(--shadow-token)]">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      Now Playing
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-[16/9] bg-[color:var(--color-muted)] border-b border-[color:var(--color-structure)] flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[color:var(--color-success)] text-white text-xs font-semibold rounded-full shadow-[var(--shadow-token)]">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Now Playing
                  </span>
                </div>
              )}

              {/* Game info */}
              <div className="p-6 space-y-4">
                <h2 className="text-2xl font-bold text-[color:var(--color-ink-primary)]">
                  {currentGame.title}
                </h2>

                {/* Game metadata */}
                <div className="flex flex-wrap gap-3 justify-center text-sm text-[color:var(--color-ink-secondary)]">
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
                  className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-semibold text-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] hover:bg-[color:var(--color-accent)]/10 border border-[color:var(--color-accent)]/20 rounded-xl transition-colors focus-ring"
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
                className="inline-flex items-center justify-center w-full px-6 py-4 text-lg font-semibold text-[color:var(--color-surface)] bg-[color:var(--color-ink-primary)] hover:opacity-90 active:opacity-80 rounded-xl shadow-[var(--shadow-token)] transition-all hover:-translate-y-0.5 focus-ring"
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

              <EndSessionButton
                venueSlug={venueSlug}
                tableId={tableId}
                sessionId={userSession?.id ?? null}
                hasGame={true}
              />
            </div>
          </>
        ) : hasValidSession ? (
          // Scenario B: Browsing - Session active but no game selected
          <>
            {/* Session active badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8f0e9] text-[color:var(--color-success)] border border-[color:var(--color-success)]/20 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-[color:var(--color-success)] rounded-full animate-pulse" />
              Session Active
            </div>

            {/* Trending at Venue - Show when we have matches */}
            {trendingGames.length > 0 && (
              <section className="space-y-3 text-left">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-[color:var(--color-ink-primary)]">
                    Trending at {venue.name}
                  </h2>
                </div>
                <p className="text-sm text-[color:var(--color-ink-secondary)]">
                  These games are hot on BoardGameGeek right now
                </p>
                <div className="space-y-3">
                  {trendingGames.slice(0, 3).map((game) => (
                    <QuickPickCard
                      key={game.id}
                      game={game}
                      venueSlug={venueSlug}
                      tableId={tableId}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Quick Picks / Staff Picks Section */}
            {quickPicks.length > 0 && (
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[color:var(--color-ink-primary)]">
                      {trendingGames.length > 0 ? 'Staff Picks' : 'Quick Picks'}
                    </h2>
                    <p className="text-sm text-[color:var(--color-ink-secondary)]">
                      Top games available now
                    </p>
                  </div>
                  <Link
                    href={`/v/${venueSlug}/t/${tableId}/wizard`}
                    className="text-sm font-medium text-[color:var(--color-accent)] hover:underline"
                  >
                    More options →
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {quickPicks.map((game) => (
                    <QuickPickCard
                      key={game.id}
                      game={game}
                      venueSlug={venueSlug}
                      tableId={tableId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Fallback text if no quick picks */}
            {quickPicks.length === 0 && (
              <p className="text-[color:var(--color-ink-secondary)]">
                Ready to find the perfect game for your group? Let us help you discover
                something fun to play!
              </p>
            )}

            {/* Game selection buttons */}
            <div className="space-y-3">
              <Link
                href={`/v/${venueSlug}/t/${tableId}/wizard`}
                className="inline-flex items-center justify-center w-full px-6 py-4 text-lg font-semibold text-[color:var(--color-surface)] bg-[color:var(--color-ink-primary)] hover:opacity-90 active:opacity-80 rounded-xl shadow-[var(--shadow-token)] transition-all hover:-translate-y-0.5 focus-ring"
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
                className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-[color:var(--color-ink-primary)] bg-[color:var(--color-elevated)] hover:bg-[color:var(--color-muted)] border border-[color:var(--color-structure)] rounded-xl transition-colors focus-ring"
              >
                Browse full library
              </Link>

              <EndSessionButton
                venueSlug={venueSlug}
                tableId={tableId}
                sessionId={userSession?.id ?? null}
                hasGame={false}
              />
            </div>
          </>
        ) : (
          // Scenario C: No Session - Show start session UI
          <>
            <p className="text-[color:var(--color-ink-secondary)]">
              Ready to start playing? Check in to begin your gaming session!
            </p>

            {/* Start Session button */}
            <StartSessionButton venueSlug={venueSlug} tableId={tableId} />
          </>
        )}

        {/* Subtle footer */}
        <p className="text-xs text-[color:var(--color-structure-strong)]">
          Powered by GameHost
        </p>
      </div>
    </main>
  );
}
