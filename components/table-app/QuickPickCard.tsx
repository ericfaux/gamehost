/**
 * QuickPickCard - Compact game card for the Quick Picks section on guest landing.
 *
 * Features:
 * - Compact display (cover, title, player count, time)
 * - "Play this" navigates to game details page for checkout confirmation
 */

import Image from 'next/image';
import Link from 'next/link';
import type { Game } from '@/lib/db/types';

interface QuickPickCardProps {
  game: Game;
  venueSlug: string;
  tableId: string;
  /** Whether to show the trending indicator badge */
  showTrendingBadge?: boolean;
}

export function QuickPickCard({
  game,
  venueSlug,
  tableId,
  showTrendingBadge = false,
}: QuickPickCardProps) {
  const gameDetailsUrl = `/v/${venueSlug}/t/${tableId}/games/${game.id}`;

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
        {/* Title with optional trending badge */}
        <div className="flex items-start gap-2 mb-1">
          <h3 className="font-bold text-[color:var(--color-ink-primary)] text-sm line-clamp-2 flex-1 min-w-0">
            {game.title}
          </h3>
          {showTrendingBadge && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full whitespace-nowrap flex-shrink-0">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                  clipRule="evenodd"
                />
              </svg>
              Trending
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-[color:var(--color-ink-secondary)] mb-3">
          <span>{game.min_players}-{game.max_players}p</span>
          <span className="text-[color:var(--color-structure)]">•</span>
          <span>{game.min_time_minutes}-{game.max_time_minutes}m</span>
        </div>

        {/* Single link to game details */}
        <div className="mt-auto">
          <Link
            href={gameDetailsUrl}
            className="block w-full py-2.5 text-sm font-semibold text-[color:var(--color-surface)] bg-[color:var(--color-ink-primary)] hover:opacity-90 active:opacity-80 rounded-xl shadow-[var(--shadow-token)] transition-all hover:-translate-y-0.5 focus-ring text-center"
          >
            Play this
          </Link>
        </div>
      </div>
    </div>
  );
}
