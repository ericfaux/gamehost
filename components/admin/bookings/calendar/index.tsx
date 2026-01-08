'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { CalendarDayView } from './CalendarDayView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarMonthView } from './CalendarMonthView';
import type { TimelineBlock } from '@/lib/db/types';
import type { TimelineViewMode } from '@/lib/data/timeline';

// =============================================================================
// Types
// =============================================================================

export interface CalendarProps {
  /** Venue ID for data fetching */
  venueId: string;
  /** Initial date to display */
  initialDate?: Date;
  /** Callback when date changes */
  onDateChange?: (date: Date) => void;
  /** Callback when a block is clicked */
  onBlockClick?: (block: TimelineBlock) => void;
  /** Initial view mode (default: 'day') */
  viewMode?: TimelineViewMode;
  /** Callback when view mode changes */
  onViewModeChange?: (mode: TimelineViewMode) => void;
}

// =============================================================================
// Main Calendar Component
// =============================================================================

/**
 * Calendar Component
 *
 * The main booking calendar that supports three view modes:
 * - Day view: Vertical time axis with blocks displayed side-by-side
 * - Week view: 7-day view with Sunday start
 * - Month view: Monthly grid with booking density visualization
 *
 * All views use the Outlook-style vertical time axis where time flows
 * top-to-bottom and overlapping bookings are displayed side-by-side.
 */
export function Calendar({
  venueId,
  initialDate = new Date(),
  onDateChange,
  onBlockClick,
  viewMode: initialViewMode = 'day',
  onViewModeChange,
}: CalendarProps) {
  const [currentViewMode, setCurrentViewMode] = useState<TimelineViewMode>(initialViewMode);
  const [currentDate, setCurrentDate] = useState(initialDate);

  // Handle date change
  const handleDateChange = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      onDateChange?.(date);
    },
    [onDateChange]
  );

  // Handle view mode change
  const handleViewModeChange = useCallback(
    (mode: TimelineViewMode) => {
      setCurrentViewMode(mode);
      onViewModeChange?.(mode);
    },
    [onViewModeChange]
  );

  // Render the appropriate view based on mode
  switch (currentViewMode) {
    case 'day':
      return (
        <CalendarDayView
          venueId={venueId}
          initialDate={currentDate}
          onDateChange={handleDateChange}
          onBlockClick={onBlockClick}
          viewMode={currentViewMode}
          onViewModeChange={handleViewModeChange}
        />
      );

    case 'week':
      return (
        <CalendarWeekView
          venueId={venueId}
          initialDate={currentDate}
          onDateChange={handleDateChange}
          onBlockClick={onBlockClick}
          viewMode={currentViewMode}
          onViewModeChange={handleViewModeChange}
        />
      );

    case 'month':
      return (
        <CalendarMonthView
          venueId={venueId}
          initialDate={currentDate}
          onDateChange={handleDateChange}
          viewMode={currentViewMode}
          onViewModeChange={handleViewModeChange}
        />
      );

    default:
      return (
        <CalendarDayView
          venueId={venueId}
          initialDate={currentDate}
          onDateChange={handleDateChange}
          onBlockClick={onBlockClick}
          viewMode={currentViewMode}
          onViewModeChange={handleViewModeChange}
        />
      );
  }
}

// =============================================================================
// Re-exports
// =============================================================================

export { CalendarDayView } from './CalendarDayView';
export { CalendarWeekView } from './CalendarWeekView';
export { CalendarMonthView } from './CalendarMonthView';
export { CalendarBlock, type BlockAction } from './CalendarBlock';
export { TimeColumn, TimeGrid, TimelineLayout } from './TimeColumn';
export { NowIndicator, NowIndicatorLine, useCurrentTime, useAutoScrollToNow } from './NowIndicator';
