'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AlertTriangle, ChevronRight } from '@/components/icons';
import type { BottleneckedGame } from '@/lib/data/dashboard';

export interface BottleneckWidgetProps {
  games: BottleneckedGame[];
}

/**
 * BottleneckWidget - Mini widget showing currently bottlenecked games.
 * Compact card showing games with demand exceeding availability.
 */
export function BottleneckWidget({ games }: BottleneckWidgetProps) {
  const displayGames = games.slice(0, 3);
  const hasBottlenecks = games.length > 0;

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        'bg-[color:var(--color-elevated)] border-[color:var(--color-structure)]',
        'shadow-card',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle
          className={cn(
            'w-4 h-4',
            hasBottlenecks
              ? 'text-[color:var(--color-warn)]'
              : 'text-[color:var(--color-ink-secondary)]',
          )}
        />
        <span className="text-sm font-semibold text-[color:var(--color-ink-primary)]">
          Bottlenecked Now:
        </span>
        <span
          className={cn(
            'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full',
            'text-xs font-bold',
            hasBottlenecks
              ? 'bg-[color:var(--color-warn)]/15 text-[color:var(--color-warn)]'
              : 'bg-[color:var(--color-muted)] text-[color:var(--color-ink-secondary)]',
          )}
        >
          {games.length}
        </span>
      </div>

      {/* Content */}
      {hasBottlenecks ? (
        <>
          {/* Game list */}
          <ul className="flex flex-col gap-1.5 mb-3">
            {displayGames.map((game) => (
              <li
                key={game.gameId}
                className="text-sm text-[color:var(--color-ink-primary)]"
              >
                <span className="font-medium">{game.title}</span>
                <span className="text-[color:var(--color-ink-secondary)] ml-1">
                  ({game.copiesInUse}/{game.copiesInRotation})
                </span>
              </li>
            ))}
          </ul>

          {/* Manage link */}
          <Link
            href="/admin/library?filter=bottlenecked"
            className={cn(
              'inline-flex items-center gap-1 text-sm font-medium',
              'text-[color:var(--color-accent)] hover:underline',
            )}
          >
            Manage copies
            <ChevronRight className="w-4 h-4" />
          </Link>
        </>
      ) : (
        <div className="text-sm text-[color:var(--color-ink-secondary)]">
          No bottlenecks 🎉
        </div>
      )}
    </div>
  );
}
