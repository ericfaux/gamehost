/**
 * String utility functions for text normalization and comparison.
 * Used across the application for consistent string handling.
 */

/**
 * Normalizes a game title for fuzzy comparison.
 *
 * Transformations applied:
 * - Converts to lowercase
 * - Trims leading/trailing whitespace
 * - Collapses multiple spaces into single space
 * - Removes all punctuation (colons, hyphens, apostrophes, etc.)
 *
 * @param title - The raw game title
 * @returns Normalized title suitable for comparison
 *
 * @example
 * normalizeTitle("Dune: Imperium")     // "dune imperium"
 * normalizeTitle("Ticket to Ride - Europe") // "ticket to ride europe"
 * normalizeTitle("  7 Wonders  ")      // "7 wonders"
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')      // Collapse whitespace
    .replace(/[^\w\s]/g, '');  // Remove punctuation
}

/**
 * Checks if two game titles match after normalization.
 *
 * @param titleA - First title to compare
 * @param titleB - Second title to compare
 * @returns True if normalized titles are equal
 *
 * @example
 * titlesMatch("Dune: Imperium", "dune imperium") // true
 * titlesMatch("Azul", "Azul: Summer Pavilion")   // false
 */
export function titlesMatch(titleA: string, titleB: string): boolean {
  return normalizeTitle(titleA) === normalizeTitle(titleB);
}
