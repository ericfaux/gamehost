/**
 * Build calendar URLs and ICS payloads for booking-style events.
 */
export interface CalendarEventDetails {
  title: string;
  description: string;
  location?: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS or HH:MM
  endTime: string; // HH:MM:SS or HH:MM
  timeZone: string;
  uid: string;
  fileName: string;
}

interface CalendarLinks {
  google: string;
  outlook: string;
  ics: string;
  icsFileName: string;
}

const CALENDAR_PRODUCT_ID = '-//GameHost//Reservation//EN';

function sanitizeCalendarText(text: string): string {
  return text.replace(/[<>]/g, '').replace(/\u0000/g, '').trim();
}

function normalizeTime(time: string): { hours: number; minutes: number; seconds: number } {
  const [hours, minutes, seconds] = time.split(':').map((part) => Number(part));
  return {
    hours: hours || 0,
    minutes: minutes || 0,
    seconds: seconds || 0,
  };
}

function getTimeZoneOffset(timeZone: string, date: Date): number {
  const localeDate = new Date(
    date.toLocaleString('en-US', {
      timeZone,
      hour12: false,
    })
  );
  return date.getTime() - localeDate.getTime();
}

function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const { hours, minutes, seconds } = normalizeTime(timeStr);
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  const offset = getTimeZoneOffset(timeZone, utcDate);
  return new Date(utcDate.getTime() + offset);
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatUtcForCalendar(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function ensureEndDate(startUtc: Date, endUtc: Date): Date {
  if (endUtc.getTime() <= startUtc.getTime()) {
    return new Date(endUtc.getTime() + 24 * 60 * 60 * 1000);
  }
  return endUtc;
}

export function buildCalendarLinks(details: CalendarEventDetails): CalendarLinks {
  const safeTitle = sanitizeCalendarText(details.title);
  const safeDescription = sanitizeCalendarText(details.description);
  const safeLocation = details.location ? sanitizeCalendarText(details.location) : '';
  const startUtc = zonedTimeToUtc(details.startDate, details.startTime, details.timeZone);
  const endUtc = ensureEndDate(
    startUtc,
    zonedTimeToUtc(details.startDate, details.endTime, details.timeZone)
  );
  const startUtcFormatted = formatUtcForCalendar(startUtc);
  const endUtcFormatted = formatUtcForCalendar(endUtc);

  const googleParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: safeTitle,
    dates: `${startUtcFormatted}/${endUtcFormatted}`,
    details: safeDescription,
    location: safeLocation,
    ctz: details.timeZone,
  });

  const outlookParams = new URLSearchParams({
    subject: safeTitle,
    startdt: startUtc.toISOString(),
    enddt: endUtc.toISOString(),
    body: safeDescription,
    location: safeLocation,
    path: '/calendar/action/compose',
    rru: 'addevent',
  });

  const descriptionIcs = escapeIcsText(safeDescription);
  const locationIcs = safeLocation ? escapeIcsText(safeLocation) : '';

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${CALENDAR_PRODUCT_ID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${details.uid}`,
    `DTSTAMP:${formatUtcForCalendar(new Date())}`,
    `DTSTART:${startUtcFormatted}`,
    `DTEND:${endUtcFormatted}`,
    `SUMMARY:${escapeIcsText(safeTitle)}`,
    `DESCRIPTION:${descriptionIcs}`,
    locationIcs ? `LOCATION:${locationIcs}` : null,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean) as string[];

  return {
    google: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`,
    ics: icsLines.join('\r\n'),
    icsFileName: details.fileName,
  };
}
