'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { timeToPixels, formatTimeDisplay } from '../utils/calendarUtils';

/**
 * Props for the NowIndicator component.
 */
interface NowIndicatorProps {
  /** First hour displayed on timeline (0-23) */
  startHour: number;
  /** Last hour displayed on timeline (0-23) */
  endHour: number;
  /** Height in pixels per hour */
  pixelsPerHour: number;
  /** Show time label next to indicator (default: true) */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * NowIndicator Component
 *
 * Displays a horizontal line indicating the current time on the calendar.
 * Auto-updates every minute to stay accurate.
 */
export function NowIndicator({
  startHour,
  endHour,
  pixelsPerHour,
  showLabel = true,
  className,
}: NowIndicatorProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Calculate position and visibility
  const { top, isVisible, timeLabel } = useMemo(() => {
    const now = currentTime;
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Check if current time is within visible range
    const currentHour = hours + minutes / 60;
    const visible = currentHour >= startHour && currentHour <= endHour + 1;

    // Calculate pixel position
    const pixelTop = timeToPixels(now, startHour, pixelsPerHour);

    // Format time for label
    const label = formatTimeDisplay(now);

    return {
      top: pixelTop,
      isVisible: visible,
      timeLabel: label,
    };
  }, [currentTime, startHour, endHour, pixelsPerHour]);

  // Don't render if outside visible range
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute left-0 right-0 z-20 pointer-events-none',
        className
      )}
      style={{ top }}
    >
      {/* Time label */}
      {showLabel && (
        <div className="absolute -left-1 -top-2.5 transform -translate-x-full">
          <span className="text-xs font-medium text-red-600 bg-white px-1 rounded shadow-sm">
            {timeLabel}
          </span>
        </div>
      )}

      {/* Indicator line */}
      <div className="relative flex items-center">
        {/* Dot at the start */}
        <div className="absolute -left-1 w-2 h-2 rounded-full bg-red-500" />
        {/* Line */}
        <div className="flex-1 h-px bg-red-500" />
      </div>
    </div>
  );
}

/**
 * Props for the NowIndicatorLine component (simplified version without label).
 */
interface NowIndicatorLineProps {
  /** First hour displayed on timeline (0-23) */
  startHour: number;
  /** Height in pixels per hour */
  pixelsPerHour: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * NowIndicatorLine Component
 *
 * A simpler version of NowIndicator that just shows the line.
 * Useful for week view where label positioning is different.
 */
export function NowIndicatorLine({
  startHour,
  pixelsPerHour,
  className,
}: NowIndicatorLineProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const top = useMemo(() => {
    return timeToPixels(currentTime, startHour, pixelsPerHour);
  }, [currentTime, startHour, pixelsPerHour]);

  return (
    <div
      className={cn(
        'absolute left-0 right-0 h-px bg-red-500 z-20 pointer-events-none',
        className
      )}
      style={{ top }}
    />
  );
}

/**
 * Hook to get current time that updates every minute.
 * Useful when you need to do custom calculations with current time.
 */
export function useCurrentTime(): Date {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return currentTime;
}

/**
 * Hook to check if we should auto-scroll to current time.
 * Returns the pixel offset if current time is within range, null otherwise.
 */
export function useAutoScrollToNow(
  startHour: number,
  endHour: number,
  pixelsPerHour: number
): number | null {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentHour = hours + minutes / 60;

  // Only return offset if current time is within visible range
  if (currentHour >= startHour && currentHour <= endHour) {
    return timeToPixels(now, startHour, pixelsPerHour);
  }

  return null;
}
