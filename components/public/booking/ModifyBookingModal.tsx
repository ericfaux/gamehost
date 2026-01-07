'use client';

import { useState, useEffect } from 'react';
import { updateBooking } from '@/app/actions/bookings';
import { checkAvailableTablesAction } from '@/app/actions/bookings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem } from '@/components/ui/select';
import { Loader2, Calendar, Clock, Users } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { BookingWithDetails, AvailableSlot, AvailableTable } from '@/lib/db/types';

interface ModifyBookingModalProps {
  open: boolean;
  onClose: () => void;
  booking: BookingWithDetails;
  durationMinutes: number;
  onComplete: (updatedBooking: BookingWithDetails) => void;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  tables: Array<{
    table_id: string;
    table_label: string;
    capacity: number | null;
  }>;
}

export function ModifyBookingModal({
  open,
  onClose,
  booking,
  durationMinutes,
  onComplete,
}: ModifyBookingModalProps) {
  const [date, setDate] = useState(booking.booking_date);
  const [partySize, setPartySize] = useState(booking.party_size);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setDate(booking.booking_date);
      setPartySize(booking.party_size);
      setSelectedSlot(null);
      setError(null);
    }
  }, [open, booking]);

  // Load available slots when date/party size changes
  useEffect(() => {
    if (!open || !date) return;

    const loadSlots = async () => {
      setIsLoadingSlots(true);
      setError(null);
      setSelectedSlot(null);

      try {
        // Generate time slots at 30-minute intervals from 10am to 10pm
        const timeSlots = generateTimeSlots(30);
        const availableSlots: TimeSlot[] = [];

        for (const startTime of timeSlots) {
          const endTime = addMinutesToTime(startTime, durationMinutes);

          const result = await checkAvailableTablesAction({
            venueId: booking.venue_id,
            date,
            startTime,
            endTime,
            partySize,
          });

          if (result.success && result.data && result.data.length > 0) {
            availableSlots.push({
              start_time: startTime,
              end_time: endTime,
              tables: result.data.map(t => ({
                table_id: t.table_id,
                table_label: t.table_label,
                capacity: t.capacity,
              })),
            });
          }
        }

        setSlots(availableSlots);
      } catch (e) {
        setError('Failed to load available times');
      } finally {
        setIsLoadingSlots(false);
      }
    };

    loadSlots();
  }, [open, date, partySize, booking.venue_id, durationMinutes]);

  const handleSubmit = async () => {
    if (!selectedSlot) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateBooking(booking.id, {
        booking_date: date,
        start_time: selectedSlot.start_time,
        party_size: partySize,
        table_id: selectedSlot.tables[0]?.table_id, // Best fit table
      });

      if (result.success && result.data) {
        // Refetch the booking with full details
        const { getBookingById } = await import('@/lib/data/bookings');
        const updatedBooking = await getBookingById(booking.id);
        if (updatedBooking) {
          onComplete(updatedBooking);
        } else {
          // Fallback: create a partial update
          onComplete({
            ...booking,
            booking_date: date,
            start_time: selectedSlot.start_time,
            end_time: selectedSlot.end_time,
            party_size: partySize,
          });
        }
      } else {
        setError(result.error ?? 'Failed to update booking');
      }
    } catch (e) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanges =
    date !== booking.booking_date ||
    partySize !== booking.party_size ||
    selectedSlot !== null;

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Modify Reservation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Picker */}
          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[color:var(--color-ink-secondary)]" />
              Date
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={today}
              className="mt-1"
              disabled={isSubmitting}
            />
          </div>

          {/* Party Size */}
          <div>
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[color:var(--color-ink-secondary)]" />
              Party Size
            </Label>
            <Select
              value={String(partySize)}
              onValueChange={(v) => setPartySize(parseInt(v))}
              disabled={isSubmitting}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} {n === 1 ? 'guest' : 'guests'}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Time Slots */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[color:var(--color-ink-secondary)]" />
              Available Times
            </Label>

            {isLoadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[color:var(--color-ink-secondary)]" />
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 text-[color:var(--color-ink-secondary)] bg-[color:var(--color-muted)] rounded-lg">
                No times available for this date and party size.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                {slots.map((slot) => {
                  const normalizedBookingStart = normalizeTime(booking.start_time);
                  const isCurrentTime =
                    slot.start_time === normalizedBookingStart &&
                    date === booking.booking_date;
                  const isSelected = selectedSlot?.start_time === slot.start_time;

                  return (
                    <button
                      key={slot.start_time}
                      onClick={() => setSelectedSlot(slot)}
                      disabled={slot.tables.length === 0 || isSubmitting}
                      className={cn(
                        'py-2 px-3 rounded-lg border text-sm font-medium transition-colors',
                        slot.tables.length === 0 && 'opacity-50 cursor-not-allowed',
                        isSelected && 'bg-teal-500 text-white border-teal-500',
                        isCurrentTime && !isSelected && 'border-teal-300 bg-teal-50',
                        !isSelected &&
                          !isCurrentTime &&
                          slot.tables.length > 0 &&
                          'hover:border-teal-400 border-[color:var(--color-structure)]'
                      )}
                    >
                      {formatTime(slot.start_time)}
                      {isCurrentTime && !isSelected && (
                        <span className="block text-xs text-teal-600">Current</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || !selectedSlot || isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions

function generateTimeSlots(intervalMinutes: number): string[] {
  const slots: string[] = [];
  const startMinutes = 10 * 60; // 10:00 AM
  const endMinutes = 22 * 60; // 10:00 PM

  for (let minutes = startMinutes; minutes < endMinutes; minutes += intervalMinutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    slots.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
  }

  return slots;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

function normalizeTime(time: string): string {
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}
