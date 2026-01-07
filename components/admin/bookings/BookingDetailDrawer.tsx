'use client';

/**
 * BookingDetailDrawer - Slide-out drawer showing comprehensive booking details.
 *
 * Features:
 * - Header with guest name and status badge
 * - Contact info (email, phone)
 * - Booking details (date, time, duration, table, party size)
 * - Game reservation (if any)
 * - Notes section
 * - Status timeline/history
 * - Action buttons based on booking status
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  X,
  Calendar,
  Clock,
  Users,
  Gamepad2,
  Mail,
  Phone,
  Loader2,
  Check,
  Pencil,
  ExternalLink,
  History,
  StickyNote,
  TableProperties,
  UserCheck,
  XCircle,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/AppShell';
import { cn } from '@/lib/utils';
import type { BookingWithDetails, BookingStatus } from '@/lib/db/types';
import {
  confirmBooking,
  cancelBooking,
  markArrived,
  seatParty,
} from '@/app/actions/bookings';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface BookingDetailDrawerProps {
  bookingId: string | null;
  onClose: () => void;
  onAction?: (action: string, bookingId: string) => Promise<void>;
  onEdit?: (bookingId: string) => void;
}

interface StatusEvent {
  type: 'created' | 'confirmed' | 'arrived' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  label: string;
  timestamp: string;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Formats a date string (YYYY-MM-DD) for display.
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a time string (HH:MM:SS or HH:MM) for display.
 */
function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Formats a timestamp for the history section.
 */
function formatTimestamp(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Capitalizes the first letter of a string.
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

/**
 * Builds a chronological status history from booking data.
 */
function buildStatusHistory(booking: BookingWithDetails): StatusEvent[] {
  const events: StatusEvent[] = [
    { type: 'created', label: 'Booking created', timestamp: booking.created_at },
  ];

  if (booking.confirmed_at) {
    events.push({ type: 'confirmed', label: 'Confirmed', timestamp: booking.confirmed_at });
  }
  if (booking.arrived_at) {
    events.push({ type: 'arrived', label: 'Guest arrived', timestamp: booking.arrived_at });
  }
  if (booking.seated_at) {
    events.push({ type: 'seated', label: 'Seated', timestamp: booking.seated_at });
  }
  if (booking.completed_at) {
    events.push({ type: 'completed', label: 'Completed', timestamp: booking.completed_at });
  }
  if (booking.cancelled_at) {
    const cancelLabel = booking.status === 'cancelled_by_guest'
      ? 'Cancelled by guest'
      : 'Cancelled by venue';
    events.push({ type: 'cancelled', label: cancelLabel, timestamp: booking.cancelled_at });
  }
  if (booking.no_show_at) {
    events.push({ type: 'no_show', label: 'Marked no-show', timestamp: booking.no_show_at });
  }

  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Returns status badge styling based on booking status.
 */
function getStatusStyle(status: BookingStatus): { label: string; className: string } {
  const statusMap: Record<BookingStatus, { label: string; className: string }> = {
    pending: {
      label: 'Pending',
      className: 'bg-[color:var(--color-warn)]/10 text-[color:var(--color-warn)] border-[color:var(--color-warn)]/30',
    },
    confirmed: {
      label: 'Confirmed',
      className: 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-accent)]/40',
    },
    arrived: {
      label: 'Arrived',
      className: 'bg-amber-100 text-amber-700 border-amber-300',
    },
    seated: {
      label: 'Seated',
      className: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    },
    completed: {
      label: 'Completed',
      className: 'bg-[color:var(--color-muted)] text-[color:var(--color-ink-secondary)] border-[color:var(--color-structure)]',
    },
    no_show: {
      label: 'No Show',
      className: 'bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)] border-[color:var(--color-danger)]/30',
    },
    cancelled_by_guest: {
      label: 'Cancelled',
      className: 'bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)] border-[color:var(--color-danger)]/30',
    },
    cancelled_by_venue: {
      label: 'Cancelled',
      className: 'bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)] border-[color:var(--color-danger)]/30',
    },
  };

  return statusMap[status] ?? { label: status, className: 'bg-[color:var(--color-muted)] text-[color:var(--color-ink-secondary)]' };
}

