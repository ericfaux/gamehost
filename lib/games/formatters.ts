/**
 * Helper utilities for formatting game data for UI display.
 * These are pure functions that can be used in both server and client components.
 */

/**
 * Parses multi-line setup steps text into an array of bullet points.
 * Filters out empty lines.
 *
 * @param setup - The raw setup_steps text from the database (may be null)
 * @returns Array of non-empty setup step strings
 *
 * @example
 * parseSetupSteps("Shuffle the deck\nDeal 5 cards to each player\nPlace remaining cards in center")
 * // Returns: ["Shuffle the deck", "Deal 5 cards to each player", "Place remaining cards in center"]
 */
export function parseSetupSteps(setup: string | null): string[] {
  if (!setup) {
    return [];
  }
  return setup
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Parses multi-line rules text into an array of bullet points.
 * Filters out empty lines.
 *
 * @param rules - The raw rules_bullets text from the database (may be null)
 * @returns Array of non-empty rule strings
 *
 * @example
 * parseRulesBullets("On your turn, draw a card\nPlay cards from your hand\nFirst to 10 points wins")
 * // Returns: ["On your turn, draw a card", "Play cards from your hand", "First to 10 points wins"]
 */
export function parseRulesBullets(rules: string | null): string[] {
  if (!rules) {
    return [];
  }
  return rules
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
