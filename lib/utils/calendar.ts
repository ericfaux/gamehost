/**
 * Calendar utility functions for generating calendar links and ICS files.
 * Used for "Add to Calendar" functionality on booking confirmation pages.
 */

export interface CalendarEventData {
  title: string;
  description: string;
  location: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:MM:SS
  timezone?: string; // e.g., "America/New_York"
}

export interface BookingCalendarData {
  venueName: string;
  venueAddress?: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endTime: string; // HH:MM:SS
  confirmationCode: string;
  partySize: number;
  gameTitle?: string;
  timezone?: string;
}

/**
 * Builds a full venue address string from VenueBookingSettings address fields.
 */
export function buildVenueAddress(settings: {
  venue_address_street?: string | null;
  venue_address_city?: string | null;
  venue_address_state?: string | null;
  venue_address_postal_code?: string | null;
  venue_address_country?: string | null;
}): string {
  const parts: string[] = [];

  if (settings.venue_address_street) {
    parts.push(settings.venue_address_street);
  }

  const cityLine: string[] = [];
  if (settings.venue_address_city) cityLine.push(settings.venue_address_city);
  if (settings.venue_address_state) cityLine.push(settings.venue_address_state);
  if (settings.venue_address_postal_code) cityLine.push(settings.venue_address_postal_code);

  if (cityLine.length > 0) {
    if (settings.venue_address_city && settings.venue_address_state) {
      parts.push(`${settings.venue_address_city}, ${settings.venue_address_state} ${settings.venue_address_postal_code || ''}`.trim());
    } else {
      parts.push(cityLine.join(' '));
    }
  }

  if (settings.venue_address_country) {
    parts.push(settings.venue_address_country);
  }

  return parts.join(', ');
}

/**
 * Creates calendar event data from booking data.
 */
export function createCalendarEvent(data: BookingCalendarData): CalendarEventData {
  const title = `Table at ${data.venueName}`;

  const descriptionLines: string[] = [
    `Confirmation Code: ${data.confirmationCode}`,
    `Party Size: ${data.partySize} ${data.partySize === 1 ? 'guest' : 'guests'}`,
  ];

  if (data.gameTitle) {
    descriptionLines.push(`Reserved Game: ${data.gameTitle}`);
  }

  descriptionLines.push('');
  descriptionLines.push('Show this confirmation code when you arrive.');

  return {
    title,
    description: descriptionLines.join('\n'),
    location: data.venueAddress || data.venueName,
    startDate: data.bookingDate,
    startTime: data.startTime,
    endDate: data.bookingDate, // Assuming same-day bookings
    endTime: data.endTime,
    timezone: data.timezone,
  };
}

/**
 * Formats a date and time for Google Calendar URL.
 * Google Calendar expects: YYYYMMDDTHHMMSS (local time) or YYYYMMDDTHHMMSSZ (UTC)
 */
