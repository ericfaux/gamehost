'use client';

import { useState } from 'react';
import {
  CheckCircle,
  Calendar,
  Clock,
  Users,
  Copy,
  Check,
  Mail,
  Phone,
} from '@/components/icons';
import type { Booking } from '@/lib/db/types';

interface StepSuccessProps {
  booking: Booking;
  venueName: string;
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

export function StepSuccess({ booking, venueName }: StepSuccessProps) {
  const [copied, setCopied] = useState(false);

  // Copy confirmation code to clipboard
  const handleCopy = async () => {
    if (booking.confirmation_code) {
      try {
        await navigator.clipboard.writeText(booking.confirmation_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-card border border-[color:var(--color-structure)] overflow-hidden">
      {/* Success Header */}
      <div className="px-6 py-8 bg-gradient-to-br from-teal-500 to-teal-600 text-white text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-serif font-semibold">
          Booking Confirmed!
        </h2>
        <p className="text-teal-100 mt-1">
          Your table at {venueName} is reserved
        </p>
      </div>

      {/* Confirmation Code */}
      {booking.confirmation_code && (
        <div className="px-6 py-4 bg-[color:var(--color-muted)] border-b border-[color:var(--color-structure)]">
          <p className="text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)] text-center mb-2">
            Confirmation Code
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-mono font-bold tracking-wider text-[color:var(--color-ink-primary)]">
              {booking.confirmation_code}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-[color:var(--color-structure)] transition-colors"
              title="Copy confirmation code"
            >
              {copied ? (
                <Check className="w-5 h-5 text-teal-600" />
              ) : (
                <Copy className="w-5 h-5 text-[color:var(--color-ink-secondary)]" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Booking Details */}
      <div className="px-6 py-6 space-y-4">
        {/* Date & Time */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <p className="font-medium text-[color:var(--color-ink-primary)]">
              {formatDateDisplay(booking.booking_date)}
            </p>
            <div className="flex items-center gap-2 mt-1 text-sm text-[color:var(--color-ink-secondary)]">
              <Clock className="w-4 h-4" />
              <span>
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
              </span>
            </div>
          </div>
        </div>

        {/* Party Size */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[color:var(--color-muted)] flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-[color:var(--color-ink-secondary)]" />
          </div>
          <div>
            <p className="text-sm text-[color:var(--color-ink-secondary)]">Party Size</p>
            <p className="font-medium text-[color:var(--color-ink-primary)]">
              {booking.party_size} {booking.party_size === 1 ? 'guest' : 'guests'}
            </p>
          </div>
        </div>

        {/* Confirmation Sent */}
        <div className="mt-6 pt-4 border-t border-[color:var(--color-structure)]">
          <p className="text-sm text-[color:var(--color-ink-secondary)] text-center">
            Confirmation sent to:
          </p>
          <div className="flex flex-col items-center gap-2 mt-2">
            {booking.guest_email && (
              <div className="flex items-center gap-2 text-sm text-[color:var(--color-ink-primary)]">
                <Mail className="w-4 h-4 text-[color:var(--color-ink-secondary)]" />
                {booking.guest_email}
              </div>
            )}
            {booking.guest_phone && (
              <div className="flex items-center gap-2 text-sm text-[color:var(--color-ink-primary)]">
                <Phone className="w-4 h-4 text-[color:var(--color-ink-secondary)]" />
                {booking.guest_phone}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-[color:var(--color-muted)] border-t border-[color:var(--color-structure)]">
        <p className="text-xs text-[color:var(--color-ink-secondary)] text-center">
          Need to modify or cancel? Contact us with your confirmation code.
        </p>
      </div>
    </div>
  );
}
