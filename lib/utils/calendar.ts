export interface CalendarReservation {
  bookingId?: string | null;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  partySize: number;
  confirmationCode?: string | null;
  reservedGameTitle?: string | null;
  venueAddress?: string | null;
  timeZone?: string | null;
}

export interface CalendarLinks {
  googleUrl: string;
  outlookUrl: string;
  icsContent: string;
  icsFileName: string;
}

interface CalendarEventDetails {
  title: string;
  description: string;
  location: string;
  timeZone: string;
  startUtc: Date;
  endUtc: Date;
  uid: string;
}

const DEFAULT_TIME_ZONE = 'UTC';

function normalizeTime(time: string): string {
  const [rawHours = '00', rawMinutes = '00', rawSeconds = '00'] = time.split(':');
  const hours = rawHours.padStart(2, '0');
  const minutes = rawMinutes.padStart(2, '0');
  const seconds = rawSeconds.padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function sanitizeText(value: string): string {
  return value.replace(/[<>]/g, '').trim();
}

function buildReservationDescription(reservation: CalendarReservation): string {
  const lines: string[] = [];

  if (reservation.confirmationCode) {
    lines.push(`Confirmation Code: ${sanitizeText(reservation.confirmationCode)}`);
  }

  lines.push(
    `Party Size: ${reservation.partySize} ${reservation.partySize === 1 ? 'guest' : 'guests'}`
  );

  if (reservation.reservedGameTitle) {
    lines.push(`Reserved Game: ${sanitizeText(reservation.reservedGameTitle)}`);
  }

  lines.push('');
  lines.push('Show this confirmation code when you arrive.');

  return lines.join('\n');
}

function resolveTimeZone(timeZone?: string | null): string {
  if (timeZone && timeZone.trim().length > 0) {
    return timeZone;
  }
  return DEFAULT_TIME_ZONE;
}

function getUtcDateForTimeZone(dateStr: string, timeStr: string, timeZone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes, seconds] = normalizeTime(timeStr).split(':').map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  const zonedDate = new Date(utcGuess.toLocaleString('en-US', { timeZone }));
  const offset = utcGuess.getTime() - zonedDate.getTime();
  return new Date(utcGuess.getTime() + offset);
}

function ensureEndAfterStart(startUtc: Date, endUtc: Date): Date {
  if (endUtc.getTime() <= startUtc.getTime()) {
    return new Date(endUtc.getTime() + 24 * 60 * 60 * 1000);
  }
  return endUtc;
}

function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function buildEventDetails(reservation: CalendarReservation): CalendarEventDetails {
  const title = `Table at ${sanitizeText(reservation.venueName)}`;
  const description = buildReservationDescription(reservation);
  const location = sanitizeText(reservation.venueAddress || reservation.venueName);
  const timeZone = resolveTimeZone(reservation.timeZone);

  const startUtc = getUtcDateForTimeZone(reservation.bookingDate, reservation.startTime, timeZone);
  const rawEndUtc = getUtcDateForTimeZone(reservation.bookingDate, reservation.endTime, timeZone);
  const endUtc = ensureEndAfterStart(startUtc, rawEndUtc);

  const idSource = reservation.confirmationCode || reservation.bookingId || `${Date.now()}`;
  const uid = `${sanitizeText(String(idSource))}@gamehost.com`;

  return {
    title,
    description,
    location,
    timeZone,
    startUtc,
    endUtc,
    uid,
  };
}

function buildGoogleCalendarUrl(details: CalendarEventDetails): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: details.title,
    dates: `${formatUtcDate(details.startUtc)}/${formatUtcDate(details.endUtc)}`,
    details: details.description,
    location: details.location,
    ctz: details.timeZone,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildOutlookCalendarUrl(details: CalendarEventDetails): string {
  const params = new URLSearchParams({
    subject: details.title,
    startdt: details.startUtc.toISOString(),
    enddt: details.endUtc.toISOString(),
    body: details.description,
    location: details.location,
    path: '/calendar/action/compose',
    rru: 'addevent',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function buildIcsContent(details: CalendarEventDetails): string {
  const dtStamp = formatUtcDate(new Date());
  const dtStart = formatUtcDate(details.startUtc);
  const dtEnd = formatUtcDate(details.endUtc);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GameHost//Reservation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(details.uid)}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(details.title)}`,
    `DESCRIPTION:${escapeIcsText(details.description)}`,
    `LOCATION:${escapeIcsText(details.location)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

/**
 * Generates Google/Outlook URLs and a downloadable ICS file for a reservation.
 */
export function createCalendarLinks(reservation: CalendarReservation): CalendarLinks {
  const details = buildEventDetails(reservation);
  const googleUrl = buildGoogleCalendarUrl(details);
  const outlookUrl = buildOutlookCalendarUrl(details);
  const icsContent = buildIcsContent(details);

  const fileKey = sanitizeText(
    (reservation.confirmationCode || reservation.bookingId || 'reservation').toString()
  );
  const icsFileName = `reservation-${fileKey}.ics`;

  return {
    googleUrl,
    outlookUrl,
    icsContent,
    icsFileName,
  };
}
