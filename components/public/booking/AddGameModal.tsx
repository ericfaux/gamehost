'use client';

import { useState, useEffect, useMemo } from 'react';
import { updateBooking, getGamesForBooking } from '@/app/actions/bookings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Gamepad2, Check, Users, X } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { BookingWithDetails } from '@/lib/db/types';

interface AddGameModalProps {
  open: boolean;
  onClose: () => void;
  booking: BookingWithDetails;
  onComplete: (updatedBooking: BookingWithDetails) => void;
}

interface GameOption {
  id: string;
  title: string;
  min_players: number;
  max_players: number;
}

export function AddGameModal({ open, onClose, booking, onComplete }: AddGameModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [games, setGames] = useState<GameOption[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameOption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch games when modal opens
  useEffect(() => {
    if (!open) return;

    setIsLoading(true);
    setError(null);
    setSelectedGame(null);
    setSearchQuery('');

    async function fetchGames() {
      try {
        const result = await getGamesForBooking(booking.venue_id);
        if (result.success && result.data) {
          setGames(result.data);
        } else {
          setError('Failed to load games');
        }
      } catch {
        setError('Failed to load games');
      } finally {
        setIsLoading(false);
      }
    }

    fetchGames();
  }, [open, booking.venue_id]);

  // Filter games by search query and party size
  const filteredGames = useMemo(() => {
    let filtered = games;

    // Filter by player count
    filtered = filtered.filter(
      game =>
        booking.party_size >= game.min_players && booking.party_size <= game.max_players
    );

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(game => game.title.toLowerCase().includes(query));
    }

    return filtered;
  }, [games, searchQuery, booking.party_size]);

  // Games that don't fit party size but match search
  const otherGames = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return games.filter(
      game =>
        game.title.toLowerCase().includes(query) &&
        (booking.party_size < game.min_players || booking.party_size > game.max_players)
    );
  }, [games, searchQuery, booking.party_size]);

  const handleSubmit = async () => {
    if (!selectedGame) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateBooking(booking.id, {
        game_id: selectedGame.id,
      });

      if (result.success) {
        // Refetch the booking with full details
        const { getBookingById } = await import('@/lib/data/bookings');
        const updatedBooking = await getBookingById(booking.id);
        if (updatedBooking) {
          onComplete(updatedBooking);
        } else {
          // Fallback: update locally
          onComplete({
            ...booking,
            game_id: selectedGame.id,
            game: {
              id: selectedGame.id,
              title: selectedGame.title,
              cover_image_url: null,
            },
          });
        }
      } else {
        setError(result.error ?? 'Failed to add game');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-teal-600" />
            Reserve a Game
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-[color:var(--color-ink-secondary)]">
            Reserve a game and we&apos;ll have it ready at your table when you arrive.
          </p>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--color-ink-secondary)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a game..."
              className="pl-10"
              disabled={isSubmitting}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[color:var(--color-ink-secondary)] hover:text-[color:var(--color-ink-primary)] rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[color:var(--color-ink-secondary)]" />
              </div>
            ) : filteredGames.length === 0 && !searchQuery ? (
              <div className="text-center py-8">
                <Gamepad2 className="w-10 h-10 mx-auto text-[color:var(--color-ink-secondary)] opacity-50" />
                <p className="mt-2 text-sm text-[color:var(--color-ink-secondary)]">
                  No games available for {booking.party_size} players
                </p>
              </div>
            ) : filteredGames.length === 0 && searchQuery && otherGames.length === 0 ? (
              <div className="text-center py-8 text-[color:var(--color-ink-secondary)]">
                No games found matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div className="space-y-2">
                {/* Games matching party size */}
                {filteredGames.length > 0 && (
                  <div>
                    {searchQuery && (
                      <p className="text-xs uppercase tracking-wider text-[color:var(--color-ink-secondary)] mb-2">
                        Games for {booking.party_size} players
                      </p>
                    )}
                    {filteredGames.map((game) => (
                      <button
                        key={game.id}
                        onClick={() => setSelectedGame(game)}
                        disabled={isSubmitting}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors mb-2',
                          selectedGame?.id === game.id
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-[color:var(--color-structure)] hover:border-teal-300'
                        )}
                      >
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                            selectedGame?.id === game.id
                              ? 'bg-teal-500 text-white'
                              : 'bg-[color:var(--color-muted)] text-[color:var(--color-ink-secondary)]'
                          )}
                        >
                          {selectedGame?.id === game.id ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <Gamepad2 className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={cn(
                              'font-medium truncate',
                              selectedGame?.id === game.id
                                ? 'text-teal-900'
                                : 'text-[color:var(--color-ink-primary)]'
                            )}
                          >
                            {game.title}
                          </div>
                          <div className="text-sm text-[color:var(--color-ink-secondary)] flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {game.min_players === game.max_players
                              ? `${game.min_players} players`
                              : `${game.min_players}-${game.max_players} players`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Games that don't fit party size */}
                {otherGames.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs uppercase tracking-wider text-[color:var(--color-ink-secondary)] mb-2">
                      Other matches (different player count)
                    </p>
                    <div className="opacity-60 space-y-2">
                      {otherGames.map((game) => (
                        <div
                          key={game.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-[color:var(--color-structure)] bg-[color:var(--color-muted)]"
                        >
                          <div className="w-10 h-10 rounded-lg bg-[color:var(--color-structure)] flex items-center justify-center flex-shrink-0">
                            <Gamepad2 className="w-5 h-5 text-[color:var(--color-ink-secondary)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[color:var(--color-ink-secondary)] truncate">
                              {game.title}
                            </div>
                            <div className="text-sm text-[color:var(--color-ink-secondary)] flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {game.min_players}-{game.max_players} players
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedGame || isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Reserve Game
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
