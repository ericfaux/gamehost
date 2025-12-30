'use client';

/**
 * Card component for displaying a game recommendation.
 * Uses theme tokens for consistent "Tabletop Tactile" styling.
 *
 * Features:
 * - Primary "Play this" action to directly select the game
 * - Secondary "Details" link to view full game info
 */

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Game } from '@/lib/db/types';
import { ComplexityBadge } from './ComplexityBadge';
import { TagChip } from './TagChip';
import { selectGameForSession } from '@/app/v/[venueSlug]/t/[tableId]/games/[gameId]/actions';

interface GameCardProps {
  game: Game;
  venueSlug: string;
  tableId: string;
  /** Optional query string to append to the details link (e.g., wizard params) */
  queryString?: string;
}

export function GameCard({ game, venueSlug, tableId, queryString }: GameCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const detailsUrl = `/v/${venueSlug}/t/${tableId}/games/${game.id}${queryString ? `?${queryString}` : ''}`;
  const landingUrl = `/v/${venueSlug}/t/${tableId}`;

  const handlePlayThis = () => {
    startTransition(async () => {
      const result = await selectGameForSession({
        venueSlug,
        tableId,
        gameId: game.id,
        wizardParams: queryString ? Object.fromEntries(new URLSearchParams(queryString)) : undefined,
      });

      if (result.success) {
        // Navigate to landing page to show "Now Playing"
        router.push(landingUrl);
      } else {
        // Show error - in a real app you might want a toast
        console.error('Failed to select game:', result.error);
      }
    });
  };

  return (
    <div className="panel-surface overflow-hidden">
      {/* Cover image */}
      {game.cover_image_url && (
        <div className="relative w-full h-40 bg-[color:var(--color-muted)]">
          <Image
            src={game.cover_image_url}
            alt={`${game.title} cover`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="text-lg font-bold text-[color:var(--color-ink-primary)]">{game.title}</h3>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--color-ink-secondary)]">
          <span className="flex items-center gap-1">
            <svg
              className="w-4 h-4"
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
            {game.min_players}–{game.max_players} players
          </span>
          <span className="text-[color:var(--color-structure)]">•</span>
          <span className="flex items-center gap-1">
            <svg
              className="w-4 h-4"
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
            {game.min_time_minutes}–{game.max_time_minutes} min
          </span>
        </div>

        {/* Complexity badge */}
        <ComplexityBadge complexity={game.complexity} />

        {/* Vibes */}
        {game.vibes && game.vibes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {game.vibes.slice(0, 3).map((vibe) => (
              <TagChip key={vibe} label={vibe} />
            ))}
            {game.vibes.length > 3 && (
              <span className="text-xs text-[color:var(--color-ink-secondary)] self-center">
                +{game.vibes.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Pitch */}
        {game.pitch && (
          <p className="text-sm text-[color:var(--color-ink-secondary)] line-clamp-2">
            {game.pitch}
          </p>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-1">
          {/* Primary: Play this */}
          <button
            onClick={handlePlayThis}
            disabled={isPending}
            className="w-full py-3 text-base font-semibold text-[color:var(--color-surface)] bg-[color:var(--color-ink-primary)] hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-[var(--shadow-token)] transition-all hover:-translate-y-0.5 focus-ring"
          >
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Selecting...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play this
              </span>
            )}
          </button>

          {/* Secondary: View Details */}
          <Link
            href={detailsUrl}
            className="inline-flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-[color:var(--color-accent)] hover:underline focus-ring rounded"
          >
            View Details
            <svg
              className="w-4 h-4 ml-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