// -----------------------------------------------------------------------------
// Sub-Components
// -----------------------------------------------------------------------------

function DrawerSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4">
      <div className="h-8 bg-[color:var(--color-muted)] rounded-lg w-2/3" />
      <div className="h-4 bg-[color:var(--color-muted)] rounded w-1/2" />
      <div className="space-y-3 mt-6">
        <div className="h-20 bg-[color:var(--color-muted)] rounded-xl" />
        <div className="h-32 bg-[color:var(--color-muted)] rounded-xl" />
        <div className="h-24 bg-[color:var(--color-muted)] rounded-xl" />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const style = getStatusStyle(status);
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border',
        style.className
      )}
    >
      {style.label}
    </span>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="h-4 w-4 text-[color:var(--color-ink-secondary)] flex-shrink-0" />
      <span className="text-[color:var(--color-ink-secondary)]">{label}:</span>
      <span className="font-medium text-[color:var(--color-ink-primary)]">{value}</span>
    </div>
  );
}

function ContactSection({ booking }: { booking: BookingWithDetails }) {
  if (!booking.guest_email && !booking.guest_phone) {
    return null;
  }

  return (
    <section>
      <h3 className="text-xs uppercase tracking-wide text-[color:var(--color-ink-secondary)] mb-2 font-semibold">
        Contact
      </h3>
      <div className="space-y-2">
        {booking.guest_email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
            <a
              href={`mailto:${booking.guest_email}`}
              className="text-[color:var(--color-accent)] hover:underline"
            >
              {booking.guest_email}
            </a>
          </div>
        )}
        {booking.guest_phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
            <a
              href={`tel:${booking.guest_phone}`}
              className="text-[color:var(--color-accent)] hover:underline"
            >
              {booking.guest_phone}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function BookingDetailsSection({ booking }: { booking: BookingWithDetails }) {
  return (
    <section>
      <h3 className="text-xs uppercase tracking-wide text-[color:var(--color-ink-secondary)] mb-2 font-semibold">
        Reservation
      </h3>
      <div className="panel-surface p-3 space-y-2">
        <DetailRow icon={Calendar} label="Date" value={formatDate(booking.booking_date)} />
        <DetailRow
          icon={Clock}
          label="Time"
          value={`${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`}
        />
        <DetailRow icon={Users} label="Party Size" value={`${booking.party_size} guests`} />
        <DetailRow
          icon={TableProperties}
          label="Table"
          value={booking.venue_table?.label ?? 'Unassigned'}
        />
        <DetailRow icon={UserCheck} label="Source" value={capitalize(booking.source)} />
      </div>
    </section>
  );
}

function GameReservationSection({ game }: { game: BookingWithDetails['game'] }) {
  if (!game) return null;

  return (
    <section>
      <h3 className="text-xs uppercase tracking-wide text-[color:var(--color-ink-secondary)] mb-2 font-semibold">
        Game Reserved
      </h3>
      <div className="flex items-center gap-3 panel-surface p-3 bg-sky-50/50 dark:bg-sky-900/10 border-sky-200/50 dark:border-sky-800/30">
        {game.cover_image_url ? (
          <img
            src={game.cover_image_url}
            alt={game.title}
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
            <Gamepad2 className="h-6 w-6 text-sky-500" />
          </div>
        )}
        <div>
          <div className="font-medium text-[color:var(--color-ink-primary)]">{game.title}</div>
          <div className="text-xs text-[color:var(--color-ink-secondary)]">Ready at table</div>
        </div>
      </div>
    </section>
  );
}

function NotesSection({ notes }: { notes: string }) {
  return (
    <section>
      <h3 className="text-xs uppercase tracking-wide text-[color:var(--color-ink-secondary)] mb-2 font-semibold">
        Notes
      </h3>
      <div className="panel-surface p-3">
        <div className="flex items-start gap-2">
          <StickyNote className="h-4 w-4 text-[color:var(--color-ink-secondary)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[color:var(--color-ink-primary)]">{notes}</p>
        </div>
      </div>
    </section>
  );
}

function StatusHistorySection({ booking }: { booking: BookingWithDetails }) {
  const events = buildStatusHistory(booking);

  return (
    <section>
      <h3 className="text-xs uppercase tracking-wide text-[color:var(--color-ink-secondary)] mb-2 font-semibold flex items-center gap-1">
        <History className="h-3.5 w-3.5" />
        History
      </h3>
      <div className="space-y-2">
        {events.map((event, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div
              className={cn(
                'w-2 h-2 rounded-full flex-shrink-0',
                event.type === 'created' && 'bg-[color:var(--color-ink-secondary)]',
                event.type === 'confirmed' && 'bg-[color:var(--color-accent)]',
                event.type === 'arrived' && 'bg-amber-500',
                event.type === 'seated' && 'bg-emerald-500',
                event.type === 'completed' && 'bg-[color:var(--color-success)]',
                event.type === 'cancelled' && 'bg-[color:var(--color-danger)]',
                event.type === 'no_show' && 'bg-[color:var(--color-danger)]'
              )}
            />
            <span className="text-[color:var(--color-ink-primary)]">{event.label}</span>
            <span className="text-[color:var(--color-ink-secondary)] text-xs ml-auto font-mono">
              {formatTimestamp(event.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BookingActions({
  booking,
  onActionComplete,
  onEdit,
}: {
  booking: BookingWithDetails;
  onActionComplete: () => void;
  onEdit?: () => void;
}) {
  const { push } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleAction = async (action: string) => {
    setIsProcessing(action);
    try {
      let result;

      switch (action) {
        case 'confirm':
          result = await confirmBooking(booking.id);
          if (result.success) {
            push({ title: 'Booking confirmed', tone: 'success' });
          }
          break;

        case 'arrive':
          result = await markArrived(booking.id);
          if (result.success) {
            push({ title: 'Guest marked as arrived', tone: 'success' });
          }
          break;

        case 'seat':
          result = await seatParty(booking.id);
          if (result.success) {
            const warning = result.data?.warning;
            push({
              title: 'Party seated',
              description: warning ?? 'Session started',
              tone: 'success',
            });
          }
          break;

        case 'cancel':
          result = await cancelBooking({
            bookingId: booking.id,
            cancelledBy: 'venue',
          });
          if (result.success) {
            push({ title: 'Booking cancelled', tone: 'success' });
          }
          break;
      }

      if (result && !result.success) {
        push({
          title: 'Error',
          description: result.error ?? 'Action failed',
          tone: 'danger',
        });
      } else {
        onActionComplete();
      }
    } catch (error) {
      console.error('Action error:', error);
      push({
        title: 'Error',
        description: 'An unexpected error occurred',
        tone: 'danger',
      });
    } finally {
      setIsProcessing(null);
      setShowCancelConfirm(false);
    }
  };

  const isEditable = ['pending', 'confirmed'].includes(booking.status);
  const canCancel = ['pending', 'confirmed', 'arrived'].includes(booking.status);

  return (
    <div className="space-y-3 w-full">
      {/* Primary actions based on status */}
      {booking.status === 'pending' && (
        <Button
          variant="primary"
          className="w-full"
          onClick={() => handleAction('confirm')}
          disabled={!!isProcessing}
        >
          {isProcessing === 'confirm' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Confirm Booking
        </Button>
      )}

      {booking.status === 'confirmed' && (
        <>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => handleAction('seat')}
            disabled={!!isProcessing}
          >
            {isProcessing === 'seat' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Seat Party
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => handleAction('arrive')}
            disabled={!!isProcessing}
          >
            {isProcessing === 'arrive' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            Mark Arrived
          </Button>
        </>
      )}

      {booking.status === 'arrived' && (
        <Button
          variant="primary"
          className="w-full"
          onClick={() => handleAction('seat')}
          disabled={!!isProcessing}
        >
          {isProcessing === 'seat' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Seat Party Now
        </Button>
      )}

      {(booking.status === 'seated' || booking.status === 'completed') && booking.session_id && (
        <Link
          href={`/admin/sessions/${booking.session_id}`}
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold bg-[color:var(--color-elevated)] text-[color:var(--color-ink-primary)] border border-[color:var(--color-structure)] shadow-card rounded-token hover:-translate-y-0.5 transition-transform duration-200 focus-ring"
        >
          <ExternalLink className="h-4 w-4" />
          View Session
        </Link>
      )}

      {/* Secondary actions */}
      {isEditable && (
        <div className="flex gap-2 pt-2 border-t border-[color:var(--color-structure)]">
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="flex-1">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
          {canCancel && !showCancelConfirm && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-[color:var(--color-danger)] hover:bg-[color:var(--color-danger)]/10"
              onClick={() => setShowCancelConfirm(true)}
            >
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <div className="p-3 rounded-xl border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/5">
          <p className="text-sm text-[color:var(--color-ink-primary)] mb-3">
            Are you sure you want to cancel this booking?
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelConfirm(false)}
              className="flex-1"
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleAction('cancel')}
              disabled={!!isProcessing}
              className="flex-1"
            >
              {isProcessing === 'cancel' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Cancel Booking'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export function BookingDetailDrawer({
  bookingId,
  onClose,
  onAction,
  onEdit,
}: BookingDetailDrawerProps) {
  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch booking');
      }
      const data = await response.json();
      setBooking(data);
    } catch (err) {
      console.error('Error fetching booking:', err);
      setError('Failed to load booking details');
      setBooking(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bookingId) {
      fetchBooking(bookingId);
    } else {
      setBooking(null);
    }
  }, [bookingId, fetchBooking]);

  const handleActionComplete = useCallback(() => {
    if (bookingId) {
      fetchBooking(bookingId);
    }
  }, [bookingId, fetchBooking]);

  const handleEdit = () => {
    if (onEdit && bookingId) {
      onEdit(bookingId);
    }
  };

  if (!bookingId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-[color:var(--color-surface)] shadow-2xl border-l border-[color:var(--color-structure)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-[color:var(--color-structure)] bg-[color:var(--color-elevated)]">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-[color:var(--color-ink-secondary)] mb-1">
              Booking Details
            </p>
            {isLoading ? (
              <div className="h-7 w-40 bg-[color:var(--color-muted)] rounded animate-pulse" />
            ) : booking ? (
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-[color:var(--color-ink-primary)] truncate">
                  {booking.guest_name}
                </h2>
                <StatusBadge status={booking.status} />
              </div>
            ) : (
              <h2 className="text-xl font-bold text-[color:var(--color-ink-primary)]">
                Not Found
              </h2>
            )}
            {booking && (
              <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
                {formatDate(booking.booking_date)} at {formatTime(booking.start_time)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-xl hover:bg-[color:var(--color-muted)] transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5 text-[color:var(--color-ink-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <DrawerSkeleton />
          ) : error ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 mx-auto bg-[color:var(--color-danger)]/10 rounded-full flex items-center justify-center mb-3">
                <XCircle className="h-6 w-6 text-[color:var(--color-danger)]" />
              </div>
              <p className="text-[color:var(--color-ink-secondary)]">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() => bookingId && fetchBooking(bookingId)}
              >
                Try Again
              </Button>
            </div>
          ) : booking ? (
            <div className="p-4 space-y-6">
              <ContactSection booking={booking} />
              <BookingDetailsSection booking={booking} />
              {booking.game && <GameReservationSection game={booking.game} />}
              {booking.notes && <NotesSection notes={booking.notes} />}
              <StatusHistorySection booking={booking} />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-[color:var(--color-ink-secondary)]">
                Booking not found
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {booking && (
          <div className="p-4 border-t border-[color:var(--color-structure)] bg-[color:var(--color-elevated)]">
            <BookingActions
              booking={booking}
              onActionComplete={handleActionComplete}
              onEdit={onEdit ? handleEdit : undefined}
            />
          </div>
        )}
      </div>
    </>
  );
}
