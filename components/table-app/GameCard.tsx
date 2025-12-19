/**
 * Card component for displaying a game recommendation.
 * Used in the wizard results to show recommended games.
 */

import Link from 'next/link';
import Image from 'next/image';
import type { Game } from '@/lib/db/types';
import { ComplexityBadge } from './ComplexityBadge';
import { TagChip } from './TagChip';

interface GameCardProps {
  game: Game;
  venueSlug: string;
  tableId: string;
  /** Optional query string to append to the details link (e.g., wizard params) */
  queryString?: string;
}

export function GameCard({ game, venueSlug, tableId, queryString }: GameCardProps) {
  const detailsUrl = `/v/${venueSlug}/t/${tableId}/games/${game.id}${queryString ? `?${queryString}` : ''}`;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Cover image */}
      {game.cover_image_url && (
        <div className="relative w-full h-40 bg-gray-100 dark:bg-gray-800">
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
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{game.title}</h3>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
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
          <span className="text-gray-300 dark:text-gray-600">•</span>
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
              <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
                +{game.vibes.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Pitch */}
        {game.pitch && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {game.pitch}
          </p>
        )}

        {/* Details button */}
        <Link
          href={detailsUrl}
          className="inline-flex items-center justify-center w-full px-4 py-2.5 mt-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
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
  );
}
