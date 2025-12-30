'use client';

/**
 * LibraryCommandBar - Compact operator-friendly command bar for the Library page.
 *
 * Includes:
 * - Global search input (title substring match)
 * - Quick filter chips (toggleable)
 * - Small stats strip
 */

import { Search, X } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Game } from '@/lib/db/types';

export type LibraryFilter = 'in_use' | 'bottlenecked' | 'out_for_repair' | 'problematic';

interface LibraryCommandBarProps {
  games: Game[];
  copiesInUse: Record<string, number>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilters: Set<LibraryFilter>;
  onFilterToggle: (filter: LibraryFilter) => void;
}

interface FilterChip {
  id: LibraryFilter;
  label: string;
  count: number;
  color: 'warn' | 'danger' | 'muted';
}

export function LibraryCommandBar({
  games,
  copiesInUse,
  searchQuery,
  onSearchChange,
  activeFilters,
  onFilterToggle,
}: LibraryCommandBarProps) {
  // Compute stats
  const gamesInRotation = games.filter((g) => g.status === 'in_rotation').length;

  const gamesInUse = games.filter((g) => {
    const inUse = copiesInUse[g.id] ?? 0;
    return inUse > 0;
  }).length;

  const bottleneckedGames = games.filter((g) => {
    const copies = g.copies_in_rotation ?? 1;
    const inUse = copiesInUse[g.id] ?? 0;
    return copies > 0 && inUse >= copies;
  }).length;

  const outForRepairGames = games.filter((g) => g.status === 'out_for_repair').length;

  const problematicGames = games.filter((g) => g.condition === 'problematic').length;

  const filterChips: FilterChip[] = [
    { id: 'in_use', label: 'In use now', count: gamesInUse, color: 'warn' },
    { id: 'bottlenecked', label: 'Bottlenecked', count: bottleneckedGames, color: 'danger' },
    { id: 'out_for_repair', label: 'Out for repair', count: outForRepairGames, color: 'muted' },
    { id: 'problematic', label: 'Problematic', count: problematicGames, color: 'danger' },
  ];

  const colorMap = {
    warn: 'bg-[color:var(--color-warn)]/10 border-[color:var(--color-warn)]/30 text-[color:var(--color-warn)]',
    danger: 'bg-[color:var(--color-danger)]/10 border-[color:var(--color-danger)]/30 text-[color:var(--color-danger)]',
    muted: 'bg-[color:var(--color-muted)] border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)]',
  };

  const activeColorMap = {
    warn: 'bg-[color:var(--color-warn)] border-[color:var(--color-warn)] text-white',
    danger: 'bg-[color:var(--color-danger)] border-[color:var(--color-danger)] text-white',
    muted: 'bg-[color:var(--color-ink-secondary)] border-[color:var(--color-ink-secondary)] text-white',
  };

  return (
    <div className="space-y-3">
      {/* Search and Stats Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--color-ink-secondary)]" />
          <Input
            type="search"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-secondary)] hover:text-[color:var(--color-ink-primary)]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Stats Strip */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-[color:var(--color-ink-secondary)]">In rotation:</span>
            <span className="font-semibold text-[color:var(--color-accent)]">{gamesInRotation}</span>
          </div>
          <div className="h-4 w-px bg-[color:var(--color-structure)]" />
          <div className="flex items-center gap-2">
            <span className="text-[color:var(--color-ink-secondary)]">In use:</span>
            <span className="font-semibold text-[color:var(--color-warn)]">{gamesInUse}</span>
          </div>
          <div className="h-4 w-px bg-[color:var(--color-structure)]" />
          <div className="flex items-center gap-2">
            <span className="text-[color:var(--color-ink-secondary)]">Bottlenecked:</span>
            <span className="font-semibold text-[color:var(--color-danger)]">{bottleneckedGames}</span>
          </div>
        </div>
      </div>

      {/* Filter Chips Row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-[color:var(--color-ink-secondary)] mr-1">Quick filters:</span>
        {filterChips.map((chip) => {
          const isActive = activeFilters.has(chip.id);
          return (
            <button
              key={chip.id}
              onClick={() => onFilterToggle(chip.id)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border
                transition-all duration-150
                ${isActive ? activeColorMap[chip.color] : colorMap[chip.color]}
                hover:opacity-90
              `}
            >
              {chip.label}
              <span className={`
                px-1.5 py-0.5 rounded-full text-[10px] font-bold
                ${isActive ? 'bg-white/20' : 'bg-black/5'}
              `}>
                {chip.count}
              </span>
            </button>
          );
        })}

        {activeFilters.size > 0 && (
          <button
            onClick={() => {
              activeFilters.forEach((f) => onFilterToggle(f));
            }}
            className="text-xs text-[color:var(--color-accent)] hover:underline ml-2"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
