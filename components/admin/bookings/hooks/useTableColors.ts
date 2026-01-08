/**
 * useTableColors Hook
 *
 * Provides consistent color assignment for venue tables.
 * Colors are persisted via the color_index field in the database.
 */

import { useMemo, useCallback } from 'react';

/**
 * Color palette for tables (12 distinct colors).
 * Each color has a main color and lighter variants for different states.
 */
export const TABLE_COLORS = [
  { name: 'blue', main: '#3B82F6', light: '#DBEAFE', border: '#2563EB' },
  { name: 'emerald', main: '#10B981', light: '#D1FAE5', border: '#059669' },
  { name: 'amber', main: '#F59E0B', light: '#FEF3C7', border: '#D97706' },
  { name: 'rose', main: '#F43F5E', light: '#FFE4E6', border: '#E11D48' },
  { name: 'purple', main: '#8B5CF6', light: '#EDE9FE', border: '#7C3AED' },
  { name: 'cyan', main: '#06B6D4', light: '#CFFAFE', border: '#0891B2' },
  { name: 'orange', main: '#F97316', light: '#FFEDD5', border: '#EA580C' },
  { name: 'pink', main: '#EC4899', light: '#FCE7F3', border: '#DB2777' },
  { name: 'indigo', main: '#6366F1', light: '#E0E7FF', border: '#4F46E5' },
  { name: 'teal', main: '#14B8A6', light: '#CCFBF1', border: '#0D9488' },
  { name: 'red', main: '#EF4444', light: '#FEE2E2', border: '#DC2626' },
  { name: 'lime', main: '#84CC16', light: '#ECFCCB', border: '#65A30D' },
] as const;

export type TableColor = (typeof TABLE_COLORS)[number];

/**
 * Table info needed for color assignment.
 */
export interface TableForColor {
  id: string;
  label: string;
  color_index?: number | null;
}

/**
 * Color map type: tableId -> color info
 */
export type TableColorMap = Record<string, TableColor>;

/**
 * Gets the color for a specific color index.
 *
 * @param colorIndex - Index into the color palette (0-11)
 * @returns TableColor object, wraps around if index > 11
 */
export function getColorByIndex(colorIndex: number): TableColor {
  const normalizedIndex = Math.abs(colorIndex) % TABLE_COLORS.length;
  return TABLE_COLORS[normalizedIndex];
}

/**
 * Generates a deterministic color index from a string (for tables without assigned colors).
 * Uses a simple hash function to ensure consistency.
 *
 * @param str - String to hash (typically table ID or label)
 * @returns Color index (0-11)
 */
function hashStringToColorIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % TABLE_COLORS.length;
}

/**
 * Hook that provides color mapping for a list of tables.
 *
 * @param tables - Array of tables with optional color_index
 * @returns Object containing color map and helper functions
 */
export function useTableColors(tables: TableForColor[]) {
  /**
   * Map of table ID to color info.
   * Uses color_index from DB if available, otherwise generates from ID.
   */
  const colorMap = useMemo<TableColorMap>(() => {
    const map: TableColorMap = {};

    for (const table of tables) {
      if (table.color_index !== null && table.color_index !== undefined) {
        // Use assigned color from database
        map[table.id] = getColorByIndex(table.color_index);
      } else {
        // Generate consistent color from table ID
        const index = hashStringToColorIndex(table.id);
        map[table.id] = getColorByIndex(index);
      }
    }

    return map;
  }, [tables]);

  /**
   * Gets the color for a specific table.
   */
  const getTableColor = useCallback(
    (tableId: string): TableColor => {
      return colorMap[tableId] ?? TABLE_COLORS[0];
    },
    [colorMap]
  );

  /**
   * Gets CSS styles for a booking block based on table and status.
   */
  const getBlockStyles = useCallback(
    (
      tableId: string,
      status: 'pending' | 'confirmed' | 'arrived' | 'seated' | 'completed'
    ): { backgroundColor: string; borderColor: string; textColor: string } => {
      const color = getTableColor(tableId);

      switch (status) {
        case 'pending':
          return {
            backgroundColor: color.light,
            borderColor: color.main,
            textColor: '#374151', // gray-700
          };
        case 'confirmed':
          return {
            backgroundColor: color.main,
            borderColor: color.border,
            textColor: '#FFFFFF',
          };
        case 'arrived':
          return {
            backgroundColor: color.main,
            borderColor: color.border,
            textColor: '#FFFFFF',
          };
        case 'seated':
          return {
            backgroundColor: color.main,
            borderColor: '#059669', // green border for seated
            textColor: '#FFFFFF',
          };
        case 'completed':
          return {
            backgroundColor: '#E5E7EB', // gray-200
            borderColor: '#9CA3AF', // gray-400
            textColor: '#6B7280', // gray-500
          };
        default:
          return {
            backgroundColor: color.main,
            borderColor: color.border,
            textColor: '#FFFFFF',
          };
      }
    },
    [getTableColor]
  );

  /**
   * Suggests the next available color index for a new table.
   * Tries to pick a color not already in use.
   */
  const suggestNextColorIndex = useCallback((): number => {
    const usedIndices = new Set<number>();

    for (const table of tables) {
      if (table.color_index !== null && table.color_index !== undefined) {
        usedIndices.add(table.color_index);
      }
    }

    // Find first unused index
    for (let i = 0; i < TABLE_COLORS.length; i++) {
      if (!usedIndices.has(i)) {
        return i;
      }
    }

    // All colors used, cycle based on count
    return tables.length % TABLE_COLORS.length;
  }, [tables]);

  return {
    colorMap,
    getTableColor,
    getBlockStyles,
    suggestNextColorIndex,
    TABLE_COLORS,
  };
}

/**
 * Standalone function to get block styles without the hook.
 * Useful in server components or utilities.
 */
export function getBlockStylesForTable(
  colorIndex: number,
  status: 'pending' | 'confirmed' | 'arrived' | 'seated' | 'completed'
): { backgroundColor: string; borderColor: string; textColor: string } {
  const color = getColorByIndex(colorIndex);

  switch (status) {
    case 'pending':
      return {
        backgroundColor: color.light,
        borderColor: color.main,
        textColor: '#374151',
      };
    case 'confirmed':
      return {
        backgroundColor: color.main,
        borderColor: color.border,
        textColor: '#FFFFFF',
      };
    case 'arrived':
      return {
        backgroundColor: color.main,
        borderColor: color.border,
        textColor: '#FFFFFF',
      };
    case 'seated':
      return {
        backgroundColor: color.main,
        borderColor: '#059669',
        textColor: '#FFFFFF',
      };
    case 'completed':
      return {
        backgroundColor: '#E5E7EB',
        borderColor: '#9CA3AF',
        textColor: '#6B7280',
      };
    default:
      return {
        backgroundColor: color.main,
        borderColor: color.border,
        textColor: '#FFFFFF',
      };
  }
}
