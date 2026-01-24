'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { Menu, Search, Bell, Sparkle, ChevronDown, Loader2 } from '@/components/icons';
import { useDensity } from '@/components/providers/DensityProvider';
import { UserMenu } from './UserMenu';
import { cn } from '@/lib/utils';
import { searchVenueGamesAction } from '@/app/actions/games';

// =============================================================================
// TYPES
// =============================================================================

interface AdminShellProps {
  children: React.ReactNode;
  userVenues?: { id: string; name: string }[];
  user?: {
    email: string;
    name: string | null;
  };
}

interface SearchResult {
  id: string;
  title: string;
  cover_image_url: string | null;
  min_players: number;
  max_players: number;
  min_time_minutes: number | null;
  max_time_minutes: number | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AdminShell({ children, userVenues = [], user }: AdminShellProps) {
  const { density } = useDensity();
  const router = useRouter();
  const [openMobile, setOpenMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [venueId, setVenueId] = useState(userVenues[0]?.id ?? '');
  const pathname = usePathname();
  const isSettingsPage = pathname.startsWith('/admin/settings');
  const isLibraryPage = pathname === '/admin/library';

  // Debounced search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const result = await searchVenueGamesAction(searchTerm);
      if (result.success && result.data) {
        setSearchResults(result.data);
        setIsDropdownOpen(true);
        setSelectedIndex(-1);
      } else {
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle selecting a game from dropdown
  const handleSelectGame = useCallback(
    (gameId: string) => {
      router.push(`/admin/library?highlight=${gameId}`);
      setIsDropdownOpen(false);
      setSearchTerm('');
      setSearchResults([]);
    },
    [router]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isDropdownOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && searchResults[selectedIndex]) {
            handleSelectGame(searchResults[selectedIndex].id);
          } else if (searchTerm.trim()) {
            // Navigate to library with search filter
            router.push(`/admin/library?search=${encodeURIComponent(searchTerm.trim())}`);
            setIsDropdownOpen(false);
            setSearchTerm('');
          }
          break;
        case 'Escape':
          setIsDropdownOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [isDropdownOpen, searchResults, selectedIndex, searchTerm, router, handleSelectGame]
  );

  // Format player count display
  const formatPlayerCount = (min: number, max: number) => {
    if (min === max) return `${min}p`;
    return `${min}-${max}p`;
  };

  // Format playtime display
  const formatPlaytime = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min === max || !max) return `${min}min`;
    return `${min}-${max}min`;
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[260px_1fr] bg-noise">
      {/* Sidebar - Hidden on mobile unless menu is open */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 lg:static lg:block',
          openMobile ? 'block' : 'hidden'
        )}
      >
        <Sidebar venueId={venueId} />
        {/* Mobile overlay */}
        {openMobile && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm lg:hidden -z-10"
            onClick={() => setOpenMobile(false)}
          />
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-[color:var(--color-structure)] backdrop-blur-sm bg-[color:var(--color-surface)]/80">
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Mobile Menu Button */}
            <Button
              aria-label="Open menu"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpenMobile(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Venue Selector */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)]">
              <Sparkle className="h-4 w-4 text-orange-500" />
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="bg-transparent text-sm font-semibold focus:outline-none"
                aria-label="Select venue"
              >
                {userVenues.length === 0 ? (
                  <option value="" className="text-[color:var(--color-ink-primary)]">
                    No Venue Found
                  </option>
                ) : (
                  userVenues.map((venue) => (
                    <option key={venue.id} value={venue.id} className="text-[color:var(--color-ink-primary)]">
                      {venue.name}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
            </div>

            {/* Search */}
            <div className="flex-1 relative" ref={searchRef}>
              <Input
                ref={inputRef}
                type="search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value.length >= 2) {
                    setIsDropdownOpen(true);
                  }
                }}
                onFocus={() => {
                  if (searchTerm.length >= 2 && searchResults.length > 0) {
                    setIsDropdownOpen(true);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search games by title"
                className="w-full pl-10"
                aria-label="Search games"
                aria-expanded={isDropdownOpen}
                aria-haspopup="listbox"
                aria-controls="search-results"
              />
              {isSearching ? (
                <Loader2 className="h-4 w-4 absolute left-3 top-3 text-[color:var(--color-ink-secondary)] animate-spin" />
              ) : (
                <Search className="h-4 w-4 absolute left-3 top-3 text-[color:var(--color-ink-secondary)]" />
              )}

              {/* Search Dropdown */}
              {isDropdownOpen && searchTerm.length >= 2 && (
                <div
                  id="search-results"
                  role="listbox"
                  className="absolute top-full left-0 right-0 mt-1 bg-[color:var(--color-surface)] border border-[color:var(--color-structure)] rounded-lg shadow-lg overflow-hidden z-50"
                >
                  {isSearching ? (
                    <div className="px-4 py-3 text-sm text-[color:var(--color-ink-secondary)] flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-[color:var(--color-ink-secondary)]">
                      No games found for &ldquo;{searchTerm}&rdquo;
                    </div>
                  ) : (
                    <>
                      <ul className="max-h-80 overflow-y-auto">
                        {searchResults.map((game, index) => (
                          <li
                            key={game.id}
                            role="option"
                            aria-selected={index === selectedIndex}
                            className={cn(
                              'px-3 py-2 cursor-pointer flex items-center gap-3 hover:bg-[color:var(--color-elevated)] transition-colors',
                              index === selectedIndex && 'bg-[color:var(--color-elevated)]'
                            )}
                            onClick={() => handleSelectGame(game.id)}
                            onMouseEnter={() => setSelectedIndex(index)}
                          >
                            {/* Game Cover Image */}
                            <div className="w-10 h-10 rounded bg-stone-100 flex-shrink-0 overflow-hidden relative">
                              {game.cover_image_url ? (
                                <Image
                                  src={game.cover_image_url}
                                  alt={`${game.title} board game cover`}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                                  ?
                                </div>
                              )}
                            </div>
                            {/* Game Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {game.title}
                              </div>
                              <div className="text-xs text-[color:var(--color-ink-secondary)] flex items-center gap-2">
                                <span>{formatPlayerCount(game.min_players, game.max_players)}</span>
                                {formatPlaytime(game.min_time_minutes, game.max_time_minutes) && (
                                  <>
                                    <span className="text-stone-300">|</span>
                                    <span>{formatPlaytime(game.min_time_minutes, game.max_time_minutes)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="px-3 py-2 border-t border-[color:var(--color-structure)] bg-stone-50">
                        <button
                          className="text-xs text-[color:var(--color-accent)] hover:underline"
                          onClick={() => {
                            router.push(`/admin/library?search=${encodeURIComponent(searchTerm.trim())}`);
                            setIsDropdownOpen(false);
                            setSearchTerm('');
                          }}
                        >
                          View all results in Library
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </Button>
              {user ? (
                <UserMenu user={user} />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-700 font-semibold">
                  --
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 md:px-6 py-6 bg-rulebook-grid">
          <div
            className={cn(
              'mx-auto space-y-4 w-full',
              isSettingsPage || isLibraryPage ? 'max-w-none' : 'max-w-6xl'
            )}
            data-density={density}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
