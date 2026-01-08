/**
 * useOverlapLayout Hook
 *
 * Calculates positioning for overlapping calendar blocks, similar to Outlook.
 * When multiple bookings occur at the same time, they're displayed side-by-side
 * rather than stacked.
 */

import { useMemo } from 'react';
import type { TimelineBlock } from '@/lib/db/types';
import { timeToPixels, calculateBlockHeight } from '../utils/calendarUtils';

/**
 * A positioned block with layout information for rendering.
 */
export interface PositionedBlock {
  /** The original timeline block data */
  block: TimelineBlock;
  /** Column index within the overlap group (0, 1, 2...) */
  column: number;
  /** Total number of columns in this overlap group */
  totalColumns: number;
  /** Pixel offset from top of timeline */
  top: number;
  /** Height in pixels */
  height: number;
  /** Left position as percentage (0-100) */
  leftPercent: number;
  /** Width as percentage (0-100) */
  widthPercent: number;
}

/**
 * Group of blocks that overlap in time.
 */
interface OverlapGroup {
  blocks: TimelineBlock[];
  /** Earliest start time in the group */
  groupStart: Date;
  /** Latest end time in the group */
  groupEnd: Date;
}

/**
 * Checks if two time ranges overlap.
 */
function rangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2;
}

/**
 * Finds the maximum number of concurrent blocks at any point in time.
 * This determines how many columns we need.
 */
function findMaxConcurrent(blocks: TimelineBlock[]): number {
  if (blocks.length <= 1) return blocks.length;

  // Create events for start and end times
  const events: Array<{ time: number; type: 'start' | 'end' }> = [];

  for (const block of blocks) {
    events.push({ time: new Date(block.start_time).getTime(), type: 'start' });
    events.push({ time: new Date(block.end_time).getTime(), type: 'end' });
  }

  // Sort by time, with 'start' events coming before 'end' events at same time
  events.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return a.type === 'start' ? -1 : 1;
  });

  let maxConcurrent = 0;
  let current = 0;

  for (const event of events) {
    if (event.type === 'start') {
      current++;
      maxConcurrent = Math.max(maxConcurrent, current);
    } else {
      current--;
    }
  }

  return maxConcurrent;
}

/**
 * Assigns column indices to blocks using a greedy algorithm.
 * Tries to place each block in the leftmost available column.
 */
function assignColumns(blocks: TimelineBlock[]): Map<string, number> {
  const columnAssignments = new Map<string, number>();

  // Sort by start time, then by duration (longer first)
  const sortedBlocks = [...blocks].sort((a, b) => {
    const startDiff = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    if (startDiff !== 0) return startDiff;

    // For same start time, put longer blocks first
    const aDuration = new Date(a.end_time).getTime() - new Date(a.start_time).getTime();
    const bDuration = new Date(b.end_time).getTime() - new Date(b.start_time).getTime();
    return bDuration - aDuration;
  });

  // Track end times for each column
  const columnEndTimes: number[] = [];

  for (const block of sortedBlocks) {
    const blockStart = new Date(block.start_time).getTime();
    const blockEnd = new Date(block.end_time).getTime();

    // Find the first column where this block can fit
    let assignedColumn = -1;
    for (let col = 0; col < columnEndTimes.length; col++) {
      if (columnEndTimes[col] <= blockStart) {
        assignedColumn = col;
        break;
      }
    }

    // If no existing column works, create a new one
    if (assignedColumn === -1) {
      assignedColumn = columnEndTimes.length;
      columnEndTimes.push(0);
    }

    // Assign the block to this column
    columnAssignments.set(block.id, assignedColumn);
    columnEndTimes[assignedColumn] = blockEnd;
  }

  return columnAssignments;
}

/**
 * Groups blocks that overlap with each other into clusters.
 * Within each cluster, we need to calculate side-by-side layout.
 */
function groupOverlappingBlocks(blocks: TimelineBlock[]): OverlapGroup[] {
  if (blocks.length === 0) return [];

  // Sort by start time
  const sortedBlocks = [...blocks].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  const groups: OverlapGroup[] = [];
  let currentGroup: OverlapGroup | null = null;

  for (const block of sortedBlocks) {
    const blockStart = new Date(block.start_time);
    const blockEnd = new Date(block.end_time);

    if (
      currentGroup === null ||
      blockStart >= currentGroup.groupEnd
    ) {
      // Start a new group
      currentGroup = {
        blocks: [block],
        groupStart: blockStart,
        groupEnd: blockEnd,
      };
      groups.push(currentGroup);
    } else {
      // Add to current group
      currentGroup.blocks.push(block);
      if (blockEnd > currentGroup.groupEnd) {
        currentGroup.groupEnd = blockEnd;
      }
    }
  }

  return groups;
}