function formatGoogleDateTime(date: string, time: string): string {
  const [year, month, day] = date.split('-');
  const [hours, minutes, seconds = '00'] = time.split(':');
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Generates a Google Calendar URL for the event.
 * Opens in a new tab with the event pre-filled.
 */
export function generateGoogleCalendarUrl(event: CalendarEventData): string {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams();

  params.set('action', 'TEMPLATE');
  params.set('text', event.title);

  // Format dates as YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS
  const startFormatted = formatGoogleDateTime(event.startDate, event.startTime);
  const endFormatted = formatGoogleDateTime(event.endDate, event.endTime);
  params.set('dates', `${startFormatted}/${endFormatted}`);

  params.set('details', event.description);
  params.set('location', event.location);

  // Set timezone if provided
  if (event.timezone) {
    params.set('ctz', event.timezone);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Formats a date and time for Outlook Calendar URL.
 * Outlook expects ISO 8601 format: YYYY-MM-DDTHH:MM:SS
 */
function formatOutlookDateTime(date: string, time: string): string {
  // Ensure time has seconds
  const timeParts = time.split(':');
  const formattedTime = timeParts.length === 2 ? `${time}:00` : time;
  return `${date}T${formattedTime}`;
}

/**
 * Generates an Outlook Web Calendar URL for the event.
 * Opens in a new tab with the event pre-filled.
 */
export function generateOutlookCalendarUrl(event: CalendarEventData): string {
  const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
  const params = new URLSearchParams();

  params.set('path', '/calendar/action/compose');
  params.set('rru', 'addevent');
  params.set('subject', event.title);
  params.set('startdt', formatOutlookDateTime(event.startDate, event.startTime));
  params.set('enddt', formatOutlookDateTime(event.endDate, event.endTime));
  params.set('body', event.description);
  params.set('location', event.location);

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Escapes special characters for ICS format per RFC 5545.
 * Backslash, semicolon, and comma must be escaped.
 * Newlines are represented as \n (literal backslash-n).
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Formats a date and time for ICS file.
 * ICS expects: YYYYMMDDTHHMMSS
 */
function formatIcsDateTime(date: string, time: string): string {
  const [year, month, day] = date.split('-');
  const [hours, minutes, seconds = '00'] = time.split(':');
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Generates a unique ID for the ICS event.
 */
function generateUid(confirmationCode: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${confirmationCode}-${timestamp}-${random}@gamehost.com`;
}

/**
 * Folds long lines in ICS format per RFC 5545.
 * Lines must be no longer than 75 octets (bytes).
 * Continuation lines start with a space or tab.
 */
function foldIcsLine(line: string): string {
  const maxLength = 75;
  if (line.length <= maxLength) {
    return line;
  }

  const lines: string[] = [];
  let remaining = line;

  // First line can be full length
  lines.push(remaining.substring(0, maxLength));
  remaining = remaining.substring(maxLength);

  // Continuation lines start with a space, so max content is 74
  while (remaining.length > 0) {
    lines.push(' ' + remaining.substring(0, maxLength - 1));
    remaining = remaining.substring(maxLength - 1);
  }

  return lines.join('\r\n');
}

/**
 * Gets the current UTC timestamp in ICS format.
 */
function getCurrentIcsTimestamp(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Generates an ICS file content string for the event.
 * Compatible with Apple Calendar, Outlook desktop, Google Calendar (import), etc.
 */
export function generateIcsContent(
  event: CalendarEventData,
  confirmationCode: string
): string {
  const uid = generateUid(confirmationCode);
  const dtstamp = getCurrentIcsTimestamp();
  const dtstart = formatIcsDateTime(event.startDate, event.startTime);
  const dtend = formatIcsDateTime(event.endDate, event.endTime);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GameHost//Reservation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
  ];

  // Add timezone-aware date/times if timezone is provided
  if (event.timezone) {
    lines.push(`DTSTART;TZID=${event.timezone}:${dtstart}`);
    lines.push(`DTEND;TZID=${event.timezone}:${dtend}`);
  } else {
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${dtend}`);
  }

  lines.push(foldIcsLine(`SUMMARY:${escapeIcsText(event.title)}`));
  lines.push(foldIcsLine(`DESCRIPTION:${escapeIcsText(event.description)}`));
  lines.push(foldIcsLine(`LOCATION:${escapeIcsText(event.location)}`));
  lines.push('STATUS:CONFIRMED');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  // ICS files require CRLF line endings
  return lines.join('\r\n');
}

/**
 * Triggers a download of an ICS file in the browser.
 */
export function downloadIcsFile(
  event: CalendarEventData,
  confirmationCode: string
): void {
  const icsContent = generateIcsContent(event, confirmationCode);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `reservation-${confirmationCode}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Sanitizes user input to prevent XSS in calendar content.
 * Removes HTML tags and limits length.
 */
export function sanitizeCalendarText(text: string, maxLength = 500): string {
  // Remove HTML tags
  const sanitized = text.replace(/<[^>]*>/g, '');
  // Trim and limit length
  return sanitized.trim().substring(0, maxLength);
}
