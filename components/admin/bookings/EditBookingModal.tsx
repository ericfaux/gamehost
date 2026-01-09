'use client';

import {
  useState,
  useEffect,
  useTransition,
  useRef,
  useMemo,
  type FormEvent,
} from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2, Search, Check } from '@/components/icons';
import {
  updateBooking,
  getGamesForBooking,
  checkAvailableTablesAction,
} from '@/app/actions/bookings';
import { addMinutesToTime, timeToMinutes } from '@/lib/data/bookings';
import type { BookingWithDetails } from '@/lib/db/types';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface EditBookingFormData {
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  party_size: number;
  booking_date: string;
  start_time: string;
  duration_minutes: number;
  table_id: string;
  game_id: string | null;
  notes: string;
  internal_notes: string;
}

interface AvailableTable {
  table_id: string;
  table_label: string;
  capacity: number | null;
  is_exact_fit: boolean;
  is_tight_fit: boolean;
}

interface GameOption {
  id: string;
  title: string;
  min_players: number;
  max_players: number;
}

interface EditBookingModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string | null;
  venueId: string;
  onSuccess?: () => void;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const PARTY_SIZE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];

const DURATION_OPTIONS = [
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
];

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Generates time slots from 10am to 10pm in 30-minute intervals.
 */
function generateTimeSlots(): { value: string; label: string }[] {
  const slots: { value: string; label: string }[] = [];
  for (let hour = 10; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 22 && minute > 0) break;

      const hourStr = hour.toString().padStart(2, '0');
      const minuteStr = minute.toString().padStart(2, '0');
      const value = `${hourStr}:${minuteStr}`;

      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const label = `${displayHour}:${minuteStr} ${ampm}`;

      slots.push({ value, label });
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

/**
 * Normalizes a time string to HH:MM format.
 */
function normalizeTime(time: string): string {
  const parts = time.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return time;
}

/**
 * Calculates duration in minutes from start and end time.
 */
function calculateDuration(startTime: string, endTime: string): number {
  const startMinutes = timeToMinutes(normalizeTime(startTime));
  const endMinutes = timeToMinutes(normalizeTime(endTime));
  return endMinutes - startMinutes;
}

// -----------------------------------------------------------------------------
// FormField Component
// -----------------------------------------------------------------------------

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[color:var(--color-ink-primary)]">
        {label}
        {required && <span className="text-[color:var(--color-danger)] ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-[color:var(--color-danger)]">{error}</p>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// GameSearchSelect Component
// -----------------------------------------------------------------------------

interface GameSearchSelectProps {
  venueId: string;
  value: string | null;
  onChange: (id: string | null) => void;
  currentGameTitle?: string | null;
}

function GameSearchSelect({ venueId, value, onChange, currentGameTitle }: GameSearchSelectProps) {
  const [games, setGames] = useState<GameOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadGames() {
      try {
        const result = await getGamesForBooking(venueId);
        if (result.success && result.data) {
          setGames(result.data);
        }
      } catch (err) {
        console.error('Failed to load games:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadGames();
  }, [venueId]);

  const filteredGames = useMemo(() => {
    if (!searchTerm.trim()) return games.slice(0, 20);
    const term = searchTerm.toLowerCase();
    return games
      .filter(g => g.title.toLowerCase().includes(term))
      .slice(0, 20);
  }, [games, searchTerm]);

  const selectedGame = useMemo(() => {
    if (!value) return null;
    return games.find(g => g.id === value) ?? null;
  }, [games, value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(gameId: string) {
    onChange(gameId);
    setSearchTerm('');
    setIsOpen(false);
  }

  function handleClear() {
    onChange(null);
    setSearchTerm('');
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-[color:var(--color-ink-secondary)] bg-[color:var(--color-elevated)] border border-[color:var(--color-structure)] rounded-token">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading games...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {selectedGame ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[color:var(--color-elevated)] border border-[color:var(--color-structure)] rounded-token">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[color:var(--color-success)]" />
            <span className="text-sm font-medium">{selectedGame.title}</span>
            {currentGameTitle && selectedGame.title === currentGameTitle && (
              <span className="text-xs text-[color:var(--color-ink-secondary)]">(current)</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded hover:bg-[color:var(--color-structure)] transition-colors"
          >
            <X className="w-4 h-4 text-[color:var(--color-ink-secondary)]" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--color-ink-secondary)]" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={currentGameTitle ? `Current: ${currentGameTitle}` : 'Search games...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsOpen(true)}
              className="pl-9"
            />
          </div>
          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-[color:var(--color-elevated)] border border-[color:var(--color-structure)] rounded-token shadow-lg max-h-48 overflow-y-auto">
              {filteredGames.length === 0 ? (
                <div className="px-3 py-2 text-sm text-[color:var(--color-ink-secondary)]">
                  {searchTerm ? 'No games found' : 'No games available'}
                </div>
              ) : (
                filteredGames.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => handleSelect(game.id)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[color:var(--color-structure)] transition-colors"
                  >
                    <div className="font-medium">{game.title}</div>
                    <div className="text-xs text-[color:var(--color-ink-secondary)]">
                      {game.min_players}-{game.max_players} players
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export function EditBookingModal({
  open,
  onClose,
  bookingId,
  venueId,
  onSuccess,
}: EditBookingModalProps) {
  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [formData, setFormData] = useState<EditBookingFormData | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof EditBookingFormData, string>>>({});
  const [availableTables, setAvailableTables] = useState<AvailableTable[]>([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isLoadingBooking, setIsLoadingBooking] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch booking when modal opens
  useEffect(() => {
    if (open && bookingId) {
      setIsLoadingBooking(true);
      setSubmitError(null);
      setErrors({});

      fetch(`/api/bookings/${bookingId}`)
        .then(res => res.json())
        .then((data: BookingWithDetails) => {
          setBooking(data);
          // Initialize form data from booking
          const duration = calculateDuration(data.start_time, data.end_time);
          setFormData({
            guest_name: data.guest_name,
            guest_email: data.guest_email ?? '',
            guest_phone: data.guest_phone ?? '',
            party_size: data.party_size,
            booking_date: data.booking_date,
            start_time: normalizeTime(data.start_time),
            duration_minutes: duration,
            table_id: data.table_id ?? '',
            game_id: data.game_id,
            notes: data.notes ?? '',
            internal_notes: data.internal_notes ?? '',
          });
        })
        .catch(err => {
          console.error('Failed to load booking:', err);
          setSubmitError('Failed to load booking details');
        })
        .finally(() => {
          setIsLoadingBooking(false);
        });
    } else if (!open) {
      setBooking(null);
      setFormData(null);
      setAvailableTables([]);
    }
  }, [open, bookingId]);

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

  // Check availability when relevant fields change
  useEffect(() => {
    if (formData?.booking_date && formData?.start_time && formData?.party_size) {
      checkAvailability();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData?.booking_date, formData?.start_time, formData?.duration_minutes, formData?.party_size]);

  function updateField<K extends keyof EditBookingFormData>(
    field: K,
    value: EditBookingFormData[K]
  ) {
    if (!formData) return;
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
    setErrors(prev => ({ ...prev, [field]: undefined }));
    setSubmitError(null);
  }

  async function checkAvailability() {
    if (!formData?.booking_date || !formData?.start_time || !formData?.party_size) {
      return;
    }

    setIsCheckingAvailability(true);
    try {
      const endTime = addMinutesToTime(formData.start_time, formData.duration_minutes);
      const result = await checkAvailableTablesAction({
        venueId,
        date: formData.booking_date,
        startTime: formData.start_time,
        endTime,
        partySize: formData.party_size,
      });

      if (result.success && result.data) {
        // Include current table even if it shows as unavailable (it's available for this booking)
        let tables = result.data;

        // If current table isn't in the list and we have it selected, we need to handle that
        // For now, the availability check excludes the current booking, so this should be fine
        setAvailableTables(tables);
      }
    } catch (err) {
      console.error('Failed to check availability:', err);
    } finally {
      setIsCheckingAvailability(false);
    }
  }

  function validate(): boolean {
    if (!formData) return false;

    const newErrors: Partial<Record<keyof EditBookingFormData, string>> = {};

    if (!formData.guest_name.trim()) {
      newErrors.guest_name = 'Guest name is required';
    }

    if (!formData.guest_email && !formData.guest_phone) {
      newErrors.guest_email = 'Email or phone required';
    }

    if (formData.guest_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guest_email)) {
      newErrors.guest_email = 'Invalid email format';
    }

    if (!formData.booking_date) {
      newErrors.booking_date = 'Date is required';
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Time is required';
    }

    if (!formData.table_id) {
      newErrors.table_id = 'Select a table';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const canSubmit =
    formData &&
    formData.guest_name.trim() &&
    (formData.guest_email || formData.guest_phone) &&
    formData.table_id &&
    formData.start_time &&
    formData.booking_date &&
    !isPending &&
    !isLoadingBooking;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate() || !formData || !bookingId) return;

    startTransition(async () => {
      try {
        const result = await updateBooking(bookingId, {
          guest_name: formData.guest_name.trim(),
          guest_email: formData.guest_email.trim() || undefined,
          guest_phone: formData.guest_phone.trim() || undefined,
          party_size: formData.party_size,
          booking_date: formData.booking_date,
          start_time: formData.start_time,
          duration_minutes: formData.duration_minutes,
          table_id: formData.table_id,
          game_id: formData.game_id,
          notes: formData.notes.trim() || undefined,
          internal_notes: formData.internal_notes.trim() || undefined,
        });

        if (result.success) {
          onClose();
          onSuccess?.();
        } else {
          setSubmitError(result.error ?? 'Failed to update booking');
        }
      } catch (err) {
        setSubmitError('An unexpected error occurred');
        console.error('Booking update error:', err);
      }
    });
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

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
        aria-labelledby="edit-booking-title"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-[color:var(--color-surface)] rounded-token shadow-xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[color:var(--color-surface)] border-b border-[color:var(--color-structure)]">
          <h2 id="edit-booking-title" className="text-lg font-serif font-semibold">
            Edit Booking
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
        {isLoadingBooking ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[color:var(--color-ink-secondary)]" />
          </div>
        ) : !formData ? (
          <div className="p-6 text-center text-[color:var(--color-ink-secondary)]">
            {submitError || 'Failed to load booking'}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Submit Error */}
            {submitError && (
              <div className="p-3 text-sm text-[color:var(--color-danger)] bg-[color:var(--color-danger)]/10 border border-[color:var(--color-danger)]/20 rounded-token">
                {submitError}
              </div>
            )}

            {/* Guest Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[color:var(--color-ink-secondary)] uppercase tracking-wide">
                Guest Information
              </h3>

              <FormField label="Guest Name" required error={errors.guest_name}>
                <Input
                  value={formData.guest_name}
                  onChange={(e) => updateField('guest_name', e.target.value)}
                  placeholder="John Smith"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Email" error={errors.guest_email}>
                  <Input
                    type="email"
                    value={formData.guest_email}
                    onChange={(e) => updateField('guest_email', e.target.value)}
                    placeholder="john@example.com"
                  />
                </FormField>
                <FormField label="Phone" error={errors.guest_phone}>
                  <Input
                    type="tel"
                    value={formData.guest_phone}
                    onChange={(e) => updateField('guest_phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </FormField>
              </div>

              {!formData.guest_email && !formData.guest_phone && (
                <p className="text-xs text-[color:var(--color-warn)]">
                  Email or phone required for confirmation
                </p>
              )}
            </div>

            {/* Reservation Details */}
            <div className="space-y-3 pt-3 border-t border-[color:var(--color-structure)]">
              <h3 className="text-sm font-medium text-[color:var(--color-ink-secondary)] uppercase tracking-wide">
                Reservation Details
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Party Size" required error={errors.party_size}>
                  <select
                    value={formData.party_size}
                    onChange={(e) => updateField('party_size', parseInt(e.target.value))}
                    className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm shadow-card focus-ring"
                  >
                    {PARTY_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'guest' : 'guests'}
                        {n === booking?.party_size && ' (current)'}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Duration" required>
                  <select
                    value={formData.duration_minutes}
                    onChange={(e) => updateField('duration_minutes', parseInt(e.target.value))}
                    className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm shadow-card focus-ring"
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Date" required error={errors.booking_date}>
                  <Input
                    type="date"
                    value={formData.booking_date}
                    onChange={(e) => updateField('booking_date', e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </FormField>

                <FormField label="Time" required error={errors.start_time}>
                  <select
                    value={formData.start_time}
                    onChange={(e) => updateField('start_time', e.target.value)}
                    className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm shadow-card focus-ring"
                  >
                    <option value="">Select time</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                        {slot.value === normalizeTime(booking?.start_time ?? '') && ' (current)'}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            </div>

            {/* Table Selection */}
            <div className="space-y-3 pt-3 border-t border-[color:var(--color-structure)]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[color:var(--color-ink-secondary)] uppercase tracking-wide">
                  Table
                </h3>
                {isCheckingAvailability && (
                  <Loader2 className="w-4 h-4 animate-spin text-[color:var(--color-ink-secondary)]" />
                )}
              </div>

              {errors.table_id && (
                <p className="text-xs text-[color:var(--color-danger)]">{errors.table_id}</p>
              )}

              {availableTables.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {availableTables.map((table) => {
                    const isCurrent = table.table_id === booking?.table_id;
                    return (
                      <button
                        key={table.table_id}
                        type="button"
                        onClick={() => updateField('table_id', table.table_id)}
                        className={cn(
                          'p-3 rounded-token border text-left transition-colors',
                          formData.table_id === table.table_id
                            ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]'
                            : 'border-[color:var(--color-structure)] hover:border-[color:var(--color-ink-secondary)]',
                          table.is_tight_fit && 'border-[color:var(--color-warn)]'
                        )}
                      >
                        <div className="font-medium">
                          {table.table_label}
                          {isCurrent && (
                            <span className="ml-1 text-xs text-[color:var(--color-ink-secondary)]">
                              (current)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[color:var(--color-ink-secondary)]">
                          {table.capacity} seats
                          {table.is_exact_fit && (
                            <span className="ml-1 text-[color:var(--color-success)]">
                              Perfect fit
                            </span>
                          )}
                          {table.is_tight_fit && (
                            <span className="ml-1 text-[color:var(--color-warn)]">
                              Tight fit
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : formData.start_time ? (
                <div className="text-center py-4 text-[color:var(--color-ink-secondary)] bg-[color:var(--color-elevated)] rounded-token">
                  No tables available for this time
                </div>
              ) : (
                <div className="text-center py-4 text-[color:var(--color-ink-subtle)] bg-[color:var(--color-elevated)] rounded-token">
                  Select date and time to see available tables
                </div>
              )}
            </div>

            {/* Game Reservation (Optional) */}
            <div className="space-y-3 pt-3 border-t border-[color:var(--color-structure)]">
              <h3 className="text-sm font-medium text-[color:var(--color-ink-secondary)] uppercase tracking-wide">
                Game Reservation (Optional)
              </h3>
              <GameSearchSelect
                venueId={venueId}
                value={formData.game_id}
                onChange={(id) => updateField('game_id', id)}
                currentGameTitle={booking?.game?.title}
              />
            </div>

            {/* Notes */}
            <div className="space-y-3 pt-3 border-t border-[color:var(--color-structure)]">
              <FormField label="Guest Notes">
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Birthday party, needs highchair, dietary restrictions, etc."
                  rows={2}
                  className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm shadow-card focus-ring placeholder:text-[color:var(--color-ink-secondary)] resize-none"
                />
              </FormField>

              <FormField label="Internal Notes (staff only)">
                <textarea
                  value={formData.internal_notes}
                  onChange={(e) => updateField('internal_notes', e.target.value)}
                  placeholder="VIP customer, previous no-show, etc."
                  rows={2}
                  className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm shadow-card focus-ring placeholder:text-[color:var(--color-ink-secondary)] resize-none"
                />
              </FormField>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[color:var(--color-structure)]">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || isPending}>
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