/**
 * Options for the overlap layout calculation.
 */
export interface OverlapLayoutOptions {
  /** Start hour of the timeline (default: 9) */
  startHour?: number;
  /** Pixels per hour (default: 60) */
  pixelsPerHour?: number;
  /** Minimum gap between columns as percentage (default: 1) */
  columnGapPercent?: number;
}

/**
 * Hook that calculates positioning for blocks with overlap handling.
 *
 * @param blocks - Array of timeline blocks to position
 * @param options - Layout configuration options
 * @returns Array of positioned blocks with layout information
 */
export function useOverlapLayout(
  blocks: TimelineBlock[],
  options: OverlapLayoutOptions = {}
): PositionedBlock[] {
  const {
    startHour = 9,
    pixelsPerHour = 60,
    columnGapPercent = 1,
  } = options;

  return useMemo(() => {
    if (blocks.length === 0) return [];

    const positionedBlocks: PositionedBlock[] = [];

    // Group overlapping blocks
    const groups = groupOverlappingBlocks(blocks);

    for (const group of groups) {
      // Calculate max concurrent blocks in this group
      const maxConcurrent = findMaxConcurrent(group.blocks);

      // Assign column indices
      const columnAssignments = assignColumns(group.blocks);

      // Calculate width for each column
      const totalGapPercent = (maxConcurrent - 1) * columnGapPercent;
      const widthPercent = (100 - totalGapPercent) / maxConcurrent;

      // Position each block
      for (const block of group.blocks) {
        const column = columnAssignments.get(block.id) ?? 0;
        const leftPercent = column * (widthPercent + columnGapPercent);

        const startTime = new Date(block.start_time);
        const endTime = new Date(block.end_time);

        const top = timeToPixels(startTime, startHour, pixelsPerHour);
        const height = calculateBlockHeight(startTime, endTime, pixelsPerHour);

        positionedBlocks.push({
          block,
          column,
          totalColumns: maxConcurrent,
          top,
          height: Math.max(height, 20), // Minimum height of 20px
          leftPercent,
          widthPercent,
        });
      }
    }

    return positionedBlocks;
  }, [blocks, startHour, pixelsPerHour, columnGapPercent]);
}

/**
 * Standalone function to calculate overlap layout without the hook.
 * Useful in server components or utilities.
 */
export function calculateOverlapLayout(
  blocks: TimelineBlock[],
  options: OverlapLayoutOptions = {}
): PositionedBlock[] {
  const {
    startHour = 9,
    pixelsPerHour = 60,
    columnGapPercent = 1,
  } = options;

  if (blocks.length === 0) return [];

  const positionedBlocks: PositionedBlock[] = [];
  const groups = groupOverlappingBlocks(blocks);

  for (const group of groups) {
    const maxConcurrent = findMaxConcurrent(group.blocks);
    const columnAssignments = assignColumns(group.blocks);

    const totalGapPercent = (maxConcurrent - 1) * columnGapPercent;
    const widthPercent = (100 - totalGapPercent) / maxConcurrent;

    for (const block of group.blocks) {
      const column = columnAssignments.get(block.id) ?? 0;
      const leftPercent = column * (widthPercent + columnGapPercent);

      const startTime = new Date(block.start_time);
      const endTime = new Date(block.end_time);

      const top = timeToPixels(startTime, startHour, pixelsPerHour);
      const height = calculateBlockHeight(startTime, endTime, pixelsPerHour);

      positionedBlocks.push({
        block,
        column,
        totalColumns: maxConcurrent,
        top,
        height: Math.max(height, 20),
        leftPercent,
        widthPercent,
      });
    }
  }

  return positionedBlocks;
}

/**
 * Utility to filter positioned blocks by date (for week view).
 */
export function filterBlocksByDate(
  blocks: PositionedBlock[],
  dateString: string
): PositionedBlock[] {
  return blocks.filter((pb) => {
    const blockDate = new Date(pb.block.start_time);
    const year = blockDate.getFullYear();
    const month = String(blockDate.getMonth() + 1).padStart(2, '0');
    const day = String(blockDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}` === dateString;
  });
}
