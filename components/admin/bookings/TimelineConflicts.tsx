'use client';

import * as React from 'react';
import { AlertTriangle } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { TimeRange, TimelineConflict } from '@/lib/data/timeline';
import type { TurnoverRisk, TurnoverRiskLevel } from '@/lib/db/types';
import { timeToPixels } from './Timeline';

// =============================================================================
// Types
// =============================================================================

interface ConflictMarkerProps {
  /** The conflict to display */
  conflict: TimelineConflict;
  /** Time range of the timeline */
  timeRange: TimeRange;
  /** Pixels per hour for positioning */
  pixelsPerHour: number;
  /** Y position (top offset) for the marker */
  top: number;
  /** Row height for vertical centering */
  rowHeight: number;
}

interface RiskZoneProps {
  /** End time of current session/booking */
  sessionEnd: Date;
  /** Start time of upcoming booking */
  bookingStart: Date;
  /** Time range of the timeline */
  timeRange: TimeRange;
  /** Pixels per hour for positioning */
  pixelsPerHour: number;
  /** Risk level affects visual intensity */
  riskLevel: TurnoverRiskLevel;
}

interface ConflictLayerProps {
  /** List of detected conflicts */
  conflicts: TimelineConflict[];
  /** List of turnover risks */
  risks: TurnoverRisk[];
  /** Time range of the timeline */
  timeRange: TimeRange;
  /** Pixels per hour for positioning */
  pixelsPerHour: number;
  /** Map of table ID to row index */
  tableIdToRowIndex: Map<string, number>;
  /** Height of each row in pixels */
  rowHeight: number;
  /** Date string for parsing times (YYYY-MM-DD) */
  dateString: string;
}

interface BufferZoneProps {
  /** End time of the booking */
  bookingEnd: Date;
  /** Buffer duration in minutes */
  bufferMinutes: number;
  /** Time range of the timeline */
  timeRange: TimeRange;
  /** Pixels per hour for positioning */
  pixelsPerHour: number;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Parses a time string (HH:MM:SS or HH:MM) to a Date object for a given date.
 */
function parseTimeString(timeStr: string, dateString: string): Date {
  // If already ISO string, parse directly
  if (timeStr.includes('T') || timeStr.includes('-')) {
    return new Date(timeStr);
  }
  // Otherwise treat as HH:MM:SS time on the given date
  return new Date(`${dateString}T${timeStr}`);
}

// =============================================================================
// Components
// =============================================================================

/**
 * Conflict marker positioned at the overlap point between two conflicting blocks.
 *
 * - Critical conflicts (hard overlap): Pulsing red marker
 * - Warning conflicts (soft overlap within 15min): Amber marker
 */
export function ConflictMarker({
  conflict,
  timeRange,
  pixelsPerHour,
  top,
  rowHeight,
}: ConflictMarkerProps) {
  // Position the marker at the overlap point (we don't have exact overlap time,
  // so we'll rely on the parent to compute and pass position, or use a visual indicator)
  // For now, we compute a reasonable position based on the conflict data
  // The marker will be positioned by the parent ConflictLayer

  const isCritical = conflict.severity === 'critical';

  return (
    <div
      className="absolute z-30 flex items-center justify-center pointer-events-auto"
      style={{
        top: top + rowHeight / 2,
        transform: 'translate(-50%, -50%)',
      }}
      title={`${isCritical ? 'Hard conflict' : 'Soft conflict'}: ${conflict.overlapMinutes} min overlap`}
    >
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center shadow-md cursor-help',
          isCritical
            ? 'bg-red-500 animate-pulse'
            : 'bg-amber-500',
        )}
      >
        <AlertTriangle className="w-4 h-4 text-white" />
      </div>
    </div>
  );
}

/**
 * Gradient visualization showing the risk zone between a session end and booking start.
 *
 * The gradient intensity varies by severity:
 * - Low: Subtle amber hint
 * - Medium: More visible amber warning
 * - High: Red danger zone with pulsing boundary
 */
export function RiskZone({
  sessionEnd,
  bookingStart,
  timeRange,
  pixelsPerHour,
  riskLevel,
}: RiskZoneProps) {
  const left = timeToPixels(sessionEnd, timeRange, pixelsPerHour);
  const right = timeToPixels(bookingStart, timeRange, pixelsPerHour);
  const width = right - left;

  // Don't render if there's no gap (or negative = overlap)
  if (width <= 0) return null;

  const gradientClass = {
    low: 'from-transparent via-amber-100/30 to-amber-100/50',
    medium: 'from-transparent via-amber-200/40 to-amber-200/60',
    high: 'from-red-100/30 via-red-200/50 to-red-300/60',
  }[riskLevel];

  return (
    <div
      className={cn(
        'absolute top-0 bottom-0 bg-gradient-to-r pointer-events-none',
        gradientClass,
      )}
      style={{ left, width }}
      role="presentation"
      aria-label={`${riskLevel} risk zone`}
    >
      {/* Animated warning line at the boundary for high risk */}
      {riskLevel === 'high' && (
        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-red-400 animate-pulse" />
      )}
    </div>
  );
}

/**
 * Overlay layer containing all conflict markers and risk zones.
 *
 * This component renders as an absolute overlay on top of the timeline rows,
 * with pointer-events-none so it doesn't interfere with block interactions.
 */
