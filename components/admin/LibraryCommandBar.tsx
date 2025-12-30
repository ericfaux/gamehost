'use client';

/**
 * LibraryCommandBar - Compact operator-friendly command bar for the Library page.
 *
 * Includes:
 * - Global search input (title substring match)
 * - Quick filter chips (toggleable) with info tooltips
 * - Small stats strip
 */

import { useState, useRef, useEffect } from 'react';
import { Search, X, Info } from '@/components/icons';
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
  tooltip: string;
}

/**
 * Tooltip component for filter definitions
 */
function FilterTooltip({
  tooltip,
  children
}: {
  tooltip: string;
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // If too close to top of viewport, show tooltip below
      if (rect.top < 80) {
        setPosition('bottom');
      } else {
        setPosition('top');
      }
    }
  }, [isVisible]);

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`
            absolute left-1/2 -translate-x-1/2 z-50
            px-3 py-2 text-xs font-normal text-[color:var(--color-ink-primary)]
            bg-[color:var(--color-elevated)] border border-[color:var(--color-structure)]
            rounded-lg shadow-card whitespace-nowrap
            ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
          `}
        >
          {tooltip}
          <div
            className={`
              absolute left-1/2 -translate-x-1/2 w-2 h-2
              bg-[color:var(--color-elevated)] border-[color:var(--color-structure)]
              transform rotate-45
              ${position === 'top'
                ? 'top-full -mt-1 border-r border-b'
                : 'bottom-full -mb-1 border-l border-t'
              }
            `}
          />
        </div>
      )}
    </div>
  );
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
    {
      id: 'in_use',
      label: 'In use now',
      count: gamesInUse,
      color: 'warn',
      tooltip: 'Games with copies_in_use > 0'
    },
    {
      id: 'bottlenecked',
      label: 'Bottlenecked',
      count: bottleneckedGames,
      color: 'danger',
      tooltip: 'All copies in use (copies_in_use ≥ copies_in_rotation)'
    },
    {
      id: 'out_for_repair',
      label: 'Out for repair',
      count: outForRepairGames,
      color: 'muted',
      tooltip: 'Game status set to "out for repair"'
    },
    {
      id: 'problematic',
      label: 'Problematic',
      count: problematicGames,
      color: 'danger',
      tooltip: 'Game condition set to "problematic"'
    },
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
          <FilterTooltip tooltip="Computed: copies_in_use ≥ copies_in_rotation">
            <div className="flex items-center gap-2 cursor-help">
              <span className="text-[color:var(--color-ink-secondary)]">Bottlenecked:</span>
              <span className="font-semibold text-[color:var(--color-danger)]">{bottleneckedGames}</span>
              <Info className="h-3 w-3 text-[color:var(--color-ink-secondary)]" />
            </div>
          </FilterTooltip>
        </div>
      </div>

      {/* Filter Chips Row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-[color:var(--color-ink-secondary)] mr-1">Quick filters:</span>
        {filterChips.map((chip) => {
          const isActive = activeFilters.has(chip.id);
          return (
            <FilterTooltip key={chip.id} tooltip={chip.tooltip}>
              <button
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
            </FilterTooltip>
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
