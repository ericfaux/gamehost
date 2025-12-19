'use server';

/**
 * Server actions for the game recommendation wizard.
 * These handle the data fetching on the server side.
 */

import { getRecommendedGames } from '@/lib/data';
import type { Game, TimeBucket, ComplexityTolerance } from '@/lib/db/types';

export interface WizardParams {
  playerCount: number;
  timeBucket: TimeBucket;
  complexityTolerance: ComplexityTolerance;
  vibes: string[];
}

export interface RecommendGamesInput {
  venueId: string;
  params: WizardParams;
}

/**
 * Server action to fetch recommended games based on wizard inputs.
 * Called from the WizardForm client component.
 */
export async function fetchRecommendedGames(
  input: RecommendGamesInput
): Promise<{ games: Game[]; error?: string }> {
  try {
    const { venueId, params } = input;

    const games = await getRecommendedGames({
      venueId,
      playerCount: params.playerCount,
      timeBucket: params.timeBucket,
      complexityTolerance: params.complexityTolerance,
      vibes: params.vibes,
    });

    return { games };
  } catch (error) {
    console.error('Error fetching recommended games:', error);
    return {
      games: [],
      error: 'Failed to load game recommendations. Please try again.',
    };
  }
}
