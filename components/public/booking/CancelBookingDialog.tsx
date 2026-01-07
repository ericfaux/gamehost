'use client';

import { useState } from 'react';
import { cancelBooking } from '@/app/actions/bookings';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertTriangle } from '@/components/icons';
import type { BookingWithDetails } from '@/lib/db/types';

interface CancelBookingDialogProps {
  open: boolean;
  onClose: () => void;
  booking: BookingWithDetails;
  onComplete: () => void;
}

export function CancelBookingDialog({
  open,
  onClose,
  booking,
  onComplete,
}: CancelBookingDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await cancelBooking({
        bookingId: booking.id,
        cancelledBy: 'guest',
        reason: reason || undefined,
      });

      if (result.success) {
        onComplete();
      } else {
        setError(result.error ?? 'Failed to cancel booking');
      }
    } catch (e) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setError(null);
      onClose();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Cancel Reservation?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel your reservation for{' '}
            <span className="font-medium text-[color:var(--color-ink-primary)]">
              {formatDateShort(booking.booking_date)} at {formatTime(booking.start_time)}
            </span>
            ? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">
          <label className="text-sm font-medium text-[color:var(--color-ink-primary)]">
            Reason for cancellation (optional)
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Plans changed, found another venue, etc."
            rows={2}
            className="mt-1"
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
        )}

        <AlertDialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Keep Reservation
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Yes, Cancel
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}
