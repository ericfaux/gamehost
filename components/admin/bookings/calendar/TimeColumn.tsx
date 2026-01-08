'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { generateHourLabels } from '../utils/calendarUtils';

/**
 * Props for the TimeColumn component.
 */
interface TimeColumnProps {
  /** First hour to display (0-23, e.g., 9 for 9 AM) */
  startHour: number;
  /** Last hour to display (0-23, e.g., 23 for 11 PM) */
  endHour: number;
  /** Height in pixels for each hour */
  pixelsPerHour: number;
  /** Width of the time column (default: 60px) */
  width?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * TimeColumn Component
 *
 * Renders the vertical time axis for calendar views.
 * Shows hour labels (e.g., "9 AM", "10 AM") aligned with the timeline grid.
 */
export function TimeColumn({
  startHour,
  endHour,
  pixelsPerHour,
  width = 60,
  className,
}: TimeColumnProps) {
  const hourLabels = React.useMemo(
    () => generateHourLabels(startHour, endHour),
    [startHour, endHour]
  );

  const totalHeight = (endHour - startHour + 1) * pixelsPerHour;

  return (
    <div
      className={cn('flex-shrink-0 bg-white border-r border-stone-200', className)}
      style={{ width }}
    >
      <div className="relative" style={{ height: totalHeight }}>
        {hourLabels.map(({ hour, label }, index) => (
          <div
            key={hour}
            className="absolute right-2 text-xs text-stone-500 font-medium"
            style={{
              top: index * pixelsPerHour - 8, // Offset to center label on grid line
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Props for the TimeGrid component.
 */
interface TimeGridProps {
  /** First hour to display (0-23) */
  startHour: number;
  /** Last hour to display (0-23) */
  endHour: number;
  /** Height in pixels for each hour */
  pixelsPerHour: number;
  /** Show half-hour lines (default: true) */
  showHalfHourLines?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Children (booking blocks) to render on top of the grid */
  children?: React.ReactNode;
}

/**
 * TimeGrid Component
 *
 * Renders the horizontal grid lines for the calendar.
 * Solid lines at each hour, dotted lines at half-hours.
 */
export function TimeGrid({
  startHour,
  endHour,
  pixelsPerHour,
  showHalfHourLines = true,
  className,
  children,
}: TimeGridProps) {
  const hourCount = endHour - startHour + 1;
  const totalHeight = hourCount * pixelsPerHour;

  return (
    <div
      className={cn('relative flex-1 bg-white', className)}
      style={{ height: totalHeight }}
    >
      {/* Hour grid lines */}
      {Array.from({ length: hourCount }, (_, i) => (
        <React.Fragment key={startHour + i}>
          {/* Full hour line */}
          <div
            className="absolute left-0 right-0 border-t border-stone-200"
            style={{ top: i * pixelsPerHour }}
          />
          {/* Half hour line */}
          {showHalfHourLines && i < hourCount - 1 && (
            <div
              className="absolute left-0 right-0 border-t border-stone-100 border-dashed"
              style={{ top: i * pixelsPerHour + pixelsPerHour / 2 }}
            />
          )}
        </React.Fragment>
      ))}
      {/* Bottom border for last hour */}
      <div
        className="absolute left-0 right-0 border-t border-stone-200"
        style={{ top: hourCount * pixelsPerHour }}
      />

      {/* Content area for blocks */}
      <div className="relative" style={{ height: totalHeight }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Combined TimeColumn and TimeGrid layout wrapper.
 */
interface TimelineLayoutProps {
  /** First hour to display (0-23) */
  startHour: number;
  /** Last hour to display (0-23) */
  endHour: number;
  /** Height in pixels for each hour */
  pixelsPerHour: number;
  /** Width of time column (default: 60px) */
  timeColumnWidth?: number;
  /** Additional CSS classes for the container */
  className?: string;
  /** Children to render in the grid area */
  children?: React.ReactNode;
}

/**
 * TimelineLayout Component
 *
 * Combines TimeColumn and TimeGrid into a single layout component.
 * Use this for the day view where you need time labels + booking area.
 */
export function TimelineLayout({
  startHour,
  endHour,
  pixelsPerHour,
  timeColumnWidth = 60,
  className,
  children,
}: TimelineLayoutProps) {
  return (
    <div className={cn('flex', className)}>
      <TimeColumn
        startHour={startHour}
        endHour={endHour}
        pixelsPerHour={pixelsPerHour}
        width={timeColumnWidth}
      />
      <TimeGrid
        startHour={startHour}
        endHour={endHour}
        pixelsPerHour={pixelsPerHour}
      >
        {children}
      </TimeGrid>
    </div>
  );
}
