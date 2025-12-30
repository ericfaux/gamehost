'use client';

/**
 * QuickPickCard - Compact game card for the Quick Picks section on guest landing.
 *
 * Features:
 * - Compact display (cover, title, player count, time)
 * - Primary "Play this" action that directly selects the game
 * - Secondary "Details" link to game detail page
 */

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Game } from '@/lib/db/types';
import { selectGameForSession } from '@/app/v/[venueSlug]/t/[tableId]/games/[gameId]/actions';

interface QuickPickCardProps {
  game: Game;
  venueSlug: string;
  tableId: string;
}

export function QuickPickCard({ game, venueSlug, tableId }: QuickPickCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handlePlayThis = () => {
    startTransition(async () => {
      const result = await selectGameForSession({
        venueSlug,
        tableId,
        gameId: game.id,
      });

      if (result.success) {
        // Refresh the landing page to show "Now Playing"
        router.refresh();
      } else {
        // Show error - in a real app you might want a toast
        console.error('Failed to select game:', result.error);
      }
    });
  };

  const detailsUrl = `/v/${venueSlug}/t/${tableId}/games/${game.id}`;

  return (
    <div className="panel-surface overflow-hidden flex flex-col">
      {/* Cover image */}
      <div className="relative w-full aspect-[4/3] bg-[color:var(--color-muted)]">
        {game.cover_image_url ? (
          <Image
            src={game.cover_image_url}
            alt={game.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 200px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[color:var(--color-structure-strong)]"
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
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col">
        {/* Title */}
        <h3 className="font-bold text-[color:var(--color-ink-primary)] text-sm line-clamp-2 mb-1">
          {game.title}
        </h3>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-[color:var(--color-ink-secondary)] mb-3">
          <span>{game.min_players}-{game.max_players}p</span>
          <span className="text-[color:var(--color-structure)]">•</span>
          <span>{game.min_time_minutes}-{game.max_time_minutes}m</span>
        </div>

        {/* Actions */}
        <div className="mt-auto space-y-2">
          <button
            onClick={handlePlayThis}
            disabled={isPending}
            className="w-full py-2.5 text-sm font-semibold text-[color:var(--color-surface)] bg-[color:var(--color-ink-primary)] hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-[var(--shadow-token)] transition-all hover:-translate-y-0.5 focus-ring"
          >
            {isPending ? (
              <span className="inline-flex items-center gap-1.5">
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
              'Play this'
            )}
          </button>

          <Link
            href={detailsUrl}
            className="block w-full py-2 text-center text-xs font-medium text-[color:var(--color-accent)] hover:underline focus-ring rounded"
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}
