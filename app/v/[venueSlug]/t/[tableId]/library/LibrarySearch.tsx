'use client';

import { useState, useEffect, useCallback } from 'react';
import { searchGamesAction } from './actions';
import { QuickPickCard } from '@/components/table-app';
import type { Game } from '@/lib/db/types';

interface LibrarySearchProps {
  venueId: string;
  venueSlug: string;
  tableId: string;
}

/**
 * LibrarySearch - Client component for searching games in the venue library.
 * Used for Option A checkout flow where guests already have a game from the shelf.
 */
export function LibrarySearch({ venueId, venueSlug, tableId }: LibrarySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    try {
      const games = await searchGamesAction(venueId, searchQuery);
      setResults(games);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg
            className="w-5 h-5 text-[color:var(--color-ink-tertiary)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for your game..."
          className="w-full pl-12 pr-4 py-4 text-lg bg-[color:var(--color-elevated)] border border-[color:var(--color-structure)] rounded-xl text-[color:var(--color-ink-primary)] placeholder:text-[color:var(--color-ink-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)] focus:border-transparent transition-all"
          autoFocus
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <svg
              className="w-5 h-5 text-[color:var(--color-accent)] animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!hasSearched && query.length < 2 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-[color:var(--color-accent-soft)] rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[color:var(--color-accent)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[color:var(--color-ink-primary)] mb-2">
            Find Your Game
          </h2>
          <p className="text-[color:var(--color-ink-secondary)]">
            Type the name of the game you grabbed from the shelf
          </p>
        </div>
      )}

      {/* Search Results */}
      {hasSearched && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-[color:var(--color-ink-secondary)]">
            {results.length} game{results.length !== 1 ? 's' : ''} found
          </p>
          <div className="grid grid-cols-2 gap-3">
            {results.map((game) => (
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

      {/* No Results */}
      {hasSearched && results.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-[color:var(--color-muted)] rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[color:var(--color-ink-tertiary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[color:var(--color-ink-primary)] mb-2">
            No games found
          </h2>
          <p className="text-[color:var(--color-ink-secondary)]">
            Try a different search term or check the game box for the exact title
          </p>
        </div>
      )}
    </div>
  );
}
