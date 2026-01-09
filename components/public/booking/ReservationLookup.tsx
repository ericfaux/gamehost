'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Search,
  Mail,
  Loader2,
  AlertCircle,
} from '@/components/icons';
import { lookupReservation } from '@/app/actions/bookings';

interface ReservationLookupProps {
  venueId: string;
  venueSlug: string;
}

export function ReservationLookup({ venueId, venueSlug }: ReservationLookupProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmationCode, setConfirmationCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!confirmationCode.trim()) {
      setError('Please enter your confirmation code');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    startTransition(async () => {
      try {
        const result = await lookupReservation({
          venueId,
          confirmationCode: confirmationCode.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
        });

        if (result.success && result.data?.bookingId) {
          // Redirect to the manage page
          router.push(`/v/${venueSlug}/book/manage/${result.data.bookingId}?email=${encodeURIComponent(email.trim())}`);
        } else {
          setError(result.error || 'Reservation not found. Please check your confirmation code and email address.');
        }
      } catch (err) {
        console.error('Lookup error:', err);
        setError('An unexpected error occurred. Please try again.');
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-card border border-[color:var(--color-structure)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-6 border-b border-[color:var(--color-structure)]">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-teal-100 flex items-center justify-center">
          <Search className="w-6 h-6 text-teal-600" />
        </div>
        <h2 className="text-lg font-serif font-semibold text-center text-[color:var(--color-ink-primary)]">
          Find Your Reservation
        </h2>
        <p className="text-sm text-[color:var(--color-ink-secondary)] text-center mt-2">
          Enter your confirmation code and email address to view or manage your reservation.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
        {/* Error Message */}
        {error && (
          <div
            className="flex items-start gap-3 p-4 bg-red-50 rounded-token border border-red-200"
            role="alert"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Confirmation Code */}
        <div>
          <label
            htmlFor="confirmationCode"
            className="block text-sm font-medium text-[color:var(--color-ink-primary)] mb-1.5"
          >
            Confirmation Code
          </label>
          <input
            type="text"
            id="confirmationCode"
            value={confirmationCode}
            onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
            placeholder="e.g., 4HYL8H"
            className="w-full px-4 py-3 border border-[color:var(--color-structure)] rounded-token text-[color:var(--color-ink-primary)] placeholder:text-[color:var(--color-ink-secondary)] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono text-lg tracking-wider uppercase"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            disabled={isPending}
          />
          <p className="mt-1.5 text-xs text-[color:var(--color-ink-secondary)]">
            You can find this code in your confirmation email
          </p>
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[color:var(--color-ink-primary)] mb-1.5"
          >
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="w-5 h-5 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
            </div>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-3 border border-[color:var(--color-structure)] rounded-token text-[color:var(--color-ink-primary)] placeholder:text-[color:var(--color-ink-secondary)] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              autoComplete="email"
              disabled={isPending}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'w-full py-3 rounded-token font-semibold text-base flex items-center justify-center gap-2 transition-colors min-h-[48px] mt-6',
            isPending
              ? 'bg-teal-400 cursor-not-allowed'
              : 'bg-teal-500 hover:bg-teal-600 active:scale-[0.98]',
            'text-white'
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>Finding reservation...</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" aria-hidden="true" />
              <span>Find My Reservation</span>
            </>
          )}
        </button>
      </form>

      {/* Help Text */}
      <div className="px-6 py-4 bg-[color:var(--color-muted)] border-t border-[color:var(--color-structure)]">
        <p className="text-xs text-[color:var(--color-ink-secondary)] text-center">
          Can&apos;t find your confirmation email? Check your spam folder or contact us for help.
        </p>
      </div>
    </div>
  );
}
