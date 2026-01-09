'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Download, ExternalLink } from '@/components/icons';
import type { Booking } from '@/lib/db/types';
import { buildCalendarLinks } from '@/lib/utils/calendar';
import { cn } from '@/lib/utils';

interface AddToCalendarProps {
  booking: Booking;
  venueName: string;
  venueAddress?: string | null;
  venueTimezone?: string | null;
  reservedGame?: string | null;
}

function formatPartySize(partySize: number): string {
  return `${partySize} ${partySize === 1 ? 'guest' : 'guests'}`;
}

function buildDescription({
  confirmationCode,
  partySize,
  reservedGame,
}: {
  confirmationCode?: string | null;
  partySize: number;
  reservedGame?: string | null;
}): string {
  const lines = [];
  if (confirmationCode) {
    lines.push(`Confirmation Code: ${confirmationCode}`);
  }
  lines.push(`Party Size: ${formatPartySize(partySize)}`);
  if (reservedGame) {
    lines.push(`Reserved Game: ${reservedGame}`);
  }
  lines.push('');
  lines.push(
    confirmationCode
      ? 'Show this confirmation code when you arrive.'
      : 'Show this reservation when you arrive.'
  );
  return lines.join('\n');
}

export function AddToCalendar({
  booking,
  venueName,
  venueAddress,
  venueTimezone,
  reservedGame,
}: AddToCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const timezone =
    venueTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const location = venueAddress?.trim() || venueName;
  const description = buildDescription({
    confirmationCode: booking.confirmation_code,
    partySize: booking.party_size,
    reservedGame,
  });

  const calendarLinks = useMemo(() => {
    const confirmationCode = booking.confirmation_code || booking.id;
    const uid = `reservation-${confirmationCode}@gamehost.com`;
    return buildCalendarLinks({
      title: `Table at ${venueName}`,
      description,
      location,
      startDate: booking.booking_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      timeZone: timezone,
      uid,
      fileName: `reservation-${confirmationCode}.ics`,
    });
  }, [
    booking.booking_date,
    booking.confirmation_code,
    booking.end_time,
    booking.id,
    booking.party_size,
    booking.start_time,
    description,
    location,
    timezone,
    venueName,
  ]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleDownload = () => {
    const blob = new Blob([calendarLinks.ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = calendarLinks.icsFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition-all',
          'bg-teal-600 text-white hover:bg-teal-700',
          'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2'
        )}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Calendar className="w-5 h-5" />
        Add to Calendar
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-[color:var(--color-structure)]',
            'bg-white shadow-elevation animate-in fade-in-0 zoom-in-95 duration-150'
          )}
          role="menu"
          aria-orientation="vertical"
        >
          <a
            href={calendarLinks.google}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[color:var(--color-ink-primary)] hover:bg-[color:var(--color-muted)]"
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            <ExternalLink className="w-4 h-4 text-[color:var(--color-ink-secondary)]" />
            Google Calendar
          </a>
          <a
            href={calendarLinks.outlook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[color:var(--color-ink-primary)] hover:bg-[color:var(--color-muted)]"
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            <ExternalLink className="w-4 h-4 text-[color:var(--color-ink-secondary)]" />
            Outlook
          </a>
          <button
            type="button"
            onClick={handleDownload}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-[color:var(--color-ink-primary)] hover:bg-[color:var(--color-muted)]"
            role="menuitem"
          >
            <Download className="w-4 h-4 text-[color:var(--color-ink-secondary)]" />
            Download .ics file
          </button>
        </div>
      )}
    </div>
  );
}
