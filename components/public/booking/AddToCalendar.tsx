'use client';

import { useState } from 'react';
import { CalendarPlus, ChevronDown, Download, ExternalLink } from '@/components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  createCalendarEvent,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadIcsFile,
  buildVenueAddress,
  type BookingCalendarData,
} from '@/lib/utils/calendar';
import type { VenueBookingSettings } from '@/lib/db/types';

interface AddToCalendarProps {
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  confirmationCode: string;
  partySize: number;
  gameTitle?: string | null;
  venueSettings?: VenueBookingSettings | null;
  /** Optional timezone for the venue (e.g., "America/New_York") */
  timezone?: string;
  /** Optional custom class name */
  className?: string;
}

export function AddToCalendar({
  venueName,
  bookingDate,
  startTime,
  endTime,
  confirmationCode,
  partySize,
  gameTitle,
  venueSettings,
  timezone,
  className,
}: AddToCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Build venue address from settings
  const venueAddress = venueSettings ? buildVenueAddress(venueSettings) : '';

  // Create calendar data
  const calendarData: BookingCalendarData = {
    venueName,
    venueAddress: venueAddress || undefined,
    bookingDate,
    startTime,
    endTime,
    confirmationCode,
    partySize,
    gameTitle: gameTitle || undefined,
    timezone,
  };

  const event = createCalendarEvent(calendarData);

  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarUrl(event);
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleOutlookCalendar = () => {
    const url = generateOutlookCalendarUrl(event);
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleDownloadIcs = () => {
    downloadIcsFile(event, confirmationCode);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          className={className}
          aria-label="Add to calendar"
        >
          <CalendarPlus className="w-4 h-4" aria-hidden="true" />
          Add to Calendar
          <ChevronDown className="w-4 h-4 ml-1" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-2"
        align="center"
        sideOffset={8}
      >
        <div className="space-y-1" role="menu" aria-label="Calendar options">
          <CalendarOption
            icon={<GoogleCalendarIcon />}
            label="Google Calendar"
            onClick={handleGoogleCalendar}
          />
          <CalendarOption
            icon={<OutlookCalendarIcon />}
            label="Outlook"
            onClick={handleOutlookCalendar}
          />
          <CalendarOption
            icon={<Download className="w-4 h-4" />}
            label="Download .ics file"
            sublabel="Apple Calendar, Outlook Desktop"
            onClick={handleDownloadIcs}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface CalendarOptionProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
}

function CalendarOption({ icon, label, sublabel, onClick }: CalendarOptionProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-[color:var(--color-muted)] transition-colors text-left min-h-[44px]"
    >
      <span className="flex-shrink-0 text-[color:var(--color-ink-secondary)]">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[color:var(--color-ink-primary)]">
          {label}
        </div>
        {sublabel && (
          <div className="text-xs text-[color:var(--color-ink-secondary)] truncate">
            {sublabel}
          </div>
        )}
      </div>
      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
    </button>
  );
}

/**
 * Google Calendar brand icon
 */
function GoogleCalendarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {/* Calendar background */}
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        fill="#4285F4"
      />
      {/* Top binding */}
      <rect
        x="3"
        y="4"
        width="18"
        height="4"
        rx="2"
        fill="#1967D2"
      />
      {/* Calendar hooks */}
      <rect x="7" y="2" width="2" height="4" rx="1" fill="#1967D2" />
      <rect x="15" y="2" width="2" height="4" rx="1" fill="#1967D2" />
      {/* Calendar grid */}
      <rect x="6" y="10" width="3" height="3" rx="0.5" fill="white" />
      <rect x="10.5" y="10" width="3" height="3" rx="0.5" fill="white" />
      <rect x="15" y="10" width="3" height="3" rx="0.5" fill="white" />
      <rect x="6" y="15" width="3" height="3" rx="0.5" fill="white" />
      <rect x="10.5" y="15" width="3" height="3" rx="0.5" fill="white" />
      <rect x="15" y="15" width="3" height="3" rx="0.5" fill="#EA4335" />
    </svg>
  );
}

/**
 * Outlook/Microsoft Calendar brand icon
 */
function OutlookCalendarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {/* Blue background */}
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        fill="#0078D4"
      />
      {/* Top binding */}
      <rect
        x="3"
        y="4"
        width="18"
        height="4"
        rx="2"
        fill="#005A9E"
      />
      {/* Calendar hooks */}
      <rect x="7" y="2" width="2" height="4" rx="1" fill="#005A9E" />
      <rect x="15" y="2" width="2" height="4" rx="1" fill="#005A9E" />
      {/* Calendar content - simplified O for Outlook */}
      <circle cx="12" cy="14.5" r="4" stroke="white" strokeWidth="2" fill="none" />
    </svg>
  );
}
