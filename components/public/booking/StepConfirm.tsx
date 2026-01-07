'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  Users,
  User,
  Mail,
  Phone,
  Gamepad2,
  TableProperties,
  StickyNote,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Send,
} from '@/components/icons';
import { createBooking } from '@/app/actions/bookings';
import type { BookingData } from './BookingWizard';
import type { VenueBookingSettings, Booking } from '@/lib/db/types';

interface StepConfirmProps {
  venueId: string;
  data: BookingData;
  settings: VenueBookingSettings;
  onComplete: (booking: Booking) => void;
  onBack: () => void;
}

// Format time for display (12-hour format)
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

// Format date for display
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function StepConfirm({
  venueId,
  data,
  settings,
  onComplete,
  onBack,
}: StepConfirmProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Handle booking submission
  const handleSubmit = () => {
    setError(null);

    startTransition(async () => {
      try {
        const result = await createBooking({
          venue_id: venueId,
          table_id: data.selectedTableId,
          booking_date: data.date,
          start_time: data.startTime,
          duration_minutes: settings.default_duration_minutes,
          party_size: data.partySize,
          guest_name: data.guestName,
          guest_email: data.guestEmail || undefined,
          guest_phone: data.guestPhone || undefined,
          notes: data.notes || undefined,
          game_id: data.gameId || undefined,
          source: 'online',
        });

        if (result.success && result.data) {
          onComplete(result.data);
        } else {
          setError(result.error || 'Failed to create booking. Please try again.');
        }
      } catch (err) {
        console.error('Booking submission error:', err);
        setError('An unexpected error occurred. Please try again.');
      }
    });
  };

  // Get table label
  const tableLabel = data.selectedSlot?.tables.find(
    t => t.table_id === data.selectedTableId
  )?.table_label;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-serif font-semibold text-[color:var(--color-ink-primary)]">
          Confirm Your Reservation
        </h2>
        <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
          Review your details before completing your booking
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-token border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Booking Failed</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Booking Summary Card */}
      <div className="bg-[color:var(--color-muted)] rounded-token border border-[color:var(--color-structure)] divide-y divide-[color:var(--color-structure)]">
        {/* Date & Time */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="font-medium text-[color:var(--color-ink-primary)]">
                {formatDateDisplay(data.date)}
              </p>
              <div className="flex items-center gap-2 mt-1 text-sm text-[color:var(--color-ink-secondary)]">
                <Clock className="w-4 h-4" />
                <span>
                  {formatTime(data.startTime)} - {formatTime(data.endTime)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Party Size & Table */}
        <div className="p-4 flex gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[color:var(--color-structure)] flex items-center justify-center">
              <Users className="w-5 h-5 text-[color:var(--color-ink-secondary)]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)]">
                Party Size
              </p>
              <p className="font-medium text-[color:var(--color-ink-primary)]">
                {data.partySize} {data.partySize === 1 ? 'guest' : 'guests'}
              </p>
            </div>
          </div>

          {tableLabel && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[color:var(--color-structure)] flex items-center justify-center">
                <TableProperties className="w-5 h-5 text-[color:var(--color-ink-secondary)]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)]">
                  Table
                </p>
                <p className="font-medium text-[color:var(--color-ink-primary)]">
                  {tableLabel}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Guest Details */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-[color:var(--color-ink-secondary)]" />
            <span className="text-[color:var(--color-ink-primary)]">
              {data.guestName}
            </span>
          </div>

          {data.guestEmail && (
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-[color:var(--color-ink-secondary)]" />
              <span className="text-[color:var(--color-ink-primary)]">
                {data.guestEmail}
              </span>
            </div>
          )}

          {data.guestPhone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-[color:var(--color-ink-secondary)]" />
              <span className="text-[color:var(--color-ink-primary)]">
                {data.guestPhone}
              </span>
            </div>
          )}
        </div>

        {/* Game Reservation */}
        {data.gameId && data.gameTitle && (
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)]">
                  Reserved Game
                </p>
                <p className="font-medium text-[color:var(--color-ink-primary)]">
                  {data.gameTitle}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Special Requests */}
        {data.notes && (
          <div className="p-4">
            <div className="flex items-start gap-3">
              <StickyNote className="w-5 h-5 text-[color:var(--color-ink-secondary)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)] mb-1">
                  Special Requests
                </p>
                <p className="text-sm text-[color:var(--color-ink-primary)]">
                  {data.notes}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Duration Note */}
      <p className="text-xs text-[color:var(--color-ink-secondary)] text-center">
        Your table is reserved for {settings.default_duration_minutes} minutes.
        {settings.confirmation_message_template && (
          <span className="block mt-1">{settings.confirmation_message_template}</span>
        )}
      </p>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className={cn(
            'flex-1 py-3 rounded-token font-medium text-base flex items-center justify-center gap-2 transition-colors touch-manipulation border border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)]',
            isPending
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-[color:var(--color-muted)]'
          )}
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className={cn(
            'flex-[2] py-3 rounded-token font-semibold text-base flex items-center justify-center gap-2 transition-colors touch-manipulation',
            isPending
              ? 'bg-teal-400 cursor-not-allowed'
              : 'bg-teal-500 hover:bg-teal-600 active:scale-[0.98]',
            'text-white'
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Booking...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Confirm Booking
            </>
          )}
        </button>
      </div>
    </div>
  );
}
