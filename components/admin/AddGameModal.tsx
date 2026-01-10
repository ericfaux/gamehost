'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from '@/components/icons';
import { addGame, updateGame } from '@/app/admin/library/actions';
import { searchGamesAction, getGameDetailsAction } from '@/app/admin/library/bgg-actions';
import type { Game, GameStatus, GameCondition } from '@/lib/db/types';
import type { BggGameDetails, BggSearchResult } from '@/lib/bgg';

interface GameFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Game | null;
  onSave?: (game: Partial<Game>) => void;
}

interface FormState {
  title: string;
  description: string;
  minPlayers: string;
  maxPlayers: string;
  minTime: string;
  maxTime: string;
  complexity: string;
  shelfLocation: string;
  bggRank: string;
  bggRating: string;
  imageUrl: string;
  copiesInRotation: string;
  status: GameStatus;
  condition: GameCondition;
  vibes: string[];
  setupSteps: string;
  rulesBullets: string;
  bggId: string;
  isStaffPick: boolean;
}

const initialFormState: FormState = {
  title: '',
  description: '',
  minPlayers: '',
  maxPlayers: '',
  minTime: '',
  maxTime: '',
  complexity: '',
  shelfLocation: '',
  bggRank: '',
  bggRating: '',
  imageUrl: '',
  copiesInRotation: '1',
  status: 'in_rotation',
  condition: 'good',
  vibes: [],
  setupSteps: '',
  rulesBullets: '',
  bggId: '',
  isStaffPick: false,
};

function mapGameToFormState(game: Game): FormState {
  return {
    title: game.title,
    description: game.pitch || '',
    minPlayers: String(game.min_players),
    maxPlayers: String(game.max_players),
    minTime: String(game.min_time_minutes),
    maxTime: String(game.max_time_minutes),
    complexity: game.complexity,
    shelfLocation: game.shelf_location || '',
    bggRank: game.bgg_rank ? String(game.bgg_rank) : '',
    bggRating: game.bgg_rating ? String(game.bgg_rating) : '',
    imageUrl: game.cover_image_url || '',
    copiesInRotation: String(game.copies_in_rotation ?? 1),
    status: game.status,
    condition: game.condition,
    vibes: game.vibes ?? [],
    setupSteps: game.setup_steps || '',
    rulesBullets: game.rules_bullets || '',
    bggId: game.bgg_id || '',
    isStaffPick: game.is_staff_pick ?? false,
  };
}

// Status options for the select
const STATUS_OPTIONS: { value: GameStatus; label: string }[] = [
  { value: 'in_rotation', label: 'In rotation' },
  { value: 'out_for_repair', label: 'Out for repair' },
  { value: 'retired', label: 'Retired' },
  { value: 'for_sale', label: 'For sale' },
];

// Condition options for the select
const CONDITION_OPTIONS: { value: GameCondition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'good', label: 'Good' },
  { value: 'worn', label: 'Worn' },
  { value: 'problematic', label: 'Problematic' },
];

// Common vibe tags for quick selection
const COMMON_VIBES = [
  'calming',
  'competitive',
  'cooperative',
  'strategic',
  'party',
  'social deduction',
  'word game',
  'family',
  'quick',
  'brain burner',
];

