'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Check,
  UserCheck,
  ArrowRight,
  Gamepad2,
  Clock,
  AlertTriangle,
  RotateCw,
} from '@/components/icons';
import { cn } from '@/lib/utils';
import type { BookingWithDetails } from '@/lib/db/types';

interface ArrivalsBoardProps {
  venueId: string;
  minutesAhead?: number;
  onSeatParty: (bookingId: string) => Promise<void>;
  onMarkArrived?: (bookingId: string) => Promise<void>;
  onReassign?: (bookingId: string) => void;
}

export function ArrivalsBoard({
  venueId,
  minutesAhead = 60,
  onSeatParty,
  onMarkArrived,
  onReassign,
}: ArrivalsBoardProps) {
  const [arrivals, setArrivals] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadArrivals = useCallback(async () => {
    try {
      // Get the browser's timezone to ensure correct local time filtering
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch(
        `/api/venues/${venueId}/arrivals?minutesAhead=${minutesAhead}&tz=${encodeURIComponent(timezone)}`
      );
      if (response.ok) {
        const data = await response.json();
        setArrivals(data);
      }
    } catch (error) {
      console.error('Error loading arrivals:', error);
    } finally {
      setLastRefresh(new Date());
      setIsLoading(false);
    }
  }, [venueId, minutesAhead]);

  // Initial load and auto-refresh
  useEffect(() => {
    loadArrivals();
    const interval = setInterval(loadArrivals, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [loadArrivals]);

  const handleSeat = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      await onSeatParty(bookingId);
      await loadArrivals();
    } finally {
      setProcessingId(null);
    }
  };

  const handleArrived = async (bookingId: string) => {
    if (!onMarkArrived) return;
    setProcessingId(bookingId);
    try {
      await onMarkArrived(bookingId);
      await loadArrivals();
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-white">
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-semibold text-stone-900">Arrivals</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">
              {format(lastRefresh, 'h:mm a')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadArrivals}
              className="h-6 w-6"
            >
              <RotateCw className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-stone-500">Next {minutesAhead} minutes</p>
      </div>

      {/* Arrivals List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-stone-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : arrivals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-stone-400 p-4">
            <Clock className="w-8 h-8 mb-2" />
            <p className="text-sm">No arrivals in the next hour</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {arrivals.map((booking) => (
              <ArrivalCard
                key={booking.id}
                booking={booking}
                isProcessing={processingId === booking.id}
                onSeat={() => handleSeat(booking.id)}
                onArrived={() => handleArrived(booking.id)}
                onReassign={() => onReassign?.(booking.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ArrivalCardProps {
  booking: BookingWithDetails;
  isProcessing: boolean;
  onSeat: () => void;
  onArrived: () => void;
  onReassign: () => void;
}

function ArrivalCard({
  booking,
  isProcessing,
  onSeat,
  onArrived,
  onReassign,
}: ArrivalCardProps) {
  const bookingTime = parseBookingTime(booking.booking_date, booking.start_time);
  const minutesUntil = differenceInMinutes(bookingTime, new Date());
  const isLate = minutesUntil < 0;
  const isArrived = booking.status === 'arrived';

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-all',
        isLate && !isArrived && 'border-amber-300 bg-amber-50',
        isArrived && 'border-teal-300 bg-teal-50',
        !isLate && !isArrived && 'border-stone-200 bg-white'
      )}
    >
      {/* Time & Status Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-mono text-sm font-medium',
              isLate && !isArrived && 'text-amber-700',
              isArrived && 'text-teal-700'
            )}
          >
            {format(bookingTime, 'h:mm a')}
          </span>
          {isLate && !isArrived && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              {Math.abs(minutesUntil)} min late
            </span>
          )}
          {isArrived && (
            <span className="text-xs text-teal-600 font-medium">ARRIVED</span>
          )}
        </div>

        {/* Table */}
        <span className="text-sm font-medium text-stone-600">
          {booking.venue_table?.label}
        </span>
      </div>

      {/* Guest Info */}
      <div className="mb-2">
        <div className="font-medium text-stone-900">{booking.guest_name}</div>
        <div className="flex items-center gap-3 text-sm text-stone-500">
          <span>Party of {booking.party_size}</span>
          {booking.game && (
            <span className="flex items-center gap-1 text-sky-600">
              <Gamepad2 className="w-3 h-3" />
              {booking.game.title}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {booking.status === 'confirmed' && (
          <>
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={onArrived}
              disabled={isProcessing}
            >
              <UserCheck className="w-3 h-3 mr-1" />
              Arrived
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={onSeat}
              disabled={isProcessing}
            >
              <Check className="w-3 h-3 mr-1" />
              Seat
            </Button>
          </>
        )}

        {booking.status === 'arrived' && (
          <Button
            size="sm"
            className="flex-1"
            onClick={onSeat}
            disabled={isProcessing}
          >
            <ArrowRight className="w-3 h-3 mr-1" />
            Seat Party Now
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Parses a booking date and time string into a Date object.
 * @param date - Date in YYYY-MM-DD format
 * @param time - Time in HH:MM:SS or HH:MM format
 */
function parseBookingTime(date: string, time: string): Date {
  // Strip seconds if present (HH:MM:SS -> HH:MM)
  const normalizedTime = time.split(':').slice(0, 2).join(':');
  return new Date(`${date}T${normalizedTime}`);
}