export function ConflictLayer({
  conflicts,
  risks,
  timeRange,
  pixelsPerHour,
  tableIdToRowIndex,
  rowHeight,
  dateString,
}: ConflictLayerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Risk zones */}
      {risks.map((risk) => {
        const rowIndex = tableIdToRowIndex.get(risk.table_id);
        if (rowIndex === undefined) return null;

        const sessionEnd = parseTimeString(risk.current_end_time, dateString);
        const bookingStart = parseTimeString(risk.next_start_time, dateString);

        return (
          <div
            key={`risk-${risk.table_id}-${risk.next_booking_id}`}
            className="absolute left-0 right-0"
            style={{
              top: rowIndex * rowHeight,
              height: rowHeight,
            }}
          >
            <RiskZone
              sessionEnd={sessionEnd}
              bookingStart={bookingStart}
              timeRange={timeRange}
              pixelsPerHour={pixelsPerHour}
              riskLevel={risk.risk_level}
            />
          </div>
        );
      })}

      {/* Conflict markers */}
      {conflicts.map((conflict) => {
        const rowIndex = tableIdToRowIndex.get(conflict.tableId);
        if (rowIndex === undefined) return null;

        // For conflict markers, we position them at the start of the overlap area
        // Since we don't have the exact overlap point, we'll let the parent handle positioning
        // or use a heuristic. For now, we render at a fixed position that will be overridden.
        return (
          <ConflictMarker
            key={`${conflict.block1Id}-${conflict.block2Id}`}
            conflict={conflict}
            timeRange={timeRange}
            pixelsPerHour={pixelsPerHour}
            top={rowIndex * rowHeight}
            rowHeight={rowHeight}
          />
        );
      })}
    </div>
  );
}

/**
 * Visual buffer zone after a booking ends, showing reserved turnover time.
 *
 * This is an optional toggle feature that shows dashed outline areas
 * representing the buffer time needed between bookings.
 */
export function BufferZone({
  bookingEnd,
  bufferMinutes,
  timeRange,
  pixelsPerHour,
}: BufferZoneProps) {
  const left = timeToPixels(bookingEnd, timeRange, pixelsPerHour);
  const width = (bufferMinutes / 60) * pixelsPerHour;

  // Don't render if buffer is too small to be useful
  if (width < 4) return null;

  return (
    <div
      className="absolute top-1 bottom-1 bg-stone-100 border border-dashed border-stone-300 rounded opacity-50"
      style={{ left, width }}
      role="presentation"
      aria-label={`${bufferMinutes} minute buffer`}
    >
      <span className="text-[10px] text-stone-400 px-1 truncate">buffer</span>
    </div>
  );
}

// =============================================================================
// Enhanced Conflict Layer with Block Position Awareness
// =============================================================================

interface EnhancedConflictLayerProps extends Omit<ConflictLayerProps, 'conflicts'> {
  /** Conflicts with computed overlap positions */
  conflicts: Array<TimelineConflict & { overlapPosition?: number }>;
  /** Map of block ID to its start time (for computing overlap position) */
  blockStartTimes?: Map<string, Date>;
}

/**
 * Enhanced conflict layer that can compute overlap positions from block data.
 *
 * If blockStartTimes is provided, the overlap position for each conflict marker
 * is computed as the start time of block2 (the later block in the conflict).
 */
export function EnhancedConflictLayer({
  conflicts,
  risks,
  timeRange,
  pixelsPerHour,
  tableIdToRowIndex,
  rowHeight,
  dateString,
  blockStartTimes,
}: EnhancedConflictLayerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Risk zones */}
      {risks.map((risk) => {
        const rowIndex = tableIdToRowIndex.get(risk.table_id);
        if (rowIndex === undefined) return null;

        const sessionEnd = parseTimeString(risk.current_end_time, dateString);
        const bookingStart = parseTimeString(risk.next_start_time, dateString);

        return (
          <div
            key={`risk-${risk.table_id}-${risk.next_booking_id}`}
            className="absolute left-0 right-0"
            style={{
              top: rowIndex * rowHeight,
              height: rowHeight,
            }}
          >
            <RiskZone
              sessionEnd={sessionEnd}
              bookingStart={bookingStart}
              timeRange={timeRange}
              pixelsPerHour={pixelsPerHour}
              riskLevel={risk.risk_level}
            />
          </div>
        );
      })}

      {/* Conflict markers with computed positions */}
      {conflicts.map((conflict) => {
        const rowIndex = tableIdToRowIndex.get(conflict.tableId);
        if (rowIndex === undefined) return null;

        // Compute overlap position from block2's start time
        let leftPosition = 0;
        if (conflict.overlapPosition !== undefined) {
          leftPosition = conflict.overlapPosition;
        } else if (blockStartTimes) {
          const block2Start = blockStartTimes.get(conflict.block2Id);
          if (block2Start) {
            leftPosition = timeToPixels(block2Start, timeRange, pixelsPerHour);
          }
        }

        const isCritical = conflict.severity === 'critical';

        return (
          <div
            key={`${conflict.block1Id}-${conflict.block2Id}`}
            className="absolute z-30 pointer-events-auto"
            style={{
              left: leftPosition,
              top: rowIndex * rowHeight + rowHeight / 2,
              transform: 'translate(-50%, -50%)',
            }}
            title={`${isCritical ? 'Hard conflict' : 'Soft conflict'}: ${conflict.overlapMinutes} min overlap`}
          >
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center shadow-md cursor-help',
                isCritical
                  ? 'bg-red-500 animate-pulse'
                  : 'bg-amber-500',
              )}
            >
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
