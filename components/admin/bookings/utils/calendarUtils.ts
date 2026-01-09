/**
 * Calendar Utility Functions
 *
 * Provides date/time calculations and positioning utilities for the
 * Outlook-style calendar views.
 */

/**
 * Extracts hours and minutes from a time value.
 * Handles ISO strings (2026-01-09T22:30:00.000Z), HH:MM strings, and Date objects.
 * For ISO strings and Date objects, extracts the time as-is without timezone conversion
 * since times represent venue local time.
 *
 * @param time - Date object, ISO string, or HH:MM(:SS) string
 * @returns Object with hours (0-23) and minutes (0-59)
 */
function extractTimeComponents(time: Date | string): { hours: number; minutes: number } {
  if (typeof time === 'string') {
    // Check if it's an ISO string (contains 'T')
    if (time.includes('T')) {
      // Extract time portion from ISO string: "2026-01-09T22:30:00.000Z" -> "22:30"
      const timeMatch = time.match(/T(\d{2}):(\d{2})/);
      if (timeMatch) {
        return {
          hours: parseInt(timeMatch[1], 10),
          minutes: parseInt(timeMatch[2], 10),
        };
      }
      // Fallback: parse as Date and use UTC (ISO strings are UTC)
      const d = new Date(time);
      return {
        hours: d.getUTCHours(),
        minutes: d.getUTCMinutes(),
      };
    }
    // HH:MM or HH:MM:SS format
    const parts = time.split(':');
    return {
      hours: parseInt(parts[0], 10),
      minutes: parseInt(parts[1], 10),
    };
  }
  // Date object - use local time (assumes Date was created correctly)
  return {
    hours: time.getHours(),
    minutes: time.getMinutes(),
  };
}

/**
 * Gets an array of 7 dates for a week, starting from Sunday.
 *
 * @param date - Any date within the desired week
 * @returns Array of 7 Date objects (Sunday through Saturday)
 */
export function getWeekDays(date: Date): Date[] {
  const result: Date[] = [];
  const d = new Date(date);

  // Find Sunday (start of week)
  const dayOfWeek = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - dayOfWeek);
  d.setHours(0, 0, 0, 0);

  // Generate 7 days
  for (let i = 0; i < 7; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    result.push(day);
  }

  return result;
}

/**
 * Gets a 6x7 grid of dates for a month calendar view.
 * Includes trailing days from previous month and leading days from next month.
 *
 * @param date - Any date within the desired month
 * @returns Array of 42 Date objects (6 weeks × 7 days), starting Sunday
 */
export function getMonthDays(date: Date): Date[] {
  const result: Date[] = [];

  // First day of the month
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

  // Find the Sunday of the week containing the first of the month
  const startDate = new Date(firstOfMonth);
  const dayOfWeek = startDate.getDay(); // 0 = Sunday
  startDate.setDate(startDate.getDate() - dayOfWeek);

  // Generate 42 days (6 weeks)
  for (let i = 0; i < 42; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    result.push(day);
  }

  return result;
}

/**
 * Converts a time to pixel position on the vertical timeline.
 *
 * @param time - Date object or time string (HH:MM or HH:MM:SS)
 * @param startHour - First hour displayed on timeline (e.g., 9 for 9 AM)
 * @param pixelsPerHour - Height in pixels for each hour
 * @param referenceDate - Optional date for time string parsing
 * @returns Pixel offset from top of timeline
 */
export function timeToPixels(
  time: Date | string,
  startHour: number,
  pixelsPerHour: number,
  referenceDate?: string
): number {
  const { hours, minutes } = extractTimeComponents(time);

  const totalMinutes = (hours - startHour) * 60 + minutes;
  return (totalMinutes / 60) * pixelsPerHour;
}

/**
 * Converts a pixel position back to time.
 *
 * @param pixels - Pixel offset from top of timeline
 * @param startHour - First hour displayed on timeline
 * @param pixelsPerHour - Height in pixels for each hour
 * @returns Time string in HH:MM format
 */
