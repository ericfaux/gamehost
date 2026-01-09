'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Calendar,
  CalendarClock,
  CalendarPlus,
  ChevronDown,
  Download,
  ExternalLink,
} from '@/components/icons';
import { createCalendarLinks } from '@/lib/utils';
import type { Booking, VenueBookingSettings } from '@/lib/db/types';

interface AddToCalendarProps {
  booking: Booking;
  venueName: string;
  settings: VenueBookingSettings;
  reservedGameTitle?: string | null;
}

function formatAddress(settings: VenueBookingSettings): string | null {
  const parts: string[] = [];

  if (settings.venue_address_street) parts.push(settings.venue_address_street);

  const cityState = [settings.venue_address_city, settings.venue_address_state]
    .filter(Boolean)
    .join(', ');

  const postal = settings.venue_address_postal_code ?? '';
  const cityLine = [cityState, postal].filter(Boolean).join(' ').trim();

  if (cityLine) parts.push(cityLine);
  if (settings.venue_address_country) parts.push(settings.venue_address_country);

  return parts.length > 0 ? parts.join(', ') : null;
}

export function AddToCalendar({
  booking,
  venueName,
  settings,
  reservedGameTitle,
}: AddToCalendarProps) {
  const venueAddress = formatAddress(settings);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const links = useMemo(() => {
    return createCalendarLinks({
      bookingId: booking.id,
      venueName,
      bookingDate: booking.booking_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      partySize: booking.party_size,
      confirmationCode: booking.confirmation_code,
      reservedGameTitle: reservedGameTitle ?? null,
      venueAddress,
      timeZone,
    });
  }, [
    booking.id,
    booking.booking_date,
    booking.start_time,
    booking.end_time,
    booking.party_size,
    booking.confirmation_code,
    venueName,
    reservedGameTitle,
    venueAddress,
    timeZone,
  ]);

  const handleDownload = () => {
    const blob = new Blob([links.icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = links.icsFileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-lg border border-[color:var(--color-structure)] bg-[color:var(--color-muted)] px-4 py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[color:var(--color-ink-primary)]">
            Add this reservation to your calendar
          </p>
          <p className="text-xs text-[color:var(--color-ink-secondary)]">
            Never miss your table at {venueName}.
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" className="w-full sm:w-auto">
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Add to Calendar
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <div className="flex flex-col gap-1">
              <a
                href={links.googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium text-[color:var(--color-ink-primary)] hover:bg-[color:var(--color-structure)]"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-teal-600" aria-hidden="true" />
                  Google Calendar
                </span>
                <ExternalLink className="h-4 w-4 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
              </a>
              <a
                href={links.outlookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium text-[color:var(--color-ink-primary)] hover:bg-[color:var(--color-structure)]"
              >
                <span className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  Outlook
                </span>
                <ExternalLink className="h-4 w-4 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium text-[color:var(--color-ink-primary)] hover:bg-[color:var(--color-structure)]"
              >
                <span className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
                  Download .ics file
                </span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
