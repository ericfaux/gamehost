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
  AlertTriangle,
  Send,
  Pencil,
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
  onEditStep: (step: number) => void;
}

// Edit button component for consistent styling
function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-[color:var(--color-ink-secondary)] hover:text-teal-600 transition-colors"
      aria-label={label}
    >
      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Edit</span>
    </button>
  );
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

// Format duration
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} minutes`;
  if (mins === 0) return hours === 1 ? '1 hour' : `${hours} hours`;
  return `${hours} hour${hours > 1 ? 's' : ''} ${mins} min`;
}

export function StepConfirm({
  venueId,
  data,
  settings,
  onComplete,
  onBack,
  onEditStep,
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
          Review Your Reservation
        </h2>
        <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
          Please confirm your details before completing your booking
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="flex items-start gap-3 p-4 bg-red-50 rounded-token border border-red-200"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-medium text-red-900">Booking Failed</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Booking Summary Card */}
      <div
        className="bg-[color:var(--color-muted)] rounded-token border border-[color:var(--color-structure)] divide-y divide-[color:var(--color-structure)]"
        role="region"
        aria-label="Booking summary"
      >
        {/* Date & Time */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-teal-600" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium text-[color:var(--color-ink-primary)]">
                  {formatDateDisplay(data.date)}
                </p>
                <div className="flex items-center gap-2 mt-1 text-sm text-[color:var(--color-ink-secondary)]">
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {formatTime(data.startTime)} - {formatTime(data.endTime)}
                  </span>
                  <span className="text-[color:var(--color-structure)]">|</span>
                  <span>{formatDuration(settings.default_duration_minutes)}</span>
                </div>
              </div>
            </div>
            <EditButton onClick={() => onEditStep(1)} label="Edit date and time" />
          </div>
        </div>

        {/* Party Size & Table */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-6 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[color:var(--color-structure)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
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
                    <TableProperties className="w-5 h-5 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
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
            <EditButton onClick={() => onEditStep(1)} label="Edit party size" />
          </div>
        </div>

        {/* Guest Details */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)]">
              Your Information
            </p>
            <EditButton onClick={() => onEditStep(3)} label="Edit contact information" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
              <span className="text-[color:var(--color-ink-primary)] font-medium">
                {data.guestName}
              </span>
            </div>

            {data.guestEmail && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
                <span className="text-[color:var(--color-ink-primary)]">
                  {data.guestEmail}
                </span>
              </div>
            )}

            {data.guestPhone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
                <span className="text-[color:var(--color-ink-primary)]">
                  {data.guestPhone}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Game Reservation */}
        {data.gameId && data.gameTitle && (
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-purple-600" aria-hidden="true" />
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
              <EditButton onClick={() => onEditStep(4)} label="Edit game selection" />
            </div>
          </div>
        )}

        {/* Special Requests */}
        {data.notes && (
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <StickyNote className="w-5 h-5 text-[color:var(--color-ink-secondary)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)] mb-1">
                    Special Requests
                  </p>
                  <p className="text-sm text-[color:var(--color-ink-primary)]">
                    {data.notes}
                  </p>
                </div>
              </div>
              <EditButton onClick={() => onEditStep(3)} label="Edit special requests" />
            </div>
          </div>
        )}
      </div>

      {/* Cancellation Policy */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-token border border-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-medium text-amber-900 text-sm">Cancellation Policy</p>
          <p className="text-sm text-amber-800 mt-1">
            Free cancellation up to 2 hours before your reservation.
            No-shows may affect future bookings.
          </p>
        </div>
      </div>

      {/* Booking Page Message */}
      {settings.booking_page_message && (
        <p className="text-xs text-[color:var(--color-ink-secondary)] text-center">
          {settings.booking_page_message}
        </p>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          aria-disabled={isPending}
          className={cn(
            'flex-1 py-3 rounded-token font-medium text-base flex items-center justify-center gap-2 transition-colors touch-manipulation border border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)] min-h-[48px]',
            isPending
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-[color:var(--color-muted)]'
          )}
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          aria-disabled={isPending}
          aria-busy={isPending}
          className={cn(
            'flex-[2] py-3 rounded-token font-semibold text-base flex items-center justify-center gap-2 transition-colors touch-manipulation min-h-[48px]',
            isPending
              ? 'bg-teal-400 cursor-not-allowed'
              : 'bg-teal-500 hover:bg-teal-600 active:scale-[0.98]',
            'text-white'
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>Booking...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" aria-hidden="true" />
              <span>Confirm Booking</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