export function GameFormModal({ isOpen, onClose, initialData, onSave }: GameFormModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // BGG Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BggSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Form state (controlled inputs for autofill)
  const [formState, setFormState] = useState<FormState>(
    initialData ? mapGameToFormState(initialData) : initialFormState,
  );

  // New vibe input
  const [newVibe, setNewVibe] = useState('');

  // Handle escape key to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSearchError(null);
      setShowResults(false);
      setFormState(initialFormState);
      setError(null);
      setNewVibe('');
    } else {
      setFormState(initialData ? mapGameToFormState(initialData) : initialFormState);
      setError(null);
    }
  }, [isOpen, initialData]);

  // Handle click outside to close modal
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  // Update a single form field
  function updateFormField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }

  // Handle BGG search
  async function handleSearch() {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setShowResults(true);

    const result = await searchGamesAction(searchQuery);

    if (result.success && result.data) {
      setSearchResults(result.data);
      if (result.data.length === 0) {
        setSearchError('No games found. Try a different search term.');
      }
    } else {
      setSearchError(result.error || 'Search failed');
      setSearchResults([]);
    }

    setIsSearching(false);
  }

  // Handle search on Enter key
  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }

  // Handle selecting a game from search results
  async function handleSelectGame(gameId: string) {
    setIsFetchingDetails(true);
    setSearchError(null);

    const result = await getGameDetailsAction(gameId);

    if (result.success && result.data) {
      const details: BggGameDetails = result.data;
      setFormState((prev) => ({
        ...prev,
        bggId: gameId,  // Store the BGG ID for exact matching
        title: details.title,
        description: details.pitch || '',
        minPlayers: String(details.min_players),
        maxPlayers: String(details.max_players),
        minTime: String(details.min_time_minutes),
        maxTime: String(details.max_time_minutes),
        complexity: details.complexity,
        bggRank: details.bgg_rank ? String(details.bgg_rank) : '',
        bggRating: details.bgg_rating ? String(details.bgg_rating) : '',
        imageUrl: details.cover_image_url || '',
        vibes: details.vibes ?? [],
      }));
      setShowResults(false);
      setSearchResults([]);
    } else {
      setSearchError(result.error || 'Failed to fetch game details');
    }

    setIsFetchingDetails(false);
  }

  // Handle clearing the form
  function handleClearForm() {
    setFormState(initialFormState);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setSearchError(null);
    setError(null);
    setNewVibe('');
  }

  // Handle vibe tag toggle
  function toggleVibe(vibe: string) {
    setFormState((prev) => {
      const vibes = prev.vibes.includes(vibe)
        ? prev.vibes.filter((v) => v !== vibe)
        : [...prev.vibes, vibe];
      return { ...prev, vibes };
    });
  }

  // Handle adding custom vibe
  function addCustomVibe() {
    const vibe = newVibe.trim().toLowerCase();
    if (vibe && !formState.vibes.includes(vibe)) {
      setFormState((prev) => ({ ...prev, vibes: [...prev.vibes, vibe] }));
    }
    setNewVibe('');
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      // Add status and condition to form data
      formData.set('status', formState.status);
      formData.set('condition', formState.condition);
      formData.set('vibes', JSON.stringify(formState.vibes));
      formData.set('setupSteps', formState.setupSteps);
      formData.set('rulesBullets', formState.rulesBullets);
      formData.set('bggId', formState.bggId);
      formData.set('isStaffPick', String(formState.isStaffPick));

      if (initialData) {
        formData.append('id', initialData.id);
      }

      const result = initialData ? await updateGame(formData) : await addGame(formData);
      if (result.success) {
        const savedGame: Partial<Game> = {
          title: formState.title,
          pitch: formState.description,
          min_players: Number(formState.minPlayers) || 0,
          max_players: Number(formState.maxPlayers) || 0,
          min_time_minutes: Number(formState.minTime) || 0,
          max_time_minutes: Number(formState.maxTime) || 0,
          complexity: (formState.complexity || 'medium') as Game['complexity'],
          shelf_location: formState.shelfLocation,
          bgg_rank: formState.bggRank ? Number(formState.bggRank) : null,
          bgg_rating: formState.bggRating ? Number(formState.bggRating) : null,
          cover_image_url: formState.imageUrl,
          copies_in_rotation: Number(formState.copiesInRotation) || 1,
          status: formState.status,
          condition: formState.condition,
          vibes: formState.vibes,
          setup_steps: formState.setupSteps || null,
          rules_bullets: formState.rulesBullets || null,
          is_staff_pick: formState.isStaffPick,
        };
        formRef.current?.reset();
        setFormState(initialFormState);
        onSave?.(savedGame);
        onClose();
      } else {
        setError(result.error || 'An unexpected error occurred');
      }
    });
  }

  if (!isOpen) return null;

  const isEditMode = !!initialData;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="panel-surface w-full max-w-lg max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-structure">
          <h2 id="modal-title" className="text-lg font-semibold text-ink-primary">
            {isEditMode ? 'Edit Game' : 'Add New Game'}
          </h2>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="icon"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-ink-secondary" />
          </Button>
        </div>

        {/* Form */}
        <form ref={formRef} action={handleSubmit} className="p-6 space-y-5">
          {/* BGG Search Section - Only show for new games */}
          {!isEditMode && (
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-ink-primary">
                <svg className="w-4 h-4 text-ink-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search BoardGameGeek
              </div>
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search for a game..."
                  className="flex-1"
                  disabled={isSearching || isFetchingDetails}
                />
                <Button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching || isFetchingDetails || !searchQuery.trim()}
                  variant="secondary"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  {isSearching ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Searching...
                    </>
                  ) : (
                    'Search'
                  )}
                </Button>
              </div>

              {/* Search Results */}
              {showResults && (
                <div className="border border-structure rounded-lg bg-[color:var(--color-elevated)] max-h-48 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-3 text-center text-sm text-ink-secondary">Searching...</div>
                  ) : searchError ? (
                    <div className="p-3 text-center text-sm text-[color:var(--color-danger)]">{searchError}</div>
                  ) : searchResults.length > 0 ? (
                    <ul className="divide-y divide-structure">
                      {searchResults.map((game) => (
                        <li key={game.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectGame(game.id)}
                            disabled={isFetchingDetails}
                            className="w-full px-3 py-2 text-left hover:bg-muted transition-colors disabled:opacity-50 flex items-center justify-between gap-2"
                          >
                            <span className="text-sm text-ink-primary truncate">{game.title}</span>
                            {game.year && (
                              <span className="text-xs text-ink-secondary shrink-0">({game.year})</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}

              {/* Loading overlay for fetching details */}
              {isFetchingDetails && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-ink-secondary">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading game details...
                </div>
              )}
            </div>
          )}

          {/* Image Preview */}
          {formState.imageUrl && (
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <Image
                src={formState.imageUrl}
                alt="Game thumbnail"
                width={64}
                height={64}
                className="w-16 h-16 object-cover rounded-lg border border-structure"
                unoptimized
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-primary truncate">{formState.title}</p>
                <p className="text-xs text-ink-secondary">Image from BoardGameGeek</p>
              </div>
            </div>
          )}

          {/* Hidden input for image URL */}
          <input type="hidden" name="imageUrl" value={formState.imageUrl} />

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-[color:var(--color-danger-muted)] border border-[color:var(--color-danger)] rounded-lg text-[color:var(--color-danger-strong)] text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-ink-primary mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              name="title"
              required
              value={formState.title}
              onChange={(e) => updateFormField('title', e.target.value)}
              placeholder="e.g., Catan"
            />
          </div>

          {/* Description / Pitch */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-ink-primary mb-1">
              Description / Pitch
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formState.description}
              onChange={(e) => updateFormField('description', e.target.value)}
              className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm text-ink-primary shadow-card focus-ring placeholder:text-ink-secondary resize-none"
              placeholder="A brief pitch for this game..."
            />
          </div>

          {/* Players Range */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">
              Players <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  type="number"
                  id="minPlayers"
                  name="minPlayers"
                  min={1}
                  max={99}
                  required
                  value={formState.minPlayers}
                  onChange={(e) => updateFormField('minPlayers', e.target.value)}
                  placeholder="Min"
                />
              </div>
              <span className="text-ink-secondary">–</span>
              <div className="flex-1">
                <Input
                  type="number"
                  id="maxPlayers"
                  name="maxPlayers"
                  min={1}
                  max={99}
                  required
                  value={formState.maxPlayers}
                  onChange={(e) => updateFormField('maxPlayers', e.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">
              Playtime (minutes) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  type="number"
                  id="minTime"
                  name="minTime"
                  min={1}
                  max={999}
                  required
                  value={formState.minTime}
                  onChange={(e) => updateFormField('minTime', e.target.value)}
                  placeholder="Min"
                />
              </div>
              <span className="text-ink-secondary">–</span>
              <div className="flex-1">
                <Input
                  type="number"
                  id="maxTime"
                  name="maxTime"
                  min={1}
                  max={999}
                  required
                  value={formState.maxTime}
                  onChange={(e) => updateFormField('maxTime', e.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>
          </div>

          {/* Complexity */}
          <div>
            <label htmlFor="complexity" className="block text-sm font-medium text-ink-primary mb-1">
              Complexity <span className="text-red-500">*</span>
            </label>
            <select
              id="complexity"
              name="complexity"
              required
              value={formState.complexity}
              onChange={(e) => updateFormField('complexity', e.target.value)}
              className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm text-ink-primary shadow-card focus-ring"
            >
              <option value="">Select complexity...</option>
              <option value="simple">Simple</option>
              <option value="medium">Medium</option>
              <option value="complex">Complex</option>
            </select>
          </div>

          {/* Status and Condition - Side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-ink-primary mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formState.status}
                onChange={(e) => updateFormField('status', e.target.value as GameStatus)}
                className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm text-ink-primary shadow-card focus-ring"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="condition" className="block text-sm font-medium text-ink-primary mb-1">
                Condition
              </label>
              <select
                id="condition"
                name="condition"
                value={formState.condition}
                onChange={(e) => updateFormField('condition', e.target.value as GameCondition)}
                className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm text-ink-primary shadow-card focus-ring"
              >
                {CONDITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {formState.condition === 'problematic' && (
                <p className="text-xs text-[color:var(--color-warn)] mt-1">
                  This game will be excluded from guest recommendations.
                </p>
              )}
            </div>
          </div>

          {/* Staff Pick */}
          <div className="flex items-center gap-3">
            <label htmlFor="isStaffPick" className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                id="isStaffPick"
                checked={formState.isStaffPick}
                onChange={(e) => updateFormField('isStaffPick', e.target.checked)}
                className="h-4 w-4 rounded border-[color:var(--color-structure)] text-[color:var(--color-accent)] focus:ring-[color:var(--color-accent)]"
              />
              <span className="text-sm font-medium text-ink-primary">Staff Pick</span>
            </label>
            <span className="text-xs text-[color:var(--color-ink-secondary)]">
              Highlight this game in the recommendation wizard
            </span>
          </div>

          {/* Vibes / Tags */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">
              Vibes / Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_VIBES.map((vibe) => (
                <button
                  key={vibe}
                  type="button"
                  onClick={() => toggleVibe(vibe)}
                  className={`
                    px-2.5 py-1 text-xs rounded-full border transition-colors
                    ${formState.vibes.includes(vibe)
                      ? 'bg-[color:var(--color-accent-soft)] border-[color:var(--color-accent)] text-[color:var(--color-accent)]'
                      : 'bg-[color:var(--color-elevated)] border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)] hover:border-[color:var(--color-accent)]'
                    }
                  `}
                >
                  {vibe}
                </button>
              ))}
            </div>
            {/* Custom vibes display */}
            {formState.vibes.filter((v) => !COMMON_VIBES.includes(v)).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {formState.vibes
                  .filter((v) => !COMMON_VIBES.includes(v))
                  .map((vibe) => (
                    <span
                      key={vibe}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-[color:var(--color-accent-soft)] border border-[color:var(--color-accent)] text-[color:var(--color-accent)]"
                    >
                      {vibe}
                      <button
                        type="button"
                        onClick={() => toggleVibe(vibe)}
                        className="hover:text-[color:var(--color-danger)]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
              </div>
            )}
            {/* Add custom vibe */}
            <div className="flex gap-2">
              <Input
                type="text"
                value={newVibe}
                onChange={(e) => setNewVibe(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomVibe();
                  }
                }}
                placeholder="Add custom vibe..."
                className="flex-1 text-sm"
              />
              <Button
                type="button"
                onClick={addCustomVibe}
                variant="ghost"
                size="sm"
                disabled={!newVibe.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Shelf Location */}
          <div>
            <label htmlFor="shelfLocation" className="block text-sm font-medium text-ink-primary mb-1">
              Location / Shelf
            </label>
            <Input
              id="shelfLocation"
              name="shelfLocation"
              value={formState.shelfLocation}
              onChange={(e) => updateFormField('shelfLocation', e.target.value)}
              placeholder="e.g., Shelf A3"
            />
          </div>

          {/* Number of Copies */}
          <div>
            <label htmlFor="copiesInRotation" className="block text-sm font-medium text-ink-primary mb-1">
              Number of copies
            </label>
            <Input
              type="number"
              id="copiesInRotation"
              name="copiesInRotation"
              min={0}
              value={formState.copiesInRotation}
              onChange={(e) => updateFormField('copiesInRotation', e.target.value)}
              placeholder="1"
            />
            <p className="text-xs text-ink-secondary mt-1">Set to 0 to hide from guest recommendations</p>
          </div>

          {/* Setup Steps */}
          <div>
            <label htmlFor="setupSteps" className="block text-sm font-medium text-ink-primary mb-1">
              Setup Steps
            </label>
            <textarea
              id="setupSteps"
              name="setupSteps"
              rows={3}
              value={formState.setupSteps}
              onChange={(e) => updateFormField('setupSteps', e.target.value)}
              className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm text-ink-primary shadow-card focus-ring placeholder:text-ink-secondary resize-none"
              placeholder="Quick setup instructions for staff..."
            />
          </div>

          {/* Rules Bullets */}
          <div>
            <label htmlFor="rulesBullets" className="block text-sm font-medium text-ink-primary mb-1">
              Rules Overview
            </label>
            <textarea
              id="rulesBullets"
              name="rulesBullets"
              rows={3}
              value={formState.rulesBullets}
              onChange={(e) => updateFormField('rulesBullets', e.target.value)}
              className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm text-ink-primary shadow-card focus-ring placeholder:text-ink-secondary resize-none"
              placeholder="Key rules to teach guests..."
            />
          </div>

          {/* BGG Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="bggRank" className="block text-sm font-medium text-ink-primary mb-1">
                BGG Rank
              </label>
              <Input
                type="number"
                id="bggRank"
                name="bggRank"
                min={1}
                value={formState.bggRank}
                onChange={(e) => updateFormField('bggRank', e.target.value)}
                placeholder="e.g., 42"
              />
            </div>
            <div>
              <label htmlFor="bggRating" className="block text-sm font-medium text-ink-primary mb-1">
                BGG Rating
              </label>
              <Input
                type="number"
                id="bggRating"
                name="bggRating"
                min={0}
                max={10}
                step={0.1}
                value={formState.bggRating}
                onChange={(e) => updateFormField('bggRating', e.target.value)}
                placeholder="0-10"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              onClick={handleClearForm}
              disabled={isPending}
              variant="ghost"
              size="sm"
              className="text-ink-secondary"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Clear Form
            </Button>
            <div className="flex items-center gap-3">
              <Button type="button" onClick={onClose} disabled={isPending} variant="ghost" size="sm">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} size="sm">
                {isPending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {isEditMode ? 'Saving...' : 'Adding...'}
                  </>
                ) : isEditMode ? (
                  'Save Changes'
                ) : (
                  'Add Game'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