export function pixelsToTime(
  pixels: number,
  startHour: number,
  pixelsPerHour: number
): string {
  const totalMinutes = (pixels / pixelsPerHour) * 60;
  const hours = Math.floor(totalMinutes / 60) + startHour;
  const minutes = Math.round(totalMinutes % 60);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Snaps a pixel position to the nearest interval (e.g., 15-minute marks).
 *
 * @param pixels - Raw pixel position
 * @param pixelsPerHour - Height in pixels for each hour
 * @param intervalMinutes - Snap interval in minutes (default: 15)
 * @returns Snapped pixel position
 */
export function snapToInterval(
  pixels: number,
  pixelsPerHour: number,
  intervalMinutes: number = 15
): number {
  const pixelsPerInterval = (pixelsPerHour / 60) * intervalMinutes;
  return Math.round(pixels / pixelsPerInterval) * pixelsPerInterval;
}

/**
 * Formats a date to YYYY-MM-DD string.
 *
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a time to display format (e.g., "2:30 PM").
 *
 * @param time - Date object or time string (HH:MM)
 * @returns Formatted time string
 */
export function formatTimeDisplay(time: Date | string): string {
  const { hours, minutes } = extractTimeComponents(time);

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes > 0 ? `:${String(minutes).padStart(2, '0')}` : '';

  return `${displayHours}${displayMinutes} ${period}`;
}

/**
 * Formats a date for display (e.g., "Friday, January 16").
 *
 * @param date - Date object
 * @param options - Optional Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDateDisplay(
  date: Date,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }
): string {
  return date.toLocaleDateString('en-US', options);
}

/**
 * Checks if two dates are the same calendar day.
 *
 * @param a - First date
 * @param b - Second date
 * @returns true if same day
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Checks if a date is today.
 *
 * @param date - Date to check
 * @returns true if today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Gets the duration in minutes between two times.
 *
 * @param startTime - Start time (Date or HH:MM string)
 * @param endTime - End time (Date or HH:MM string)
 * @param referenceDate - Reference date for string parsing
 * @returns Duration in minutes
 */
export function getDurationMinutes(
  startTime: Date | string,
  endTime: Date | string,
  referenceDate: string = '2000-01-01'
): number {
  const start = extractTimeComponents(startTime);
  const end = extractTimeComponents(endTime);

  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  // Handle crossing midnight (e.g., 10 PM to 1 AM)
  if (endMinutes < startMinutes) {
    return (24 * 60 - startMinutes) + endMinutes;
  }

  return endMinutes - startMinutes;
}

/**
 * Generates hour labels for the time column.
 *
 * @param startHour - First hour (0-23)
 * @param endHour - Last hour (0-23)
 * @returns Array of { hour, label } objects
 */
export function generateHourLabels(
  startHour: number,
  endHour: number
): Array<{ hour: number; label: string }> {
  const labels: Array<{ hour: number; label: string }> = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    labels.push({
      hour,
      label: `${displayHour} ${period}`,
    });
  }

  return labels;
}

/**
 * Parses a date string in YYYY-MM-DD format to a Date object.
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object (at midnight local time)
 */
export function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Gets the start of a week (Sunday) for a given date.
 *
 * @param date - Any date
 * @returns Date object for Sunday of that week
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  d.setDate(d.getDate() - dayOfWeek);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Gets the end of a week (Saturday) for a given date.
 *
 * @param date - Any date
 * @returns Date object for Saturday of that week
 */
export function getWeekEnd(date: Date): Date {
  const d = getWeekStart(date);
  d.setDate(d.getDate() + 6);
  return d;
}

/**
 * Calculates the height in pixels for a block based on duration.
 *
 * @param startTime - Block start time
 * @param endTime - Block end time
 * @param pixelsPerHour - Height in pixels per hour
 * @returns Height in pixels
 */
export function calculateBlockHeight(
  startTime: Date | string,
  endTime: Date | string,
  pixelsPerHour: number
): number {
  const durationMinutes = getDurationMinutes(startTime, endTime);
  return (durationMinutes / 60) * pixelsPerHour;
}
