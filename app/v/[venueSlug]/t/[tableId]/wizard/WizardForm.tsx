'use client';

/**
 * WizardForm - Client component for the game recommendation wizard.
 *
 * Collects user preferences and calls the server action to fetch
 * recommended games. Preserves wizard params in the query string
 * when linking to game details so they can be stored in the session.
 */

import { useState, useTransition } from 'react';
import { fetchRecommendedGames, type WizardParams } from './actions';
import { GameCard } from '@/components/table-app';
import type { Game, TimeBucket, ComplexityTolerance } from '@/lib/db/types';

interface WizardFormProps {
  venueId: string;
  venueSlug: string;
  tableId: string;
}

// Wizard step options
const PLAYER_OPTIONS = [
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5+' },
];

const TIME_OPTIONS: { value: TimeBucket; label: string }[] = [
  { value: '30-45', label: '30–45 min' },
  { value: '60-120', label: '1–2 hours' },
  { value: '120+', label: '2+ hours' },
];

const COMPLEXITY_OPTIONS: { value: ComplexityTolerance; label: string; desc: string }[] = [
  { value: 'super_simple', label: 'Keep it simple', desc: 'Easy to learn and play' },
  { value: 'medium', label: 'Some strategy', desc: 'A bit of thinking involved' },
  { value: 'dont_mind_complex', label: "Bring it on", desc: "We don't mind complexity" },
];

const VIBE_OPTIONS = [
  { value: 'light_silly', label: 'Light & Silly' },
  { value: 'competitive', label: 'Competitive' },
  { value: 'cooperative', label: 'Co-op' },
  { value: 'deep_thinky', label: 'Deep & Thinky' },
  { value: 'family_friendly', label: 'Family Friendly' },
];

export function WizardForm({ venueId, venueSlug, tableId }: WizardFormProps) {
  // Form state
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [timeBucket, setTimeBucket] = useState<TimeBucket>('30-45');
  const [complexityTolerance, setComplexityTolerance] = useState<ComplexityTolerance>('medium');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);

  // Results state
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Toggle vibe selection
  const toggleVibe = (vibe: string) => {
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  };

  // Handle form submission
  const handleSubmit = () => {
    setError(null);

    const params: WizardParams = {
      playerCount,
      timeBucket,
      complexityTolerance,
      vibes: selectedVibes,
    };

    startTransition(async () => {
      const result = await fetchRecommendedGames({ venueId, params });

      if (result.error) {
        setError(result.error);
        setGames(null);
      } else {
        setGames(result.games);
      }
    });
  };

  // Build query string for wizard params (passed to game detail page)
  const buildWizardQueryString = (): string => {
    const params = new URLSearchParams();
    params.set('pc', playerCount.toString());
    params.set('tb', timeBucket);
    params.set('ct', complexityTolerance);
    if (selectedVibes.length > 0) {
      params.set('vibes', selectedVibes.join(','));
    }
    return params.toString();
  };

  // Reset to modify preferences
  const handleReset = () => {
    setGames(null);
    setError(null);
  };

  // If we have results, show them
  if (games !== null) {
    return (
      <div className="space-y-6">
        {/* Results header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {games.length > 0 ? 'Recommended for you' : 'No matches found'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {games.length > 0
                ? `${games.length} game${games.length !== 1 ? 's' : ''} match your preferences`
                : 'Try loosening your filters'}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Modify
          </button>
        </div>

        {/* Game cards */}
        {games.length > 0 ? (
          <div className="space-y-4">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                venueSlug={venueSlug}
                tableId={tableId}
                queryString={buildWizardQueryString()}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
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
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No games match all your criteria right now.
            </p>
            <button
              onClick={handleReset}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
            >
              Adjust preferences
            </button>
          </div>
        )}
      </div>
    );
  }

  // Wizard form
  return (
    <div className="space-y-8">
      {/* Player count */}
      <section className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          How many players?
        </label>
        <div className="grid grid-cols-4 gap-2">
          {PLAYER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPlayerCount(option.value)}
              className={`py-3 text-center font-medium rounded-lg border-2 transition-colors ${
                playerCount === option.value
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* Time bucket */}
      <section className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          How much time do you have?
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TIME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTimeBucket(option.value)}
              className={`py-3 px-2 text-center text-sm font-medium rounded-lg border-2 transition-colors ${
                timeBucket === option.value
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* Complexity tolerance */}
      <section className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          How complex can the game be?
        </label>
        <div className="space-y-2">
          {COMPLEXITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setComplexityTolerance(option.value)}
              className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${
                complexityTolerance === option.value
                  ? 'border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/30'
                  : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
              }`}
            >
              <div
                className={`font-medium ${
                  complexityTolerance === option.value
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {option.label}
              </div>
              <div
                className={`text-sm ${
                  complexityTolerance === option.value
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {option.desc}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Vibes (multi-select chips) */}
      <section className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          What vibe are you going for? <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {VIBE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleVibe(option.value)}
              className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-colors ${
                selectedVibes.includes(option.value)
                  ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full py-4 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-blue-600/25 transition-colors"
      >
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Finding games...
          </span>
        ) : (
          'Show me games'
        )}
      </button>
    </div>
  );
}
