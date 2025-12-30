/**
 * Normalizes a game title for duplicate detection.
 *
 * Normalization rules:
 * - Trim whitespace
 * - Convert to lowercase
 * - Collapse multiple spaces to single space
 * - Remove all punctuation and non-alphanumeric characters (except spaces)
 *
 * Examples:
 * - "Ticket to Ride" -> "ticket to ride"
 * - "  Ticket  to   Ride  " -> "ticket to ride"
 * - "Ticket To Ride: Europe" -> "ticket to ride europe"
 * - "7 Wonders" -> "7 wonders"
 * - "Settlers of Catan" -> "settlers of catan"
 */
export function normalizeGameTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation/non-alphanumeric except spaces
    .replace(/\s+/g, ' ')    // Collapse multiple spaces to single space
    .trim();
}
