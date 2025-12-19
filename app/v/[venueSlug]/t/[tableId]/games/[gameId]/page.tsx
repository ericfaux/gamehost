/**
 * Game Detail Route - /v/[venueSlug]/t/[tableId]/games/[gameId]
 *
 * Shows detailed information about a specific game and allows
 * guests to start a session ("We're playing this").
 *
 * Wizard params can be passed via query string from the wizard page
 * and will be stored with the session for analytics.
 */

import Link from 'next/link';
import Image from 'next/image';
import { getVenueAndTableBySlugAndTableId, getGameById } from '@/lib/data';
import { parseSetupSteps, parseRulesBullets } from '@/lib/games/formatters';
import { ComplexityBadge, TagChip } from '@/components/table-app';
import { StartSessionButton } from './StartSessionButton';

interface PageProps {
  params: Promise<{
    venueSlug: string;
    tableId: string;
    gameId: string;
  }>;
  searchParams: Promise<{
    pc?: string;
    tb?: string;
    ct?: string;
    vibes?: string;
  }>;
}

export default async function GameDetailPage({ params, searchParams }: PageProps) {
  const { venueSlug, tableId, gameId } = await params;
  const queryParams = await searchParams;

  // Fetch venue, table, and game in parallel
  const [venueTableResult, game] = await Promise.all([
    getVenueAndTableBySlugAndTableId(venueSlug, tableId),
    getGameById(gameId),
  ]);

  // Handle missing data
  if (!venueTableResult || !venueTableResult.table.is_active || !game) {
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
            {!game ? 'Game not found' : 'This table link is not valid'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {!game
              ? 'The game you are looking for does not exist or has been removed.'
              : 'Please scan a valid QR code at your table.'}
          </p>
          <Link
            href={venueTableResult ? `/v/${venueSlug}/t/${tableId}` : '/'}
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {venueTableResult ? 'Back to table' : 'Go to Home'}
          </Link>
        </div>
      </main>
    );
  }

  const { venue, table } = venueTableResult;

  // Parse setup steps and rules
  const setupSteps = parseSetupSteps(game.setup_steps);
  const rulesBullets = parseRulesBullets(game.rules_bullets);

  // Build wizard params object from query string (for session creation)
  // This preserves the user's wizard selections when they start a session
  const wizardParams = queryParams.pc
    ? {
        playerCount: parseInt(queryParams.pc, 10),
        timeBucket: queryParams.tb || null,
        complexityTolerance: queryParams.ct || null,
        vibes: queryParams.vibes ? queryParams.vibes.split(',') : [],
      }
    : null;

  // Build back link (preserve query string for wizard context)
  const backUrl = `/v/${venueSlug}/t/${tableId}/wizard`;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link
            href={backUrl}
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
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {game.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {venue.name} · {table.label}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Cover image */}
        {game.cover_image_url && (
          <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
            <Image
              src={game.cover_image_url}
              alt={`${game.title} cover`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 512px"
              priority
            />
          </div>
        )}

        {/* Game title and metadata */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{game.title}</h2>

          {/* Quick stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>
                {game.min_players}–{game.max_players} players
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                {game.min_time_minutes}–{game.max_time_minutes} min
              </span>
            </div>

            {game.shelf_location && (
              <div className="flex items-center gap-1.5">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{game.shelf_location}</span>
              </div>
            )}
          </div>

          {/* Complexity badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Complexity:</span>
            <ComplexityBadge complexity={game.complexity} />
          </div>

          {/* Vibes */}
          {game.vibes && game.vibes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {game.vibes.map((vibe) => (
                <TagChip key={vibe} label={vibe} />
              ))}
            </div>
          )}
        </div>

        {/* Pitch / Overview */}
        {game.pitch && (
          <section className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Why you might like it
            </h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{game.pitch}</p>
          </section>
        )}

        {/* Setup steps */}
        {setupSteps.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Setup</h3>
            <ol className="space-y-2">
              {setupSteps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-full flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Rules bullets */}
        {rulesBullets.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">How to play</h3>
            <ul className="space-y-2">
              {rulesBullets.map((rule, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full mt-2" />
                  <span className="text-gray-600 dark:text-gray-400">{rule}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Sticky bottom button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="max-w-lg mx-auto">
          <StartSessionButton
            venueSlug={venueSlug}
            tableId={tableId}
            gameId={gameId}
            gameTitle={game.title}
            tableLabel={table.label}
            wizardParams={wizardParams}
          />
        </div>
      </div>
    </main>
  );
}
