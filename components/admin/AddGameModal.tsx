'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import Image from 'next/image';
import { addGame, updateGame } from '@/app/admin/library/actions';
import { searchGamesAction, getGameDetailsAction } from '@/app/admin/library/bgg-actions';
import type { Game } from '@/lib/db/types';

interface GameFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Game | null;
}

interface BGGSearchResult {
  id: string;
  name: string;
  year: number | null;
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
  };
}

export function GameFormModal({ isOpen, onClose, initialData }: GameFormModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // BGG Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BGGSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Form state (controlled inputs for autofill)
  const [formState, setFormState] = useState<FormState>(
    initialData ? mapGameToFormState(initialData) : initialFormState,
  );

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
      const details = result.data;
      setFormState({
        title: details.name,
        description: details.description || '',
        minPlayers: String(details.minPlayers),
        maxPlayers: String(details.maxPlayers),
        minTime: String(details.minPlaytime),
        maxTime: String(details.maxPlaytime),
        complexity: details.complexity,
        shelfLocation: '',
        bggRank: details.bggRank ? String(details.bggRank) : '',
        bggRating: details.bggRating ? String(details.bggRating) : '',
        imageUrl: details.thumbnail || '',
      });
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
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      if (initialData) {
        formData.append('id', initialData.id);
      }

      const result = initialData ? await updateGame(formData) : await addGame(formData);
      if (result.success) {
        formRef.current?.reset();
        setFormState(initialFormState);
        onClose();
      } else {
        setError(result.error || 'An unexpected error occurred');
      }
    });
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
            {initialData ? 'Edit Game' : 'Add New Game'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form ref={formRef} action={handleSubmit} className="p-6 space-y-5">
          {/* BGG Search Section */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search BoardGameGeek
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search for a game..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={isSearching || isFetchingDetails}
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={isSearching || isFetchingDetails || !searchQuery.trim()}
                className="px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
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
              </button>
            </div>

            {/* Search Results */}
            {showResults && (
              <div className="border border-slate-200 rounded-lg bg-white max-h-48 overflow-y-auto">
                {isSearching ? (
                  <div className="p-3 text-center text-sm text-slate-500">Searching...</div>
                ) : searchError ? (
                  <div className="p-3 text-center text-sm text-red-600">{searchError}</div>
                ) : searchResults.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {searchResults.map((game) => (
                      <li key={game.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectGame(game.id)}
                          disabled={isFetchingDetails}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-between gap-2"
                        >
                          <span className="text-sm text-slate-900 truncate">{game.name}</span>
                          {game.year && (
                            <span className="text-xs text-slate-500 shrink-0">({game.year})</span>
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
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-600">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading game details...
              </div>
            )}
          </div>

          {/* Image Preview */}
          {formState.imageUrl && (
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
              <Image
                src={formState.imageUrl}
                alt="Game thumbnail"
                width={64}
                height={64}
                className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                unoptimized
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{formState.title}</p>
                <p className="text-xs text-slate-500">Image from BoardGameGeek</p>
              </div>
            </div>
          )}

          {/* Hidden input for image URL */}
          <input type="hidden" name="imageUrl" value={formState.imageUrl} />

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formState.title}
              onChange={(e) => updateFormField('title', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Catan"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formState.description}
              onChange={(e) => updateFormField('description', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="A brief pitch for this game..."
            />
          </div>

          {/* Players Range */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Players <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="number"
                  id="minPlayers"
                  name="minPlayers"
                  min={1}
                  max={99}
                  required
                  value={formState.minPlayers}
                  onChange={(e) => updateFormField('minPlayers', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Min"
                />
              </div>
              <span className="text-slate-400">–</span>
              <div className="flex-1">
                <input
                  type="number"
                  id="maxPlayers"
                  name="maxPlayers"
                  min={1}
                  max={99}
                  required
                  value={formState.maxPlayers}
                  onChange={(e) => updateFormField('maxPlayers', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Playtime (minutes) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="number"
                  id="minTime"
                  name="minTime"
                  min={1}
                  max={999}
                  required
                  value={formState.minTime}
                  onChange={(e) => updateFormField('minTime', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Min"
                />
              </div>
              <span className="text-slate-400">–</span>
              <div className="flex-1">
                <input
                  type="number"
                  id="maxTime"
                  name="maxTime"
                  min={1}
                  max={999}
                  required
                  value={formState.maxTime}
                  onChange={(e) => updateFormField('maxTime', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>

          {/* Complexity */}
          <div>
            <label htmlFor="complexity" className="block text-sm font-medium text-slate-700 mb-1">
              Complexity <span className="text-red-500">*</span>
            </label>
            <select
              id="complexity"
              name="complexity"
              required
              value={formState.complexity}
              onChange={(e) => updateFormField('complexity', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select complexity...</option>
              <option value="simple">Simple</option>
              <option value="medium">Medium</option>
              <option value="complex">Complex</option>
            </select>
          </div>

          {/* Shelf Location */}
          <div>
            <label htmlFor="shelfLocation" className="block text-sm font-medium text-slate-700 mb-1">
              Location / Shelf
            </label>
            <input
              type="text"
              id="shelfLocation"
              name="shelfLocation"
              value={formState.shelfLocation}
              onChange={(e) => updateFormField('shelfLocation', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Shelf A3"
            />
          </div>

          {/* BGG Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="bggRank" className="block text-sm font-medium text-slate-700 mb-1">
                BGG Rank
              </label>
              <input
                type="number"
                id="bggRank"
                name="bggRank"
                min={1}
                value={formState.bggRank}
                onChange={(e) => updateFormField('bggRank', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 42"
              />
            </div>
            <div>
              <label htmlFor="bggRating" className="block text-sm font-medium text-slate-700 mb-1">
                BGG Rating
              </label>
              <input
                type="number"
                id="bggRating"
                name="bggRating"
                min={0}
                max={10}
                step={0.1}
                value={formState.bggRating}
                onChange={(e) => updateFormField('bggRating', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0-10"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleClearForm}
              disabled={isPending}
              className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Clear Form
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {initialData ? 'Saving...' : 'Adding...'}
                  </>
                ) : initialData ? (
                  'Save Changes'
                ) : (
                  'Add Game'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
