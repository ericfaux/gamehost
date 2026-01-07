'use client';

import { useState, useEffect, useMemo, useId, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Gamepad2,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
  Check,
} from '@/components/icons';
import { getGamesForBooking } from '@/app/actions/bookings';
import { GamesSkeleton } from './BookingSkeleton';
import { NetworkError } from './BookingErrorBoundary';
import type { BookingData } from './BookingWizard';

interface StepGameProps {
  venueId: string;
  data: BookingData;
  onUpdate: (updates: Partial<BookingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface GameOption {
  id: string;
  title: string;
  min_players: number;
  max_players: number;
}

export function StepGame({
  venueId,
  data,
  onUpdate,
  onNext,
  onBack,
}: StepGameProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [games, setGames] = useState<GameOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const searchInputId = useId();
  const gamesListId = useId();

  // Fetch games with retry support
  const fetchGames = useCallback(async (retryCount = 0) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getGamesForBooking(venueId);
      if (result.success && result.data) {
        setGames(result.data);
      }
    } catch (err) {
      console.error('Error fetching games:', err);

      // Retry logic
      if (retryCount < 2) {
        setIsRetrying(true);
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        setIsRetrying(false);
        return fetchGames(retryCount + 1);
      }

      setError('Unable to load games. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  // Fetch games on mount
  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Filter games by search query and player count
  const filteredGames = useMemo(() => {
    let filtered = games;

    // Filter by player count
    filtered = filtered.filter(
      game =>
        data.partySize >= game.min_players && data.partySize <= game.max_players
    );

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(game =>
        game.title.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [games, searchQuery, data.partySize]);

  // Games that don't fit the party size
  const otherGames = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return games.filter(
      game =>
        game.title.toLowerCase().includes(query) &&
        (data.partySize < game.min_players || data.partySize > game.max_players)
    );
  }, [games, searchQuery, data.partySize]);

  // Handle game selection
  const handleSelectGame = (game: GameOption | null) => {
    if (game) {
      onUpdate({ gameId: game.id, gameTitle: game.title });
    } else {
      onUpdate({ gameId: null, gameTitle: null });
    }
  };

  // Handle skip
  const handleSkip = () => {
    onUpdate({ gameId: null, gameTitle: null });
    onNext();
  };

  // Loading state with skeleton
  if (loading) {
    return <GamesSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-serif font-semibold text-[color:var(--color-ink-primary)]">
            Reserve a Game
          </h2>
          <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
            Optional: Have a specific game waiting at your table
          </p>
        </div>

        <NetworkError onRetry={() => fetchGames()} isRetrying={isRetrying} />

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-3 rounded-token font-medium text-base flex items-center justify-center gap-2 transition-colors touch-manipulation border border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-muted)] min-h-[48px]"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            Back
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="flex-[2] py-3 rounded-token font-medium text-base flex items-center justify-center gap-2 transition-colors touch-manipulation border border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-muted)] min-h-[48px]"
          >
            Skip for now
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-serif font-semibold text-[color:var(--color-ink-primary)]">
          Reserve a Game
        </h2>
        <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
          Optional: Have a specific game waiting at your table
        </p>
      </div>

      {/* Selected Game Banner */}
      {data.gameId && data.gameTitle && (
        <div
          className="flex items-center justify-between p-4 bg-teal-50 rounded-token border border-teal-200"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-teal-600" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-teal-900">{data.gameTitle}</p>
              <p className="text-sm text-teal-700">Reserved for your visit</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSelectGame(null)}
            className="p-2 text-teal-600 hover:text-teal-800 hover:bg-teal-100 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Remove game selection"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <label htmlFor={searchInputId} className="sr-only">
          Search games
        </label>
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[color:var(--color-ink-secondary)] pointer-events-none"
          aria-hidden="true"
        />
        <input
          id={searchInputId}
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search games..."
          autoComplete="off"
          autoCapitalize="off"
          aria-controls={gamesListId}
          className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] pl-11 pr-10 py-3 text-base shadow-card focus-ring min-h-[48px]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[color:var(--color-ink-secondary)] hover:text-[color:var(--color-ink-primary)] rounded-full min-h-[32px] min-w-[32px] flex items-center justify-center"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Games List */}
      <div className="space-y-4" id={gamesListId}>
        {/* Games matching party size */}
        {filteredGames.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)] mb-2">
              Games for {data.partySize} players
            </p>
            <div
              className="space-y-2 max-h-64 overflow-y-auto"
              role="listbox"
              aria-label={`Games available for ${data.partySize} players`}
            >
              {filteredGames.map(game => (
                <button
                  key={game.id}
                  type="button"
                  role="option"
                  aria-selected={data.gameId === game.id}
                  onClick={() => handleSelectGame(game)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-token border transition-colors touch-manipulation text-left min-h-[64px]',
                    'active:scale-[0.99]',
                    data.gameId === game.id
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] hover:border-teal-300'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      data.gameId === game.id
                        ? 'bg-teal-500 text-white'
                        : 'bg-[color:var(--color-muted)] text-[color:var(--color-ink-secondary)]'
                    )}
                  >
                    {data.gameId === game.id ? (
                      <Check className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <Gamepad2 className="w-5 h-5" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'font-medium truncate',
                        data.gameId === game.id
                          ? 'text-teal-900'
                          : 'text-[color:var(--color-ink-primary)]'
                      )}
                    >
                      {game.title}
                    </p>
                    <p className="text-sm text-[color:var(--color-ink-secondary)] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {game.min_players === game.max_players
                          ? `${game.min_players} players`
                          : `${game.min_players}-${game.max_players} players`}
                      </span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No matching games */}
        {filteredGames.length === 0 && !searchQuery && (
          <div className="py-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-[color:var(--color-muted)] flex items-center justify-center mb-3">
              <Gamepad2 className="w-7 h-7 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
            </div>
            <p className="text-sm text-[color:var(--color-ink-secondary)]">
              No games available for {data.partySize} players
            </p>
            <p className="text-xs text-[color:var(--color-ink-secondary)] mt-1">
              You can skip this step and browse our library when you arrive
            </p>
          </div>
        )}

        {/* No search results */}
        {filteredGames.length === 0 && searchQuery && otherGames.length === 0 && (
          <div className="py-6 text-center" role="status">
            <p className="text-sm text-[color:var(--color-ink-secondary)]">
              No games found matching &quot;{searchQuery}&quot;
            </p>
          </div>
        )}

        {/* Games that don't fit party size */}
        {otherGames.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)] mb-2">
              Other matching games (different player count)
            </p>
            <div className="space-y-2 max-h-32 overflow-y-auto opacity-60">
              {otherGames.map(game => (
                <div
                  key={game.id}
                  className="flex items-center gap-3 p-3 rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-muted)]"
                  aria-disabled="true"
                >
                  <div className="w-10 h-10 rounded-lg bg-[color:var(--color-structure)] flex items-center justify-center flex-shrink-0">
                    <Gamepad2 className="w-5 h-5 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[color:var(--color-ink-secondary)] truncate">
                      {game.title}
                    </p>
                    <p className="text-sm text-[color:var(--color-ink-secondary)] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{game.min_players}-{game.max_players} players</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-token font-medium text-base flex items-center justify-center gap-2 transition-colors touch-manipulation border border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-muted)] min-h-[48px]"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          Back
        </button>

        {data.gameId ? (
          <button
            type="button"
            onClick={onNext}
            className="flex-[2] py-3 rounded-token font-semibold text-base flex items-center justify-center gap-2 transition-colors touch-manipulation bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98] min-h-[48px]"
          >
            Continue
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSkip}
            className="flex-[2] py-3 rounded-token font-medium text-base flex items-center justify-center gap-2 transition-colors touch-manipulation border border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-muted)] min-h-[48px]"
          >
            Skip for now
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
