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

/**
 * Calculates the Levenshtein (edit) distance between two strings.
 * This measures the minimum number of single-character edits
 * (insertions, deletions, substitutions) needed to transform one string into another.
 *
 * @param a - First string
 * @param b - Second string
 * @returns The edit distance (0 = identical strings)
 *
 * @example
 * levenshteinDistance("catan", "catan")     // 0
 * levenshteinDistance("catan", "cataan")    // 1
 * levenshteinDistance("catan", "settlers")  // 7
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Use two rows instead of full matrix for space efficiency
  let prevRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  let currRow = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    currRow[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,      // deletion
        currRow[j - 1] + 1,  // insertion
        prevRow[j - 1] + cost // substitution
      );
    }

    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[b.length];
}

/**
 * Calculates a match score between a search query and a result title.
 * Combines Levenshtein similarity with length ratio to penalize
 * results that are much longer than the search query.
 *
 * This prevents "Catan" from matching "Catan: Seafarers" when the
 * exact "Catan" is available, since expansions/variants have longer titles.
 *
 * Score formula: similarityRatio × lengthRatio
 * - similarityRatio = 1 - (levenshteinDistance / maxLength)
 * - lengthRatio = minLength / maxLength
 *
 * @param searchTitle - The title being searched for
 * @param resultTitle - A candidate result title from BGG
 * @returns Score from 0 to 1 (1 = perfect match)
 *
 * @example
 * calculateMatchScore("Catan", "Catan")              // 1.0 (exact match)
 * calculateMatchScore("Catan", "Catan: Seafarers")   // ~0.11 (penalized)
 * calculateMatchScore("Catan", "Cataan")             // ~0.69 (typo tolerance)
 */
export function calculateMatchScore(searchTitle: string, resultTitle: string): number {
  const a = normalizeTitle(searchTitle);
  const b = normalizeTitle(resultTitle);

  // Exact match shortcut
  if (a === b) return 1.0;

  // Handle empty strings
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  const minLen = Math.min(a.length, b.length);

  const similarityRatio = 1 - distance / maxLen;
  const lengthRatio = minLen / maxLen;

  // Ensure non-negative score
  return Math.max(0, similarityRatio * lengthRatio);
}
