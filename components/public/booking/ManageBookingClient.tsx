'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Gamepad2,
  Pencil,
  X,
  AlertTriangle,
  Check,
  Mail,
  Phone,
} from '@/components/icons';
import { cn } from '@/lib/utils';
import type { BookingWithDetails, VenueBookingSettings } from '@/lib/db/types';
import { ModifyBookingModal } from './ModifyBookingModal';
import { CancelBookingDialog } from './CancelBookingDialog';
import { AddGameModal } from './AddGameModal';
import { AddToCalendar } from './AddToCalendar';

interface ManageBookingClientProps {
  booking: BookingWithDetails;
  venueName: string;
  venueSettings: VenueBookingSettings | null;
}

export function ManageBookingClient({
  booking: initialBooking,
  venueName,
  venueSettings,
}: ManageBookingClientProps) {
  const router = useRouter();
  const [booking, setBooking] = useState(initialBooking);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showAddGameModal, setShowAddGameModal] = useState(false);

  const isModifiable = ['pending', 'confirmed'].includes(booking.status);
  const isCancellable = ['pending', 'confirmed', 'arrived'].includes(booking.status);
  const isPast = isBookingPast(booking);
  const isCompleted = ['completed', 'no_show', 'cancelled_by_guest', 'cancelled_by_venue'].includes(
    booking.status
  );

  const handleCancelComplete = () => {
    setShowCancelDialog(false);
    router.refresh();
  };

  const handleModifyComplete = (updatedBooking: BookingWithDetails) => {
    setBooking(updatedBooking);
    setShowModifyModal(false);
  };

  // Calculate duration for display
  const durationMinutes = calculateDurationMinutes(booking.start_time, booking.end_time);

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <StatusBanner status={booking.status} />

      {/* Booking Details Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-serif">Reservation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-[color:var(--color-ink-secondary)] mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-medium text-[color:var(--color-ink-primary)]">
                {formatDateDisplay(booking.booking_date)}
              </div>
              <div className="text-sm text-[color:var(--color-ink-secondary)]">
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
              </div>
            </div>
          </div>

          {/* Party Size */}
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
            <div>
              <span className="font-medium text-[color:var(--color-ink-primary)]">{booking.party_size}</span>
              <span className="text-[color:var(--color-ink-secondary)]">
                {' '}
                {booking.party_size === 1 ? 'guest' : 'guests'}
              </span>
            </div>
          </div>

          {/* Table */}
          {booking.venue_table && (
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
              <div>
                <span className="font-medium text-[color:var(--color-ink-primary)]">
                  {booking.venue_table.label}
                </span>
              </div>
            </div>
          )}

          {/* Game Reservation */}
          {booking.game ? (
            <div className="flex items-start gap-3">
              <Gamepad2 className="w-5 h-5 text-teal-600 mt-0.5" aria-hidden="true" />
              <div>
                <div className="font-medium text-teal-700">{booking.game.title}</div>
                <div className="text-sm text-[color:var(--color-ink-secondary)]">
                  Reserved and ready at your table
                </div>
              </div>
            </div>
          ) : isModifiable && !isPast ? (
            <button
              onClick={() => setShowAddGameModal(true)}
              className="flex items-center gap-3 w-full p-3 rounded-lg border border-dashed border-[color:var(--color-structure)] hover:border-teal-400 hover:bg-teal-50 transition-colors min-h-[48px]"
            >
              <Gamepad2 className="w-5 h-5 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
              <span className="text-sm text-[color:var(--color-ink-secondary)]">
                Reserve a game for your visit
              </span>
            </button>
          ) : null}

          {/* Notes */}
          {booking.notes && (
            <div className="pt-3 border-t border-[color:var(--color-structure)]">
              <p className="text-sm text-[color:var(--color-ink-secondary)]">
                <span className="font-medium">Notes:</span> {booking.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guest Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-serif">Guest Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="font-medium text-lg text-[color:var(--color-ink-primary)]">
            {booking.guest_name}
          </div>

          {booking.guest_email && (
            <div className="flex items-center gap-2 text-sm text-[color:var(--color-ink-secondary)]">
              <Mail className="w-4 h-4" aria-hidden="true" />
              {booking.guest_email}
            </div>
          )}

          {booking.guest_phone && (
            <div className="flex items-center gap-2 text-sm text-[color:var(--color-ink-secondary)]">
              <Phone className="w-4 h-4" aria-hidden="true" />
              {booking.guest_phone}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add to Calendar - show for confirmed/pending bookings that haven't passed */}
      {booking.confirmation_code && !isCompleted && !isPast && (
        <AddToCalendar
          venueName={venueName}
          bookingDate={booking.booking_date}
          startTime={booking.start_time}
          endTime={booking.end_time}
          confirmationCode={booking.confirmation_code}
          partySize={booking.party_size}
          gameTitle={booking.game?.title}
          venueSettings={venueSettings}
          className="w-full min-h-[48px]"
        />
      )}

      {/* Actions */}
      {!isCompleted && !isPast && (
        <div className="space-y-3">
          {isModifiable && (
            <Button
              variant="secondary"
              className="w-full min-h-[48px]"
              onClick={() => setShowModifyModal(true)}
            >
              <Pencil className="w-4 h-4 mr-2" aria-hidden="true" />
              Modify Reservation
            </Button>
          )}

          {isCancellable && (
            <Button
              variant="ghost"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[48px]"
              onClick={() => setShowCancelDialog(true)}
            >
              <X className="w-4 h-4 mr-2" aria-hidden="true" />
              Cancel Reservation
            </Button>
          )}
        </div>
      )}

      {/* Cancellation Policy */}
      {isCancellable && !isPast && (
        <div className="p-4 bg-[color:var(--color-elevated)] rounded-lg border border-[color:var(--color-structure)]">
          <h3 className="text-sm font-medium text-[color:var(--color-ink-primary)] mb-1">
            Cancellation Policy
          </h3>
          <p className="text-sm text-[color:var(--color-ink-secondary)]">
            Free cancellation up to 2 hours before your reservation. Late cancellations or no-shows
            may affect future bookings.
          </p>
        </div>
      )}

      {/* Confirmation Info */}
      <div className="text-center text-sm text-[color:var(--color-ink-secondary)]">
        <p>
          Booking ID: <span className="font-mono">{booking.id.slice(0, 8)}</span>
        </p>
        <p>Booked on {formatDateShort(booking.created_at)}</p>
      </div>

      {/* Modals */}
      <ModifyBookingModal
        open={showModifyModal}
        onClose={() => setShowModifyModal(false)}
        booking={booking}
        durationMinutes={durationMinutes}
        onComplete={handleModifyComplete}
      />

      <CancelBookingDialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        booking={booking}
        onComplete={handleCancelComplete}
      />

      <AddGameModal
        open={showAddGameModal}
        onClose={() => setShowAddGameModal(false)}
        booking={booking}
        onComplete={(updatedBooking) => {
          setBooking(updatedBooking);
          setShowAddGameModal(false);
        }}
      />
    </div>
  );
}

function StatusBanner({ status }: { status: string }) {
  const config: Record<string, { bg: string; icon: typeof Clock; iconColor: string; title: string; message: string }> = {
    pending: {
      bg: 'bg-amber-50 border-amber-200',
      icon: Clock,
      iconColor: 'text-amber-500',
      title: 'Pending Confirmation',
      message: 'Your booking is awaiting confirmation.',
    },
    confirmed: {
      bg: 'bg-emerald-50 border-emerald-200',
      icon: Check,
      iconColor: 'text-emerald-500',
      title: 'Confirmed',
      message: "You're all set! See you soon.",
    },
    arrived: {
      bg: 'bg-teal-50 border-teal-200',
      icon: Check,
      iconColor: 'text-teal-500',
      title: 'Checked In',
      message: 'You have arrived. Enjoy your visit!',
    },
    seated: {
      bg: 'bg-teal-50 border-teal-200',
      icon: Check,
      iconColor: 'text-teal-500',
      title: 'Seated',
      message: 'Your session is in progress. Have fun!',
    },
    completed: {
      bg: 'bg-stone-50 border-stone-200',
      icon: Check,
      iconColor: 'text-stone-400',
      title: 'Completed',
      message: 'This reservation has ended. Thanks for visiting!',
    },
    no_show: {
      bg: 'bg-stone-50 border-stone-200',
      icon: AlertTriangle,
      iconColor: 'text-stone-400',
      title: 'No Show',
      message: 'This reservation was marked as a no-show.',
    },
    cancelled_by_guest: {
      bg: 'bg-stone-50 border-stone-200',
      icon: X,
      iconColor: 'text-stone-400',
      title: 'Cancelled',
      message: 'You cancelled this reservation.',
    },
    cancelled_by_venue: {
      bg: 'bg-stone-50 border-stone-200',
      icon: X,
      iconColor: 'text-stone-400',
      title: 'Cancelled by Venue',
      message: 'This reservation was cancelled by the venue.',
    },
  };

  const defaultConfig = {
    bg: 'bg-stone-50 border-stone-200',
    icon: Clock,
    iconColor: 'text-stone-400',
    title: status,
    message: '',
  };

  const statusConfig = config[status] ?? defaultConfig;
  const Icon = statusConfig.icon;

  return (
    <div className={cn('p-4 rounded-lg border', statusConfig.bg)} role="status">
      <div className="flex items-center gap-3">
        <Icon className={cn('w-5 h-5', statusConfig.iconColor)} aria-hidden="true" />
        <div>
          <div className="font-medium text-[color:var(--color-ink-primary)]">{statusConfig.title}</div>
          {statusConfig.message && (
            <div className="text-sm text-[color:var(--color-ink-secondary)]">{statusConfig.message}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function isBookingPast(booking: BookingWithDetails): boolean {
  const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
  return bookingDateTime < new Date();
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function calculateDurationMinutes(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;
  return endTotal - startTotal;
}
