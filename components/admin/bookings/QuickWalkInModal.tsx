'use client';

import { useState, useEffect, useRef } from 'react';
import { format, addHours } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Loader2, X, Check } from '@/components/icons';
import {
  createBooking,
  seatParty,
  checkAvailableTablesAction,
} from '@/app/actions/bookings';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface AvailableTable {
  table_id: string;
  table_label: string;
  capacity: number | null;
  is_exact_fit: boolean;
  is_tight_fit: boolean;
}

interface QuickWalkInModalProps {
  open: boolean;
  onClose: () => void;
  venueId: string;
  onSuccess?: () => void;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const PARTY_SIZE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12];

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export function QuickWalkInModal({
  open,
  onClose,
  venueId,
  onSuccess,
}: QuickWalkInModalProps) {
  const [step, setStep] = useState<'size' | 'table' | 'seating'>('size');
  const [partySize, setPartySize] = useState(2);
  const [guestName, setGuestName] = useState('');
  const [availableTables, setAvailableTables] = useState<AvailableTable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('size');
      setPartySize(2);
      setGuestName('');
      setAvailableTables([]);
      setError(null);
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Handle backdrop click
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  const handleSizeConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const now = new Date();
      const result = await checkAvailableTablesAction({
        venueId,
        date: format(now, 'yyyy-MM-dd'),
        startTime: format(now, 'HH:mm'),
        endTime: format(addHours(now, 2), 'HH:mm'),
        partySize,
      });

      if (result.success && result.data) {
        setAvailableTables(result.data);
        setStep('table');
      } else {
        setError(result.error || 'Failed to check availability');
      }
    } catch {
      setError('Failed to check availability');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableSelect = async (tableId: string) => {
    setStep('seating');
    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();

      // Create booking
      const bookingResult = await createBooking({
        venue_id: venueId,
        table_id: tableId,
        guest_name: guestName || 'Walk-in',
        party_size: partySize,
        booking_date: format(now, 'yyyy-MM-dd'),
        start_time: format(now, 'HH:mm'),
        duration_minutes: 120,
        source: 'walk_in',
      });

      if (!bookingResult.success || !bookingResult.data) {
        throw new Error(bookingResult.error || 'Failed to create booking');
      }

      // Immediately seat
      const seatResult = await seatParty(bookingResult.data.id);

      if (!seatResult.success) {
        throw new Error(seatResult.error || 'Failed to seat party');
      }

      // Success!
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to seat party');
      setStep('table');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-walk-in-title"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-[color:var(--color-surface)] rounded-token shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--color-structure)]">
          <h2 id="quick-walk-in-title" className="text-lg font-serif font-semibold">
            Seat Walk-In
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-token hover:bg-[color:var(--color-structure)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Error message */}
          {error && (
            <div className="p-3 text-sm text-[color:var(--color-danger)] bg-[color:var(--color-danger)]/10 border border-[color:var(--color-danger)]/20 rounded-token">
              {error}
            </div>
          )}

          {/* Step 1: Party Size */}
          {step === 'size' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[color:var(--color-ink-secondary)]">
                  Party Size
                </label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {PARTY_SIZE_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPartySize(n)}
                      className={cn(
                        'h-10 rounded-token border text-sm font-medium transition-colors',
                        partySize === n
                          ? 'bg-[color:var(--color-accent)] text-white border-[color:var(--color-accent)]'
                          : 'bg-[color:var(--color-elevated)] border-[color:var(--color-structure)] hover:border-[color:var(--color-structure-strong)]'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[color:var(--color-ink-secondary)]">
                  Guest Name{' '}
                  <span className="text-[color:var(--color-ink-tertiary)]">(optional)</span>
                </label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Walk-in"
                  className="mt-1"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSizeConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
                Find Table
              </Button>
            </div>
          )}

          {/* Step 2: Table Selection */}
          {step === 'table' && (
            <div className="space-y-4">
              <p className="text-sm text-[color:var(--color-ink-secondary)]">
                Select a table for party of {partySize}:
              </p>

              {availableTables.length === 0 ? (
                <div className="text-center py-8 text-[color:var(--color-ink-secondary)]">
                  No tables available for this party size right now.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {availableTables.map((table) => (
                    <button
                      key={table.table_id}
                      type="button"
                      onClick={() => handleTableSelect(table.table_id)}
                      disabled={isLoading}
                      className={cn(
                        'p-3 rounded-token border text-left transition-all',
                        'hover:border-[color:var(--color-accent)] hover:shadow-sm',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        table.is_exact_fit && 'border-[color:var(--color-success)]/50 bg-[color:var(--color-success)]/5',
                        table.is_tight_fit && 'border-[color:var(--color-warn)]/50'
                      )}
                    >
                      <div className="font-medium">{table.table_label}</div>
                      <div className="text-xs text-[color:var(--color-ink-secondary)] flex items-center gap-1">
                        {table.capacity} seats
                        {table.is_exact_fit && (
                          <>
                            <span className="text-[color:var(--color-success)]">•</span>
                            <span className="text-[color:var(--color-success)]">Perfect</span>
                          </>
                        )}
                        {table.is_tight_fit && (
                          <>
                            <span className="text-[color:var(--color-warn)]">•</span>
                            <span className="text-[color:var(--color-warn)]">Tight</span>
                          </>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setStep('size')}
              >
                Back
              </Button>
            </div>
          )}

          {/* Step 3: Seating in Progress */}
          {step === 'seating' && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[color:var(--color-accent)] mb-4" />
              <p className="text-[color:var(--color-ink-secondary)]">Seating party...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
